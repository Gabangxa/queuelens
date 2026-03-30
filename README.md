# QueueLens
> Unified job queue monitoring dashboard for indie developers — connect BullMQ, Sidekiq, and Celery, see all failures in one view.

## What This Is

QueueLens is a hosted dashboard mockup that demonstrates the core value: paste a Redis connection URL, auto-discover all job queues, drill into failed jobs, and retry them — without touching your application code. This mockup uses seeded SQLite data so no live Redis instance is required to explore the full UI.

## How to Run

### On Replit (recommended)
1. Go to: https://replit.com/new/github/Gabangxa/queuelens
2. Click **Run** — no configuration needed
3. Open the web preview

### Locally
```bash
npm install
npm start        # http://localhost:3000
```

## What's Built

- `GET /` — Landing page with hero, pain/solution section, framework logos, pricing table, and CTA
- `GET /dashboard` — Main dashboard: sidebar queue list, queue cards with waiting/active/completed/failed counts, "Add Connection" modal
- `GET /dashboard/queue/:name` — Queue drill-down: stats bar, job list table with status, created time, attempts, truncated last error
- `GET /dashboard/job/:id` — Job detail: status badge, timestamps, payload JSON block, full error + stack trace, attempt history, Retry/Discard buttons
- `GET /api/queues` — JSON list of all queues with counts
- `GET /api/queues/:name` — JSON queue detail + job list
- `GET /api/jobs/:id` — JSON job detail + attempt history
- `POST /api/jobs/:id/retry` — Non-functional retry (returns success response for UI demo)
- `GET /health` — Returns `{"status":"ok"}`

## How It's Supposed to Work

1. User visits `/dashboard` and sees 3 seeded queues: `email-sends`, `image-processing`, `pdf-exports`
2. The red failed-count badges on `email-sends` (3) and `pdf-exports` (12) draw attention immediately
3. User clicks `email-sends` → queue detail page shows a table of 3 failed jobs with truncated SMTP errors
4. User clicks job `j-8821` → job detail shows the full payload JSON, "SMTP connection refused" error message, and complete stack trace
5. User clicks **Retry Job** → a green success toast appears confirming the job was queued for retry
6. User can also click **Discard** to remove the job (toast confirmation, non-functional in mockup)

## Stack

- Runtime: Node.js 20
- Framework: Express
- Frontend: React 18 via CDN (Babel standalone, no build step)
- Database: SQLite via `better-sqlite3` (seeded on first boot)
- Styling: Tailwind CSS via CDN
- Deployment: Replit (cloudrun)

## What's Not Built Yet

- Real Redis / BullMQ connection (all data is seeded in SQLite)
- Sidekiq and Celery framework support (UI-only labels)
- Authentication / user accounts
- Email alerts on queue failure threshold
- Payment / billing integration
- Historical charts and trend data
- Multi-user / team seats

## Files

```
queuelens/
├── server.js          Express app — all routes and static serving
├── db.js              SQLite init, seed data, and query helpers
├── package.json       Dependencies: express, better-sqlite3
├── .replit            Replit run config (node server.js, cloudrun)
├── replit.nix         Nix environment with nodejs-20_x
├── product-spec.json  Pipeline spec (research → mockup stage)
├── public/
│   └── index.html     Landing page — static HTML + Tailwind CDN
└── views/
    ├── dashboard.html  React dashboard — queue cards grid
    ├── queue.html      React queue detail — job list table
    └── job.html        React job detail — payload, error, stack trace, retry
```

---
*Mockup generated 2026-03-30 · Research: research.md*
