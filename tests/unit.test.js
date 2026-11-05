const assert = require("assert");
const mongoose = require("mongoose");
const { validateSignupData, validateEditProfileData } = require("../src/utils/validation");
const { toHttpError, HttpError } = require("../src/utils/errors");
const { toPublicUser } = require("../src/utils/publicUser");
const { setAuthCookie, clearAuthCookie } = require("../src/utils/cookie");
const User = require("../src/models/user");
const ConnectionRequest = require("../src/models/connectionRequest");
const { userAuth } = require("../src/middleware/auth");

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

ok("signup: null body rejected as invalid JSON body", () => {
  assert.throws(() => validateSignupData(null), /JSON object/);
});

ok("signup: password is capped at 72 bytes, not 72 characters", () => {
  // 18 emoji = 72 UTF-8 bytes, 19 emoji = 76 bytes.
  assert.doesNotThrow(() =>
    validateSignupData({ ...goodSignup, password: "😀".repeat(18) })
  );
  assert.throws(
    () => validateSignupData({ ...goodSignup, password: "😀".repeat(19) }),
    /72 bytes/
  );
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

ok("profile: blank optional age/gender are ignored", () => {
  assert.deepStrictEqual(validateEditProfileData({ age: "" }), {});
  assert.deepStrictEqual(validateEditProfileData({ gender: "" }), {});
  assert.deepStrictEqual(validateEditProfileData({ age: null, gender: null }), {});
});

ok("profile: non-string first name rejected", () => {
  assert.throws(() => validateEditProfileData({ firstName: 1234 }), /must be text/);
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

ok("profile: clearing the last name is rejected", () => {
  assert.throws(() => validateEditProfileData({ lastName: "   " }), /Last name is required/);
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

ok("errors: duplicate pairKey -> friendly 409", () => {
  const e = toHttpError({ code: 11000, keyPattern: { pairKey: 1 } });
  assert.strictEqual(e.status, 409);
  assert.ok(/already exists/.test(e.message));
  assert.ok(!/pairKey/.test(e.message));
});

ok("errors: oversized body -> 413", () => {
  const e = toHttpError({ type: "entity.too.large", status: 413 });
  assert.strictEqual(e.status, 413);
  assert.strictEqual(e.message, "Request body is too large.");
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

ok("user schema: lastName is required", () => {
  assert.strictEqual(User.schema.path("lastName").isRequired, true);
});

ok("connection schema: pairKey has a unique sparse index", () => {
  const pairIndex = ConnectionRequest.schema
    .indexes()
    .find(([keys]) => keys.pairKey === 1);

  assert.ok(pairIndex, "pairKey index is missing");
  assert.strictEqual(pairIndex[1].unique, true);
  assert.strictEqual(pairIndex[1].sparse, true);
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
  assert.strictEqual(bucket[0].options.partitioned, undefined);
  assert.strictEqual(bucket[0].options.maxAge, 24 * 60 * 60 * 1000);
});

ok("cookie: production uses none + secure + partitioned", () => {
  const bucket = [];
  process.env.NODE_ENV = "production";
  setAuthCookie(fakeRes(bucket), { headers: {}, secure: true }, "tok");
  assert.strictEqual(bucket[0].options.sameSite, "none");
  assert.strictEqual(bucket[0].options.secure, true);
  assert.strictEqual(bucket[0].options.partitioned, true);
});

ok("cookie: clearing matches creation attributes", () => {
  const bucket = [];
  process.env.NODE_ENV = "production";
  clearAuthCookie(fakeRes(bucket), { headers: {}, secure: true });
  assert.strictEqual(bucket[0].options.sameSite, "none");
  assert.strictEqual(bucket[0].options.secure, true);
  assert.strictEqual(bucket[0].options.partitioned, true);
});

// --- JWT --------------------------------------------------------------------
process.env.JWT_SECRET = "unit-test-secret";
const jwt = require("jsonwebtoken");

const fakeAuthResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const expectUnauthorized = async (token) => {
  const req = { cookies: { token } };
  const res = fakeAuthResponse();
  let nextCalled = false;

  await userAuth(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(nextCalled, false);
};

(async () => {
  try {
    const doc = User.hydrate({ _id: new mongoose.Types.ObjectId(), firstName: "Test" });
    const token = await doc.getJWT();
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    assert.strictEqual(decoded._id, doc._id.toString());
    console.log("PASS  jwt: sign + verify round trip");
    passed++;
  } catch (e) {
    console.log("FAIL  jwt: sign + verify round trip — " + e.message);
    process.exitCode = 1;
  }

  try {
    // A token signed with a different algorithm must not be accepted, even when
    // the signature itself is valid for the configured secret.
    const token = jwt.sign(
      { _id: new mongoose.Types.ObjectId().toString() },
      process.env.JWT_SECRET,
      { algorithm: "HS384", expiresIn: "1h" }
    );
    await expectUnauthorized(token);
    console.log("PASS  jwt: non-HS256 token rejected by middleware");
    passed++;
  } catch (e) {
    console.log("FAIL  jwt: non-HS256 token rejected by middleware — " + e.message);
    process.exitCode = 1;
  }

  try {
    await expectUnauthorized("not-a-jwt");
    console.log("PASS  jwt: malformed token rejected by middleware");
    passed++;
  } catch (e) {
    console.log("FAIL  jwt: malformed token rejected by middleware — " + e.message);
    process.exitCode = 1;
  }

  try {
    const withoutHash = User.hydrate({
      _id: new mongoose.Types.ObjectId(),
      firstName: "Legacy",
    });
    assert.strictEqual(await withoutHash.isvalidPassword("whatever"), false);

    const corruptHash = User.hydrate({
      _id: new mongoose.Types.ObjectId(),
      firstName: "Legacy",
      password: "not-a-bcrypt-hash",
    });
    assert.strictEqual(await corruptHash.isvalidPassword("whatever"), false);

    console.log("PASS  password: missing/corrupt hash returns false (401, not 500)");
    passed++;
  } catch (e) {
    console.log("FAIL  password: missing/corrupt hash returns false — " + e.message);
    process.exitCode = 1;
  }

  try {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const forward = new ConnectionRequest({
      fromUserId: a,
      toUserId: b,
      status: "interested",
    });
    const reverse = new ConnectionRequest({
      fromUserId: b,
      toUserId: a,
      status: "interested",
    });

    await forward.validate();
    await reverse.validate();

    assert.strictEqual(forward.pairKey, reverse.pairKey);
    console.log("PASS  connection pairKey is direction independent");
    passed++;
  } catch (e) {
    console.log("FAIL  connection pairKey is direction independent — " + e.message);
    process.exitCode = 1;
  }

  console.log(`\n${passed} unit checks passed`);
})();

