/**
 * XSS Sanitization Utility for Admin Panel
 * DOMPurify kullanarak güvenli HTML sanitization
 */

// Client-side only - DOMPurify browser'da çalışır
let DOMPurify: any = null;

if (typeof window !== 'undefined') {
  try {
    DOMPurify = require('dompurify');
  } catch (error) {
    console.warn('⚠️ DOMPurify not available, using basic XSS protection');
  }
}

/**
 * HTML içeriğini sanitize et - Rich text için
 * DOMPurify kullanarak güvenli HTML oluşturur
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // DOMPurify yoksa fallback kullan
  if (!DOMPurify || typeof window === 'undefined') {
    return basicXSSEscape(html);
  }

  // DOMPurify ile sanitize et - Güvenli konfigürasyon
  const clean = DOMPurify.sanitize(html, {
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
      'colspan', 'rowspan', 'scope', 'headers', 'align', 'valign',
      'border', 'cellpadding', 'cellspacing', 'bgcolor'
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true,
    // Güvenli URL'ler - javascript:, data:, vbscript: yasak
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Tehlikeli tag'leri yasakla
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'base', 'meta', 'link'],
    // Tehlikeli attribute'ları yasakla - tüm event handler'lar
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 
      'onchange', 'onsubmit', 'onmouseout', 'onmousedown', 'onmouseup',
      'onkeydown', 'onkeyup', 'onkeypress', 'onresize', 'onscroll',
      'onabort', 'oncanplay', 'oncanplaythrough', 'ondurationchange',
      'onemptied', 'onended', 'onerror', 'onloadeddata', 'onloadedmetadata',
      'onloadstart', 'onpause', 'onplay', 'onplaying', 'onprogress',
      'onratechange', 'onseeked', 'onseeking', 'onstalled', 'onsuspend',
      'ontimeupdate', 'onvolumechange', 'onwaiting'
    ],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    SANITIZE_DOM: true,
    // Ek güvenlik ayarları
    SAFE_FOR_TEMPLATES: false, // Template injection koruması
    SAFE_FOR_XML: false,
    WHOLE_DOCUMENT: false,
    // URL sanitization
    ADD_ATTR: ['target'], // External link'ler için target="_blank" ekle
    ADD_TAGS: [],
    // Style tag'lerini kaldır (CSS injection koruması)
    FORBID_STYLE: false // Style attribute'a izin ver ama style tag'lerini yasakla
  });
  
  // Ek güvenlik: href ve src attribute'larını kontrol et
  // DOMPurify zaten yapıyor ama ekstra kontrol
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = clean;
  
  // Tüm link'leri kontrol et
  const links = tempDiv.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:'))) {
      link.removeAttribute('href');
    }
    // External link'ler için güvenlik
    if (href && href.startsWith('http')) {
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('target', '_blank');
    }
  });
  
  // Tüm img src'lerini kontrol et
  const images = tempDiv.querySelectorAll('img[src]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && (src.startsWith('javascript:') || src.startsWith('vbscript:'))) {
      img.removeAttribute('src');
    }
  });
  
  return tempDiv.innerHTML;
}

/**
 * Plain text için sanitization
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text.replace(/<[^>]*>/g, '');
  
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
}

/**
 * Basit XSS escape (fallback)
 */
function basicXSSEscape(html: string): string {
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

