# NEXORA authentication security audit

Phase 1 only. No authentication code, models, or migrations were changed.

Inspected: `apps/accounts/` (models, authentication, services, serializers, validators, views), `services/supabase_auth.py`, `services/http.py`, `apps/core/throttles.py`, `apps/core/middleware.py`, `apps/core/exceptions.py`, `config/settings/base.py`, `config/settings/prod.py`, `config/api_urls.py`, and the auth tests in `tests/test_auth.py` and `tests/test_throttles.py`. There is no React app in this repository. The client is expected to call Django and send `Authorization: Bearer`.

## What exists

| Capability | Where | What it actually does |
| --- | --- | --- |
| Identity | `Profile` in `apps/accounts/models.py` | UUID primary key. No password column. No email column. `deleted_at` hides the row from `Profile.objects`. |
| Request user | `AuthUser` in `apps/accounts/authentication.py` | Built per request from a Supabase access token. Not a Django `User`. `is_active` is always `True`. |
| Authority | `SupabaseJWTAuthentication` | Default DRF auth class in `config/settings/base.py`. Verifies Supabase JWTs. |
| Passwords | `services/supabase_auth.py` | Signup, sign-in, refresh, logout, recover, and password update are HTTP calls to Supabase Auth. Django hashers are not used. |
| Login | `POST /api/v1/auth/login` | Email is stripped and lowercased. Wrong password, unknown Supabase user, and missing local profile all return 401 `invalid_credentials`. |
| Tokens | `LoginView._session` | JSON body contains `access_token`, `refresh_token`, `expires_in`, and the profile. No cookies are set. |
| Refresh | `POST /api/v1/auth/refresh` | Forwards the refresh token to Supabase and returns the new pair. No local rotation record. |
| Logout | `POST /api/v1/auth/logout` | Requires a valid access token and asks Supabase to log out that bearer token. 204 on success. |
| Forgot password | `POST /api/v1/auth/password/forgot` | Always 202 with the same sentence, including when Supabase fails. |
| Reset | `POST /api/v1/auth/password/reset` | Sends the caller-supplied token to Supabase as the bearer token for a password update. 204 or 400. |
| Change password | `POST /api/v1/auth/password/change` | Re-checks the current password with Supabase, then updates it. Does not revoke other sessions. |
| Current user | `GET /api/v1/users/me` | Returns the profile. Email is not included. |
| Rate limits | `apps/core/throttles.py` | Login 5/minute per IP and email. Register 5/hour per IP. Password routes 3/hour per IP and email when the body has `email`. |
| Brute-force store | `CACHES` in `config/settings/base.py` | Redis when `REDIS_URL` is set. Production refuses to boot without it. Dev uses local memory. |

`django.contrib.auth` password validators and hashers apply only to the operator user that logs into `/admin/`. Tests force MD5. Production uses Django's default PBKDF2 for that operator user. Argon2 is not installed. Chat passwords never reach those hashers.

There is no `PasswordResetToken`, `RefreshToken`, `UserSession`, or `AuthenticationAuditLog` model. There is no `POST /api/v1/auth/logout-all`. There is no Django email template. `EMAIL_HOST` is not configured. Password-reset mail is sent by Supabase inside `recover()`, not by Django.

## How a React client is expected to authenticate

1. `POST /api/v1/auth/login` with email and password.
2. Store the JSON `access_token` and `refresh_token` itself. The API does not set an HttpOnly cookie.
3. Send `Authorization: Bearer <access_token>` on later calls.
4. `POST /api/v1/auth/refresh` with the refresh token in the JSON body when the access token expires.
5. `POST /api/v1/auth/logout` with the bearer access token.

That design puts the refresh token in JavaScript. A React app that follows the current API and keeps the token in `localStorage` is doing what the response format requires. The backend cannot prevent that until refresh moves to an HttpOnly cookie.

