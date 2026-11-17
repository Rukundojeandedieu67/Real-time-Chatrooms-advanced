# Backend Master Prompt: Real-Time Chat Rooms API

Paste everything under "The prompt" into your AI coding tool (Cursor or similar) as the first message. Work phase by phase (Section 15), and do not let the tool skip ahead. The prompt is backend only: Django REST Framework + Supabase (Auth, Postgres, Storage, Realtime). The UI tool will later consume this API using the generated OpenAPI schema.

---

# The prompt

## 1. Role and goal

You are a senior backend engineer. Build a production-grade, secure, fully tested REST API for a real-time chat room platform, using Django + Django REST Framework, with Supabase providing Auth, Postgres, Storage and Realtime. Backend only: no templates, no frontend code. A separate frontend will consume this API, so every capability a real chat app needs must exist as an endpoint, be documented in OpenAPI, and be covered by tests.

The project must be defendable in front of reviewers: every design decision has a reason written in the README, every endpoint works, and every claim is proven by a passing test.

## 2. Non-negotiable rules

- Backend only. The API is the product.
- Never invent behaviour silently. If something is ambiguous, state the assumption in `docs/DECISIONS.md` and continue.
- Never commit secrets. Provide `.env.example` only.
- The Supabase service-role key exists only on the server. It never reaches a client, a log or a response.
- After every phase: run the tests, run the linter, fix failures, then commit. Do not start the next phase with a red build.
- Everything listed here is in scope. If you cannot finish an item, say so explicitly. Do not skip it quietly.

## 3. Architecture decisions

1. **Django is the only API the client calls.** The client never talks to Supabase directly for writes. The one exception is subscribing to Realtime channels (read-only).
2. **Authentication is delegated to Supabase Auth.** Django exposes its own `/auth/*` endpoints that call the Supabase Auth REST API server-side, so the frontend needs one base URL.
3. **Every protected request carries a Supabase JWT** (`Authorization: Bearer`). Django verifies the signature (JWKS for asymmetric keys, or the JWT secret for legacy projects), the `aud` claim and the expiry. From the token it reads `sub` (user id) and `app_metadata.role`.
4. **Django owns the schema.** Tables are created by Django migrations on the Supabase Postgres database. Row Level Security is enabled on all tables with no write policies for `authenticated`, so the database refuses direct client writes.
5. **Avatars and image attachments** live in Supabase Storage. Django validates the upload, stores it, and returns a signed or public URL.
6. **Real-time delivery** uses Supabase Realtime Broadcast on private channel `room:{room_id}`. Django publishes events through the Realtime broadcast REST endpoint with the service key, and only after the database transaction commits (`transaction.on_commit`). A Realtime authorization policy lets only room members subscribe.
7. **Typing and presence** are ephemeral. Typing state is short-lived (5 s TTL) and never stored permanently.
8. **Global roles:** `member` and `admin`, read from `app_metadata.role`. **Room roles:** `owner`, `admin`, `member`.

## 4. Stack and tooling

Python 3.12, Django 5, djangorestframework, drf-spectacular (OpenAPI + Swagger UI), django-cors-headers, PyJWT\[crypto\], requests or httpx, psycopg, dj-database-url, gunicorn, whitenoise, pytest, pytest-django, pytest-cov, factory-boy, responses (or respx) to mock Supabase HTTP calls, ruff, bandit, pip-audit, pre-commit, Docker + docker-compose (Postgres for local and tests), GitHub Actions.

## 5. Project structure

```
backend/
├── config/               settings split: base.py, dev.py, prod.py, test.py
├── apps/
│   ├── core/             pagination, exceptions, throttles, permissions, health
│   ├── accounts/         auth proxy views, JWT authentication, profiles
│   ├── rooms/            rooms, members, invites
│   ├── chat/             messages, reactions, attachments, read state
│   ├── realtime/         broadcast publisher, typing, presence
│   └── analytics/
├── services/             supabase_auth.py, supabase_storage.py, supabase_realtime.py
├── tests/                mirrors apps/, plus tests/concurrency/
├── docs/                 DECISIONS.md, SECURITY.md, API_WALKTHROUGH.md
├── .github/workflows/ci.yml
├── Dockerfile, docker-compose.yml, .env.example, README.md
```

