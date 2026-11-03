const assert = require("assert");
const mongoose = require("mongoose");
const { validateSignupData, validateEditProfileData } = require("../src/utils/validation");
const { toHttpError, HttpError } = require("../src/utils/errors");
const { toPublicUser } = require("../src/utils/publicUser");
const { setAuthCookie, clearAuthCookie } = require("../src/utils/cookie");
const User = require("../src/models/user");

let passed = 0;
const ok = (name, fn) => {
  try {
    fn();
    passed++;
    console.log("PASS  " + name);
  } catch (e) {
    console.log("FAIL  " + name + " — " + e.message);
    process.exitCode = 1;
  }
};

// --- signup validation ------------------------------------------------------
const goodSignup = { firstName: "Vishal", lastName: "Kharwar", emailId: "a@b.com", password: "password123" };

ok("signup: valid payload accepted", () => {
  assert.doesNotThrow(() => validateSignupData(goodSignup));
});

ok("signup: missing fields rejected", () => {
  assert.throws(() => validateSignupData({}), /required/);
});

ok("signup: whitespace-only name rejected", () => {
  assert.throws(() => validateSignupData({ ...goodSignup, firstName: "   " }), /First name/);
});

ok("signup: 73-char password rejected", () => {
  assert.throws(() => validateSignupData({ ...goodSignup, password: "x".repeat(73) }), /72/);
});

ok("signup: object password rejected", () => {
  assert.throws(() => validateSignupData({ ...goodSignup, password: { $ne: 1 } }), /at least 8/);
});

// --- profile edit validation ------------------------------------------------
ok("profile: trims strings and skips unknown fields", () => {
  const out = validateEditProfileData({
    firstName: "  Vishal ",
    about: "  hello  ",
    skill: [" React ", "React", "Node"],
  });
  assert.strictEqual(out.firstName, "Vishal");
  assert.strictEqual(out.about, "hello");
  assert.deepStrictEqual(out.skill, ["React", "Node"]);
});

ok("profile: empty body rejected", () => {
  assert.throws(() => validateEditProfileData({}), /No profile fields/);
});

ok("profile: email is not editable", () => {
  assert.throws(() => validateEditProfileData({ emailId: "x@y.com" }), /cannot be edited/);
});

ok("profile: password is not editable", () => {
  assert.throws(() => validateEditProfileData({ password: "hacked123" }), /cannot be edited/);
});

ok("profile: age 17 rejected", () => {
  assert.throws(() => validateEditProfileData({ age: 17 }), /18 and 120/);
});

ok("profile: age as numeric string accepted", () => {
  assert.strictEqual(validateEditProfileData({ age: "24" }).age, 24);
});

ok("profile: unknown gender rejected", () => {
  assert.throws(() => validateEditProfileData({ gender: "robot" }), /male, female, other/);
});

ok("profile: javascript: photo URL rejected", () => {
  assert.throws(() => validateEditProfileData({ profilePhoto: "javascript:alert(1)" }), /valid photo URL/);
});

ok("profile: empty photo allowed (clears it)", () => {
  assert.strictEqual(validateEditProfileData({ profilePhoto: "" }).profilePhoto, "");
});

ok("profile: non-array skills rejected", () => {
  assert.throws(() => validateEditProfileData({ skill: "React" }), /list of strings/);
});

// --- error mapping ----------------------------------------------------------
ok("errors: HttpError keeps status and message", () => {
  const e = toHttpError(new HttpError(403, "nope"));
  assert.strictEqual(e.status, 403);
  assert.strictEqual(e.message, "nope");
});

ok("errors: duplicate email -> 409 friendly message", () => {
  const e = toHttpError({ code: 11000, keyPattern: { emailId: 1 } });
  assert.strictEqual(e.status, 409);
  assert.ok(/already exists/.test(e.message));
  assert.ok(!/E11000/.test(e.message));
});

