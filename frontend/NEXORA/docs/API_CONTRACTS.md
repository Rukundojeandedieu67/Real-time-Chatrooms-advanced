# NEXORA — PROPOSED API CONTRACTS

> [!IMPORTANT]
> **PROPOSED FRONTEND INTEGRATION CONTRACTS**
> These specifications represent the contract shape implemented by the NEXORA frontend mock services.
> Cursor / Backend Engineers should compare these proposed endpoints and JSON payloads against the existing Django REST API and adjust the service calls accordingly.

---

## 1. Authentication & Session Management

### 1.1 User Registration
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/register/`
- **Auth**: None
- **Request Body**:
```json
{
  "name": "Elena Rostova",
  "username": "elena_r",
  "email": "elena@nexora.io",
  "password": "SecurePassword123!"
}
```
- **Response (201 Created)**:
```json
{
  "user": {
    "id": "usr_002",
    "name": "Elena Rostova",
    "username": "elena_r",
    "email": "elena@nexora.io",
    "avatar": "https://...",
    "status": "online"
  },
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi..."
}
```
- **Errors**: `400 Bad Request` (`{"email": ["A user with this email already exists."]}`)

---

### 1.2 User Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login/`
- **Auth**: None
- **Request Body**:
```json
{
  "email": "alex.rivera@nexora.io",
  "password": "password123"
}
```
- **Response (200 OK)**:
```json
{
  "user": {
    "id": "usr_curr_001",
    "name": "Alex Rivera",
    "username": "alex_rivera",
    "email": "alex.rivera@nexora.io",
    "avatar": "https://...",
    "title": "Lead Systems Architect",
    "status": "online"
  },
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi..."
}
```
- **Errors**: `401 Unauthorized` (`{"detail": "No active account found with the given credentials."}`)

---

### 1.3 Token Refresh
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/token/refresh/`
- **Auth**: None
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response (200 OK)**:
```json
{
  "access": "eyJhbGciOi..."
}
```

---

### 1.4 Logout
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/logout/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
- **Response (200 OK)**:
```json
{
  "detail": "Successfully logged out."
}
```

---

### 1.5 Password Recovery & Reset
- **Forgot Password**: `POST /api/v1/auth/password/reset/`
  - Body: `{"email": "alex.rivera@nexora.io"}`
  - Response: `{"detail": "Password reset e-mail has been sent."}`
- **Reset Confirm**: `POST /api/v1/auth/password/reset/confirm/`
  - Body: `{"token": "token123", "new_password": "NewPassword123!"}`
  - Response: `{"detail": "Password has been reset with the new password."}`

---

## 2. Current User & Profiles

### 2.1 Get Current User (`me`)
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/me/`
- **Auth**: `Bearer <token>`
- **Response (200 OK)**:
```json
{
  "id": "usr_curr_001",
  "name": "Alex Rivera",
  "username": "alex_rivera",
  "email": "alex.rivera@nexora.io",
  "avatar": "https://...",
  "title": "Lead Systems Architect",
  "bio": "Building resilient decentralized communication protocols.",
  "status": "online",
  "statusMessage": "Refactoring WebSocket heartbeat ⚡",
  "location": "Zurich / Remote",
  "stats": {
    "roomsJoined": 8,
    "messagesSent": 1420,
    "reactionsGiven": 390
  },
  "preferences": {
    "theme": "dark",
    "accentColor": "blue",
    "fontSize": "medium",
    "soundEnabled": true,
    "desktopNotifications": true
  }
}
```

### 2.2 Update Current User Profile
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/me/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "name": "Alex Rivera",
  "title": "Principal Systems Engineer",
  "bio": "Updated technical biography",
  "location": "Zurich, Switzerland"
}
```

### 2.3 Update Presence
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/me/presence/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "status": "away",
  "statusMessage": "In simulation lab 🔬"
}
```

---

## 3. Conversations & Direct Messaging

### 3.1 List Conversations
- **Method**: `GET`
- **Endpoint**: `/api/v1/conversations/`
- **Auth**: `Bearer <token>`
- **Response (200 OK)**:
```json
[
  {
    "id": "conv_dm_001",
    "type": "direct",
    "title": "Dr. Elena Rostova",
    "participant": {
      "id": "usr_002",
      "name": "Dr. Elena Rostova",
      "username": "elena_rostova",
      "avatar": "https://...",
      "status": "online"
    },
    "lastMessage": {
      "id": "msg_010",
      "text": "The KV cache pruning dropped latency by 38%...",
      "timestamp": "2026-11-17T15:35:00Z",
      "read": true
    },
    "unreadCount": 0,
    "pinned": true
  }
]
```

