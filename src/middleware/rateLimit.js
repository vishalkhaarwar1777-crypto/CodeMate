const rateLimit = require("express-rate-limit");

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Protect credential endpoints from brute-force attempts. `trust proxy` is set
// in app.js, so req.ip is the client address when deployed behind Render.
const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

module.exports = { authLimiter };
