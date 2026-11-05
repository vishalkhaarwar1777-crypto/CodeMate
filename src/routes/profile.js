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

    if (Object.keys(updates).length === 0) {
      throw createHttpError(400, "No profile changes were provided.");
    }

    // Load the current document, apply only the allow-listed fields, and save.
    // `validateModifiedOnly` is important for accounts created by older
    // versions of the app: Mongoose would otherwise re-validate every field on
    // the document and an unrelated legacy value could block this edit.
    // It also means the password hash never has to be loaded for this route.
    const user = await User.findById(req.user._id);

    if (!user) {
      throw createHttpError(
        401,
        "Session is no longer valid. Please login again."
      );
    }

    Object.assign(user, updates);
    await user.save({ validateModifiedOnly: true });

    res.json({
      message: "Profile updated successfully!",
      data: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = profileRouter;
