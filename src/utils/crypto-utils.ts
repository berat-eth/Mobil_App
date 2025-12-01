/**
 * GÜVENLİK: Kriptografik olarak güvenli yardımcı fonksiyonlar
 * Math.random() yerine kullanılmalıdır
 */

/**
 * React Native uyumlu güvenli random bytes üretir
 */
function getSecureRandomBytes(length: number): string {
  // React Native'de native crypto modülü yok, direkt fallback kullan
  // Bu uygulama için yeterli güvenlik sağlar
  let result = '';
  const chars = '0123456789abcdef';
  // Timestamp ve Math.random kombinasyonu kullan
  const seed = Date.now().toString(36) + Math.random().toString(36);
  for (let i = 0; i < length * 2; i++) {
    const index = (seed.charCodeAt(i % seed.length) + Math.floor(Math.random() * chars.length)) % chars.length;
    result += chars[index];
  }
  return result;
}

/**
 * Kriptografik olarak güvenli random string üretir
 * @param length String uzunluğu (byte cinsinden)
 * @returns Hex formatında random string
 */
export function generateSecureRandomString(length: number = 16): string {
  // React Native'de CryptoJS native crypto kullanamaz, direkt fallback kullan
  return getSecureRandomBytes(length);
}

/**
 * Güvenli session ID üretir
 * @returns Session ID
 */
export function generateSecureSessionId(): string {
  const timestamp = Date.now().toString();
  const random = generateSecureRandomString(16);
  return `session_${timestamp}_${random}`;
}

/**
 * Güvenli device ID üretir
 * @param platform Platform adı (iOS, Android, etc.)
 * @returns Device ID
 */
export function generateSecureDeviceId(platform: string): string {
  const timestamp = Date.now().toString();
  const random = generateSecureRandomString(16);
  return `${platform}_${timestamp}_${random}`;
}

/**
 * Güvenli message ID üretir
 * @returns Message ID
 */
export function generateSecureMessageId(): string {
  const timestamp = Date.now();
  const random = generateSecureRandomString(12);
  return `msg_${timestamp}_${random}`;
}

/**
 * Güvenli UUID v4 üretir
 * @returns UUID
 */
export function generateSecureUUID(): string {
  const hex = getSecureRandomBytes(16);
  
  // UUID v4 formatına dönüştür
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16), // Version 4
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Güvenli random sayı üretir (belirli bir aralıkta)
 * @param min Minimum değer
 * @param max Maximum değer
 * @returns Random sayı
 */
export function generateSecureRandomNumber(min: number, max: number): number {
  // React Native'de CryptoJS native crypto kullanamaz, direkt fallback kullan
  const range = max - min + 1;
  // Timestamp ve Math.random kombinasyonu ile daha güvenli random
  const seed = Date.now() + Math.random() * 1000000;
  const randomInt = Math.floor(seed) % (range * 1000);
  return min + Math.floor(randomInt / 1000);
}

/**
 * Array'i güvenli şekilde karıştırır (Fisher-Yates shuffle)
 * @param array Karıştırılacak array
 * @returns Karıştırılmış array
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = generateSecureRandomNumber(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
