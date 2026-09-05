# ReachInbox AI - Full-Stack Production Email Job Scheduler & Dashboard

A production-grade, persistent, rate-limited email scheduling service and modern dashboard built for **ReachInbox.ai**.

> **Zero Cron Jobs**: Fully powered by **BullMQ + Redis** delayed jobs and **PostgreSQL** relational persistence. Handles server restarts, worker concurrency, atomic hourly rate limiting, Slack rate limit alerts, Elasticsearch indexing, and Ethereal fake SMTP sending with live message previews.

---

## 🚀 Key Features Matrix

| Category | Feature | Implementation Details |
| :--- | :--- | :--- |
| **Backend** | **BullMQ Delayed Scheduling** | Enqueues jobs using delayed Redis timestamps with deterministic job IDs (`email_<uuid>`). **No Cron libraries or crontab used.** |
| **Backend** | **Restart Safety & Idempotency** | On boot, backend syncs PostgreSQL pending/rate-limited emails with Redis. Guarantees future emails send at the right time without duplicate sends. |
| **Backend** | **Worker Concurrency** | Configurable worker concurrency level (`WORKER_CONCURRENCY=5`) running parallel jobs safely. |
| **Backend** | **Provider Throttling** | Minimum inter-email delay (`delaySeconds` / `DEFAULT_MIN_DELAY_MS`) enforced in worker. |
| **Backend** | **Hourly Rate Limiting** | Atomic Redis counters (`INCR` on `rate_limit:<sender>:<YYYYMMDDHH>`). When limit reached, jobs auto-reschedule to next hour window. |
| **Backend** | **Live Slack Notifications** | Live alert posted to user's connected Slack webhook when hourly rate limit is hit. |
| **Backend** | **Elasticsearch Indexing** | Full-text search across subject, recipient, body, and status via Elasticsearch. |
| **Backend** | **Ethereal Fake SMTP** | Auto-generates test SMTP credentials via Nodemailer and stores clickable preview URLs. |
| **Backend** | **BullBoard Live Queue UI** | Exposes live BullMQ monitor at `http://localhost:5001/admin/queues`. |
| **Frontend** | **Google OAuth & Workspace Login** | Google OAuth authentication header showing User Avatar, Name, Email, and Logout. |
| **Frontend** | **CSV / TXT Lead Uploader** | Client-side PapaParse integration detecting unique email addresses with real-time badges. |
| **Frontend** | **Compose Campaign Modal** | Set Subject, Body, Recipients, Start Time, Delay (sec), Hourly Limit, and Sender Account. |
| **Frontend** | **Scheduled & Sent Tables** | Dedicated tabs with loading states, empty states, status badges, and clickable Ethereal preview links. |

---

## 🏗 System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (Next.js 14)                             |
|  - Header: Google User Profile, Avatar, Slack Connection Status, Logout           |
|  - Global Search Bar: Full-text Elasticsearch search API                          |
|  - Tabs: Scheduled Emails | Sent Emails | BullMQ Live Monitor                      |
|  - Modals: Compose Email (CSV parser, start time, delay, limit) | Slack Connector |
+-----------------------------------------------------------------------------------+
                                        │
                                   REST APIs
                                        ▼
+-----------------------------------------------------------------------------------+
|                              BACKEND (Express.js + TypeScript)                    |
|  - Auth Routes: Google OAuth verify & user upsert                                 |
|  - Email Routes: /schedule, /scheduled, /sent, /search, /stats                    |
|  - Slack Routes: /connect, /status, /disconnect                                   |
|  - BullBoard UI: /admin/queues                                                    |
|  - Core Engines:                                                                  |
|    • SchedulerService: Calculates delay & enqueues deterministic BullMQ jobs      |
|    • RateLimiterService: Atomic Redis hourly counters per sender                  |
|    • SlackService: Live webhook payload alert dispatch                            |
|    • ElasticsearchService: Full-text index & search query handler                 |
|    • EtherealService: Nodemailer fake SMTP dispatch + preview URL generator       |
+-----------------------------------------------------------------------------------+
       │                      │                      │                     │
       ▼                      ▼                      ▼                     ▼
