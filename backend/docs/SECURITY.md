# Security

Django is the only component that writes chat data. The browser never receives the Supabase service-role key, and it never talks to Postgres.

## JWT verification

`Authorization: Bearer` must be a Supabase access token.

- `alg=none` is rejected before any signature check.
- HS256 is checked with `SUPABASE_JWT_SECRET`.
- RS256 and ES256 are checked with the key from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. An unknown `kid` is rejected. Keys are cached in the process for 10 minutes.
- `aud` must be `authenticated` (or `SUPABASE_JWT_AUD`). `exp` and `sub` are required.
- `sub` must be the UUID of a profile that has not been soft-deleted. A deleted account fails the next request with 401.
- `app_metadata.role` may be `member` or `admin`. Anything else is treated as `member`.

Public auth routes ignore a bad `Authorization` header so a client can register or log in without first clearing a stale token. Every other route requires a valid token.

## Object-level authorisation

A valid token is not enough.

- Private rooms are invisible to non-members, including join. Those requests return 404, so the response does not reveal that the room exists.
- Public rooms can be previewed by any signed-in user. Reading or sending messages, typing, presence, and read markers require membership and return 403 `not_a_member` otherwise.
- Room update and invites require owner or admin. Delete and role changes require the owner. An admin cannot remove the owner or another admin.
- Message edit is the author, inside 15 minutes. Message delete is the author or a room owner or admin.
- A global admin sees every room in the analytics list. The same flag does not bypass room membership for messages.
- Account deletion removes memberships, renames the profile, soft-deletes it, and bans the Supabase user. The ban runs inside the same database transaction, so a failed ban rolls the local delete back.

## Input validation

Serializers reject unknown fields. Strings, UUIDs, and numbers have explicit bounds. Pagination is capped (messages default 50, max 100; list pages default 20, max 100). Postgres CHECK constraints back the important bounds, including message body length (`char_length(body) <= 2000`).

## Uploads

Avatars are limited to 2 MB and attachments to 5 MB. The file must be JPEG, PNG, or WebP by magic bytes and by Pillow. The image is transposed from EXIF, re-encoded, and rejected if a side is over 8000 pixels or the re-encoded bytes still exceed the cap. The storage name is random. The client filename is never stored.

## Enumeration

Login uses one message for a wrong password, an unknown email, and a deleted profile. Forgot-password and resend-verification always return the same 202 body, including when Supabase fails.

## Production settings

`config.settings.prod` hardcodes `DEBUG = False`. It refuses to boot unless `SECRET_KEY`, `ALLOWED_HOSTS`, `REDIS_URL`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CORS_ORIGIN` are set. `collectstatic` and `makemigrations` are exempt so the image can build.

Also enabled: `SECURE_SSL_REDIRECT` (with `/health` exempt so a load balancer can probe HTTP), HSTS for one year including subdomains, secure session and CSRF cookies, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: same-origin`.

## CORS

`CORS_ORIGIN` is the allow-list. Credentials are not accepted. Production should set a single frontend origin.

## SQL injection

Queries go through the Django ORM. The message-length check is a parameterised `RunSQL` constraint in the migration, not string-built SQL from user input.

## Logging

Each request gets an `X-Request-ID` (echoed only when the client value is short and safe) and that id is attached to log records. Log lines are method, path, and status. Auth and storage failures log a status code, not the response body, because bodies can contain an email. Unhandled 500 responses use a fixed message and do not include the exception text.

## Secrets

Configuration comes from the environment. `.env` is gitignored and excluded from the Docker build. `.env.example` holds placeholders. `scripts/scan_secrets.py` runs in pre-commit and skips `env/`, `.git`, and `.env.example`. CI runs `pip-audit` and `bandit`.

## Row level security

`docs/supabase_rls.sql` enables RLS on every chat table and adds no write policy for `authenticated` or `anon`. Those roles therefore cannot write through the Supabase Data API. Django connects as the table owner and bypasses RLS. The only client policy lets an authenticated user `SELECT` from `realtime.messages` when the topic is `room:{id}` and they are still a member of that non-deleted room.

## Service-role key

`SUPABASE_SERVICE_ROLE_KEY` is read only in `services/`. Views call the service functions. API responses are checked so the key is not echoed. The key is used for storage, the admin user ban, and Realtime broadcast.
