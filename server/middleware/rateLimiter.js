const rateLimit = require("express-rate-limit");

function createRateLimiter() {
  return rateLimit({
    windowMs: 6 * 1000,
    limit: 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });
}

module.exports = { createRateLimiter };

