import { Request, Response } from 'express';
import { schedulerService } from '../services/schedulerService';
import { prisma } from '../database/prisma';
import { elasticsearchService } from '../services/elasticsearchService';
import { emailQueue } from '../queue/emailQueue';
import { rateLimiterService } from '../services/rateLimiterService';

export const scheduleEmail = async (req: Request, res: Response) => {
  try {
    const {
      subject,
      body,
      recipients,
      startTime,
      delaySeconds,
      hourlyLimit,
      senderEmail,
      userId,
    } = req.body;

    if (!subject || !body || !senderEmail) {
      return res.status(400).json({
        error: 'Missing required fields: subject, body, and senderEmail are mandatory.',
      });
    }

    let recipientList: string[] = [];

    if (Array.isArray(recipients)) {
      recipientList = recipients;
    } else if (typeof recipients === 'string') {
      recipientList = recipients.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    }

    if (recipientList.length === 0) {
      return res.status(400).json({
        error: 'No valid recipient email addresses provided.',
      });
    }

    const scheduledStartTime = startTime ? new Date(startTime) : new Date();

    const result = await schedulerService.scheduleCampaign({
      subject,
      body,
      recipients: recipientList,
      startTime: scheduledStartTime,
      delaySeconds: delaySeconds ? parseInt(delaySeconds, 10) : 2,
      hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 200,
      senderEmail,
      userId,
    });

    return res.status(201).json({
      message: 'Emails successfully scheduled!',
      result,
    });
  } catch (err: any) {
    console.error('[EmailController Schedule Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to schedule emails.' });
  }
};

export const getScheduledEmails = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where: {
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.scheduledEmail.count({
        where: {
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
      }),
    ]);

    return res.json({
      emails,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve scheduled emails.' });
  }
};

export const getSentEmails = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where: {
          status: { in: ['SENT', 'FAILED'] },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scheduledEmail.count({
        where: {
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
    ]);

    return res.json({
      emails,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve sent emails.' });
  }
};

export const searchEmails = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;

    // Check Elasticsearch search first
    if (elasticsearchService.getIsAvailable()) {
      const esResults = await elasticsearchService.searchEmails(query, status);
      if (esResults && esResults.length > 0) {
        return res.json({
          source: 'elasticsearch',
          emails: esResults,
        });
      }
    }

    // Database Fallback Search
    const whereCondition: any = {};
    if (status) {
      whereCondition.status = status;
    }

    if (query.trim()) {
      whereCondition.OR = [
        { subject: { contains: query, mode: 'insensitive' } },
        { recipient: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
        { senderEmail: { contains: query, mode: 'insensitive' } },
      ];
    }

    const emails = await prisma.scheduledEmail.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      source: 'database',
      emails,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to perform search query.' });
  }
};

export const getEmailStats = async (req: Request, res: Response) => {
  try {
    const [scheduledCount, sentCount, failedCount, rateLimitedCount, jobCounts] = await Promise.all([
      prisma.scheduledEmail.count({ where: { status: 'SCHEDULED' } }),
      prisma.scheduledEmail.count({ where: { status: 'SENT' } }),
      prisma.scheduledEmail.count({ where: { status: 'FAILED' } }),
      prisma.scheduledEmail.count({ where: { status: 'RATE_LIMITED' } }),
      emailQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
    ]);

    return res.json({
      stats: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rateLimited: rateLimitedCount,
        total: scheduledCount + sentCount + failedCount + rateLimitedCount,
      },
      queue: jobCounts,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch email statistics.' });
  }
};
