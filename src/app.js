const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || !process.env[name].trim(),
);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}. ` +
      "Add them to .env locally and to the Render dashboard in production.",
  );
  process.exit(1);
}

const app = express();

// Render terminates HTTPS at its proxy. Trusting it lets Express/`res.cookie`
// know the original request was secure, which is required for Secure cookies.
app.set("trust proxy", 1);

const normalizeOrigin = (value) => value.trim().replace(/\/+$/, "");

// Credentialed CORS must use an explicit allowlist. A wildcard ("*") is
// rejected by browsers when `credentials: true` is used.
const allowedOrigins = [
  "http://localhost:5173",
  "https://codemates-connect.vercel.app",
  ...(process.env.FRONTEND_URL || "").split(","),
]
  .filter(Boolean)
  .map(normalizeOrigin);

const corsOptions = {
  origin(origin, callback) {
    // Health checks, curl, and same-origin requests do not send an Origin
    // header. They are not browser cross-origin requests.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    // Return false instead of an error: the request gets no CORS headers and
    // the browser blocks it, without turning the request into a 500.
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// CORS must run before every route (including the auth routes).
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("CodeMates Backend is running!");
});

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

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = Number(err.status || err.statusCode) || 500;

  if (status >= 500) {
    console.error("Unhandled API error:", err.message);
  }

  res.status(status).json({
    message:
      status >= 500
        ? "Something went wrong on the server."
        : "Invalid request body.",
  });
});

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
