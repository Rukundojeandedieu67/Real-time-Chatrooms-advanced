# Real-time chat rooms API

A backend-only chat API. Clients authenticate with a Supabase access token, and Django is the only writer of rooms, messages, reactions, and files. Postgres stores the data, Supabase Storage holds images, and Supabase Realtime delivers events after the database commit. The point of the split is that a leaked anon key still cannot write chat rows or read another room's private channel.

```mermaid
flowchart LR
  client[Client]
  django[Django REST API]
  auth[Supabase Auth]
  db[(Postgres)]
  storage[Supabase Storage]
  rt[Supabase Realtime]

  client -->|Bearer access token| django
  django -->|sign-in, refresh, ban| auth
  django -->|ORM| db
  django -->|upload and signed URLs| storage
  django -->|broadcast after commit| rt
  client -->|subscribe room:id| rt
  client -->|signed image URL| storage
```

Sending a message:

1. The client uploads any images and receives attachment ids.
2. `POST /api/v1/rooms/{id}/messages` validates membership, stores the row, and links those attachments.
3. After the transaction commits, Django broadcasts `message.created` on `room:{id}`.
4. Other members, already subscribed to that private channel, receive the event. A failed broadcast does not fail the POST.

## Quick start

Python 3.11 or 3.12. The Docker image and CI use 3.12.

```bash
python -m venv env
env\Scripts\pip install -r requirements.txt
copy .env.example .env
docker compose up -d db
set DJANGO_SETTINGS_MODULE=config.settings.dev
env\Scripts\python manage.py migrate
env\Scripts\python manage.py seed_demo
env\Scripts\python manage.py runserver
```

On macOS or Linux, use `source env/bin/activate`, `cp .env.example .env`, and `export DJANGO_SETTINGS_MODULE=config.settings.dev`.

Open `http://localhost:8000/docs` for Swagger and `http://localhost:8000/health` for the probe. Seed data is users `ada`, `grace`, and `linus`, rooms `general` (public) and `maintainers` (private), at least 12 messages, one reaction, and invite code `demo-invite-code`. Seed is safe to run twice.

Docker runs the API and Postgres together. Put real Supabase values in `.env` first. Compose points the web container at `postgres://chat:chat@db:5432/chat`.

```bash
docker compose up --build
```

