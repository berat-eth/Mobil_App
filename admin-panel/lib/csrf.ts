/**
 * CSRF Protection Utility
 * Double-submit cookie pattern kullanarak CSRF koruması sağlar
 */

const CSRF_TOKEN_COOKIE = 'csrf-token'
const CSRF_TOKEN_HEADER = 'X-CSRF-Token'

/**
 * CSRF token oluştur
 */
export function generateCSRFToken(): string {
  // Güvenli random token oluştur
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback: Math.random kullan (production'da crypto API kullanılmalı)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * CSRF token'ı cookie'ye kaydet
 */
export function setCSRFTokenCookie(token: string): void {
  if (typeof document !== 'undefined') {
    // SameSite=Strict ile CSRF koruması
    document.cookie = `${CSRF_TOKEN_COOKIE}=${token}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}; max-age=3600`
  }
}

/**
 * Cookie'den CSRF token'ı oku
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_TOKEN_COOKIE) {
      return value
    }
  }
  return null
}

/**
 * CSRF token'ı header'a ekle
 */
export function getCSRFHeader(): Record<string, string> {
  const token = getCSRFTokenFromCookie()
  if (!token) return {}
  
  return {
    [CSRF_TOKEN_HEADER]: token
  }
}

/**
 * State-changing HTTP method'ları kontrol et
 */
export function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

/**
 * CSRF token doğrulama (server-side)
 */
export function validateCSRFToken(requestToken: string | null, cookieToken: string | null): boolean {
  if (!requestToken || !cookieToken) {
    return false
  }
  
  // Double-submit cookie pattern: Header ve cookie'deki token'lar eşleşmeli
  return requestToken === cookieToken && requestToken.length === 64 // 32 byte = 64 hex char
}

export { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER }

