const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/database");
const { createHttpError, toHttpError } = require("./utils/errors");
require("dotenv").config({ quiet: true });

// Check required environment variables
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];

const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Normalize frontend URLs
const normalizeOrigin = (value) => value.trim().replace(/\/+$/, "");

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://codemates-connect.vercel.app",
  ...(process.env.FRONTEND_URL || "").split(","),
]
  .filter(Boolean)
  .map(normalizeOrigin);

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      // Reject with a client error (403) instead of a generic 500.
      return callback(createHttpError(403, "Origin not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Middlewares
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Backend health check
app.get("/", (req, res) => {
  res.send("CodeMates Backend is running!");
});

// Routes
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const connectionRouter = require("./routes/request");
const userRouter = require("./routes/user");
const messageRouter = require("./routes/message");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", connectionRouter);
app.use("/", messageRouter);
app.use("/", userRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const error = toHttpError(err);

  if (error.status >= 500) {
    // Log the original error (with stack) for Render logs, but never send it.
    console.error("API error:", err);
  }

  res.status(error.status).json({ message: error.message });
});

const startServer = () => {
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log("Server is successfully listening");
  });

  // Render sends SIGTERM on redeploy. Close connections instead of being
  // killed mid-request.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);

    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(0));
    });

    // Do not hang forever if a connection refuses to close.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  return server;
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Connect database and start server
connectDB()
  .then(() => {
    console.log("Database connection is established...");
    startServer();
  })
  .catch((err) => {
    console.error("Database cannot be connected:", err.message);
    process.exit(1);
  });
