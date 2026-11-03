const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];

const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || !process.env[name].trim()
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}.`
  );
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);

// Allowed frontend origins
const normalizeOrigin = (value) => value.trim().replace(/\/+$/, "");

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

      console.error("Blocked CORS origin:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Middlewares
app.use(express.json());
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

  const status = Number(err.status || err.statusCode) || 500;

  if (status >= 500) {
    console.error("API error:", err.message);
  }

  res.status(status).json({
    message:
      status >= 500
        ? "Something went wrong on the server."
        : err.message || "Invalid request.",
  });
});

// Connect database and start server
connectDB()
  .then(() => {
    console.log("Database connection is established...");

    app.listen(process.env.PORT || 3000, () => {
      console.log("Server is successfully listening");
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected:", err.message);
    process.exit(1);
  });