const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://vishalkhaarwar1777_db_user:vishalkhaarwar1777@namastenode.62x0ziy.mongodb.net/devTinder?appName=devTinder"
  );
};

module.exports = connectDB;