const dns = require("dns");
const mongoose = require("mongoose");

// Optional override for networks where the system resolver cannot resolve
// MongoDB Atlas SRV records. Leave DNS_SERVERS unset to use system DNS.
const applyDnsServers = () => {
  const servers = (process.env.DNS_SERVERS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }
};

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  applyDnsServers();

  // Useful in Render logs when Atlas briefly drops the connection.
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
  });

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
};

module.exports = connectDB;
