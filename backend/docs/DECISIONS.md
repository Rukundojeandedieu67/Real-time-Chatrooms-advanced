# Decisions

These are the choices the spec left open, and the reasons they are in the code.

## Identity

Usernames are lowercase `[a-z0-9_]{3,30}`. Uppercase is a 400. It is not lowercased for the caller, so `Ada` and `ada` cannot both exist by accident.

Email lives in the Supabase user and in the access token. It is not a column and it is not returned on profiles. The login `user` object is the local profile.

A missing or soft-deleted profile after a successful Supabase login returns the same 401 as a bad password. There is no separate `profile_missing` code, so the login response cannot be used to probe which emails have a local row.

Register returns 201. If Supabase did not create a session yet, `email_confirmation_required` is true and the tokens are null. A duplicate email is 409. If the local insert fails after Supabase created the user, the API deletes that Supabase user. If that cleanup also fails, it is logged and the client still gets the original error.

## Rooms

`POST /rooms` accepts defaults (`is_private` false, `max_members` 100, empty description). `PUT /rooms/{id}` requires every field. `PATCH` requires at least one.

Room names are 3–60 characters with no line breaks. Descriptions are stripped and capped at 300. `max_members` is an integer from 1 to 10000, and it cannot drop below the current member count.

Public room names are unique, case-insensitively, among rooms that are not deleted. Private rooms may reuse a name.

Join of a public room is 201. Joining again is 409 `already_member`. A full room is 409 `room_full`. Join, leave, role change, and kick lock the room row with `select_for_update`.

When the owner leaves, the oldest admin becomes owner. If there is no admin, the oldest member does. Age is `joined_at`, then id. If the owner is alone, the room is soft-deleted. Leave is 204.

`muted` is stored on the membership. There is no endpoint to change it yet.

Invites default to 7 days and 10 uses. The bounds are 1–720 hours and 1–100 uses. A bad, expired, exhausted, or deleted-room invite is 404 `invite_invalid`. Creating an invite retries on code collision inside a savepoint so one duplicate does not abort the request.

## Messages

The body check is `char_length(body) <= 2000` via `RunSQL`. A regex such as `[\s\S]{0,2000}` is illegal in PostgreSQL because a bounded repeat cannot exceed 255.

An empty body is allowed only when the message links at least one attachment. History keeps deleted messages as placeholders with a null body. Search skips them. The room card preview says "Message deleted" or "Attachment" when that is the latest row.

`client_message_id` is unique per room and sender. A repeat returns 200 and the original message. The first send is 201.

Edit is the author and only for 15 minutes. Delete is the author or a room owner or admin, returns 200, clears the body, and best-effort deletes attachment objects.

Reactions use shortcodes (`like`, `love`, `laugh`, `wow`, `sad`, `celebrate`, `fire`, `eyes`, `yes`, `no`) so the path does not contain a raw emoji. The glyph is in the JSON. Repeating a reaction is 200. The first one is 201. Removing a missing reaction is 404.

Read markers move only forward, compared by `created_at`. A cursor `before` walks newest-first and is the id of the last row of the previous page.

## Attachments and avatars

An attachment row is created before the message, with `message` null, plus `room` and `uploaded_by`. Send links pending rows owned by that user in that room. Orphaned uploads are possible. The upload throttle is the limit on that. There is no sweeper.

Both buckets (`avatars` and `attachments`) are private. Responses contain signed URLs, cached until shortly before they expire. Room avatars live in the avatars bucket under `rooms/{room_id}/`.

## Presence and realtime

Heartbeat updates `status` and `last_seen_at`. It does not broadcast. A user is present when status is `online` or `away` and `last_seen_at` is inside 60 seconds. Typing lasts 5 seconds and is deleted lazily on read.

Broadcasts are scheduled with `transaction.on_commit`. The payload is `{event, data, sent_at}` on topic `room:{id}` with `private: true`. A failed or unconfigured broadcast is logged and the HTTP request still succeeds.

## Account deletion

Memberships are removed even from archived rooms, so leave does not 404 mid-delete. The username becomes `d` plus 29 hex characters of the profile id. Supabase is banned for `876000h` inside the transaction. Avatar blob deletion happens after commit and is best-effort.

## Admin and analytics

Django admin is for operators with a Django user. Chat users do not use it.

Global admin changes only the analytics room list. Room stats still require membership, and a private room the caller is not in is 404.

## Local versus Supabase

RLS is not in Django migrations. Local Postgres has no `auth.uid()` and no `realtime` schema. Apply `docs/supabase_rls.sql` on the Supabase project after migrate.

Tests use `TEST_DATABASE_URL`, never the app `DATABASE_URL`, so a developer `.env` cannot point pytest at production.

Unread counts are computed in Python for the rooms on the current page. That is N queries per page and is acceptable at the default page size.

CORS may be a comma-separated list in local development. Production should be one origin.

`/health`, `/schema`, and `/docs` exist at the site root and under `/api/v1/`, so a host can probe `/health` and a client can stay under the versioned prefix.
