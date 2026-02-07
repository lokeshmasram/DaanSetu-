const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiting for OTP requests (5 requests per 15 minutes per IP)
const otpRateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 15 * 60, // per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after limit
});

// Rate limiting for password reset attempts (5 attempts per hour per IP)
const passwordResetLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 60, // per hour
  blockDuration: 60 * 60, // Block for 1 hour after limit
});

// Middleware for rate limiting
const rateLimit = (limiter) => {
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
      await limiter.consume(ip);
      next();
    } catch (error) {
      const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        message: `Too many requests, please try again after ${retryAfter} seconds`,
        retryAfter
      });
    }
  };
};

module.exports = {
  otpRateLimiter: rateLimit(otpRateLimiter),
  passwordResetLimiter: rateLimit(passwordResetLimiter),
};
