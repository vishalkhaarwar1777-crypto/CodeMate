
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ],
  credentials: true,
}));

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

connectDB()
  .then(() => {
    console.log("Database connection is established...");

    app.listen(process.env.PORT || 3000, () => {
      console.log("Server is successfully listening");
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected:", err);
  });