## Environment

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django secret. Production rejects the default insecure key. |
| `DEBUG` | Dev only. Production ignores this and forces `False`. |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` locally, `config.settings.prod` when deployed. |
| `ALLOWED_HOSTS` | Comma-separated. Required in production. |
| `DATABASE_URL` | App database. |
| `TEST_DATABASE_URL` | Pytest database. Never falls back to `DATABASE_URL`. |
| `CORS_ORIGIN` | Allowed frontend origin. Comma-separated locally. |
| `SUPABASE_URL` | Project URL. |
| `SUPABASE_ANON_KEY` | Auth calls made on behalf of a user. |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage, admin ban, and Realtime. Server only. |
| `SUPABASE_JWT_SECRET` | HS256 projects. Leave empty when tokens are RS256 or ES256. |
| `SUPABASE_JWT_AUD` | Expected `aud`. Default `authenticated`. |
| `SUPABASE_AVATAR_BUCKET` | Default `avatars`. |
| `SUPABASE_ATTACHMENT_BUCKET` | Default `attachments`. |
| `REDIS_URL` | Shared throttle cache. Required in production. |

Create two private Storage buckets with those names, and run `docs/supabase_rls.sql` in the Supabase SQL editor after `migrate`.

## Endpoints

All routes below are under `/api/v1`. Roles: public, signed-in, member, owner, or admin (room admin unless noted).

| Method and path | Who | Success |
| --- | --- | --- |
| `GET /health`, `/schema`, `/docs` | public | 200 |
| `POST /auth/register` | public | 201 |
| `POST /auth/login`, `/auth/refresh` | public | 200 |
| `POST /auth/logout` | bearer | 204 |
| `POST /auth/password/forgot`, `/auth/email/resend` | public | 202 |
| `POST /auth/password/reset` | recovery token | 204 |
| `POST /auth/password/change` | signed-in | 204 |
| `GET /users/me` | signed-in | 200 |
| `PUT`, `PATCH /users/me` | signed-in | 200 |
| `DELETE /users/me` | signed-in | 204 |
| `PUT`, `DELETE /users/me/avatar` | signed-in | 200, 204 |
| `GET /users?search=` | signed-in | 200 |
| `GET /users/{id}` | signed-in | 200 |
| `GET /rooms?scope=mine\|public` | signed-in | 200 |
| `POST /rooms` | signed-in | 201 |
| `GET /rooms/{id}` | signed-in; private requires member | 200 |
| `PUT`, `PATCH /rooms/{id}` | room owner or admin | 200 |
| `DELETE /rooms/{id}` | room owner | 204 |
| `PUT /rooms/{id}/avatar` | room owner or admin | 200 |
| `POST /rooms/{id}/join` | signed-in, public room | 201 |
| `POST /rooms/{id}/leave` | member | 204 |
| `GET /rooms/{id}/members` | member | 200 |
| `PATCH /rooms/{id}/members/{user_id}` | room owner | 200 |
| `DELETE /rooms/{id}/members/{user_id}` | room owner or admin | 204 |
| `POST /rooms/{id}/invites` | room owner or admin | 201 |
| `POST /invites/{code}/accept` | signed-in | 201 |
| `GET`, `POST /rooms/{id}/messages` | member | 200, 201 |
| `GET /messages/{id}` | member | 200 |
| `PATCH /messages/{id}` | author, within 15 minutes | 200 |
| `DELETE /messages/{id}` | author, or room owner or admin | 200 |
| `POST /rooms/{id}/attachments` | member | 201 |
| `PUT`, `DELETE /messages/{id}/reactions/{emoji}` | member | 201 or 200, 204 |
| `POST /rooms/{id}/read` | member | 200 |
| `POST`, `GET /rooms/{id}/typing` | member | 204, 200 |
| `POST /presence/heartbeat` | signed-in | 200 |
| `GET /rooms/{id}/presence` | member | 200 |
| `GET /analytics/messages-per-room` | signed-in; global admin sees all rooms | 200 |
| `GET /rooms/{id}/stats` | member | 200 |

A non-member posting a message in a public room gets 403:

```json
{ "error": { "code": "not_a_member", "message": "Join this room before sending messages", "details": {} } }
```

The same call on a private room is 404.

## Authentication

Register creates the Supabase user, then a local profile whose id is the Supabase `sub`. Login checks the password with Supabase and returns the access token, refresh token, and profile. Later requests send `Authorization: Bearer`. Django verifies the signature, audience, and expiry, then loads the profile.

Forgot-password always returns 202 and the same sentence, for a known email, an unknown email, and an upstream failure. Reset consumes the recovery token. Change-password checks the current password by signing in again, then updates it with the current access token. Logout revokes that access token.

## Realtime events

Channel: `room:{room_id}`, private. Envelope: `{ "event", "data", "sent_at" }`.

| Event | When |
| --- | --- |
| `message.created`, `message.updated`, `message.deleted` | message writes |
| `reaction.changed` | add or remove |
| `typing` | typing started or stopped |
| `member.joined`, `member.left`, `member.role_changed` | membership changes |

There is no presence event. Poll `GET /rooms/{id}/presence`. Payloads contain ids, usernames, and display names. They do not contain email or tokens.

## Rate limits

Redis in production, local memory in development. Authenticated limits use the user id. Anonymous limits use the IP. 429 responses include `Retry-After`.

| Scope | Limit |
| --- | --- |
| Anonymous, any route | 20 / minute |
| Signed-in default | 120 / minute |
| `auth_login` | 5 / minute per IP and email |
| `auth_register` | 5 / hour per IP |
| `auth_password` (forgot, reset, resend, change) | 3 / hour per IP and email |
| `message_send` | 30 / minute per user |
| `typing` | 60 / minute per user |
| `upload` | 10 / minute per user |

`/health`, `/schema`, and `/docs` are not throttled.

## Security choices

Private rooms answer 404 to non-members so existence does not leak. Uploads are re-encoded and renamed so a client cannot choose the stored path or keep EXIF. The service-role key stays in `services/`. Row level security is deny-by-default for the Data API; the SQL is `docs/supabase_rls.sql`. Production will not start with `DEBUG` on, an empty `ALLOWED_HOSTS`, or no Redis. The longer write-up is `docs/SECURITY.md`. Assumptions are in `docs/DECISIONS.md`.

## Tests

Postgres must be listening. Compose starts it with user, password, and database `chat`.

```bash
set DJANGO_SETTINGS_MODULE=config.settings.test
set TEST_DATABASE_URL=postgres://chat:chat@localhost:5432/chat
env\Scripts\python -m pytest
```

Coverage is printed at the end and the run fails under 85%. The current suite is above 95% with branch coverage. Ruff, bandit, and pip-audit are in CI (`.github/workflows/ci.yml`).

```bash
env\Scripts\python -m ruff check .
env\Scripts\python -m bandit -c pyproject.toml -r apps services config
env\Scripts\python -m pip_audit -r requirements.txt
```

## Curl

Full commands for every endpoint are in `docs/API_WALKTHROUGH.md`. The shortest path after `seed_demo` is login, then list rooms. Seed users have no Supabase password until you register them, so register a real user against your project:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ada@example.com\",\"password\":\"CorrectHorse1\",\"username\":\"ada\",\"display_name\":\"Ada\"}"
```

