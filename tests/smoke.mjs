// Smoke tests for a running API instance. Read-only: every write path is
// exercised with invalid input, so no users/requests/messages are created.
// Usage: npm run test:smoke   (BASE=https://... to target another server)
const BASE = process.env.BASE || "http://localhost:3000";
const ORIGIN = "https://codemates-connect.vercel.app";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

async function waitUp() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

async function req(path, init = {}) {
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

const jsonPost = (obj) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: ORIGIN },
  body: JSON.stringify(obj),
});

const oid = "507f1f77bcf86cd799439011";

await waitUp();

// --- health / routing -------------------------------------------------------
let r = await req("/");
check("GET / returns 200 text", r.status === 200 && r.body.includes("running"));
check("x-powered-by is disabled", !r.headers.get("x-powered-by"));

r = await req("/definitely-not-a-route");
check(
  "unknown route -> 404 JSON",
  r.status === 404 && r.body.message === "Route not found."
);

// --- unauthenticated access -------------------------------------------------
for (const [name, path, init] of [
  ["profile view", "/profile/view", {}],
  ["feed", "/feed", {}],
  ["received requests", "/user/requests/received", {}],
  ["connections", "/user/connection", {}],
  ["unread count", "/user/messages", {}],
  ["thread", `/user/messages/${oid}`, {}],
  ["send request", `/request/send/interested/${oid}`, { method: "POST" }],
  ["review request", `/request/review/accepted/${oid}`, { method: "POST" }],
  ["profile edit", "/profile/edit", { method: "PATCH", body: "{}", headers: { "Content-Type": "application/json" } }],
]) {
  r = await req(path, { ...init, headers: { ...(init.headers || {}), Origin: ORIGIN } });
  check(`${name} without cookie -> 401`, r.status === 401, `${r.status}`);
}

// --- login / signup validation ---------------------------------------------
r = await req("/login", jsonPost({}));
check("login without body -> 400", r.status === 400 && r.body.message);

r = await req("/login", jsonPost({ emailId: "nobody-here-xyz@example.com", password: "irrelevant123" }));
check(
  "login unknown email -> 401 generic message",
  r.status === 401 && r.body.message === "Invalid email or password."
);

r = await req("/signup", jsonPost({ firstName: "Test", lastName: "User", emailId: "not-an-email", password: "password123" }));
check("signup invalid email -> 400 message", r.status === 400 && !!r.body.message, JSON.stringify(r.body));

r = await req("/signup", jsonPost({ firstName: "T", lastName: "User", emailId: "t@example.com", password: "password123" }));
check("signup short first name -> 400", r.status === 400 && /First name/.test(r.body.message), JSON.stringify(r.body));

r = await req("/signup", jsonPost({ firstName: "Test", lastName: "", emailId: "t@example.com", password: "password123" }));
check("signup missing last name -> 400", r.status === 400);

r = await req("/signup", jsonPost({ firstName: "Test", lastName: "User", emailId: "t@example.com", password: "x".repeat(73) }));
check("signup 73-char password -> 400 (bcrypt limit)", r.status === 400 && /72/.test(r.body.message), JSON.stringify(r.body));

r = await req("/signup", jsonPost({ firstName: "Test", lastName: "User", emailId: "t@example.com", password: "short" }));
check("signup short password -> 400", r.status === 400 && /8/.test(r.body.message));

r = await req("/signup", jsonPost({ firstName: "Test", lastName: "User", emailId: "t@example.com", password: { $ne: 1 } }));
check("signup non-string password -> 400", r.status === 400);

// --- error handling ---------------------------------------------------------
r = await req("/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: ORIGIN },
  body: "{bad",
});
check(
  "malformed JSON -> 400 generic message",
  r.status === 400 && r.body.message === "Request body must be valid JSON.",
  JSON.stringify(r.body)
);

// --- CORS -------------------------------------------------------------------
r = await req("/login", {
  method: "OPTIONS",
  headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
});
check(
  "preflight vercel origin -> 204 + credentials",
  r.status === 204 &&
    r.headers.get("access-control-allow-origin") === ORIGIN &&
    r.headers.get("access-control-allow-credentials") === "true",
  `${r.status} allow-origin=${r.headers.get("access-control-allow-origin")}`
);
check(
  "preflight advertises PATCH/DELETE",
  /PATCH/.test(r.headers.get("access-control-allow-methods") || "") &&
    /DELETE/.test(r.headers.get("access-control-allow-methods") || ""),
  r.headers.get("access-control-allow-methods") || "-"
);

r = await req("/login", {
  method: "OPTIONS",
  headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "PATCH" },
});
check("preflight localhost -> 204", r.status === 204);

r = await req("/login", {
  method: "OPTIONS",
  headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
});
check(
  "blocked origin -> 403 (was 500)",
  r.status === 403 && /Origin not allowed/.test(r.body.message || ""),
  `${r.status} ${JSON.stringify(r.body)}`
);

// --- logout -----------------------------------------------------------------
r = await req("/logout", { method: "POST", headers: { Origin: ORIGIN } });
check(
  "logout -> 200 and clears cookie",
  r.status === 200 && /token=;/.test(r.headers.get("set-cookie") || ""),
  r.headers.get("set-cookie") || "no set-cookie"
);

// --- summary ----------------------------------------------------------------
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join(" | "));
  process.exitCode = 1;
}
