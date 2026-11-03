/**
 * Shared error helpers.
 *
 * Routes throw `HttpError` (or pass unexpected errors to `next`), and the
 * central handler in app.js converts them into a status code plus a message
 * that is safe to show to the caller. Anything unrecognised becomes a generic
 * 500 so database/driver details never reach the browser.
 */

class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

const createHttpError = (status, message) => new HttpError(status, message);

/**
 * Convert any thrown value into a status + client-safe message.
 */
const toHttpError = (err) => {
  if (err instanceof HttpError) return err;

  // Unique index violation (for example, signing up with an existing email).
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];

    if (field === "emailId") {
      return new HttpError(
        409,
        "An account with that email already exists. Try logging in instead."
      );
    }

    if (field === "pairKey") {
      return new HttpError(
        409,
        "A connection request already exists between you and this developer."
      );
    }

    return new HttpError(
      409,
      field ? `That ${field} is already in use.` : "That value is already in use."
    );
  }

  if (err?.name === "ValidationError") {
    const firstError = Object.values(err.errors || {})[0];

    return new HttpError(400, firstError?.message || "Invalid request data.");
  }

  if (err?.name === "CastError") {
    return new HttpError(
      400,
      `Invalid value for ${err.path || "request field"}.`
    );
  }

  if (err?.type === "entity.parse.failed") {
    return new HttpError(400, "Request body must be valid JSON.");
  }

  if (err?.type === "entity.too.large") {
    return new HttpError(413, "Request body is too large.");
  }

  const status = Number(err?.status || err?.statusCode);

  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    // Keep a meaningful 4xx message. For 5xx, keep the status (for example a
    // 503 from a dependency) but never forward the original message.
    return new HttpError(
      status,
      status >= 500
        ? "Something went wrong on the server."
        : err.message || "Invalid request.",
      { cause: err }
    );
  }

  return new HttpError(500, "Something went wrong on the server.", {
    cause: err,
  });
};

module.exports = { HttpError, createHttpError, toHttpError };
