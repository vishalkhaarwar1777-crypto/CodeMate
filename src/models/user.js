const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
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
      // Never load the hash by default. Login opts back in with
      // .select("+password"), and /profile/edit does too because Mongoose
      // validates required paths when saving a loaded document.
      select: false,
    },

    about: {
      type: String,
      default: "Hey! I am here to use DevTinder.",
      maxlength: 1000,
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
    versionKey: false,
  }
);

// The feed sorts by newest profiles; this index keeps that sort cheap.
userSchema.index({ createdAt: -1, _id: -1 });

// Defence in depth: even if a document is serialised directly, the hash is
// removed. API responses should still go through toPublicUser().
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

userSchema.methods.getJWT = async function () {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ _id: this._id.toString() }, secret, { expiresIn: "1d" });
};

userSchema.methods.isvalidPassword = async function (passwordInputByUser) {
  return bcrypt.compare(passwordInputByUser, this.password);
};

module.exports = mongoose.model("user", userSchema);
