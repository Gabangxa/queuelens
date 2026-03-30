const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'queuelens.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      framework TEXT DEFAULT 'bullmq',
      waiting INTEGER DEFAULT 0,
      active INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      avg_duration_ms INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      queue_name TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      error_message TEXT,
      stack_trace TEXT,
      attempts INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      processed_at TEXT,
      failed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS job_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      attempted_at TEXT NOT NULL,
      error TEXT
    );
  `);

  const existing = db.prepare('SELECT COUNT(*) as cnt FROM queues').get();
  if (existing.cnt > 0) return;

  // Seed queues
  const insertQueue = db.prepare(`
    INSERT OR IGNORE INTO queues (name, framework, waiting, active, completed, failed, avg_duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertQueue.run('email-sends',       'bullmq', 124, 8, 18432, 3,  420);
  insertQueue.run('image-processing',  'bullmq', 7,   2, 4211,  0,  3800);
  insertQueue.run('pdf-exports',       'bullmq', 0,   0, 891,   12, 12400);

  // Seed failed jobs for email-sends
  const insertJob = db.prepare(`
    INSERT OR IGNORE INTO jobs
      (id, queue_name, status, payload, error_message, stack_trace, attempts, max_attempts, created_at, processed_at, failed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertJob.run(
    'j-8821', 'email-sends', 'failed',
    JSON.stringify({ to: 'user@example.com', subject: 'Welcome to QueueLens', template: 'welcome' }),
    'SMTP connection refused: connect ECONNREFUSED 10.0.1.5:587',
    `Error: SMTP connection refused: connect ECONNREFUSED 10.0.1.5:587
    at SMTPConnection._onError (/app/node_modules/nodemailer/lib/smtp-connection/index.js:198:19)
    at Socket.<anonymous> (/app/node_modules/nodemailer/lib/smtp-connection/index.js:369:14)
    at Socket.emit (events.js:400:28)
    at emitErrorNT (internal/streams/destroy.js:106:8)
    at processTicksAndRejections (internal/process/task_queues.js:82:21)`,
    3, 3,
    '2026-03-30T04:12:00Z', '2026-03-30T04:12:01Z', '2026-03-30T06:12:00Z'
  );

  insertJob.run(
    'j-8794', 'email-sends', 'failed',
    JSON.stringify({ to: 'admin@bigcorp.com', subject: 'Invoice #1042', template: 'invoice' }),
    'Recipient mailbox full: 452 Too many messages for user',
    `Error: Recipient mailbox full: 452 Too many messages for user
    at SMTPConnection._onData (/app/node_modules/nodemailer/lib/smtp-connection/index.js:542:23)
    at TLSSocket.<anonymous> (/app/node_modules/nodemailer/lib/smtp-connection/index.js:386:12)
    at TLSSocket.emit (events.js:400:28)
    at addChunk (internal/streams/readable.js:293:12)
    at readableAddChunk (internal/streams/readable.js:267:9)`,
    3, 3,
    '2026-03-30T03:55:00Z', '2026-03-30T03:55:01Z', '2026-03-30T05:55:00Z'
  );

  insertJob.run(
    'j-8750', 'email-sends', 'failed',
    JSON.stringify({ to: 'team@startup.io', subject: 'Password reset', template: 'reset' }),
    'DNS lookup failed: getaddrinfo ENOTFOUND smtp.mailprovider.io',
    `Error: DNS lookup failed: getaddrinfo ENOTFOUND smtp.mailprovider.io
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:76:26)
    at SMTPConnection._connectTCP (/app/node_modules/nodemailer/lib/smtp-connection/index.js:338:9)
    at SMTPConnection._connect (/app/node_modules/nodemailer/lib/smtp-connection/index.js:280:10)
    at SMTPConnection.connect (/app/node_modules/nodemailer/lib/smtp-connection/index.js:196:8)`,
    3, 3,
    '2026-03-30T02:03:00Z', '2026-03-30T02:03:01Z', '2026-03-30T04:03:00Z'
  );

  // Seed failed jobs for pdf-exports
  insertJob.run(
    'j-7110', 'pdf-exports', 'failed',
    JSON.stringify({ reportId: 'rpt-9921', format: 'A4', pages: 47 }),
    'Puppeteer timeout: Page load exceeded 30000ms',
    `TimeoutError: Puppeteer timeout: Page load exceeded 30000ms
    at Page._waitForNavigation (/app/node_modules/puppeteer/lib/cjs/puppeteer/common/Page.js:828:21)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
    at async PdfExportJob.render (/app/workers/pdf-export.js:42:5)
    at async PdfExportJob.process (/app/workers/pdf-export.js:18:3)`,
    3, 3,
    '2026-03-29T22:10:00Z', '2026-03-29T22:10:01Z', '2026-03-30T00:10:00Z'
  );

  insertJob.run(
    'j-7089', 'pdf-exports', 'failed',
    JSON.stringify({ reportId: 'rpt-9918', format: 'A4', pages: 112 }),
    'Out of memory: Cannot allocate 512MB for canvas operation',
    `FatalError: Out of memory: Cannot allocate 512MB for canvas operation
    at Canvas.toBuffer (/app/node_modules/canvas/build/Release/canvas.node)
    at PdfExportJob.renderPage (/app/workers/pdf-export.js:78:32)
    at async PdfExportJob.render (/app/workers/pdf-export.js:44:7)
    at async PdfExportJob.process (/app/workers/pdf-export.js:18:3)`,
    3, 3,
    '2026-03-29T21:45:00Z', '2026-03-29T21:45:01Z', '2026-03-29T23:45:00Z'
  );

  insertJob.run(
    'j-7044', 'pdf-exports', 'failed',
    JSON.stringify({ reportId: 'rpt-9905', format: 'letter', pages: 8 }),
    'ERR_TOO_MANY_REDIRECTS: https://api.internal/data/export?id=882',
    `Error: ERR_TOO_MANY_REDIRECTS: https://api.internal/data/export?id=882
    at ClientRequest.<anonymous> (/app/node_modules/node-fetch/lib/index.js:1455:11)
    at ClientRequest.emit (events.js:400:28)
    at Socket.socketErrorListener (_http_client.js:475:9)
    at PdfExportJob.fetchData (/app/workers/pdf-export.js:61:19)`,
    3, 3,
    '2026-03-29T20:44:00Z', '2026-03-29T20:44:01Z', '2026-03-29T22:44:00Z'
  );

  // Seed attempt history
  const insertAttempt = db.prepare(`
    INSERT OR IGNORE INTO job_attempts (job_id, attempt_number, attempted_at, error)
    VALUES (?, ?, ?, ?)
  `);

  insertAttempt.run('j-8821', 1, '2026-03-30T04:12:00Z', 'SMTP connection refused: connect ECONNREFUSED 10.0.1.5:587');
  insertAttempt.run('j-8821', 2, '2026-03-30T05:12:00Z', 'SMTP connection refused: connect ECONNREFUSED 10.0.1.5:587');
  insertAttempt.run('j-8821', 3, '2026-03-30T06:12:00Z', 'SMTP connection refused: connect ECONNREFUSED 10.0.1.5:587');

  insertAttempt.run('j-8794', 1, '2026-03-30T03:55:00Z', 'Recipient mailbox full: 452 Too many messages for user');
  insertAttempt.run('j-8794', 2, '2026-03-30T04:25:00Z', 'Recipient mailbox full: 452 Too many messages for user');
  insertAttempt.run('j-8794', 3, '2026-03-30T05:55:00Z', 'Recipient mailbox full: 452 Too many messages for user');

  insertAttempt.run('j-8750', 1, '2026-03-30T02:03:00Z', 'DNS lookup failed: getaddrinfo ENOTFOUND smtp.mailprovider.io');
  insertAttempt.run('j-8750', 2, '2026-03-30T03:03:00Z', 'DNS lookup failed: getaddrinfo ENOTFOUND smtp.mailprovider.io');
  insertAttempt.run('j-8750', 3, '2026-03-30T04:03:00Z', 'DNS lookup failed: getaddrinfo ENOTFOUND smtp.mailprovider.io');

  console.log('Database seeded with mock data.');
}

function getAllQueues() {
  return getDb().prepare('SELECT * FROM queues ORDER BY failed DESC, name').all();
}

function getQueue(name) {
  return getDb().prepare('SELECT * FROM queues WHERE name = ?').get(name);
}

function getJobsForQueue(queueName) {
  return getDb().prepare(
    'SELECT * FROM jobs WHERE queue_name = ? ORDER BY failed_at DESC, created_at DESC'
  ).all(queueName);
}

function getJob(id) {
  return getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

function getJobAttempts(jobId) {
  return getDb().prepare(
    'SELECT * FROM job_attempts WHERE job_id = ? ORDER BY attempt_number'
  ).all(jobId);
}

module.exports = { initDb, getAllQueues, getQueue, getJobsForQueue, getJob, getJobAttempts };
