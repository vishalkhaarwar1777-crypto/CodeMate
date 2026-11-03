/**
 * Convert a Mongoose user document into the only fields the frontend needs.
 * This deliberately omits `password` (the hash), so profile/login responses
 * can never leak it to the browser.
 */
const toPublicUser = (user) => {
  if (!user) return null;

  const value = typeof user.toObject === "function" ? user.toObject() : user;

  return {
    _id: value._id,
    firstName: value.firstName,
    lastName: value.lastName,
    emailId: value.emailId,
    age: value.age,
    gender: value.gender,
    about: value.about,
    profilePhoto: value.profilePhoto,
    skill: Array.isArray(value.skill) ? value.skill : [],
    createdAt: value.createdAt,
  };
};

module.exports = { toPublicUser };
