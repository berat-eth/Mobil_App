const { getJson, setJsonEx, sha256 } = require('../redis');

const TENANT_TTL = 300; // 5 dakika

module.exports = async function tenantCache(req, res, next) {
  try {
    if (res.locals && res.locals.tenant) return next();

    const headerKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (!headerKey) return next();

    const token = String(headerKey).startsWith('Bearer ')
      ? String(headerKey).slice(7)
      : String(headerKey);

    const cacheKey = `tenant:apikey:${sha256(token)}`;

    const cached = await getJson(cacheKey);
    if (cached && cached.id) {
      res.locals.tenant = cached;
      req.tenant = cached;
      return next();
    }

    // Global API key middleware DB'den set ettikten sonra cache'e yazmak için hook
    const writeOnce = () => {
      try {
        const t = req.tenant;
        if (t && t.id) setJsonEx(cacheKey, TENANT_TTL, t);
      } catch (_) {}
    };

    res.on('finish', writeOnce);
    res.on('close', writeOnce);
    return next();
  } catch (e) {
    return next();
  }
};


