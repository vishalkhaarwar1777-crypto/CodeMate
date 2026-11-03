const express = require("express");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const { validateSignupData } = require("../utils/validation");
const User = require("../models/user");
const { setAuthCookie, clearAuthCookie } = require("../utils/cookie");
const { toPublicUser } = require("../utils/publicUser");
const { authLimiter } = require("../middleware/rateLimit");

authRouter.post("/signup", authLimiter, async (req, res, next) => {
  try {
    validateSignupData(req.body);

    const { firstName, lastName } = req.body;
    const emailId = req.body.emailId.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailId,
      password: hashedPassword,
    });

    // The frontend signs in immediately after creating the account, so no
    // cookie is set here.
    res.status(201).json({
      message: "User added successfully",
      user: toPublicUser(user),
    });
  } catch (err) {
    // Duplicate emails become 409 Conflict; validation errors become 400.
    next(err);
  }
});

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    // body-parser leaves req.body undefined when the request has no body (or a
    // non-JSON content type), so never read fields from it directly.
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const emailId =
      typeof body.emailId === "string"
        ? body.emailId.trim().toLowerCase()
        : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!emailId || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    // `password` is select:false on the schema, so opt back in for the
    // comparison only.
    const user = await User.findOne({ emailId }).select("+password");

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
    return next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  clearAuthCookie(res, req);

  res.json({
    message: "Logout successful",
  });
});

module.exports = authRouter;
