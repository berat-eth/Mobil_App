const express = require('express');
const { queue } = require('../services/queue');
const { GmapsJob, GmapsLead } = require('../orm/models');
const { v4: uuidv4 } = require('uuid');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/google-maps', async (req, res) => {
  try {
    const { query, city, limit } = req.body || {};
    if (!query || !city) return res.status(400).json({ success: false, message: 'query and city required' });
    const jobId = uuidv4();

    await GmapsJob.create({ jobId, query, city, status: 'queued', total: 0, processed: 0 });
    await queue.add('scrape', { jobId, query, city, limit: Math.min(Number(limit || 100), 300) }, {
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
    return res.json({ success: true, jobId });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/google-maps/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = await GmapsJob.findOne({ where: { jobId } });
  if (!job) return res.status(404).json({ success: false, message: 'job not found' });
  return res.json({ success: true, data: { status: job.status, total: job.total, processed: job.processed, error: job.error || null } });
});

router.get('/google-maps/result/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const items = await GmapsLead.findAll({ where: { jobId }, limit: 5000 });
  return res.json({ success: true, data: items });
});

module.exports = router;