Keep views thin, put business rules in service functions, and keep all Supabase HTTP calls in `services/` so they are easy to mock.

## 6. Data model

Use UUID primary keys, `created_at` and `updated_at` on every table, and soft delete (`deleted_at`) where noted.

| Table | Fields and constraints |
| --- | --- |
| `profiles` | `id` UUID PK (= Supabase user id), `username` unique (3-30 chars, `[a-z0-9_]`), `display_name`, `bio` (max 160), `avatar_path`, `status` (online, away, offline), `last_seen_at`, `deleted_at` |
| `rooms` | `id`, `name` (3-60), `description` (max 300), `is_private` bool, `avatar_path`, `max_members` (default 100), `created_by` FK profiles, `deleted_at`. Unique `lower(name)` among non-deleted public rooms |
| `room_members` | `id`, `room` FK, `user` FK, `role` (owner, admin, member), `joined_at`, `last_read_message` FK null, `muted` bool. **Unique (room, user)** |
| `room_invites` | `id`, `room` FK, `code` unique random, `created_by`, `expires_at`, `max_uses`, `uses` |
| `messages` | `id`, `room` FK, `sender` FK, `body` (1-2000 chars, may be empty only if it has an attachment), `reply_to` FK self null, `client_message_id` UUID, `edited_at`, `deleted_at`. **Unique (room, sender, client\_message\_id)** for idempotent sends. Index (room, created\_at DESC) |
| `message_attachments` | `id`, `message` FK, `storage_path`, `content_type`, `size_bytes`, `width`, `height` |
| `message_reactions` | `id`, `message` FK, `user` FK, `emoji` (from an allowed list). **Unique (message, user, emoji)** |
| `typing_state` | `room`, `user`, `expires_at`. Unique (room, user). Expired rows are ignored and cleaned up lazily |

Add `CHECK` constraints that mirror the validation rules, as a second safety net behind the serializers.

## 7. API specification

Base path `/api/v1/`. JSON everywhere except file uploads (`multipart/form-data`). Use `PUT` for full replacement and `PATCH` for partial updates.

### 7.1 Authentication

| Method and path | Purpose | Notes |
| --- | --- | --- |
| `POST /auth/register` | Create account | Body: email, password, username, display\_name. Calls Supabase sign-up, then creates the profile. `201`. `409` if email or username exists. Password policy: min 10 chars, letter + number |
| `POST /auth/login` | Sign in | Returns access\_token, refresh\_token, expires\_in, user. `401` with a generic message on bad credentials |
| `POST /auth/refresh` | New access token | Body: refresh\_token |
| `POST /auth/logout` | Revoke session | Requires auth. `204` |
| `POST /auth/password/forgot` | Send reset email | Always `202`, whether or not the email exists (no user enumeration) |
| `POST /auth/password/reset` | Finish reset | Body: recovery token from the email link + new\_password. Calls Supabase to update the password |
| `POST /auth/password/change` | Change while signed in | Body: current\_password, new\_password. Re-verifies the current password first |
| `POST /auth/email/resend` | Resend verification email | Rate limited tightly |
| `DELETE /users/me` | Delete account | Soft-deletes the profile, removes memberships, disables the Supabase user |

### 7.2 Profiles

| Method and path | Purpose |
| --- | --- |
| `GET /users/me` | My profile |
| `PUT /users/me` | Replace profile fields |
| `PATCH /users/me` | Update some fields (display\_name, bio, status) |
| `PUT /users/me/avatar` | Upload avatar (multipart). Allowed: JPEG, PNG, WebP. Max 2 MB. Verify the real file type (magic bytes), not only the extension. Re-encode and strip EXIF |
| `DELETE /users/me/avatar` | Remove avatar |
| `GET /users/{id}` | Public profile (no email) |
| `GET /users?search=` | Search users by username or display name (for invites), paginated |

### 7.3 Rooms and membership

