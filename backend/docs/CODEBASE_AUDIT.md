# NEXORA codebase audit

Phase 0 only. No application code was changed for this audit.

Inspected on branch `refactor/backend-architecture-corrections` at commit `5436619` (`Make the chat API pass Postgres checks and ship the docs.`). The commit before that is `0e4958e` (`chore: checkpoint before backend refactoring`).

The product name in the new brief is NEXORA. The running code, OpenAPI title, and README still describe a "Real-Time Chat Rooms API" whose authentication authority is Supabase Auth.

## Existing architecture

```mermaid
flowchart LR
  client[Client]
  django[Django REST API]
  sauth[Supabase Auth]
  db[(Postgres)]
  storage[Supabase Storage]
  rt[Supabase Realtime]

  client -->|Supabase access token| django
  django -->|signup, login, refresh, ban| sauth
  django -->|ORM as the database owner| db
  django -->|service-role upload and signed URL| storage
  django -->|service-role broadcast after commit| rt
  client -->|subscribe with a Supabase user token| rt
```

| Piece | What the code does today |
| --- | --- |
| Django / DRF | Business API under `/api/v1`. Settings: `config/settings/base.py`, `dev.py`, `prod.py`, `test.py`. |
| Identity | `Profile` in `apps/accounts/models.py`. Request user is `AuthUser` in `apps/accounts/authentication.py`. It is not a Django `User` and it is not saved. |
| Passwords and sessions | `services/supabase_auth.py` calls Supabase Auth REST. Django does not hash chat passwords. |
| Database | Django migrations. Local default is `postgres://chat:chat@localhost:5432/chat`. This machine's `.env` points `DATABASE_URL` at the Supabase direct host. |
| Realtime | `apps/realtime/publishing.py` posts to Supabase after commit, using the service-role key. |
| Storage | `services/supabase_storage.py`. Private buckets, signed URLs. |
| Redis | Optional throttle cache. No Celery. No worker process. |
| Tests | pytest against Postgres via `TEST_DATABASE_URL`. Supabase HTTP is mocked. |

## What is already implemented

These match the current code and the tests that exercise them.

| Area | Where | Status |
| --- | --- | --- |
| Register, login, refresh, logout, forgot, reset, change, resend | `apps/accounts/views.py`, `apps/accounts/services.py`, `services/supabase_auth.py` | VERIFIED against mocked Supabase |
| JWT check: reject `alg=none`, check `aud` and `exp`, HS256 secret or RS256/ES256 JWKS | `verify_token` in `apps/accounts/authentication.py` | VERIFIED |
| Profiles, avatar, user search | `apps/accounts/views.py`, `apps/core/images.py` | VERIFIED |
| Rooms, roles, join lock, invites, ownership transfer | `apps/rooms/services.py` | VERIFIED |
| Messages, idempotency `(room, sender, client_message_id)`, edit window, soft delete, reactions, cursor, read marker | `apps/chat/models.py`, `apps/chat/services.py` | VERIFIED |
| Typing TTL, polled presence, analytics scope | `apps/realtime/services.py`, `apps/analytics/services.py` | VERIFIED |
| Broadcast after commit; broadcast failure does not fail the request | `apps/realtime/publishing.py` | VERIFIED |
| Rate limits and the uniform error envelope | `apps/core/throttles.py`, `apps/core/exceptions.py` | VERIFIED |
| Join concurrency | `tests/concurrency/test_joins.py` | VERIFIED on local Postgres |
| OpenAPI | `/schema`, `/docs`, and the same paths under `/api/v1` | VERIFIED |
| Image magic bytes, re-encode, random storage name | `apps/core/images.py` | VERIFIED |
| RLS script for Supabase, not applied by Django | `docs/supabase_rls.sql` | Present, not executed by migrate |

Baseline from the last full local run, after commit `5436619`: **46 passed, coverage 95.67%** (branch coverage, fail under 85%). That run used local Postgres through `TEST_DATABASE_URL`, not the Supabase host in `.env`. Ruff was clean. `pip-audit -r requirements.txt` reported no known vulnerabilities for the pinned set (Pillow 13.0.0, pytest 9.0.3).

## Run failure seen on this machine

`python manage.py runserver` dies in `check_migrations` with `getaddrinfo` error 11001 for `db.rnmuuwhuxxsgndzkfvpu.supabase.co`.

DNS for that name returns only an IPv6 address (`AAAA`, `2a05:d018:...`). This Windows resolver does not hand that address to applications, so psycopg reports the host as unknown. An earlier value, `aws-0-xx.pooler.supabase.com`, is not a real name: `xx` is not a region.

The shell is Git Bash. `env/scripts/activate` was executed, not sourced, so the parent shell stayed on system Python (`AppData\Local\Programs\Python\Python311`). The project environment is `env/Scripts/activate`.

