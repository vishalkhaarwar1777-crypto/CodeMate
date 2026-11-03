// One-time migration: populate the connection request `pairKey` used by the
// unique anti-duplicate index. Safe to run more than once.
//
// Usage: npm run db:backfill-pair-key
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const ConnectionRequest = require("../src/models/connectionRequest");
const connectDB = require("../src/config/database");

const buildPairKey = (fromUserId, toUserId) =>
  [fromUserId.toString(), toUserId.toString()].sort().join(":");

const run = async () => {
  await connectDB();

  // Make sure the unique index exists before writing pair keys.
  await ConnectionRequest.init();

  const rows = await ConnectionRequest.find({
    $or: [
      { pairKey: { $exists: false } },
      { pairKey: null },
      { pairKey: "" },
    ],
  }).select("_id fromUserId toUserId");

  let updated = 0;
  const conflicts = [];

  for (const row of rows) {
    const pairKey = buildPairKey(row.fromUserId, row.toUserId);

    try {
      await ConnectionRequest.updateOne(
        { _id: row._id },
        { $set: { pairKey } }
      );
      updated += 1;
    } catch (err) {
      // An existing duplicate pair is the only expected conflict.
      if (err.code === 11000) {
        conflicts.push(row._id.toString());
      } else {
        throw err;
      }
    }
  }

  console.log(`Backfilled ${updated}/${rows.length} connection request(s).`);

  if (conflicts.length > 0) {
    console.warn(
      "Duplicate pairs need manual cleanup (ids):",
      conflicts.join(", ")
    );
    process.exitCode = 1;
  }
};

run()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Closing the connection emits "disconnected"; keep migration output clean.
    mongoose.connection.removeAllListeners();
    return mongoose.connection.close(false);
  });
