import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { prisma } from '../database/prisma';
import { etherealService } from '../services/etherealService';
import { rateLimiterService } from '../services/rateLimiterService';
import { slackService } from '../services/slackService';
import { elasticsearchService } from '../services/elasticsearchService';

export interface SendEmailJobData {
  emailId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delaySeconds: number;
  userId?: string;
}

const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<SendEmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const emailWorker = new Worker<SendEmailJobData>(
  QUEUE_NAME,
  async (job: Job<SendEmailJobData>) => {
    const { emailId, senderEmail, recipient, subject, body, hourlyLimit, delaySeconds, userId } = job.data;
    console.log(`[Worker] Picked up job ${job.id} for email ${emailId} -> recipient ${recipient}`);

    // Check DB status first for idempotency
    const dbEmail = await prisma.scheduledEmail.findUnique({ where: { id: emailId } });
    if (!dbEmail) {
      console.warn(`[Worker] Scheduled email record ${emailId} not found in DB. Skipping job.`);
      return { status: 'skipped', reason: 'record_not_found' };
    }

    if (dbEmail.status === 'SENT') {
      console.log(`[Worker] Email ${emailId} has already been SENT. Skipping duplicate execution.`);
      return { status: 'skipped', reason: 'already_sent' };
    }

    // Check rate limit atomically in Redis
    const limitCheck = await rateLimiterService.checkAndIncrement(senderEmail, hourlyLimit);

    if (!limitCheck.allowed) {
      console.warn(
        `[Worker] Sender ${senderEmail} exceeded rate limit (${limitCheck.currentCount}/${hourlyLimit}). Rescheduling email ${emailId} to next hour in ${Math.round(limitCheck.resetInMs / 1000)}s.`
      );

      // Reschedule job in BullMQ to the start of the next hour window
      const newJobId = `email_${emailId}_rescheduled_${Date.now()}`;
      await emailQueue.add('send-email', job.data, {
        delay: limitCheck.resetInMs,
        jobId: newJobId,
      });

      // Update DB status to RATE_LIMITED
      const updatedEmail = await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: {
          status: 'RATE_LIMITED',
          scheduledAt: limitCheck.nextHourDate,
          jobId: newJobId,
        },
      });

      // Update Elasticsearch
      await elasticsearchService.indexEmail({
        id: updatedEmail.id,
        campaignId: updatedEmail.campaignId,
        senderEmail: updatedEmail.senderEmail,
        recipient: updatedEmail.recipient,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: 'RATE_LIMITED',
        scheduledAt: updatedEmail.scheduledAt,
      });

      // Send live Slack alert notification
      await slackService.notifyRateLimitHit({
        senderEmail,
        attemptedCount: limitCheck.currentCount,
        hourlyLimit,
        rescheduledTime: limitCheck.nextHourDate,
        recipient,
        userId,
      });

      return {
        status: 'rate_limited',
        rescheduledTo: limitCheck.nextHourDate,
        attemptedCount: limitCheck.currentCount,
      };
    }

    // Apply minimum inter-email delay to throttle provider sending
    const enforcedDelayMs = Math.max((delaySeconds || 0) * 1000, config.defaultMinDelayMs);
    if (enforcedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, enforcedDelayMs));
    }

    // Update status to PROCESSING
    await prisma.scheduledEmail.update({
      where: { id: emailId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Send email via Ethereal fake SMTP
      const sendResult = await etherealService.sendEmail({
        from: senderEmail,
        to: recipient,
        subject,
        body,
      });

      const sentAt = new Date();
      const updatedEmail = await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sentAt,
          etherealPreviewUrl: sendResult.previewUrl || null,
        },
      });

      // Update Elasticsearch index
      await elasticsearchService.indexEmail({
        id: updatedEmail.id,
        campaignId: updatedEmail.campaignId,
        senderEmail: updatedEmail.senderEmail,
        recipient: updatedEmail.recipient,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: 'SENT',
        scheduledAt: updatedEmail.scheduledAt,
        sentAt,
        etherealPreviewUrl: sendResult.previewUrl || null,
      });

      console.log(`[Worker] Successfully sent email ${emailId} to ${recipient}`);

      return {
        status: 'sent',
        sentAt,
        previewUrl: sendResult.previewUrl,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown SMTP sending error';
      console.error(`[Worker] Failed sending email ${emailId}:`, errorMsg);

      const updatedEmail = await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          errorMessage: errorMsg,
        },
      });

      await elasticsearchService.indexEmail({
        id: updatedEmail.id,
        campaignId: updatedEmail.campaignId,
        senderEmail: updatedEmail.senderEmail,
        recipient: updatedEmail.recipient,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: 'FAILED',
        scheduledAt: updatedEmail.scheduledAt,
        errorMessage: errorMsg,
      });

      throw err; // Trigger BullMQ retry mechanism
    }
  },
  {
    connection: redisConnection,
    concurrency: config.workerConcurrency, // Configurable worker concurrency
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker Event] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Event] Job ${job?.id} failed with error:`, err.message);
});