`.env` currently defines `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN`, and `CSRF_TRUSTED_ORIGINS`. It does not define `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`. After the database connects, signup, storage, and broadcast still cannot authenticate upstream until those two are set. `CSRF_TRUSTED_ORIGINS` is not read by `config/settings/base.py`.

## Findings

### CRITICAL

**F1. Supabase Auth is the authentication authority.**

`REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]` is `SupabaseJWTAuthentication` (`config/settings/base.py`). `AuthUser` is built from a Supabase access token and a `Profile` row whose id is the token `sub` (`apps/accounts/authentication.py`, `user_from_claims`). There is no `AUTH_USER_MODEL`. `django.contrib.auth.models.User` exists only for `/admin/`. Chat passwords are sent to `services/supabase_auth.py` (`sign_up`, `sign_in`, `refresh`, `update_password`, `disable_user`). The NEXORA target says Django must be the only authentication authority. That migration has not started.

Files: `apps/accounts/authentication.py`, `apps/accounts/services.py`, `apps/accounts/models.py` (`Profile`), `services/supabase_auth.py`, `config/settings/base.py`.

**F2. This workstation cannot open the configured database host.**

`.env` `DATABASE_URL` uses host `db.rnmuuwhuxxsgndzkfvpu.supabase.co`, port 5432, database `postgres`, user `postgres`. That hostname has no IPv4 address. `runserver` cannot migrate or serve. This is environment and network, not a model bug.

### HIGH

**F3. Realtime authorization is a Supabase Auth user id.**

`docs/supabase_rls.sql` allows `SELECT` on `realtime.messages` when `member.user_id = auth.uid()`. `auth.uid()` is the Supabase Auth subject. Django never mints a Realtime JWT. `services/supabase_realtime.py` `broadcast` publishes with the service-role key. A normal Django access token would not satisfy that policy, and the code does not issue a separate short-lived Realtime token.

Files: `services/supabase_realtime.py`, `apps/realtime/publishing.py`, `docs/supabase_rls.sql`.

**F4. The database role in `.env` is the Supabase `postgres` role.**

That role bypasses RLS. `docs/SECURITY.md` already says Django connects as table owner. There is no separate migration role and runtime role. RLS does not constrain this connection. Direct browser access is only refused if RLS is actually applied in the Supabase project; Django does not apply `docs/supabase_rls.sql`.

**F5. Access tokens are not revoked locally.**

`logout_session` in `apps/accounts/services.py` calls Supabase `logout`. `verify_token` checks signature and `exp` only. There is no session table, device list, or denylist. A copied access token keeps working until it expires. Account suspension is `disable_user` in `services/supabase_auth.py` (ban `876000h`), not a Django `is_active` flag.

**F6. Password cutover cannot copy password hashes.**

Supabase stores the password. This database has no password column on `Profile`. Email is not stored either; it is read from the JWT (`AuthUser.email`). A Django user migration can keep `Profile.id` (the Supabase `sub`) and therefore keep room and message foreign keys, but existing users must set a new password. The code must not try to read plaintext passwords. No migration command for this exists.

### MEDIUM

**F7. No transactional outbox.**

`publish` in `apps/realtime/publishing.py` registers `transaction.on_commit`. `send_broadcast` runs inline. A failed broadcast is logged and the HTTP request still succeeds (`apps/realtime/publishing.py` `_send`). There is no `outbox_events` table, no retry, and no worker. Duplicate delivery is already safe for message create because of `unique_client_message`. Consumers of broadcast events have no event id.

**F8. Presence and typing do not match the target Realtime design.**

`heartbeat` in `apps/realtime/services.py` writes `Profile.status` and `last_seen_at`. `room_presence` polls members seen in the last `PRESENCE_WINDOW_SECONDS` (60). It does not open a Supabase Presence channel. `TypingState` (`apps/realtime/models.py`, table `typing_state`) is persisted and deleted when it expires. The target brief says typing is ephemeral and should expire in the client.

**F9. Signed attachment URLs are not checked again at download time.**

`create_signed_url` in `services/supabase_storage.py` returns a URL cached until shortly before expiry. Possession of that URL fetches the object. Room membership is checked at upload and when the message is serialized, not when Storage serves the bytes.

**F10. Orphan attachments are not removed.**

`upload_attachment` in `apps/chat/services.py` inserts `MessageAttachment` with `message` null. `send_message` links them. Nothing deletes an upload that is never sent.

**F11. Room list unread counts are per row.**

`room_card` in `apps/rooms/services.py` runs a count query for each room on the page. Correct, and it grows with page size.

**F12. The message length rule is not in the Django model state.**

