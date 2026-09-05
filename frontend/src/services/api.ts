import axios from 'axios';
import { User, SenderAccount, ScheduledEmailItem, EmailStats, QueueJobCounts } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

export const apiService = {
  // Auth
  googleLogin: async (data: { credential?: string; email?: string; name?: string; avatar?: string; googleId?: string }) => {
    const res = await api.post<{ message: string; user: User }>('/auth/google', data);
    return res.data;
  },

  // Emails
  scheduleEmailBatch: async (data: {
    subject: string;
    body: string;
    recipients: string[];
    startTime?: string;
    delaySeconds?: number;
    hourlyLimit?: number;
    senderEmail: string;
    userId?: string;
  }) => {
    const res = await api.post('/emails/schedule', data);
    return res.data;
  },

  getScheduledEmails: async (page = 1, limit = 50) => {
    const res = await api.get<{ emails: ScheduledEmailItem[]; pagination: any }>('/emails/scheduled', {
      params: { page, limit },
    });
    return res.data;
  },

  getSentEmails: async (page = 1, limit = 50) => {
    const res = await api.get<{ emails: ScheduledEmailItem[]; pagination: any }>('/emails/sent', {
      params: { page, limit },
    });
    return res.data;
  },

  searchEmails: async (q: string, status?: string) => {
    const res = await api.get<{ source: string; emails: ScheduledEmailItem[] }>('/emails/search', {
      params: { q, status },
    });
    return res.data;
  },

  getEmailStats: async () => {
    const res = await api.get<{ stats: EmailStats; queue: QueueJobCounts }>('/emails/stats');
    return res.data;
  },

  // Senders
  getSenders: async () => {
    const res = await api.get<{ senders: SenderAccount[] }>('/senders');
    return res.data;
  },

  createSender: async (data: { email: string; name?: string; maxEmailsPerHour?: number }) => {
    const res = await api.post<{ sender: SenderAccount }>('/senders', data);
    return res.data;
  },

  // Slack
  connectSlack: async (data: { webhookUrl: string; userEmail?: string; userId?: string }) => {
    const res = await api.post<{ message: string; webhookUrl: string; connected: boolean }>('/slack/connect', data);
    return res.data;
  },

  getSlackStatus: async (userEmail?: string) => {
    const res = await api.get<{ connected: boolean; webhookUrl: string | null }>('/slack/status', {
      params: { userEmail },
    });
    return res.data;
  },

  disconnectSlack: async (userEmail?: string) => {
    const res = await api.post<{ message: string; connected: boolean }>('/slack/disconnect', { userEmail });
    return res.data;
  },
};
