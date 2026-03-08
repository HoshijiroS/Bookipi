const rateLimit = require("express-rate-limit");

function createRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });
}

module.exports = { createRateLimiter };

