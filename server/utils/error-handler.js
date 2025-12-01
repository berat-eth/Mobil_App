/**
 * Error Handler Utility
 * Production'da hassas bilgileri gizler, development'ta detaylı bilgi verir
 */

/**
 * Güvenli error response oluştur
 * Production'da stack trace ve detaylı error mesajlarını gizler
 */
function createSafeErrorResponse(error, defaultMessage = 'An error occurred') {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Development'ta detaylı bilgi ver
  if (isDevelopment) {
    return {
      success: false,
      message: error.message || defaultMessage,
      error: error.message,
      stack: error.stack,
      code: error.code,
      type: error.name || 'Error'
    };
  }
  
  // Production'da generic mesaj
  const response = {
    success: false,
    message: defaultMessage
  };
  
  // Sadece güvenli error code'ları ekle
  if (error.code && isSafeErrorCode(error.code)) {
    response.code = error.code;
  }
  
  return response;
}

/**
 * Güvenli error code kontrolü
 * Sadece client'a gösterilmesi güvenli olan error code'ları döndür
 */
function isSafeErrorCode(code) {
  // Database error code'ları güvenli değil
  const unsafeCodes = [
    'ER_', // MySQL errors
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND'
  ];
  
  return !unsafeCodes.some(prefix => code.startsWith(prefix));
}

/**
 * Şifre ve hassas verileri filtrele (loglama için)
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'oldPassword', 'apiKey', 'apiSecret', 'secret', 'token', 'accessToken', 'refreshToken'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Error'u logla (stack trace ile)
 * GÜVENLİK: Production'da bile loglara yazılır ama client'a gönderilmez
 * Stack trace sadece development'ta console'a yazılır
 * Şifre ve hassas veriler otomatik olarak filtrelenir
 */
function logError(error, context = '', req = null) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Error objesini sanitize et
  const errorData = {
    message: error.message,
    code: error.code,
    name: error.name
  };
  
  if (isDevelopment) {
    errorData.stack = error.stack;
  }
  
  // Eğer req varsa ve req.body içeriyorsa, şifreleri filtrele
  if (req && req.body) {
    const sanitizedBody = sanitizeLogData(req.body);
    errorData.requestBody = sanitizedBody;
  }
  
  // GÜVENLİK: Production'da stack trace console'a yazılmaz (log dosyasına yazılabilir)
  console.error(`❌ ${contextStr}Error at ${timestamp}:`, errorData);
  
  // TODO: Error monitoring servisi entegrasyonu (Sentry, etc.)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: { context } });
  // }
}

/**
 * Database error'ları için özel handler
 * Database error mesajları hassas bilgi içerebilir
 */
function handleDatabaseError(error, defaultMessage = 'Database error occurred') {
  logError(error, 'DATABASE');
  
  // Database error mesajlarını asla client'a gönderme
  return createSafeErrorResponse(
    new Error(defaultMessage),
    defaultMessage
  );
}

/**
 * Validation error'ları için handler
 * Validation error'ları client'a gösterilebilir
 */
function handleValidationError(error, defaultMessage = 'Validation error') {
  // Validation error'ları güvenli, client'a gösterilebilir
  return {
    success: false,
    message: error.message || defaultMessage,
    code: 'VALIDATION_ERROR'
  };
}

/**
 * Express error middleware
 * Tüm unhandled error'ları yakalar
 */
function errorMiddleware(error, req, res, next) {
  logError(error, req.path, req);
  
  const response = createSafeErrorResponse(
    error,
    'An unexpected error occurred'
  );
  
  res.status(error.status || 500).json(response);
}

module.exports = {
  createSafeErrorResponse,
  logError,
  handleDatabaseError,
  handleValidationError,
  errorMiddleware,
  isSafeErrorCode,
  sanitizeLogData
};

