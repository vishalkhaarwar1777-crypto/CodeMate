const validator = require("validator");
const { createHttpError } = require("./errors");

const FIRST_NAME_MIN = 4;
const FIRST_NAME_MAX = 50;
const LAST_NAME_MAX = 50;
const EMAIL_MAX = 254;
// bcrypt only uses the first 72 bytes of a password, so a longer password
// would silently be truncated (and a shorter one would still match).
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const ABOUT_MAX = 1000;
const PHOTO_URL_MAX = 2048;
const MAX_SKILLS = 20;
const SKILL_MAX = 50;

// Keep this list in sync with the fields the UI can edit. Everything else
// (email, password, timestamps) must go through a dedicated flow.
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "age",
  "gender",
  "about",
  "profilePhoto",
  "skill",
];

const GENDERS = ["male", "female", "other"];

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Validate the signup payload. Throws HttpError(400) with a user-facing
 * message so the shared error handler can respond consistently.
 */
const validateSignupData = (body = {}) => {
  const firstName = asTrimmedString(body.firstName);
  const lastName = asTrimmedString(body.lastName);
  const emailId = asTrimmedString(body.emailId);
  const { password } = body;

  if (!firstName || !lastName) {
    throw createHttpError(400, "First name and last name are required.");
  }

  if (firstName.length < FIRST_NAME_MIN || firstName.length > FIRST_NAME_MAX) {
    throw createHttpError(
      400,
      `First name must be between ${FIRST_NAME_MIN} and ${FIRST_NAME_MAX} characters.`
    );
  }

  if (lastName.length > LAST_NAME_MAX) {
    throw createHttpError(
      400,
      `Last name cannot be longer than ${LAST_NAME_MAX} characters.`
    );
  }

  if (!validator.isEmail(emailId)) {
    throw createHttpError(400, "Enter a valid email address.");
  }

  if (emailId.length > EMAIL_MAX) {
    throw createHttpError(400, "Email address is too long.");
  }

  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    throw createHttpError(
      400,
      `Password must be at least ${PASSWORD_MIN} characters long.`
    );
  }

  if (password.length > PASSWORD_MAX) {
    throw createHttpError(
      400,
      `Password cannot be longer than ${PASSWORD_MAX} characters.`
    );
  }
};

/**
 * Validate a profile edit and return a normalised copy of the allowed fields.
 * The returned object is what gets assigned to the user document, so values
 * are trimmed once here instead of being trusted from the request body.
 */
const validateEditProfileData = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "Request body must be a JSON object.");
  }

  const fields = Object.keys(body);

  if (fields.length === 0) {
    throw createHttpError(400, "No profile fields were provided.");
  }

  const unknownFields = fields.filter(
    (field) => !EDITABLE_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    throw createHttpError(
      400,
      `These fields cannot be edited: ${unknownFields.join(", ")}.`
    );
  }

  const updates = {};

  if ("firstName" in body) {
    const firstName = asTrimmedString(body.firstName);

    if (firstName.length < FIRST_NAME_MIN || firstName.length > FIRST_NAME_MAX) {
      throw createHttpError(
        400,
        `First name must be between ${FIRST_NAME_MIN} and ${FIRST_NAME_MAX} characters.`
      );
    }

    updates.firstName = firstName;
  }

  if ("lastName" in body) {
    if (typeof body.lastName !== "string") {
      throw createHttpError(400, "Last name must be text.");
    }

    const lastName = body.lastName.trim();

    if (lastName.length > LAST_NAME_MAX) {
      throw createHttpError(
        400,
        `Last name cannot be longer than ${LAST_NAME_MAX} characters.`
      );
    }

    updates.lastName = lastName;
  }

  if ("age" in body) {
    const age = Number(body.age);

    if (!Number.isInteger(age) || age < 18 || age > 120) {
      throw createHttpError(400, "Age must be a whole number between 18 and 120.");
    }

    updates.age = age;
  }

  if ("gender" in body) {
    if (!GENDERS.includes(body.gender)) {
      throw createHttpError(
        400,
        `Gender must be one of: ${GENDERS.join(", ")}.`
      );
    }

    updates.gender = body.gender;
  }

  if ("about" in body) {
    if (typeof body.about !== "string") {
      throw createHttpError(400, "About must be text.");
    }

    const about = body.about.trim();

    if (about.length > ABOUT_MAX) {
      throw createHttpError(
        400,
        `About cannot be longer than ${ABOUT_MAX} characters.`
      );
    }

    updates.about = about;
  }

  if ("profilePhoto" in body) {
    if (typeof body.profilePhoto !== "string") {
      throw createHttpError(400, "Profile photo must be a URL.");
    }

    const profilePhoto = body.profilePhoto.trim();

    if (profilePhoto.length > PHOTO_URL_MAX) {
      throw createHttpError(400, "Profile photo URL is too long.");
    }

    if (profilePhoto && !validator.isURL(profilePhoto)) {
      throw createHttpError(400, "Enter a valid photo URL.");
    }

    updates.profilePhoto = profilePhoto;
  }

  if ("skill" in body) {
    if (!Array.isArray(body.skill)) {
      throw createHttpError(400, "Skills must be a list of strings.");
    }

    if (body.skill.length > MAX_SKILLS) {
      throw createHttpError(400, `Add at most ${MAX_SKILLS} skills.`);
    }

    const skills = body.skill.map((item) => {
      if (typeof item !== "string") {
        throw createHttpError(400, "Skills must be a list of strings.");
      }

      const skill = item.trim();

      if (!skill) {
        throw createHttpError(400, "Skills cannot be empty.");
      }

      if (skill.length > SKILL_MAX) {
        throw createHttpError(
          400,
          `Each skill must be at most ${SKILL_MAX} characters.`
        );
      }

      return skill;
    });

    updates.skill = [...new Set(skills)];
  }

  return updates;
};

module.exports = { validateSignupData, validateEditProfileData };
