const { chromium } = require('playwright-extra');
const StealthPlugin = require('playwright-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');

chromium.use(StealthPlugin());

function pickProxy() {
  const list = String(process.env.HTTP_PROXIES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

function buildMapsUrl(query, city) {
  const q = encodeURIComponent(`${query} ${city}`);
  return `https://www.google.com/maps/search/${q}`;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeOnce({ query, city, limit = 50, proxy }) {
  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  ];
  const contextOptions = {};
  if (proxy) contextOptions.proxy = { server: proxy };

  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    const url = buildMapsUrl(query, city);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2000);

    // Captcha basic detection
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/detected unusual traffic|verify/i.test(bodyText)) {
      throw new Error('captcha_or_block');
    }

    // Wait results list
    await page.waitForSelector('[role="feed"]', { timeout: 60000 });

    // Scroll to load items
    const feed = page.locator('[role="feed"]');
    let seen = new Set();
    let results = [];
    for (let i = 0; i < 20 && results.length < limit; i++) {
      const cards = page.locator('[role="article"]');
      const count = await cards.count();
      for (let k = 0; k < count && results.length < limit; k++) {
        const card = cards.nth(k);
        const id = await card.getAttribute('data-result-id').catch(() => null) || `${k}`;
        if (seen.has(id)) continue;
        seen.add(id);

        // Open in side panel
        await card.click({ delay: 50 });
        await page.waitForTimeout(400 + Math.floor(Math.random() * 300));

        const name = await page.locator('h1 span[class*="fontHeadlineLarge"]').first().innerText().catch(() => '');
        const address = await page.locator('[data-item-id="address"] span').last().innerText().catch(() => '');
        const phone = await page.locator('[data-item-id="phone"] span').last().innerText().catch(() => '');
        const website = await page.locator('a[data-item-id="authority"]').getAttribute('href').catch(() => '');

        const shareBtn = page.locator('button[aria-label*="Paylaş"][aria-label*="Share"]').first();
        let locationUrl = '';
        if (await shareBtn.count().catch(() => 0)) {
          await shareBtn.click().catch(() => {});
          await page.waitForTimeout(400);
          locationUrl = await page.locator('input[aria-label*="Bağlantı"] , input[aria-label*="Link"]').inputValue().catch(() => '');
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(200);
        }

        results.push({ name, address, city, phone, website, locationUrl });
      }

      await feed.evaluate(el => { el.scrollBy(0, el.scrollHeight); });
      await page.waitForTimeout(1200 + Math.floor(Math.random() * 600));
    }

    return { success: true, data: results };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function runScrape(params) {
  const proxy = pickProxy();
  try {
    return await scrapeOnce({ ...params, proxy });
  } catch (e) {
    if (String(e.message).includes('captcha_or_block')) {
      // retry with another proxy if available
      const nextProxy = pickProxy();
      if (nextProxy && nextProxy !== proxy) {
        return await scrapeOnce({ ...params, proxy: nextProxy });
      }
      return { success: false, blocked: true, error: 'Blocked by captcha' };
    }
    return { success: false, error: e.message };
  }
}

module.exports = { runScrape };