Routes do not match the paths in the new brief. The live prefixes are `/api/v1/auth/...` with no trailing slash. `GET /api/v1/users/me` is the current-user call. Adding a second tree at `/api/auth/...` would be a duplicate API.

## Findings

### CRITICAL

**A1. Supabase Auth is the identity authority.**

`login`, `register`, `refresh_session`, `logout_session`, `forgot_password`, `reset_password`, and `change_password` in `apps/accounts/services.py` all delegate to `services/supabase_auth.py`. Django never verifies a password hash it stored. This contradicts the requirement that Django is the only authentication authority. A second Django login stacked on top of this would be the duplicate system the brief forbids, so the correction has to replace these calls, not add another login beside them.

**A2. Logout does not give the API a revoked refresh token it can reject.**

`LogoutView` passes `request.auth` (the access token) to `logout()` in `services/supabase_auth.py`. There is no local refresh-token row to mark revoked. `verify_token` accepts any unexpired, correctly signed Supabase access token. After logout, that access token still works until `exp`. There is no logout-all endpoint, so other devices are not revoked by any NEXORA route.

### HIGH

**A3. Refresh tokens are returned in JSON and are not rotated by NEXORA.**

`_session` in `apps/accounts/views.py` puts `refresh_token` in the response body. `refresh_session` trusts Supabase to issue the next pair and stores nothing. Reuse of an old refresh token cannot be detected by Django. There is no server-side session list.

**A4. Password reset is not a hashed, single-use NEXORA token.**

`ResetSerializer` accepts `token` and `new_password`. `reset_password` calls `update_password(token, new_password)`, which sends that value as a Supabase bearer token. Django does not generate the token, does not store a hash, does not set a 20-minute expiry, and does not invalidate older tokens. Those rules, if they exist, are inside Supabase and are not enforced or tested here. A successful reset does not revoke other sessions in this codebase. The user is not emailed by Django that the password changed.

**A5. Register confirms that an email is taken.**

`map_supabase` turns Supabase duplicate signup into 409 `email_taken`. Login and forgot-password do not do this. Register does. Username collisions return 409 `username_taken` before any Supabase call (`register` in `apps/accounts/services.py`).

**A6. No Django password-reset email and no allowlisted link.**

`recover` posts the email to Supabase and ignores the response body. The reset URL is whatever the Supabase project is configured to send. Django does not check an allowlisted HTTPS frontend origin, and it does not render a NEXORA message with an expiry warning. Delivery failure is logged as a warning and still returns 202, which is safe for enumeration and hides the failure from the operator's API client. There is no async mail queue. Celery is not installed.

### MEDIUM

**A7. Password-change and reset rate limits are not per account.**

`PasswordRateThrottle.get_cache_key` appends the `email` field. Forgot and resend send `email`, so they are limited per IP and email (3/hour). Reset and change-password bodies have no `email`, so the key is the IP plus an empty string. Change-password also has the signed-in user throttle (120/minute), which does not stop a low-rate password guess against the current password. Login is 5/minute per IP and email. One account can still be attacked from many IPs. Counters live in Redis only when `REDIS_URL` is set.

**A8. Access-token lifetime is not chosen by Django.**

`expires_in` is copied from Supabase. This code does not set a short lifetime and does not check a denylist on each request. A stolen access token works until Supabase's `exp`.

**A9. Inactive and unverified accounts are only partly visible.**

A soft-deleted profile fails `Profile.objects.filter` in `login` and gets the same 401 as a bad password. `AuthUser.is_active` is hardcoded `True`, so a deleted profile that still verifies as a JWT is rejected only because `user_from_claims` uses the alive manager. There is no unverified or blocked flag on `Profile`. Unverified signup depends on Supabase returning no session (`email_confirmation_required` on register). A later login of an unverified user is whatever Supabase returns, then mapped to the generic 401 only when Supabase itself rejects it.

**A10. Change password does not end other sessions and compares the new password in Python.**