ok("errors: Mongoose ValidationError -> 400", () => {
  const e = toHttpError({ name: "ValidationError", errors: { age: { message: "Age low" } } });
  assert.strictEqual(e.status, 400);
  assert.strictEqual(e.message, "Age low");
});

ok("errors: CastError -> 400", () => {
  const e = toHttpError({ name: "CastError", path: "_id" });
  assert.strictEqual(e.status, 400);
  assert.ok(/Invalid value/.test(e.message));
});

ok("errors: unknown error -> 500 generic, no leak", () => {
  const e = toHttpError(new Error("connection string mongodb://secret"));
  assert.strictEqual(e.status, 500);
  assert.strictEqual(e.message, "Something went wrong on the server.");
});

ok("errors: status 503 preserved without leaking message", () => {
  const e = toHttpError({ status: 503, message: "Atlas connection pool secret" });
  assert.strictEqual(e.status, 503);
  assert.ok(!/secret/.test(e.message));
});

// --- public user ------------------------------------------------------------
ok("publicUser: password hash never serialised", () => {
  const pub = toPublicUser({
    _id: new mongoose.Types.ObjectId(),
    firstName: "A",
    lastName: "B",
    emailId: "a@b.com",
    password: "$2b$10$hash",
    skill: ["Node"],
  });
  assert.ok(!("password" in pub));
  assert.deepStrictEqual(pub.skill, ["Node"]);
});

ok("user schema: password is select:false", () => {
  assert.strictEqual(User.schema.path("password").options.select, false);
});

ok("user schema: toJSON strips password", () => {
  const json = User.hydrate({
    _id: new mongoose.Types.ObjectId(),
    firstName: "Test",
    emailId: "t@example.com",
    password: "$2b$10$hash",
  }).toJSON();
  assert.ok(!("password" in json));
});

// --- cookies ----------------------------------------------------------------
const fakeRes = (bucket) => ({
  cookie: (name, value, options) => bucket.push({ name, value, options }),
  clearCookie: (name, options) => bucket.push({ name, value: null, options }),
});

ok("cookie: local HTTP uses lax and not secure", () => {
  const bucket = [];
  process.env.NODE_ENV = "development";
  delete process.env.RENDER;
  setAuthCookie(fakeRes(bucket), { headers: {}, secure: false }, "tok");
  assert.strictEqual(bucket[0].options.sameSite, "lax");
  assert.strictEqual(bucket[0].options.secure, false);
  assert.strictEqual(bucket[0].options.httpOnly, true);
  assert.strictEqual(bucket[0].options.maxAge, 24 * 60 * 60 * 1000);
});

ok("cookie: production uses none + secure", () => {
  const bucket = [];
  process.env.NODE_ENV = "production";
  setAuthCookie(fakeRes(bucket), { headers: {}, secure: true }, "tok");
  assert.strictEqual(bucket[0].options.sameSite, "none");
  assert.strictEqual(bucket[0].options.secure, true);
});

ok("cookie: clearing matches creation attributes", () => {
  const bucket = [];
  process.env.NODE_ENV = "production";
  clearAuthCookie(fakeRes(bucket), { headers: {}, secure: true });
  assert.strictEqual(bucket[0].options.sameSite, "none");
  assert.strictEqual(bucket[0].options.secure, true);
});

// --- JWT --------------------------------------------------------------------
process.env.JWT_SECRET = "unit-test-secret";

(async () => {
  try {
    const doc = User.hydrate({ _id: new mongoose.Types.ObjectId(), firstName: "Test" });
    const token = await doc.getJWT();
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);

    assert.strictEqual(decoded._id, doc._id.toString());
    console.log("PASS  jwt: sign + verify round trip");
    passed++;
  } catch (e) {
    console.log("FAIL  jwt: sign + verify round trip — " + e.message);
    process.exitCode = 1;
  }

  console.log(`\n${passed} unit checks passed`);
})();

