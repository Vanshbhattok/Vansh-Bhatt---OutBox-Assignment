import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  defaultMinDelayMs: parseInt(process.env.DEFAULT_MIN_DELAY_MS || '2000', 10),
  defaultMaxEmailsPerHour: parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR || '200', 10),
  ethereal: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  },
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};
