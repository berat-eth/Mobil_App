/**
 * Response Sanitizer
 * Hassas verileri (password, token, vb.) response'lardan temizler
 */

/**
 * User object'inden password field'ını kaldır
 */
function sanitizeUser(user) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.hashedPassword;
  
  return sanitized;
}

/**
 * Array of users'dan password field'larını kaldır
 */
function sanitizeUsers(users) {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map(user => sanitizeUser(user));
}

/**
 * Response object'inden hassas field'ları kaldır
 */
function sanitizeResponse(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }

  const sanitized = { ...data };
  
  // Password field'larını kaldır
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.hashedPassword;
  
  // Token field'larını kaldır (eğer user object içindeyse)
  if (sanitized.user) {
    sanitized.user = sanitizeUser(sanitized.user);
  }
  
  // Nested object'leri recursive olarak temizle
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeResponse(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map(item => 
        typeof item === 'object' ? sanitizeResponse(item) : item
      );
    }
  }

  return sanitized;
}

module.exports = {
  sanitizeUser,
  sanitizeUsers,
  sanitizeResponse
};

