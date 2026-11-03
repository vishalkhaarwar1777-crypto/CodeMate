const express = require("express");
const mongoose = require("mongoose");
const messageRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const Message = require("../models/message");
const ConnectionRequest = require("../models/connectionRequest");

const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1000;

/**
 * Conversations are addressed by the other developer's id, which is what the
 * UI already holds. A thread only exists once a request between the two users
 * was accepted, so every message route proves that first.
 */
async function findAcceptedConnection(otherUserId, userId) {
  if (!mongoose.Types.ObjectId.isValid(otherUserId)) return null;
  if (otherUserId === userId.toString()) return null;

  return ConnectionRequest.findOne({
    status: "accepted",
    $or: [
      { fromUserId: userId, toUserId: otherUserId },
      { fromUserId: otherUserId, toUserId: userId },
    ],
  });
}

function parsePaging(query) {
  const page = Math.min(
    MAX_PAGE,
    Math.max(1, parseInt(query.page, 10) || 1)
  );
  const requestedLimit = parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit));

  return { page, limit };
}

// GET /user/messages/:userId?page=1&limit=30
// Returns the newest page oldest-first. Later pages contain older messages, so
// the client must prepend them above the messages it already has.
messageRouter.get("/user/messages/:userId", userAuth, async (req, res, next) => {
  try {
    const connection = await findAcceptedConnection(
      req.params.userId,
      req.user._id
    );

    if (!connection) {
      return res.status(404).json({
        message: "Conversation not found. You can only message your connections.",
      });
    }

    const { page, limit } = parsePaging(req.query);

    const rows = await Message.find({ connectionId: connection._id })
      .select("-__v")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).reverse();

    res.json({ data, page, limit, hasMore });
  } catch (err) {
    next(err);
  }
});

// POST /user/messages/:userId  { text }
messageRouter.post("/user/messages/:userId", userAuth, async (req, res, next) => {
  try {
    const connection = await findAcceptedConnection(
      req.params.userId,
      req.user._id
    );

    if (!connection) {
      return res.status(404).json({
        message: "Conversation not found. You can only message your connections.",
      });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      return res.status(400).json({ message: "Message text is required." });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Messages cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const message = await Message.create({
      connectionId: connection._id,
      senderId: req.user._id,
      text,
    });

    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
});

// POST /user/messages/:userId/read
// Marks everything the other developer sent as read.
messageRouter.post(
  "/user/messages/:userId/read",
  userAuth,
  async (req, res, next) => {
    try {
      const connection = await findAcceptedConnection(
        req.params.userId,
        req.user._id
      );

      if (!connection) {
        return res.status(404).json({
          message: "Conversation not found. You can only message your connections.",
        });
      }

      const result = await Message.updateMany(
        {
          connectionId: connection._id,
          senderId: { $ne: req.user._id },
          readAt: null,
        },
        { readAt: new Date() }
      );

      res.json({ updated: result.modifiedCount ?? 0 });
    } catch (err) {
      next(err);
    }
  }
);

// GET /user/messages -> total unread messages across every conversation.
messageRouter.get("/user/messages", userAuth, async (req, res, next) => {
  try {
    const connectionIds = (
      await ConnectionRequest.find({
        status: "accepted",
        $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }],
      }).select("_id")
    ).map((row) => row._id);

    const counts = await Message.aggregate([
      {
        $match: {
          connectionId: { $in: connectionIds },
          senderId: { $ne: req.user._id },
          readAt: null,
        },
      },
      { $group: { _id: "$connectionId", count: { $sum: 1 } } },
    ]);

    const unread = counts.reduce((total, row) => total + row.count, 0);

    res.json({ unread });
  } catch (err) {
    next(err);
  }
});

module.exports = messageRouter;
