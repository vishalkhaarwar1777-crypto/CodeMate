# CodeMates API

Base URL (production): `https://codemate-wn1u.onrender.com`
Base URL (local): `http://localhost:3000`

Every route except `POST /signup` and `POST /login` requires the HTTP-only
`token` cookie set at login. Requests must be sent with credentials enabled.

## Auth (`src/routes/auth.js`)

| Method | Path      | Body                              | Success |
| ------ | --------- | --------------------------------- | ------- |
| POST   | `/signup` | `firstName`, `lastName`, `emailId`, `password` | `201 { message, user }` |
| POST   | `/login`  | `emailId`, `password`             | `200 { message, user }` + `Set-Cookie: token` |
| POST   | `/logout` | –                                 | `200 { message }` + clears `token` |

## Profile (`src/routes/profile.js`)

| Method | Path             | Body (all optional)                                                        |
| ------ | ---------------- | -------------------------------------------------------------------------- |
| GET    | `/profile/view`  | –                                                                          |
| PATCH  | `/profile/edit`  | `firstName`, `lastName`, `age`, `gender`, `about`, `profilePhoto`, `skill` |

`PATCH /profile/edit` rejects any field that is not in the list above.

## Connection requests (`src/routes/request.js`)

| Method | Path                                | `:status` values          |
| ------ | ----------------------------------- | ------------------------- |
| POST   | `/request/send/:status/:toUserId`   | `ignored`, `interested`   |
| POST   | `/request/review/:status/:requestId`| `accepted`, `rejected`    |

Only the recipient of a pending (`interested`) request can review it.

## Users (`src/routes/user.js`)

| Method | Path                      | Notes                                              |
| ------ | ------------------------- | -------------------------------------------------- |
| GET    | `/feed?page=1&limit=10`   | Newest profiles, excludes anyone you already acted on |
| GET    | `/user/requests/received` | Pending requests sent to you                       |
| GET    | `/user/connection`        | Accepted connections (both directions)             |

## Messages (`src/routes/message.js`)

A conversation exists only between two users with an accepted request.

| Method | Path                            | Notes                                      |
| ------ | ------------------------------- | ------------------------------------------ |
| GET    | `/user/messages/:userId`        | Thread, `?page=1&limit=30`, oldest-first   |
| POST   | `/user/messages/:userId`        | Body: `{ text }` (max 2000 chars)          |
| POST   | `/user/messages/:userId/read`   | Marks incoming messages as read            |
| GET    | `/user/messages`                | `{ unread }` total across conversations    |

## Not implemented

`PATCH /profile/password` (listed in older notes) does not exist yet.

## Status codes

- `200` read/update success
- `201` resource created (`/signup`, sending a request, sending a message)
- `400` invalid body, status or id
- `401` missing/expired cookie, or bad login credentials
- `403` blocked CORS origin
- `404` route/resource not found
- `409` duplicate email or duplicate connection request
- `500` unexpected server error (generic message, details stay in logs)
