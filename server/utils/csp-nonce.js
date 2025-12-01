/**
 * CSP Nonce Utility
 * Content Security Policy için nonce oluşturma ve yönetimi
 */

const crypto = require('crypto');

/**
 * Her request için benzersiz nonce oluştur
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP direktiflerini nonce ile oluştur
 * @param {string} nonce - Nonce değeri
 * @param {boolean} isDevelopment - Development ortamı mı?
 */
function createCSPDirectives(nonce, isDevelopment = false) {
  const directives = {
    defaultSrc: ["'self'"],
    // GÜVENLİK: unsafe-inline kaldırıldı, nonce kullanılıyor
    styleSrc: [
      "'self'",
      `'nonce-${nonce}'`, // Inline style'lar için nonce
      "https://fonts.googleapis.com"
    ],
    // GÜVENLİK: unsafe-inline ve unsafe-eval kaldırıldı, nonce kullanılıyor
    scriptSrc: [
      "'self'",
      `'nonce-${nonce}'`, // Inline script'ler için nonce
      // Gerekli external script'ler
      "https://accounts.google.com",
      "https://www.gstatic.com"
    ],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: [
      "'self'",
      "https://api.huglutekstil.com"
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'self'"],
    // XSS koruması için
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  };

  // Development için ekstra izinler (ama yine de unsafe-inline yok)
  if (isDevelopment) {
    // Development'ta localhost bağlantılarına izin ver
    directives.connectSrc.push("http://localhost:*", "ws://localhost:*", "https:");
    directives.frameSrc.push("https://www.dhlecommerce.com.tr");
    
    // Development'ta bile unsafe-inline kullanmıyoruz
    // Nonce kullanarak güvenli inline script/style desteği sağlıyoruz
  }

  return directives;
}

/**
 * CSP middleware - Her request için nonce oluşturur ve response'a ekler
 */
function cspNonceMiddleware(req, res, next) {
  // Her request için benzersiz nonce oluştur
  const nonce = generateNonce();
  
  // Request'e nonce ekle (template'lerde kullanmak için)
  res.locals.cspNonce = nonce;
  req.cspNonce = nonce;
  
  // CSP header'ını dinamik olarak oluştur
  const isDevelopment = process.env.NODE_ENV === 'development';
  const directives = createCSPDirectives(nonce, isDevelopment);
  
  // Report URI ekle (varsa)
  if (process.env.CSP_REPORT_URI) {
    directives.reportUri = process.env.CSP_REPORT_URI;
  }
  
  // CSP header'ını oluştur (helmet formatına uygun)
  const cspParts = [];
  
  // Her directive'i ekle
  Object.entries(directives).forEach(([key, values]) => {
    if (key === 'reportUri') {
      // report-uri directive'i
      cspParts.push(`report-uri ${values}`);
    } else if (Array.isArray(values)) {
      // Normal directive'ler
      const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      cspParts.push(`${directiveName} ${values.join(' ')}`);
    }
  });
  
  const cspHeader = cspParts.join('; ');
  
  // CSP header'ını response'a ekle
  res.setHeader('Content-Security-Policy', cspHeader);
  
  // Report-Only modu için (opsiyonel)
  if (process.env.CSP_REPORT_ONLY === 'true') {
    res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
  }
  
  next();
}

module.exports = {
  generateNonce,
  createCSPDirectives,
  cspNonceMiddleware
};

