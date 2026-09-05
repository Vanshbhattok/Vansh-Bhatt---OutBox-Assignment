import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { slackService } from '../services/slackService';
import { config } from '../config';

export const connectSlack = async (req: Request, res: Response) => {
  try {
    const { webhookUrl, userId, userEmail } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Valid Slack incoming webhook URL is required.' });
    }

    if (userId || userEmail) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: userId || undefined }, { email: userEmail || undefined }],
        },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { slackWebhookUrl: webhookUrl },
        });
      }
    }

    // Send test notification
    await slackService.sendTestNotification(webhookUrl);

    return res.json({
      message: 'Slack successfully connected! Test notification sent to channel.',
      webhookUrl,
      connected: true,
    });
  } catch (err: any) {
    console.error('[SlackController Error]:', err);
    return res.status(500).json({
      error: err.message || 'Failed to save Slack webhook URL or send test notification.',
    });
  }
};

export const getSlackStatus = async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.query;

    let webhookUrl = config.slackWebhookUrl;

    if (userEmail && typeof userEmail === 'string') {
      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (user?.slackWebhookUrl) {
        webhookUrl = user.slackWebhookUrl;
      }
    }

    if (!webhookUrl) {
      const firstUser = await prisma.user.findFirst({ where: { slackWebhookUrl: { not: null } } });
      if (firstUser?.slackWebhookUrl) {
        webhookUrl = firstUser.slackWebhookUrl;
      }
    }

    return res.json({
      connected: Boolean(webhookUrl && webhookUrl.trim() !== ''),
      webhookUrl: webhookUrl ? `${webhookUrl.substring(0, 30)}...` : null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve Slack status.' });
  }
};

export const disconnectSlack = async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.body;

    if (userEmail) {
      await prisma.user.updateMany({
        where: { email: userEmail },
        data: { slackWebhookUrl: null },
      });
    }

    return res.json({
      message: 'Slack disconnected successfully.',
      connected: false,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to disconnect Slack.' });
  }
};
