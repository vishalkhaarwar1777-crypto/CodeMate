const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 50,
    },

    lastName: {
      type: String,
    },

    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address: " + value);
        }
      },
    },

    age: {
      type: Number,
      min: 18,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    password: {
      type: String,
      required: true,
    },

    about: {
      type: String,
      default: "Hey! I am here to use DevTinder.",
    },

    profilePhoto: {
      type: String,
      default: "https://placehold.co/100x100?text=User",
      validate(value) {
        if (value && !validator.isURL(value)) {
          throw new Error("Invalid photo URL: " + value);
        }
      },
    },

    skill: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.getJWT = async function () {
  return jwt.sign(
    { _id: this._id },
    process.env.JWT_SECRET || "dev@Tinder$1777",
    { expiresIn: "1d" }
  );
};

userSchema.methods.isvalidPassword = async function (passwordInputByUser) {
  return bcrypt.compare(passwordInputByUser, this.password);
};

module.exports = mongoose.model("user", userSchema);