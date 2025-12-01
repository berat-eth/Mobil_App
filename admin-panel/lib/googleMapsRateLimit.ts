/**
 * Rate limiting utility for API endpoints
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

/**
 * Default rate limit: 10 requests per 15 minutes
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Check if request is rate limited
 * @param identifier Unique identifier (e.g., IP address)
 * @param config Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore[identifier];

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    };

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: rateLimitStore[identifier].resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 * @param request NextRequest object
 * @returns Client identifier (IP address or fallback)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