| Method and path | Purpose | Who |
| --- | --- | --- |
| `GET /rooms` | My rooms with unread count and last message preview. `?scope=public` lists discoverable public rooms | member |
| `POST /rooms` | Create room, creator becomes `owner` | any user |
| `GET /rooms/{id}` | Room detail | members (public rooms: anyone signed in, read-only preview) |
| `PUT /rooms/{id}`, `PATCH /rooms/{id}` | Update | owner, admin |
| `DELETE /rooms/{id}` | Soft delete | owner |
| `PUT /rooms/{id}/avatar` | Room image | owner, admin |
| `POST /rooms/{id}/join` | Join a public room | any user. `409` already a member, `403` private, `409` room full |
| `POST /rooms/{id}/leave` | Leave. If the owner leaves, ownership transfers to the oldest admin or member; if none, the room is archived | member |
| `GET /rooms/{id}/members` | Member list with profiles and roles | members |
| `PATCH /rooms/{id}/members/{user_id}` | Change role | owner only |
| `DELETE /rooms/{id}/members/{user_id}` | Remove a member | owner, admin (an admin cannot remove the owner or another admin) |
| `POST /rooms/{id}/invites` | Create invite link or code | owner, admin |
| `POST /invites/{code}/accept` | Join a private room by code | any user |

### 7.4 Messages

| Method and path | Purpose | Rules |
| --- | --- | --- |
| `GET /rooms/{id}/messages` | History | Members only. Cursor pagination (`?before=<id>&limit=50`, max 100). `?q=` searches text |
| `POST /rooms/{id}/messages` | Send | Members only. Body 1-2000 chars, optional `reply_to`, `client_message_id` required for idempotency. A repeated `client_message_id` returns the original message with `200`, not a duplicate |
| `GET /messages/{id}` | One message | Members of its room |
| `PATCH /messages/{id}` | Edit | Author only, within 15 minutes. Sets `edited_at` |
| `DELETE /messages/{id}` | Delete | Author, or room owner/admin. Soft delete, body hidden |
| `POST /rooms/{id}/attachments` | Upload an image for a message (multipart) | JPEG, PNG, WebP, max 5 MB. Returns an attachment id to pass in the message |
| `PUT /messages/{id}/reactions/{emoji}` | Add reaction | Idempotent |
| `DELETE /messages/{id}/reactions/{emoji}` | Remove my reaction |  |

### 7.5 Typing, read state, presence

| Method and path | Purpose |
| --- | --- |
| `POST /rooms/{id}/typing` | Body `{"is_typing": true}`. Sets a 5 s TTL and broadcasts `typing`. Called by the client every \~3 s while typing. `204` |
| `GET /rooms/{id}/typing` | Who is typing right now (polling fallback) |
| `POST /rooms/{id}/read` | Body `{"last_read_message_id": ...}`. Moves the read marker forward only, never backwards |
| `POST /presence/heartbeat` | Updates `last_seen_at` and status |
| `GET /rooms/{id}/presence` | Online members of the room |

### 7.4b Analytics and operations

| Method and path | Purpose |
| --- | --- |
| `GET /analytics/messages-per-room` | Messages per room for rooms I belong to (global admins see all) |
| `GET /rooms/{id}/stats` | Member count, message count, busiest hour, top senders (members only) |
| `GET /health` | Liveness, plus a database check |
| `GET /schema`, `GET /docs` | OpenAPI schema and Swagger UI |

## 8. Business rules and edge cases

- Only members read or write messages. Non-members get `403` with a clear message. A room that does not exist (or is soft-deleted) gets `404`. For private rooms, use `404` instead of `403` for non-members so existence is not leaked.
- Joining, member-cap checks and ownership transfer run inside `transaction.atomic()` with `select_for_update()` on the room row.
- Two simultaneous joins never create duplicate members (unique constraint plus `get_or_create` handling of `IntegrityError`).
- A user removed from a room immediately loses read and write access, and their Realtime subscription is no longer authorised.
- Editing and deleting respect author and role rules. Deleted messages keep their position but hide their content.
- Reaction emoji must come from a fixed allowed list.
- Read markers only move forward.
- Message sends are idempotent by `client_message_id`, so retries on a bad network never duplicate.

