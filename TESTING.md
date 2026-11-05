# CodeMates API test plan

Two layers: automated checks that run without touching data, and a manual
checklist for the authenticated flows.

## 1. Automated (run these first)

```bash
npm test          # 38 unit checks: validation, error mapping, cookies, JWT, schemas
npm run test:smoke  # 30 HTTP checks against a running server (read-only)
```

`test:smoke` expects the API on `http://localhost:3000`. Point it elsewhere with:

```powershell
$env:BASE="https://codemate-wn1u.onrender.com"; npm run test:smoke
```

The smoke suite covers: health, security headers, 404, every protected route
without a cookie, login/signup validation failures (including missing and
non-JSON bodies), malformed JSON, CORS preflight for Vercel and localhost,
blocked-origin rejection, and logout cookie clearing. It never creates a user,
request or message.

`cookies.txt` (created by the manual steps below) is gitignored so a token is
never committed by accident.

## 2. Manual: authentication

Use `curl.exe` in PowerShell (not the `curl` alias) so cookies are stored.

### Signup

```powershell
curl.exe -i -X POST http://localhost:3000/signup `
  -H "Content-Type: application/json" `
  -d '{\"firstName\":\"Test\",\"lastName\":\"User\",\"emailId\":\"test@example.com\",\"password\":\"password123\"}'
```

- [ ] `201` and `{ "message", "user" }`, with no `password` key
- [ ] Repeating the same email returns `409` with "already exists"
- [ ] Password under 8 characters returns `400`
- [ ] Password over 72 bytes returns `400` (bcrypt truncates at 72 bytes)
- [ ] `emailId` sent as an object/array returns `400` (never a Mongo operator)

### Login

```powershell
curl.exe -i -c cookies.txt -X POST http://localhost:3000/login `
  -H "Content-Type: application/json" `
  -d '{\"emailId\":\"test@example.com\",\"password\":\"password123\"}'
```

- [ ] `200` and `user` without `password`
- [ ] `Set-Cookie: token=...; HttpOnly; Path=/; SameSite=Lax` locally
- [ ] On Render (`NODE_ENV=production` or `RENDER=true`): `Secure; SameSite=None; Partitioned`
- [ ] Wrong password and unknown email both return `401` with the same message
- [ ] A request with no body or a `text/plain` body returns `400`, never `500`
- [ ] More than 30 login/signup attempts in 15 minutes returns `429`

Browser check (production):

1. Open `https://codemates-connect.vercel.app` and log in.
2. DevTools -> Application -> Cookies -> `codemate-wn1u.onrender.com`.
3. Confirm `HttpOnly` and `Secure` are checked and `SameSite=None`.

### Logout

```powershell
curl.exe -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/logout
curl.exe -i -b cookies.txt http://localhost:3000/profile/view
```

- [ ] Logout returns `200`
- [ ] The `token` cookie is cleared (expired)
- [ ] `/profile/view` now returns `401`

### Protected routes

Without a cookie, each of these must return `401`:

```text
GET   /profile/view
PATCH /profile/edit
GET   /feed
GET   /user/requests/received
GET   /user/connection
GET   /user/messages
GET   /user/messages/:userId
POST  /user/messages/:userId
POST  /user/messages/:userId/read
POST  /request/send/:status/:toUserId
POST  /request/review/:status/:requestId
```

A tampered/expired token must also return `401` ("Invalid session" / "expired").

## 3. Manual: profile

- [ ] `GET /profile/view` returns the logged-in user only
- [ ] `PATCH /profile/edit` with `{ "about": "new text" }` returns `200` and the updated user
- [ ] The same edit from a second account does not change the first account
- [ ] `{ "emailId": "x@y.com" }` returns `400` (not editable)
- [ ] `{ "password": "..." }` returns `400` (not editable)
- [ ] `{ "age": 17 }` and `{ "gender": "robot" }` return `400`
- [ ] `{ "profilePhoto": "javascript:alert(1)" }` returns `400`
- [ ] Skills are trimmed and de-duplicated

## 4. Manual: feed and connections

Two accounts, A and B.

- [ ] `GET /feed?page=1&limit=10` returns an array and excludes A
- [ ] `limit=500` is capped (max 50), `page=0` is treated as page 1
- [ ] Empty feed returns `200 []`, not an error
- [ ] A sends `POST /request/send/interested/:B` -> `201`
- [ ] Repeating the same call -> `409` (duplicate prevention)
- [ ] B sending back to A -> `409` (opposite direction also blocked)
- [ ] A sending to A -> `400`
- [ ] Invalid id -> `400`; valid-but-unknown id -> `404`
- [ ] Status other than `ignored`/`interested` -> `400`
- [ ] B sees A in `GET /user/requests/received`
- [ ] A (not the recipient) cannot review B's request -> `404`
- [ ] B reviews `accepted` -> request appears in `GET /user/connection` for both
- [ ] Re-reviewing an accepted request -> `404` (no longer `interested`)
- [ ] `rejected` removes it from both received and connections

## 5. Manual: messaging

Only after a request is accepted.

- [ ] A and B can `POST /user/messages/:id` with text -> `201`
- [ ] Empty/whitespace text -> `400`
- [ ] Text over 2000 characters -> `400`
- [ ] A third user C (no accepted request) -> `404`
- [ ] `GET /user/messages/:id?page=1&limit=30` returns oldest-first + `hasMore`
- [ ] Sending as B increments A's `GET /user/messages` -> `{ unread: n }`
- [ ] `POST /user/messages/:id/read` sets `readAt` and unread drops
- [ ] Reading your own messages does not mark them as read for the other user

## 6. Expected status codes

| Code | Meaning |
| ---- | ------- |
| 200 | read or update succeeded |
| 201 | user, connection request or message created |
| 400 | invalid body, status, id, or JSON |
| 401 | no/expired cookie, or bad credentials |
| 403 | CORS origin blocked |
| 404 | route or resource not found |
| 409 | duplicate email or duplicate connection request |
| 413 | request body is larger than 100 KB |
| 429 | too many authentication attempts (rate limit) |
| 500 | unexpected server error (generic message only) |

## 7. Not yet tested

The authenticated happy paths above require a real account. Run them with a
throwaway test account (and delete it afterwards) or an existing account whose
credentials you are comfortable using.