+--------------+      +----------------+     +---------------+     +---------------+
| PostgreSQL   |      | Redis          |     | BullMQ Worker |     | Elasticsearch |
| Relational   |      | Queue storage  |     | Concurrency: 5|     | Full-text     |
| Persistence  |      | & Hourly keys  |     | Throttling &  |     | Email Index   |
|              |      |                |     | Rescheduling  |     |               |
+--------------+      +----------------+     +---------------+     +---------------+
```

---

## ⚡ How It Works Under the Hood

### 1. Persistent Scheduling (No Cron)
When a campaign is scheduled:
1. `EmailCampaign` and `ScheduledEmail` records are saved in **PostgreSQL**.
2. A deterministic job ID (`email_<id>`) is computed.
3. The job is enqueued in **BullMQ** with `delay = targetTimestamp - Date.now()`.
4. Redis stores the delayed job in a sorted set by execution time.

### 2. Rate Limiting & Auto-Rescheduling
1. Before sending each email, the BullMQ worker calls `RateLimiterService.checkAndIncrement(senderEmail, hourlyLimit)`.
2. Uses Redis atomic `INCR` on key `rate_limit:<senderEmail>:<YYYYMMDDHH>`.
3. If `currentCount > hourlyLimit`:
   - Job is **NOT dropped or failed**.
   - Target start time for the next UTC hour window is calculated (`nextHourMs`).
   - Job is enqueued back into BullMQ with `delay = nextHourMs`.
   - Database record is updated to `status = RATE_LIMITED`.
   - **Live Slack Alert** is dispatched to the user's Slack webhook.

### 3. Server Restart Recovery
If the Express backend process or server restarts:
1. BullMQ delayed jobs remain safely stored in Redis.
2. Upon boot, `SchedulerService.recoverAndSyncPendingEmails()` scans PostgreSQL for any pending/rate-limited emails missing from Redis queue and restores them with exact remaining delay calculations.
3. Emails already marked `SENT` in DB are automatically skipped by workers, maintaining 100% idempotency.

---

## 🛠 Setup & Running Locally

### Prerequisites
- **Node.js**: v18+ (Tested on v22.20.0)
- **Docker Desktop**: Running locally

### Step 1: Start Infrastructure Containers
Launch PostgreSQL, Redis, and Elasticsearch using Docker Compose:
```bash
docker compose up -d
```

### Step 2: Start Backend Server
```bash
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev
```
- **Backend API**: `http://localhost:5001/api`
- **BullMQ Live Queue Dashboard**: `http://localhost:5001/admin/queues`

### Step 3: Start Frontend Dashboard
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- **Frontend App**: `http://localhost:3000`

---

## 🌐 Environment Variables Configuration

### Backend (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200
WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_MS=2000
DEFAULT_MAX_EMAILS_PER_HOUR=200
ETHEREAL_USER=
ETHEREAL_PASS=
SLACK_WEBHOOK_URL=
GOOGLE_CLIENT_ID=
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_BULL_BOARD_URL=http://localhost:5001/admin/queues
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## 📝 Demo & Walkthrough

1. **Google / Demo Login**: Log into the workspace using Google OAuth or 1-Click Demo.
2. **Compose Email**: Click **Compose Email**, select sender, paste lead emails or upload a CSV file. Set start time, inter-email delay, and hourly rate limit.
3. **Inspect Scheduled Queue**: View delayed email jobs under **Scheduled Emails** or monitor live Redis queues at `/admin/queues`.
4. **Inspect Sent Email Logs**: Switch to **Sent Emails** to view completed jobs and click **View Email** to inspect the fake email rendered on Ethereal SMTP.
5. **Test Server Restart**: Stop backend (`Ctrl+C`), restart it (`npm run dev`). Observe future scheduled emails continue sending on time without duplication!
6. **Test Rate Limiting & Slack Alert**: Schedule emails exceeding sender limit (e.g. 5 emails with limit = 2). Observe remaining 3 emails auto-reschedule to the next hour and receive a live formatted Slack alert in your Slack channel!
