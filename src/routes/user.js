const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");

// Only public profile fields. Never expose password or emailId in the feed.
const USER_SAFE_DATA =
  "firstName lastName age gender about skill profilePhoto createdAt";

userRouter.get("/user/requests/received", userAuth, async (req, res, next) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .lean();

    res.json({
      message: "Received connection requests",
      data: connectionRequests,
    });
  } catch (err) {
    next(err);
  }
});

userRouter.get("/user/connection", userAuth, async (req, res, next) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA)
      .lean();

    const data = connectionRequests
      .map((row) => {
        if (!row.fromUserId || !row.toUserId) return null;

        if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
          return row.toUserId;
        }

        return row.fromUserId;
      })
      .filter(Boolean);

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.get("/feed", userAuth, async (req, res, next) => {
  try {
    const loggedInUser = req.user;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    // Every request in either direction (sent or received, any status) means
    // the two people already interacted, so hide those profiles.
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    })
      .select("fromUserId toUserId")
      .lean();

    const hiddenUserIds = new Set([loggedInUser._id.toString()]);

    connectionRequests.forEach((row) => {
      if (row.fromUserId) hiddenUserIds.add(row.fromUserId.toString());
      if (row.toUserId) hiddenUserIds.add(row.toUserId.toString());
    });

    const users = await User.find({
      _id: { $nin: Array.from(hiddenUserIds) },
    })
      .select(USER_SAFE_DATA)
      // A stable sort keeps pagination consistent between requests.
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // An empty feed is a valid result: respond with [] and HTTP 200.
    return res.json(users);
  } catch (err) {
    return next(err);
  }
});

module.exports = userRouter;
