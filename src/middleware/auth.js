const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "Please login!" });
  }

  if (!process.env.JWT_SECRET) {
    return res
      .status(500)
      .json({ message: "Server authentication is not configured." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?._id || !mongoose.Types.ObjectId.isValid(decoded._id)) {
      return res
        .status(401)
        .json({ message: "Invalid session. Please login again." });
    }

    const user = await User.findById(decoded._id);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Session is no longer valid. Please login again." });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Your session has expired. Please login again." });
    }

    if (err.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid session. Please login again." });
    }

    // Database/network failures are server errors, not authentication errors.
    return next(err);
  }
};

module.exports = { userAuth };
