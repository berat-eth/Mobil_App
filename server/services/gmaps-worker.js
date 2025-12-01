const { Worker } = require('bullmq');
const { connection, queueName } = require('./queue');
const { GmapsJob, GmapsLead } = require('../orm/models');
const { runScrape } = require('./scrapers/googleMapsScraper');

const RATE_LIMIT_MS = Number(process.env.RATE_LIMIT_MS || 12000);

async function processJob(job) {
  const { jobId, query, city, limit } = job.data;
  const dbJob = await GmapsJob.findOne({ where: { jobId } });
  if (!dbJob) return;
  await dbJob.update({ status: 'running' });

  const result = await runScrape({ query, city, limit });
  if (!result.success) {
    await dbJob.update({ status: result.blocked ? 'blocked' : 'failed', error: result.error || 'unknown' });
    return;
  }

  const data = result.data || [];
  await dbJob.update({ total: data.length, processed: data.length, status: 'completed' });
  if (data.length) {
    const rows = data.map(r => ({ ...r, jobId, query, city }));
    // bulk insert in chunks
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const slice = rows.slice(i, i + chunkSize);
      await GmapsLead.bulkCreate(slice);
    }
  }
  // polite rate limit between jobs
  await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
}

const worker = new Worker(queueName, processJob, {
  connection,
  concurrency: Number(process.env.SCRAPER_CONCURRENCY || 2)
});

worker.on('failed', (job, err) => {
  console.error('gmaps worker failed:', err && err.message);
});

module.exports = { worker };


