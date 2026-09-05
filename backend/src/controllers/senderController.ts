import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { rateLimiterService } from '../services/rateLimiterService';
import { config } from '../config';

export const getSenders = async (req: Request, res: Response) => {
  try {
    const senders = await prisma.senderAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const sendersWithStats = await Promise.all(
      senders.map(async (sender) => {
        const stats = await rateLimiterService.getSenderStats(
          sender.email,
          sender.maxEmailsPerHour
        );
        return {
          ...sender,
          stats,
        };
      })
    );

    return res.json({ senders: sendersWithStats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve sender accounts.' });
  }
};

export const createSender = async (req: Request, res: Response) => {
  try {
    const { email, name, maxEmailsPerHour } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid sender email address is required.' });
    }

    const sender = await prisma.senderAccount.upsert({
      where: { email },
      update: {
        name: name || email.split('@')[0],
        maxEmailsPerHour: maxEmailsPerHour ? parseInt(maxEmailsPerHour, 10) : config.defaultMaxEmailsPerHour,
      },
      create: {
        email,
        name: name || email.split('@')[0],
        maxEmailsPerHour: maxEmailsPerHour ? parseInt(maxEmailsPerHour, 10) : config.defaultMaxEmailsPerHour,
      },
    });

    return res.status(201).json({ sender });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create sender account.' });
  }
};
