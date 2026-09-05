export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  slackWebhookUrl?: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  name: string;
  maxEmailsPerHour: number;
  stats?: {
    usedCount: number;
    maxHourlyLimit: number;
    remaining: number;
    resetInMs: number;
  };
}

export interface ScheduledEmailItem {
  id: string;
  campaignId?: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  scheduledAt: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
  total: number;
}

export interface QueueJobCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
}