`change_password` rejects an identical current and new string, then asks Supabase to sign in and update. It does not revoke refresh tokens. It does not send a notification email.

**A11. CSRF and cookies are not part of the API session.**

`CsrfViewMiddleware` is installed. API auth is a bearer header, and `CORS_ALLOW_CREDENTIALS` is `False`. That is consistent today. If Phase 2 puts the refresh token in a cookie, CSRF and `CORS_ALLOW_CREDENTIALS` must be redesigned together. `CSRF_TRUSTED_ORIGINS` is not read from the environment.

**A12. Login activity is not recorded.**

Logging in `apps/core/middleware.py` is method, path, and status, plus a request id. Passwords and tokens are not written there. There is also no audit row for login, logout, or password change. `supabase_auth` logs upstream status codes, not bodies.

### LOW

**A13. Password policy is local and short of Django's validators.**

`validate_password` requires 10 to 128 characters, one letter, and one digit. It does not use Django's similarity, common-password, or numeric validators, and it does not consult a breach list. The settings list those validators, but this function never calls them.

**A14. The documented paths differ from the new brief.**

Keep `/api/v1/auth/login`, `/logout`, `/refresh`, `/password/forgot`, `/password/reset`, `/password/change`, and `/users/me`. Add logout-all beside them, for example `POST /api/v1/auth/logout-all`, instead of a second `/api/auth/` tree.

## Recommended corrections

Do these in the later phases. Do not add a second login that still calls Supabase.

1. **Phase 2.** Add a Django user model whose primary key is the existing `Profile.id`, with a password column hashed by Django. Prefer Argon2 for new hashes. Login verifies that hash, returns a short-lived access JWT signed by Django, and stores only a hash of the refresh token. Keep the current JSON shape until the React client is ready to move the refresh token to an HttpOnly, Secure, SameSite cookie. Say so before switching, because that is a breaking change for any client that reads `refresh_token` from the body.
2. **Phase 3.** Logout deletes the current refresh-token row. Logout-all deletes every row for that user. Both write an audit event. Keep access tokens short, on the order of minutes, because logout cannot erase a JWT that was already issued. Reject a reused refresh token and, if rotation detects reuse, revoke the whole family.
3. **Phase 4.** Forgot-password creates a random token, stores only its hash, expires it in about 20 minutes, and marks older unused tokens for that user dead. The response stays the generic 202 for known and unknown emails. Reset consumes the hash in one transaction with `select_for_update`, sets the Django password, and deletes every refresh token. Do not log the user in.
4. **Phase 5.** Change-password requires the current password, rejects the same password, rehashes, and revokes the other refresh tokens. Send reset and change notices through Django email configured from environment variables, using an allowlisted `https` frontend origin. Do not put the raw token or the password in logs or in the message beyond the single reset link.
5. **Phase 6.** Tests for the cases in the brief, against Postgres, including two concurrent resets of one token. Extend `docs/API_WALKTHROUGH.md` only after the behaviour exists.

Existing profile UUIDs stay. Room and message foreign keys stay pointed at those ids. Supabase Auth calls remain until the Django paths pass tests, then login stops using them. Realtime still needs its own short-lived token if Supabase must verify the subscriber. That bridge is not part of this auth phase.

## Phase 1 result

| Item | Result |
| --- | --- |
| Inspected | Account app, Supabase Auth client, throttles, settings, auth routes, auth tests |
| Already working | Generic login 401, generic forgot-password 202, bearer JWT checks, login and password throttles, no tokens in the request log line |
| Defects | Supabase is the authority; no local refresh revocation; reset tokens are not hashed here; register reveals taken emails; no logout-all; no NEXORA reset email |
| Files modified | `docs/AUTH_SECURITY_AUDIT.md` only |
| Migrations | None |
| Tests run | None. This phase did not change behaviour |
| Remaining risk | A client that holds the current refresh token in JavaScript, and a logout that does not make Django reject that token |

Phase 2 is not started.
