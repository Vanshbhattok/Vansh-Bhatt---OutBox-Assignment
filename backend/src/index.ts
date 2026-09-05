import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from './config';
import apiRouter from './routes/api';
import { emailQueue } from './queue/emailQueue';
import { elasticsearchService } from './services/elasticsearchService';
import { schedulerService } from './services/schedulerService';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup BullBoard Dashboard UI at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    workerConcurrency: config.workerConcurrency,
  });
});

const startServer = async () => {
  try {
    // 1. Initialize Elasticsearch index
    await elasticsearchService.initIndex();

    // 2. Perform server recovery & sync for pending/rate-limited emails
    await schedulerService.recoverAndSyncPendingEmails();

    // 3. Start Express server listener
    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ReachInbox Email Scheduler Backend is Live!`);
      console.log(`📡 API Base URL:      http://localhost:${config.port}/api`);
      console.log(`📊 BullMQ Dashboard:  http://localhost:${config.port}/admin/queues`);
      console.log(`⚡ Worker Concurrency:${config.workerConcurrency}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to launch backend server:', err);
    process.exit(1);
  }
};

startServer();