`apps/chat/migrations/0002_initial.py` adds `message_body_length` with `RunSQL`: `char_length(body) <= 2000`. `Message.Meta` in `apps/chat/models.py` does not declare that check. `makemigrations --check` is clean because the SQL is not part of model state. A future operation that rebuilds the table from the model would drop the check unless the SQL is repeated.

**F13. Features named in the new brief are absent.**

No models, routes, or services for notifications, user blocking, moderation actions, or direct conversations. `RoomMember.muted` is stored and has no endpoint (`apps/rooms/models.py`). These were not part of the original chat-rooms endpoint list. They are gaps against the NEXORA brief, not regressions in the current API.

### LOW

**F14. `CSRF_TRUSTED_ORIGINS` in `.env` is ignored.**

`config/settings/base.py` never assigns `CSRF_TRUSTED_ORIGINS`. The API uses bearer tokens. Admin login would use Django's default trusted-origins list.

**F15. OpenAPI title and README still say Supabase Auth is the login authority.**

`SPECTACULAR_SETTINGS` in `config/settings/base.py` and `README.md`. Expected until the auth migration is approved.

**F16. `muted` and invite reuse are incomplete product surface.**

Invite create, accept, expiry, and exhaustion are implemented (`apps/rooms/services.py` `create_invite`, `accept_invite`). There is no list or revoke endpoint.

## Database migration risk

Do not reset the database and do not delete the existing migration files.

| Item | Risk |
| --- | --- |
| `profiles.id` is the Supabase user UUID and the target of `room_members.user`, `messages.sender`, `rooms.created_by`, attachments, reactions, invites, and typing. | A new Django user table must use these UUIDs or every foreign key must be rewritten. Prefer adding a real user model that keeps the same UUID and points `Profile` at it, in a new migration. |
| `0002_initial` message length check is raw SQL. | Do not squash migrations until that check is represented in state or re-applied. |
| Supabase `postgres` role bypasses RLS. | Apply `docs/supabase_rls.sql` only after a backup. It does not change Django's own connection. |
| No data has been confirmed inside the Supabase project from this machine. | The connection never succeeded. Local Postgres used by pytest is a different database (`localhost`, database `chat`). |
| Rollback | Each new migration needs a reverse. Do not edit `0001` / `0002` again once this Supabase database has applied them. |

Backup before the first auth migration: Supabase dashboard backup, or `pg_dump` through the IPv4 pooler. There is no dump in the repo.

## Correction plan

No code in this list has been changed.

| Order | Correction | Files that would change | Status |
| --- | --- | --- | --- |
| 1 | Django user model with the existing UUIDs, Django password hashing, registration, login, refresh, revocation, reset, change, activation and suspension. Keep Supabase Auth callable until the new paths pass tests. Then stop calling `services/supabase_auth.py` from login. | New migration under `apps/accounts/migrations/`. `apps/accounts/models.py`, `authentication.py`, `services.py`, `views.py`, `config/settings/base.py`. Tests in `tests/test_auth.py`. | NOT IMPLEMENTED |
| 2 | Short-lived Realtime JWT signed with a key Supabase is configured to trust. `sub` is the Django user UUID. Membership checked before it is issued. | New issuer module. `docs/supabase_rls.sql` must stop using `auth.uid()` unless that JWT is accepted as a Supabase user. | NOT IMPLEMENTED |
| 3 | Runtime database role that is not the migration owner. Apply RLS on the Supabase project. | New SQL or docs. Settings documentation. No model change required for the role split. | NOT IMPLEMENTED |
| 4 | Outbox only if retry is required. Today a failed broadcast does not undo the message. A worker needs a process. Redis and Celery are not installed. | `apps/realtime/models.py` and a new migration if an outbox is approved. | PARTIALLY IMPLEMENTED |
| 5 | Direct conversations, block, moderation, notifications, orphan cleanup, only after the above is approved. | New models and routes. Do not remove current room and message routes. | NOT IMPLEMENTED |

## How to start the server on this machine

Git Bash, from `backend`:

```bash
source env/Scripts/activate
```

In the Supabase dashboard, open the project `rnmuuwhuxxsgndzkfvpu`, Database, Connection string, and choose the **Session pooler** URI. It is an IPv4 host of the form `aws-0-<region>.pooler.supabase.com`, port **5432**, user `postgres.rnmuuwhuxxsgndzkfvpu`. Put that in `DATABASE_URL`. Do not use `db.<ref>.supabase.co` from this PC, and do not use `aws-0-xx`.

Also set `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. They are missing from `.env`.

Then:

```bash
python manage.py migrate
python manage.py runserver
```

`/health` and `/docs` answer only after migrate can reach the database.

## Next phase

Phase 1 is the Django authentication migration and the Realtime JWT design. It is not started. Waiting for approval of this audit.