Use the returned `access_token`:

```bash
curl -s http://localhost:8000/api/v1/rooms?scope=public \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Live URL

Not deployed. This repo does not invent a host. After you create the Supabase project, the buckets, and Redis, Render can use `render.yaml`: gunicorn, `DJANGO_SETTINGS_MODULE=config.settings.prod`, health check `/health`. On Railway, use the same start command and the same health path, and attach Postgres plus Redis. Confirm `https://YOUR_HOST/health` and `https://YOUR_HOST/docs` yourself. Do not commit the filled `.env`.

## Trade-offs

Unread counts are calculated per room on the page, which is a few extra queries and stays correct. Orphan attachment rows are not swept; the upload limit is the control. Broadcast is HTTP to Supabase rather than a socket held by Django, so a Realtime outage cannot roll back a message that was already stored. Presence is polled. `muted` is stored and not yet editable. Usernames are not case-folded.

## Defence questions

**Why does Supabase Auth go through Django?** The client still uses a Supabase access token, but password changes, registration, and the ban on account delete are server-side. That keeps the service-role key off the client and lets Django create the profile in the same flow as the Supabase user.

**Why broadcast after commit?** Subscribers must not see a message that the transaction then rolls back. `transaction.on_commit` runs the HTTP broadcast only after Postgres commits. If Realtime is down, the request still returns the saved message.

**Why idempotency keys?** A client retry after a timeout must not insert a second row. `(room, sender, client_message_id)` is unique. The retry returns the original message with 200.

**How is concurrency handled?** Join locks the room with `select_for_update` and counts members inside that transaction. Twenty overlapping joins into ten free slots end with ten members. A second join by the same user hits the unique membership and returns 409.

**How are uploads secured?** Magic bytes plus Pillow, a size cap before and after re-encode, EXIF stripped by the re-encode, a random object name, and a private bucket. The API returns a signed URL.

**How do rate limits work?** DRF throttles read their rates from settings on each request. Authenticated users are keyed by id, anonymous callers by IP, and login or password routes also include the email. Production requires Redis so the counters are shared across gunicorn workers. A 429 sets `Retry-After`.
