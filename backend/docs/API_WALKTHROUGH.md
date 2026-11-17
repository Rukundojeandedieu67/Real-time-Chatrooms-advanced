# API walkthrough

Base URL below is `http://localhost:8000`. Send `Content-Type: application/json` except for uploads. Authenticated calls send `Authorization: Bearer $ACCESS`.

Errors look like:

```json
{ "error": { "code": "not_a_member", "message": "Join this room before sending messages", "details": {} } }
```

## Health, schema, docs

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/schema?format=json
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/docs
```

The same three paths exist under `/api/v1/`.

## Auth

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"CorrectHorse1","username":"ada","display_name":"Ada Lovelace"}'

curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"CorrectHorse1"}'
```

Copy `access_token` into `ACCESS` and `refresh_token` into `REFRESH`.

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH\"}"

curl -s -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS"

curl -s -X POST http://localhost:8000/api/v1/auth/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"RECOVERY_TOKEN","new_password":"CorrectHorse2"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/auth/password/change \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"current_password":"CorrectHorse1","new_password":"CorrectHorse2"}'

curl -s -X POST http://localhost:8000/api/v1/auth/email/resend \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com"}'
```

Forgot and resend return 202 with the same message whether or not the email exists. Reset and change return 204.

## Profiles

```bash
curl -s http://localhost:8000/api/v1/users/me -H "Authorization: Bearer $ACCESS"

curl -s -X PUT http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"username":"ada","display_name":"Ada","bio":"Analytical engines.","status":"online"}'

curl -s -X PATCH http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"status":"away"}'

curl -s -X PUT http://localhost:8000/api/v1/users/me/avatar \
  -H "Authorization: Bearer $ACCESS" \
  -F "file=@avatar.png"

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8000/api/v1/users/me/avatar \
  -H "Authorization: Bearer $ACCESS"

curl -s "http://localhost:8000/api/v1/users?search=ada" -H "Authorization: Bearer $ACCESS"
curl -s http://localhost:8000/api/v1/users/$USER_ID -H "Authorization: Bearer $ACCESS"

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS"
```

## Rooms

```bash
curl -s -X POST http://localhost:8000/api/v1/rooms \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"name":"general","description":"Hello","is_private":false,"max_members":100}'

curl -s "http://localhost:8000/api/v1/rooms?scope=mine" -H "Authorization: Bearer $ACCESS"
curl -s "http://localhost:8000/api/v1/rooms?scope=public" -H "Authorization: Bearer $ACCESS"
curl -s http://localhost:8000/api/v1/rooms/$ROOM -H "Authorization: Bearer $ACCESS"

curl -s -X PUT http://localhost:8000/api/v1/rooms/$ROOM \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"name":"general","description":"Updated","is_private":false,"max_members":50}'

curl -s -X PATCH http://localhost:8000/api/v1/rooms/$ROOM \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"description":"Shorter"}'

curl -s -X PUT http://localhost:8000/api/v1/rooms/$ROOM/avatar \
  -H "Authorization: Bearer $ACCESS" -F "file=@room.png"

curl -s -X POST http://localhost:8000/api/v1/rooms/$ROOM/join -H "Authorization: Bearer $ACCESS"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/rooms/$ROOM/leave \
  -H "Authorization: Bearer $ACCESS"

curl -s http://localhost:8000/api/v1/rooms/$ROOM/members -H "Authorization: Bearer $ACCESS"

curl -s -X PATCH http://localhost:8000/api/v1/rooms/$ROOM/members/$USER_ID \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE \
  http://localhost:8000/api/v1/rooms/$ROOM/members/$USER_ID \
  -H "Authorization: Bearer $ACCESS"

curl -s -X POST http://localhost:8000/api/v1/rooms/$ROOM/invites \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"max_uses":10,"expires_in_hours":168}'

curl -s -X POST http://localhost:8000/api/v1/invites/$CODE/accept \
  -H "Authorization: Bearer $ACCESS"

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8000/api/v1/rooms/$ROOM \
  -H "Authorization: Bearer $ACCESS"
```

`scope` is `mine` (default) or `public`. Private non-members get 404. Join twice or a full room returns 409.

## Messages

```bash
curl -s "http://localhost:8000/api/v1/rooms/$ROOM/messages?limit=50" \
  -H "Authorization: Bearer $ACCESS"

curl -s "http://localhost:8000/api/v1/rooms/$ROOM/messages?before=$MESSAGE&q=hello" \
  -H "Authorization: Bearer $ACCESS"

curl -s -X POST http://localhost:8000/api/v1/rooms/$ROOM/messages \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d "{\"body\":\"hello\",\"client_message_id\":\"$CLIENT_ID\"}"

curl -s -X POST http://localhost:8000/api/v1/rooms/$ROOM/attachments \
  -H "Authorization: Bearer $ACCESS" -F "file=@photo.png"

curl -s http://localhost:8000/api/v1/messages/$MESSAGE -H "Authorization: Bearer $ACCESS"

curl -s -X PATCH http://localhost:8000/api/v1/messages/$MESSAGE \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"body":"hello edited"}'

curl -s -X DELETE http://localhost:8000/api/v1/messages/$MESSAGE \
  -H "Authorization: Bearer $ACCESS"

curl -s -X PUT http://localhost:8000/api/v1/messages/$MESSAGE/reactions/like \
  -H "Authorization: Bearer $ACCESS"

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE \
  http://localhost:8000/api/v1/messages/$MESSAGE/reactions/like \
  -H "Authorization: Bearer $ACCESS"

curl -s -X POST http://localhost:8000/api/v1/rooms/$ROOM/read \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d "{\"last_read_message_id\":\"$MESSAGE\"}"
```

Reaction shortcodes: `like`, `love`, `laugh`, `wow`, `sad`, `celebrate`, `fire`, `eyes`, `yes`, `no`.

Sending the same `client_message_id` again returns 200 and the original body. A non-member of a public room gets 403. A non-member of a private room gets 404.

## Typing, presence, analytics

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/rooms/$ROOM/typing \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"is_typing":true}'

curl -s http://localhost:8000/api/v1/rooms/$ROOM/typing -H "Authorization: Bearer $ACCESS"

curl -s -X POST http://localhost:8000/api/v1/presence/heartbeat \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" \
  -d '{"status":"online"}'

curl -s http://localhost:8000/api/v1/rooms/$ROOM/presence -H "Authorization: Bearer $ACCESS"

curl -s http://localhost:8000/api/v1/analytics/messages-per-room -H "Authorization: Bearer $ACCESS"
curl -s http://localhost:8000/api/v1/rooms/$ROOM/stats -H "Authorization: Bearer $ACCESS"
```

Subscribe on Supabase Realtime to the private channel `room:{room_id}`. Events: `message.created`, `message.updated`, `message.deleted`, `reaction.changed`, `typing`, `member.joined`, `member.left`, `member.role_changed`. Each payload is `{ "event", "data", "sent_at" }`.
