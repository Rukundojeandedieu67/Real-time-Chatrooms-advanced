# NEXORA — Frontend & Backend Integration Guide

This guide is designed for **Cursor** and backend engineers who will connect the NEXORA frontend to the existing Django REST Framework backend and real-time infrastructure (WebSockets / Supabase Realtime).

---

## 1. Principles of Integration

1. **Zero UI Rewrite**: The components and React Context providers (`AuthContext`, `ChatContext`, `RoomContext`, `NotificationContext`) are completely decoupled from data fetching. They only consume service functions located in `src/services/`.
2. **Replacement Points**: To connect to Django, simply update the files in `src/services/` to replace mock delay timers and memory stores with real HTTP requests (`fetch` or `axios`).
3. **Authentication Token Persistence**: Currently, authentication status is persisted in `localStorage` under `nexora_demo_user` for previewing. When integrating Django SimpleJWT or session tokens:
   - Store the access token in memory or secure HTTP-only cookies.
   - Attach the `Authorization: Bearer <token>` header on outbound requests via an interceptor.

---

## 2. Environment Configuration

Create a `.env` file in `frontend/NEXORA/`:

```env
# Django REST Framework Base URL
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Realtime Provider (Django Channels WebSockets OR Supabase Realtime)
VITE_WS_URL=ws://localhost:8000/ws
# Or if using Supabase:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## 3. Step-by-Step Service Replacement

### Step 3.1: Create an API Client (`src/services/api.client.js`)

Create a centralized Axios or Fetch client with authentication interceptors:

```javascript
// src/services/api.client.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiClient(endpoint, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem('access_token');
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'API request failed');
  }
  return response.json();
}
```

---

### Step 3.2: Replace `src/services/auth.service.js`

Replace mock delays with real API calls:

```javascript
// src/services/auth.service.js
import { apiClient } from './api.client';

export const authService = {
  async getCurrentUser() {
    return apiClient('/users/me/');
  },
  async login({ email, password }) {
    const res = await apiClient('/auth/login/', {
      method: 'POST',
      body: { email, password },
    });
    localStorage.setItem('access_token', res.access_token);
    return res;
  },
  async register(data) {
    const res = await apiClient('/auth/register/', {
      method: 'POST',
      body: data,
    });
    localStorage.setItem('access_token', res.access_token);
    return res;
  },
  async logout() {
    await apiClient('/auth/logout/', { method: 'POST' });
    localStorage.removeItem('access_token');
  },
};
```

---

### Step 3.3: Replace `src/services/chat.service.js` & `src/services/room.service.js`

Map the methods to Django endpoints:
- `getConversations()` ➔ `GET /api/v1/conversations/`
- `getMessages(conversationId)` ➔ `GET /api/v1/conversations/${conversationId}/messages/`
- `sendMessage({ conversationId, text, attachments, replyTo })` ➔ `POST /api/v1/conversations/${conversationId}/messages/`
- `toggleReaction({ messageId, emoji })` ➔ `POST /api/v1/messages/${messageId}/reactions/`
- `getRooms({ category, search, filter })` ➔ `GET /api/v1/rooms/?category=${category}&search=${search}&filter=${filter}`
- `joinRoom(roomId)` ➔ `POST /api/v1/rooms/${roomId}/join/`
- `leaveRoom(roomId)` ➔ `POST /api/v1/rooms/${roomId}/leave/`
- `createRoom(data)` ➔ `POST /api/v1/rooms/`

---

## 4. Connecting Real-Time Subscriptions

For real-time messages, reactions, typing indicators, and presence updates:

### If using Supabase Realtime:
In `src/context/ChatContext.jsx`, add a listener to the active room channel:

```javascript
useEffect(() => {
  if (!activeConversationId) return;

  const channel = supabase
    .channel(`room:${activeConversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${activeConversationId}`
    }, (payload) => {
      setMessages((prev) => [...prev, payload.new]);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeConversationId]);
```

### If using Django Channels / WebSockets:
```javascript
useEffect(() => {
  if (!activeConversationId) return;

  const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/chat/${activeConversationId}/`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'chat_message') {
      setMessages((prev) => [...prev, data.message]);
    } else if (data.type === 'typing') {
      setIsTyping(data.is_typing);
    }
  };

  return () => {
    ws.close();
  };
}, [activeConversationId]);
```

---

## 5. Verification Checklist for Cursor

- [ ] Inspect existing Django URL routes in `backend/` and verify endpoint names against `docs/API_CONTRACTS.md`.
- [ ] Align payload property names (e.g., camelCase vs snake_case).
- [ ] Configure CORS in Django (`django-cors-headers`) to allow the frontend origin (`http://localhost:5173`).
- [ ] Confirm Django authentication tokens (SimpleJWT `Bearer` or DRF Token authentication).
- [ ] Test the message flow from `MessageComposer` through Django REST to the database.
