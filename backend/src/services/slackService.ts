import axios from 'axios';
import { config } from '../config';
import { prisma } from '../database/prisma';

export class SlackService {
  /**
   * Sends a live Slack notification when a sender hits their hourly rate limit.
   */
  public async notifyRateLimitHit(details: {
    senderEmail: string;
    attemptedCount: number;
    hourlyLimit: number;
    rescheduledTime: Date;
    recipient: string;
    userId?: string;
  }): Promise<boolean> {
    try {
      // Find webhook URL either from specified user or default config
      let webhookUrl = config.slackWebhookUrl;

      if (details.userId) {
        const user = await prisma.user.findUnique({ where: { id: details.userId } });
        if (user?.slackWebhookUrl) {
          webhookUrl = user.slackWebhookUrl;
        }
      }

      if (!webhookUrl) {
        // First fallback: check if any user has set a Slack webhook
        const userWithWebhook = await prisma.user.findFirst({
          where: { slackWebhookUrl: { not: null } },
        });
        if (userWithWebhook?.slackWebhookUrl) {
          webhookUrl = userWithWebhook.slackWebhookUrl;
        }
      }

      if (!webhookUrl || webhookUrl.trim() === '') {
        console.log(`[SlackService] Rate limit hit for ${details.senderEmail}, but no Slack webhook configured. Skipping notification safely.`);
        return false;
      }

      const formattedTime = details.rescheduledTime.toLocaleString('en-US', {
        timeZoneName: 'short',
      });

      const payload = {
        text: `🚨 *ReachInbox Rate Limit Alert*: Sender \`${details.senderEmail}\` reached maximum limit of ${details.hourlyLimit} emails/hour!`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 ReachInbox Hourly Rate Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender Account:*\n\`${details.senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n*${details.hourlyLimit} emails/hr*`,
              },
              {
                type: 'mrkdwn',
                text: `*Current Window Attempt:*\n*#${details.attemptedCount}*`,
              },
              {
                type: 'mrkdwn',
                text: `*Rescheduled Delivery:*\n\`${formattedTime}\``,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Action Taken:* Email to \`${details.recipient}\` was deferred to protect sender domain health. BullMQ job auto-rescheduled for next available hour window.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🤖 ReachInbox Automated Email Scheduler • Production Job Queue Engine',
              },
            ],
          },
        ],
      };

      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      console.log(`[SlackService] Live rate limit alert successfully sent to Slack for sender ${details.senderEmail}`);
      return true;
    } catch (err) {
      console.error('[SlackService] Failed to send Slack alert:', (err as Error).message);
      return false;
    }
  }

  public async sendTestNotification(webhookUrl: string): Promise<boolean> {
    try {
      const payload = {
        text: '✅ *ReachInbox Slack Integration Connected!*',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚡ ReachInbox Slack Connected',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Your ReachInbox Email Scheduler is successfully linked to this Slack channel. You will receive live alerts whenever an hourly email sending limit is hit!',
            },
          },
        ],
      };

      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      return true;
    } catch (err) {
      console.error('[SlackService] Test notification failed:', (err as Error).message);
      throw err;
    }
  }
}

export const slackService = new SlackService();
