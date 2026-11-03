const express = require("express");
const mongoose = require("mongoose");
const connectionRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const { createHttpError } = require("../utils/errors");

// Statuses the sender is allowed to choose when creating a request.
const SEND_STATUSES = ["ignored", "interested"];
// Statuses the recipient is allowed to choose when reviewing a request.
const REVIEW_STATUSES = ["accepted", "rejected"];

connectionRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res, next) => {
    try {
      const fromUserId = req.user._id;
      const { status, toUserId } = req.params;

      if (!SEND_STATUSES.includes(status)) {
        throw createHttpError(
          400,
          `Status must be one of: ${SEND_STATUSES.join(", ")}.`
        );
      }

      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        throw createHttpError(400, "Invalid user id.");
      }

      if (fromUserId.equals(toUserId)) {
        throw createHttpError(
          400,
          "You cannot send a connection request to yourself."
        );
      }

      const toUser = await User.findById(toUserId).select("firstName");

      if (!toUser) {
        throw createHttpError(404, "User not found.");
      }

      // One request per pair, in either direction, so two people cannot
      // create duplicate/opposite requests.
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      }).select("_id status");

      if (existingConnectionRequest) {
        throw createHttpError(
          409,
          "A connection request already exists between you and this developer."
        );
      }

      const data = await ConnectionRequest.create({
        fromUserId,
        toUserId,
        status,
      });

      return res.status(201).json({
        message: `${req.user.firstName} is ${status} in ${toUser.firstName}`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
);

connectionRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res, next) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;

      if (!REVIEW_STATUSES.includes(status)) {
        throw createHttpError(
          400,
          `Status must be one of: ${REVIEW_STATUSES.join(", ")}.`
        );
      }

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw createHttpError(400, "Invalid request id.");
      }

      // Only the recipient of a pending request may review it.
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });

      if (!connectionRequest) {
        throw createHttpError(404, "Connection request not found.");
      }

      connectionRequest.status = status;
      const data = await connectionRequest.save();

      return res.json({
        message: `Connection request ${status}.`,
        data,
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = connectionRouter;
