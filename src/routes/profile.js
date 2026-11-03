const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const { validateEditprofileData } = require("../utils/validation");
const { toPublicUser } = require("../utils/publicUser");

// View profile
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    // Never send the Mongoose document directly: it contains the password hash.
    res.json(toPublicUser(req.user));
  } catch (err) {
    res.status(400).json({ message: "Could not load your profile." });
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditprofileData(req)) {
      return res.status(400).json({ message: "Invalid edit request!" });
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => {
      loggedInUser[key] = req.body[key];
    });

    await loggedInUser.save();

    res.json({
      message: "Profile updated successfully!",
      data: toPublicUser(loggedInUser),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = profileRouter;
