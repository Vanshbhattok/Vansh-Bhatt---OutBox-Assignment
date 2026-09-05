import { Router } from 'express';
import { googleAuthLogin, getCurrentUser } from '../controllers/authController';
import {
  scheduleEmail,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  getEmailStats,
} from '../controllers/emailController';
import { connectSlack, getSlackStatus, disconnectSlack } from '../controllers/slackController';
import { getSenders, createSender } from '../controllers/senderController';

const router = Router();

// Auth routes
router.post('/auth/google', googleAuthLogin);
router.get('/auth/me', getCurrentUser);

// Email Scheduler routes
router.post('/emails/schedule', scheduleEmail);
router.get('/emails/scheduled', getScheduledEmails);
router.get('/emails/sent', getSentEmails);
router.get('/emails/search', searchEmails);
router.get('/emails/stats', getEmailStats);

// Slack integration routes
router.post('/slack/connect', connectSlack);
router.get('/slack/status', getSlackStatus);
router.post('/slack/disconnect', disconnectSlack);

// Sender accounts routes
router.get('/senders', getSenders);
router.post('/senders', createSender);

export default router;
