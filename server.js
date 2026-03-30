const express = require('express');
const path = require('path');
const { initDb, getAllQueues, getQueue, getJobsForQueue, getJob, getJobAttempts } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database with seed data on startup
initDb();

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── API ───────────────────────────────────────────────────────────────────────

app.get('/api/queues', (req, res) => {
  try {
    const queues = getAllQueues();
    res.json(queues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/queues/:name', (req, res) => {
  try {
    const queue = getQueue(req.params.name);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    const jobs = getJobsForQueue(req.params.name);
    res.json({ queue, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id', (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const attempts = getJobAttempts(req.params.id);
    res.json({ job, attempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Non-functional retry — returns success toast data
app.post('/api/jobs/:id/retry', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true, message: `Job ${req.params.id} queued for retry.` });
});

// ── Views ─────────────────────────────────────────────────────────────────────

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard/queue/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'queue.html'));
});

app.get('/dashboard/job/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'job.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`QueueLens running on http://0.0.0.0:${PORT}`);
});