## 9. Real-time design

Events are broadcast on channel `room:{room_id}` with this envelope: `{ "event": "...", "data": {...}, "sent_at": "..." }`.

| Event | Triggered by |
| --- | --- |
| `message.created`, `message.updated`, `message.deleted` | message endpoints |
| `reaction.changed` | reaction endpoints |
| `typing` | typing endpoint (data: user id, display name, is\_typing) |
| `member.joined`, `member.left`, `member.role_changed` | membership endpoints |

Rules: publish only after commit; a failed broadcast must never fail the API request (log it and carry on); never include secrets or emails in payloads. Document the event list in the README so the frontend knows exactly what to subscribe to.

## 10. Rate limiting

Use DRF throttling with a shared cache (Redis in production, local memory in dev). Throttle by user id when authenticated, otherwise by IP. Return `429` with a `Retry-After` header.

| Scope | Limit |
| --- | --- |
| Anonymous (any) | 20 / minute |
| `auth_login` | 5 / minute per IP + email |
| `auth_register` | 5 / hour per IP |
| `auth_password` (forgot, reset, resend) | 3 / hour per IP + email |
| `message_send` | 30 / minute per user |
| `typing` | 60 / minute per user |
| `upload` | 10 / minute per user |
| Authenticated default | 120 / minute per user |

Limits are settings, not hard-coded, and each one has a test proving the 429.

## 11. Security requirements

Implement and document every item in `docs/SECURITY.md`:

- JWT verification: signature, `aud`, `exp`; reject `alg=none`; refuse unknown key ids.
- Object-level authorisation on every endpoint (membership and role checks), with a test per rule.
- Strict input validation on every serializer; reject unknown or oversized fields; cap pagination limits.
- Uploads: type allow-list, magic-byte check, size cap, re-encode images, random storage names, never trust the client filename.
- Generic auth errors and the uniform `202` on forgot-password to prevent user enumeration.
- Production settings: `DEBUG=False`, `SECURE_SSL_REDIRECT`, HSTS, secure and HttpOnly cookies, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `ALLOWED_HOSTS` set explicitly.
- CORS restricted to the configured frontend origin only.
- SQL injection safe by using the ORM only; no raw string-built SQL.
- Logging never records tokens, passwords or full emails; add a request-id to every log line.
- Secrets only from environment variables; a pre-commit secret scan; `pip-audit` and `bandit` in CI.
- Supabase RLS on every table, with no write policies for client roles.
- The service-role key is used only inside `services/`.

## 12. Errors, pagination, validation

One error shape everywhere:

```json
{ "error": { "code": "not_a_member", "message": "Join this room before sending messages", "details": {} } }
```

Status codes: `200`, `201`, `204`, `400` (validation), `401` (missing or bad token), `403` (not allowed), `404` (missing, or hidden private), `409` (conflict or duplicate), `413` (file too large), `415` (bad media type), `429` (rate limit), `500` (never leak internals). Implement a custom DRF exception handler so every failure uses this shape.

## 13. Testing requirements

Use pytest against a real Postgres (docker-compose locally, a service container in CI). Mock only the Supabase HTTP calls. Target 85%+ coverage, with CI failing below that. Required cases (minimum):

1. No token returns 401; expired or tampered token returns 401.
2. Register, login, refresh, logout, forgot, reset and change-password happy paths, plus duplicate email (409) and weak password (400).
3. Forgot-password returns the same response for known and unknown emails.
4. Profile get, put, patch; avatar upload happy path; wrong type (415); too large (413); fake extension rejected.
5. Create, update, delete room with role checks; a normal member cannot update (403).
6. Join public room; join private room (403 or 404); join full room (409); join twice (409).
7. Non-member read messages returns 403 (404 for private).
8. Non-member send returns 403.
9. Empty body and over-length body return 400.
10. Unknown room returns 404.
11. Edit and delete rules: author only, 15-minute edit window, admin can delete.
12. Idempotent send: same `client_message_id` twice returns one message.
13. Reactions are idempotent and limited to the allowed list.
14. Cursor pagination returns correct order and respects the max limit.
15. Typing sets and expires after 5 s; non-members cannot post typing.
16. Read marker never moves backwards.
17. Analytics counts match inserted data, and users only see their own rooms.
18. Rate limit tests: each throttle scope returns 429 with `Retry-After`.
19. Concurrency (real threads and Postgres): 20 simultaneous joins to a room with 10 slots end with exactly 10 members; two simultaneous joins by one user create one row.
20. Broadcast is called after commit, and a broadcast failure does not fail the request.
21. Removed member loses access instantly.
22. Ownership transfer when the owner leaves.

