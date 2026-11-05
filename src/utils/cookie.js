const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Render terminates HTTPS at its proxy, so `req.secure` is only correct when
 * `trust proxy` is enabled in app.js. If NODE_ENV is production, we also force
 * the production cookie settings.
 */
const isHttpsRequest = (req) => {
  if (!req) return false;

  const forwardedProto = req.headers?.["x-forwarded-proto"];

  return (
    Boolean(req.secure) ||
    (typeof forwardedProto === "string" &&
      forwardedProto.split(",")[0].trim() === "https")
  );
};

const getCookieOptions = (req, { withMaxAge = false } = {}) => {
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

  // The frontend (vercel.app) and API (onrender.com) are different sites.
  // Browsers only send a cookie on a cross-site request when it is
  // SameSite=None and Secure. Local HTTP development keeps Lax.
  const useCrossSiteCookie = isProduction || isHttpsRequest(req);

  const options = {
    httpOnly: true,
    secure: useCrossSiteCookie,
    sameSite: useCrossSiteCookie ? "none" : "lax",
    path: "/",
  };

  // Chrome's third-party cookie restrictions can block a cross-site cookie
  // even when SameSite=None. A partitioned cookie (CHIPS) is stored per
  // top-level site and is the supported way to keep this API's cookie working
  // from the Vercel frontend. Browsers that do not support it ignore the flag.
  if (useCrossSiteCookie) options.partitioned = true;

  if (withMaxAge) options.maxAge = ONE_DAY_MS;

  return options;
};

const setAuthCookie = (res, req, token) => {
  res.cookie("token", token, getCookieOptions(req, { withMaxAge: true }));
};

const clearAuthCookie = (res, req) => {
  // Use the same attributes as when the cookie was created, otherwise the
  // browser keeps the old cookie even though the server sent a clear command.
  res.clearCookie("token", getCookieOptions(req));
};

module.exports = { setAuthCookie, clearAuthCookie };
