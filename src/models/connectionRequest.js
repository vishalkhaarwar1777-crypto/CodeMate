const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`,
      },
    },
    // Canonical "smallerId:largerId" key. A unique index on this field makes
    // duplicate requests impossible even when two requests race, regardless of
    // which direction they were sent in.
    pairKey: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Duplicate-request lookup checks both directions, and the received/review
// queries filter by recipient + status. These indexes keep all three cheap.
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });
connectionRequestSchema.index({ toUserId: 1, status: 1 });
connectionRequestSchema.index({ fromUserId: 1, status: 1 });
connectionRequestSchema.index({ pairKey: 1 }, { unique: true, sparse: true });

// Compute the pair key before validation so it is present on every save.
// Sparse keeps the index usable while older documents are backfilled.
connectionRequestSchema.pre("validate", function () {
  if (!this.fromUserId || !this.toUserId) return;

  const ids = [this.fromUserId.toString(), this.toUserId.toString()].sort();
  this.pairKey = ids.join(":");
});

// pairKey is an internal implementation detail.
connectionRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.pairKey;
    return ret;
  },
});

// A user cannot send a request to themselves. This is a second line of
// defence: the route also rejects it before touching the database.
connectionRequestSchema.pre("save", function () {
  if (this.fromUserId.equals(this.toUserId)) {
    const error = new Error(
      "You cannot send a connection request to yourself."
    );
    error.status = 400;
    throw error;
  }
});

const ConnectionRequestModel = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema
);

module.exports = ConnectionRequestModel;