### 3.2 Get Messages in Conversation / Room
- **Method**: `GET`
- **Endpoint**: `/api/v1/conversations/:id/messages/` (or `/api/v1/rooms/:id/messages/`)
- **Query Params**: `?limit=50&before=<timestamp>`
- **Auth**: `Bearer <token>`
- **Response (200 OK)**:
```json
[
  {
    "id": "msg_001_01",
    "conversationId": "conv_dm_001",
    "senderId": "usr_002",
    "senderName": "Dr. Elena Rostova",
    "senderAvatar": "https://...",
    "text": "Hey Alex! Did you get a chance to inspect the attention head...",
    "timestamp": "2026-11-17T15:10:00Z",
    "status": "read",
    "replyTo": null,
    "attachments": [],
    "reactions": [
      { "emoji": "⚡", "count": 2, "users": ["usr_curr_001", "usr_002"] }
    ],
    "edited": false
  }
]
```

### 3.3 Send Message
- **Method**: `POST`
- **Endpoint**: `/api/v1/conversations/:id/messages/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "text": "That curve looks outstanding. I will integrate the inference pipeline.",
  "replyToId": "msg_001_03",
  "attachmentIds": ["att_01"]
}
```

### 3.4 Edit Message
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/messages/:id/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "text": "Updated message content"
}
```

### 3.5 Delete Message
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/messages/:id/`
- **Auth**: `Bearer <token>`
- **Response (204 No Content)**

### 3.6 Toggle Reaction
- **Method**: `POST`
- **Endpoint**: `/api/v1/messages/:id/reactions/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "emoji": "🚀"
}
```

---

## 4. Chatrooms

### 4.1 List & Discover Rooms
- **Method**: `GET`
- **Endpoint**: `/api/v1/rooms/`
- **Query Params**: `?category=All&search=quantum&filter=public`
- **Auth**: `Bearer <token>`
- **Response (200 OK)**:
```json
[
  {
    "id": "room_001",
    "name": "ai-autonomous-agents",
    "title": "AI & Autonomous Agents",
    "category": "AI & Robotics",
    "description": "Deep dive into multi-agent workflows...",
    "isPrivate": false,
    "memberCount": 524,
    "isJoined": true,
    "avatar": "🤖",
    "topic": "Exploring self-correcting planning loops..."
  }
]
```

### 4.2 Create Room
- **Method**: `POST`
- **Endpoint**: `/api/v1/rooms/`
- **Auth**: `Bearer <token>`
- **Request Body**:
```json
{
  "name": "quantum-algorithms",
  "title": "Quantum Algorithms & QASM",
  "category": "Quantum Computing",
  "description": "Discussions on quantum circuit synthesis",
  "isPrivate": false,
  "topic": "NISQ simulations",
  "rules": ["Be constructive and cite papers."]
}
```

### 4.3 Join / Leave Room
- **Join**: `POST /api/v1/rooms/:id/join/` -> `200 OK`
- **Leave**: `POST /api/v1/rooms/:id/leave/` -> `200 OK`

---

## 5. File & Image Attachments

### 5.1 Upload Attachment
- **Method**: `POST`
- **Endpoint**: `/api/v1/attachments/upload/`
- **Auth**: `Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Response (201 Created)**:
```json
{
  "id": "att_01",
  "name": "kv-cache-latency-v2.png",
  "size": "1.4 MB",
  "type": "image/png",
  "url": "https://storage.nexora.io/attachments/kv-cache-latency-v2.png"
}
```

---

## 6. Notifications

### 6.1 List Notifications
- **Method**: `GET`
- **Endpoint**: `/api/v1/notifications/`
- **Auth**: `Bearer <token>`

### 6.2 Mark Notification Read
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/notifications/:id/read/`
- **Auth**: `Bearer <token>`

### 6.3 Mark All Read
- **Method**: `POST`
- **Endpoint**: `/api/v1/notifications/mark-all-read/`
- **Auth**: `Bearer <token>`
