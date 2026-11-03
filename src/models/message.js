const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // The accepted ConnectionRequest that unlocks this conversation.
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectionRequest",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// The conversation timeline is read newest-first, with _id as a stable
// tiebreaker for messages created in the same millisecond.
messageSchema.index({ connectionId: 1, createdAt: -1, _id: -1 });

// Unread counts and "mark as read" filter by conversation, sender and readAt.
messageSchema.index({ connectionId: 1, senderId: 1, readAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
