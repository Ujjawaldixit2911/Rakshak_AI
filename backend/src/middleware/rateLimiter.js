const rateLimit = require('express-rate-limit');

// General API rate limiter: 300 requests per 15 mins
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for Auth (register/login): 20 requests per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many login/registration attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Routing & Geocoding limiter: 60 requests per minute
const routeSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many route search requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Crime reporting limiter: 15 requests per 10 mins
const crimeReportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    error: 'Too many crime report submissions from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// SOS trigger limiter: 10 requests per minute
const sosLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many SOS requests. In an immediate life emergency, call 112 directly.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  routeSearchLimiter,
  crimeReportLimiter,
  sosLimiter
};
