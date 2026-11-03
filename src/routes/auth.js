const express = require("express");
const authRouter = express.Router();
const { validateSignupData } = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { setAuthCookie, clearAuthCookie } = require("../utils/cookie");
const { toPublicUser } = require("../utils/publicUser");

authRouter.post("/signup", async (req, res) => {
  try {
    validateSignupData(req);

    const { firstName, lastName, emailId, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      message: "User added successfully",
      user: toPublicUser(user),
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const emailId =
      typeof req.body.emailId === "string"
        ? req.body.emailId.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!emailId || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ emailId });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await user.isvalidPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = await user.getJWT();

    setAuthCookie(res, req, token);

    return res.json({
      message: "Login successful",
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    return res
      .status(500)
      .json({ message: "Could not sign you in. Please try again." });
  }
});

authRouter.post("/logout", (req, res) => {
  clearAuthCookie(res, req);

  res.json({
    message: "Logout successful",
  });
});

module.exports = authRouter;
