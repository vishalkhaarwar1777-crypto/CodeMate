const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const User = require("../models/user");
const { validateEditProfileData } = require("../utils/validation");
const { toPublicUser } = require("../utils/publicUser");
const { createHttpError } = require("../utils/errors");

// View profile
profileRouter.get("/profile/view", userAuth, (req, res) => {
  // Never send the Mongoose document directly: it contains the password hash.
  res.json(toPublicUser(req.user));
});

profileRouter.patch("/profile/edit", userAuth, async (req, res, next) => {
  try {
    // Validates the allow-list and field types, and returns trimmed values.
    const updates = validateEditProfileData(req.body);

    // `password` is select:false on the schema, but Mongoose validates required
    // paths when saving. Re-select it so the update can be saved; it is still
    // never serialised into the response.
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      throw createHttpError(
        401,
        "Session is no longer valid. Please login again."
      );
    }

    Object.assign(user, updates);
    await user.save();

    res.json({
      message: "Profile updated successfully!",
      data: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = profileRouter;
