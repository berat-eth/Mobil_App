/**
 * XSS Protection Middleware
 * Response'larda output encoding yapar
 */

const { sanitizeHTML, sanitizeObject } = require('../utils/xss-sanitizer');

/**
 * Response data'sını sanitize et
 */
function sanitizeResponseData(data) {
  if (!data) {
    return data;
  }

  // Eğer data bir object ise recursive olarak sanitize et
  if (typeof data === 'object') {
    return sanitizeObject(data, { mode: 'html' });
  }

  // String ise HTML sanitize et
  if (typeof data === 'string') {
    return sanitizeHTML(data);
  }

  return data;
}

/**
 * XSS Protection Middleware
 * Response'larda otomatik sanitization yapar
 */
function xssProtectionMiddleware(req, res, next) {
  // Orijinal json metodunu sakla
  const originalJson = res.json.bind(res);

  // json metodunu override et
  res.json = function(data) {
    // Sadece success response'larda sanitize et
    if (data && typeof data === 'object') {
      // data field'ını sanitize et
      if (data.data) {
        data.data = sanitizeResponseData(data.data);
      }
      
      // message field'ını sanitize et (eğer HTML içeriyorsa)
      if (data.message && typeof data.message === 'string') {
        // Message'lar genelde plain text olmalı
        const { sanitizePlainText } = require('../utils/xss-sanitizer');
        data.message = sanitizePlainText(data.message);
      }
    }

    return originalJson(data);
  };

  next();
}

/**
 * Selective XSS Protection
 * Sadece belirli field'ları sanitize et
 */
function selectiveXssProtection(fields = []) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      if (data && typeof data === 'object' && data.data) {
        data.data = sanitizeObject(data.data, {
          mode: 'html',
          fields: fields.length > 0 ? fields : null
        });
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  xssProtectionMiddleware,
  selectiveXssProtection,
  sanitizeResponseData
};

