const validator = require("validator");

const validateSignupData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName?.trim() || !lastName?.trim()) {
    throw new Error("First name and last name are required.");
  }

  if (!validator.isEmail(emailId ?? "")) {
    throw new Error("Enter a valid email address.");
  }

  // Matches what the UI asks for, so a password the form accepts is not
  // rejected here for reasons the user cannot see.
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
};

const validateEditprofileData = (req) => {
  const allowedEditField = [
    "firstName",
    "lastName",
    "age",
    "gender",
    "about",
    "profilePhoto",
    "skill",
  ];

  const fields = Object.keys(req.body);

  return (
    fields.length > 0 &&
    fields.every((field) => allowedEditField.includes(field))
  );
};

module.exports = { validateSignupData, validateEditprofileData };
