import { prisma } from '../database/prisma';
import { emailQueue, SendEmailJobData } from '../queue/emailQueue';
import { elasticsearchService } from './elasticsearchService';
import { config } from '../config';

export class SchedulerService {
  /**
   * Schedule a new batch email campaign
   */
  public async scheduleCampaign(data: {
    subject: string;
    body: string;
    recipients: string[];
    startTime: Date;
    delaySeconds?: number;
    hourlyLimit?: number;
    senderEmail: string;
    userId?: string;
  }) {
    const {
      subject,
      body,
      recipients,
      startTime,
      delaySeconds = 2,
      hourlyLimit = 200,
      senderEmail,
      userId,
    } = data;

    if (!recipients || recipients.length === 0) {
      throw new Error('At least one valid recipient email is required.');
    }

    // Clean & filter email addresses
    const validRecipients = Array.from(
      new Set(
        recipients
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );

    if (validRecipients.length === 0) {
      throw new Error('No valid email addresses found in the provided list.');
    }

    // Find or create SenderAccount
    let sender = await prisma.senderAccount.findUnique({
      where: { email: senderEmail },
    });

    if (!sender) {
      sender = await prisma.senderAccount.create({
        data: {
          email: senderEmail,
          name: senderEmail.split('@')[0],
          maxEmailsPerHour: hourlyLimit,
        },
      });
    }

    // Create EmailCampaign record
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: userId || null,
        subject,
        body,
        startTime,
        delaySeconds,
        hourlyLimit,
        totalRecipients: validRecipients.length,
      },
    });

    const now = Date.now();
    const startTimestamp = startTime.getTime();
    const scheduledRecords = [];

    // Schedule each email recipient with staggered delays
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];

      // Stagger target send time based on delaySeconds
      const targetTimeMs = startTimestamp + i * (delaySeconds * 1000);
      const scheduledAt = new Date(targetTimeMs);
      const delayMs = Math.max(0, targetTimeMs - now);

      // Temporary placeholder ID for deterministic jobId
      const emailId = (await prisma.scheduledEmail.create({
        data: {
          campaignId: campaign.id,
          senderId: sender.id,
          senderEmail,
          recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt,
          jobId: `email_pending_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        },
      })).id;

      // Deterministic job ID guarantees idempotency
      const jobId = `email_${emailId}`;

      // Update DB record with final deterministic jobId
      const scheduledEmail = await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: { jobId },
      });

      const jobData: SendEmailJobData = {
        emailId,
        senderEmail,
        recipient,
        subject,
        body,
        hourlyLimit,
        delaySeconds,
        userId,
      };

      // Add delayed job to BullMQ queue (No Cron!)
      await emailQueue.add('send-email', jobData, {
        delay: delayMs,
        jobId,
      });

      // Index in Elasticsearch
      await elasticsearchService.indexEmail({
        id: emailId,
        campaignId: campaign.id,
        senderEmail,
        recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt,
      });

      scheduledRecords.push(scheduledEmail);
    }

    console.log(`[Scheduler] Successfully scheduled ${scheduledRecords.length} emails for campaign ${campaign.id}`);

    return {
      campaignId: campaign.id,
      totalScheduled: scheduledRecords.length,
      firstScheduledAt: scheduledRecords[0]?.scheduledAt,
      lastScheduledAt: scheduledRecords[scheduledRecords.length - 1]?.scheduledAt,
    };
  }

  /**
   * Server restart recovery & synchronization.
   * Guarantees pending emails in DB are tracked in BullMQ queue without double sending.
   */
  public async recoverAndSyncPendingEmails(): Promise<void> {
    console.log('[Recovery Sync] Checking database for pending scheduled emails...');

    try {
      const pendingEmails = await prisma.scheduledEmail.findMany({
        where: {
          status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
        },
      });

      if (pendingEmails.length === 0) {
        console.log('[Recovery Sync] No pending emails requiring queue restoration.');
        return;
      }

      console.log(`[Recovery Sync] Found ${pendingEmails.length} pending/rate-limited emails. Verifying queue alignment...`);

      const now = Date.now();
      let reEnqueuedCount = 0;

      for (const email of pendingEmails) {
        const existingJob = await emailQueue.getJob(email.jobId);

        if (!existingJob) {
          // Job missing in Redis (e.g., Redis restart/flush), re-enqueue with exact target time
          const scheduledMs = new Date(email.scheduledAt).getTime();
          const delayMs = Math.max(0, scheduledMs - now);

          // Get campaign details for settings
          const campaign = email.campaignId
            ? await prisma.emailCampaign.findUnique({ where: { id: email.campaignId } })
            : null;

          const jobData: SendEmailJobData = {
            emailId: email.id,
            senderEmail: email.senderEmail,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            hourlyLimit: campaign?.hourlyLimit || config.defaultMaxEmailsPerHour,
            delaySeconds: campaign?.delaySeconds || 2,
            userId: campaign?.userId || undefined,
          };

          await emailQueue.add('send-email', jobData, {
            delay: delayMs,
            jobId: email.jobId,
          });

          reEnqueuedCount++;
        }
      }

      console.log(`[Recovery Sync] Restored ${reEnqueuedCount} delayed jobs to BullMQ queue.`);
    } catch (err) {
      console.error('[Recovery Sync] Error during restart synchronization:', (err as Error).message);
    }
  }
}

export const schedulerService = new SchedulerService();
