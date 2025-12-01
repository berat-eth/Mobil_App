/**
 * XSS Sanitizer Utility
 * DOMPurify benzeri güçlü HTML sanitization
 * Node.js ortamında çalışır
 */

// DOMPurify import - fallback ile
let DOMPurify;
let window;

try {
  // Önce isomorphic-dompurify dene (Node.js için optimize edilmiş)
  const createDOMPurify = require('isomorphic-dompurify');
  DOMPurify = createDOMPurify;
} catch (error) {
  try {
    // Fallback: jsdom + dompurify
    const { JSDOM } = require('jsdom');
    const createDOMPurify = require('dompurify');
    window = new JSDOM('').window;
    DOMPurify = createDOMPurify(window);
  } catch (fallbackError) {
    console.warn('⚠️ DOMPurify not available, using basic XSS protection');
    DOMPurify = null;
  }
}

/**
 * HTML içeriğini sanitize et
 * DOMPurify kullanarak güvenli HTML oluşturur
 */
function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // DOMPurify yoksa fallback kullan
  if (!DOMPurify) {
    return basicXSSEscape(html);
  }

  const defaultOptions = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'code', 'pre', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id',
      'target', 'rel', 'style'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    SANITIZE_DOM: true,
    ...options
  };

  return DOMPurify.sanitize(html, defaultOptions);
}

/**
 * Rich text editor içeriği için sanitization
 * Daha fazla HTML tag'ine izin verir ama güvenli şekilde
 */
function sanitizeRichText(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // DOMPurify yoksa fallback kullan
  if (!DOMPurify) {
    return basicXSSEscape(html);
  }

  return sanitizeHTML(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'strike', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'blockquote', 'pre', 'code', 'samp', 'kbd', 'var',
      'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'hr', 'div', 'span', 'sub', 'sup', 'mark', 'small', 'abbr', 'cite',
      'b', 'i', 'q', 'time'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id',
      'target', 'rel', 'style', 'data-*', 'aria-*', 'role',
      'colspan', 'rowspan', 'scope', 'headers', 'align', 'valign'
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true
  });
}

/**
 * Plain text için sanitization
 * Tüm HTML tag'lerini kaldırır, sadece metin bırakır
 */
function sanitizePlainText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // HTML tag'lerini kaldır
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // HTML entity'leri decode et
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');
  
  // JavaScript ve event handler'ları kaldır
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
}

/**
 * URL sanitization
 * Güvenli URL'ler oluşturur
 */
function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Sadece http, https, mailto, tel gibi güvenli protokollere izin ver
  const safeProtocols = /^(https?|mailto|tel|ftp):/i;
  
  if (!safeProtocols.test(url)) {
    return '';
  }

  // DOMPurify ile URL'yi sanitize et
  if (DOMPurify) {
    return DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }
  
  // Fallback: Basit URL temizleme
  return url.replace(/[<>"']/g, '');
}

/**
 * CSS sanitization
 * Güvenli CSS oluşturur
 */
function sanitizeCSS(css) {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Tehlikeli CSS özelliklerini kaldır
  const dangerousPatterns = [
    /expression\s*\(/gi,
    /javascript:/gi,
    /@import/gi,
    /behavior:/gi,
    /binding:/gi,
    /-moz-binding/gi
  ];

  let sanitized = css;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * Object içindeki tüm string'leri sanitize et
 * Recursive olarak çalışır
 */
function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  const { mode = 'html', fields = null } = options;

  for (const [key, value] of Object.entries(obj)) {
    // Belirli field'ları atla (eğer belirtilmişse)
    if (fields && !fields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      switch (mode) {
        case 'html':
          sanitized[key] = sanitizeHTML(value);
          break;
        case 'rich':
          sanitized[key] = sanitizeRichText(value);
          break;
        case 'plain':
          sanitized[key] = sanitizePlainText(value);
          break;
        default:
          sanitized[key] = sanitizeHTML(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Basit XSS escape (DOMPurify yoksa fallback)
 */
function basicXSSEscape(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
}

module.exports = {
  sanitizeHTML,
  sanitizeRichText,
  sanitizePlainText,
  sanitizeURL,
  sanitizeCSS,
  sanitizeObject,
  DOMPurify
};