## 14. DevOps and delivery

- `docker-compose.yml` runs Django and Postgres with one command. `Dockerfile` is multi-stage and runs as a non-root user.
- `.env.example` documents every variable: `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (optional), `CORS_ORIGIN`, `REDIS_URL`.
- A seed command `python manage.py seed_demo` creates demo rooms, members and messages (at least 10 rows).
- GitHub Actions workflow: install, ruff, bandit, pip-audit, migrations check, pytest with coverage gate.
- Deployment target: Render or Railway with gunicorn and whitenoise, plus a live health URL.
- Provide a Postman or Bruno collection, or a `docs/API_WALKTHROUGH.md` with curl commands for every endpoint.

## 15. Working method (follow in this order)

After each phase: run tests, lint, commit with a clear message, and report what was done and what is next. Stop and wait for my "continue" between phases.

1. **Foundation:** project, settings split, Docker, CI skeleton, error handler, pagination, health.
2. **Auth:** JWT authentication, `/auth/*` endpoints, profiles, avatar upload, with tests.
3. **Rooms and membership:** models, migrations, endpoints, roles, invites, with tests.
4. **Messages:** CRUD, idempotency, reactions, attachments, read markers, with tests.
5. **Real-time:** broadcast publisher, typing, presence, RLS and Realtime policy SQL, with tests.
6. **Hardening:** rate limits, security headers, concurrency tests, analytics, coverage gate.
7. **Delivery:** OpenAPI polish, seed data, README, SECURITY.md, DECISIONS.md, deployment, final checklist.

## 16. README requirements (for the defence)

The README must contain: one-paragraph pitch; architecture diagram (Mermaid) showing client, Django, Supabase Auth, Postgres, Storage and Realtime; the "user sends a message" flow in 4 steps; quick start (local and Docker); environment variables; endpoint table with methods, roles and status codes; authentication flow including forgot-password; the real-time event list; rate-limit table; security decisions and why; how to run tests and view coverage; a curl walkthrough anyone can follow; live demo URL; trade-offs and known limitations; and a "likely defence questions" section with short answers (why Supabase Auth through Django, why broadcast after commit, why idempotency keys, how concurrency is handled, how uploads are secured, how rate limits work).

## 17. Final acceptance checklist

The work is not finished until all of these are true:

- Every endpoint in Section 7 exists, is documented in Swagger and works against Supabase.
- All tests pass in CI; coverage is at least 85%.
- A fresh clone runs with `docker compose up` and the README steps.
- No secrets in the Git history.
- The "break it on purpose" case (non-member sends a message) returns a clear 403 with the standard error shape.
- The repo is pushed to GitHub with a clean, readable commit history.
- The live URL answers `/health` and `/docs`.

---

# After the prompt: what you do yourself

1. Create the Supabase project and fill `.env` (keys stay on your machine and in your host's secret settings).
2. Create a Supabase Storage bucket for avatars and attachments, and make it private so signed URLs are used.
3. In SMTP settings (or the default Supabase email), confirm that reset emails arrive, and set the redirect URL for password recovery to your frontend.
4. Create the GitHub repo, then push:

```bash
git init && git branch -M main
git remote add origin https://github.com/YOU/chat-rooms-api.git
git add . && git commit -m "chore: initial backend foundation"
git push -u origin main
```

5. Work on feature branches (`feat/auth`, `feat/messages`), open a pull request per phase, and let CI go green before merging.
6. Deploy and paste the live URL into the README.
7. Give the UI tool the file at `/api/v1/schema` plus the real-time event list from the README, so the frontend matches the backend exactly.
