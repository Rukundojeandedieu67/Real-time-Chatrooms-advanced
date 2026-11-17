# NEXORA — Frontend Architecture & Technical Design

## 1. Executive Summary

NEXORA is a high-performance, real-time messaging and community platform built with **React 19**, **Vite**, **Tailwind CSS v4**, **React Router v7**, and **Lucide React**.

This frontend is designed as a standalone, enterprise-grade client interface that functions independently using simulated mock services and reactive state managers. It requires **no active backend connection** during frontend iteration and is architected for zero-redesign integration with a Django REST Framework (DRF) backend and Supabase Realtime / WebSockets.

---

## 2. Directory & File Organization

```
frontend/NEXORA/
├── docs/
│   ├── FRONTEND_ARCHITECTURE.md       # Architecture, component structure, design system
│   ├── API_CONTRACTS.md               # Proposed REST and Realtime endpoints
│   └── FRONTEND_BACKEND_INTEGRATION.md# Step-by-step guide for backend integration
├── public/
├── src/
│   ├── components/
│   │   ├── chat/                      # Messaging, thread list, composer, bubbles, reactions
│   │   ├── common/                    # UserAvatar, OnlineIndicator, Modal, Dropdown, SearchBar
│   │   ├── layout/                    # AppLayout, AppSidebar, TopBar, MobileNavigation
│   │   ├── notifications/             # Notification panels and items
│   │   └── rooms/                     # Room cards, directory, members, room settings
│   ├── context/
│   │   ├── AuthContext.jsx            # Current user session and auth actions
│   │   ├── ChatContext.jsx            # Active conversation, message dispatch, typing
│   │   ├── RoomContext.jsx            # Chatroom directory, join/leave, room creation
│   │   ├── NotificationContext.jsx    # System notifications and badges
│   │   └── ToastContext.jsx           # Global user feedback toast alerts
│   ├── mocks/
│   │   ├── users.js                   # Mock user directory with avatars and bios
│   │   ├── conversations.js           # Mock direct messages and guild channels
│   │   ├── messages.js                # Initial message threads with reactions and files
│   │   ├── rooms.js                   # Public/private chatrooms across categories
│   │   └── notifications.js           # Mention, reaction, and security notifications
│   ├── pages/
│   │   ├── auth/                      # Login, Register, Forgot Password, Reset, Verify
│   │   ├── chat/                      # Main split-pane messaging experience
│   │   ├── dashboard/                 # Network activity, online peers, quick actions
│   │   ├── notifications/             # Full notification center
│   │   ├── profile/                   # User profile, presence settings, privacy
│   │   ├── rooms/                     # Room discovery & room detail conversation views
│   │   └── settings/                  # Appearance, security, 2FA, session manager
│   ├── services/
│   │   ├── auth.service.js            # Mock auth operations with simulated latency
│   │   ├── chat.service.js            # Mock messaging and reactions store
│   │   ├── room.service.js            # Mock room directory and membership
│   │   ├── user.service.js            # Mock user identity and preferences
│   │   └── notification.service.js    # Mock alert notifications
│   ├── App.jsx                        # Application root routing & context providers
│   ├── index.css                      # Tailwind v4 import, custom scrollbars, dark tokens
│   └── main.jsx                       # React DOM root entrypoint
├── package.json
└── vite.config.js
```

---

## 3. Routing Architecture

Routing is managed via **React Router**:

| Route | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | User login with demo autofill option |
| `/register` | `RegisterPage` | Account creation with password strength meter |
| `/forgot-password` | `ForgotPasswordPage` | Password recovery initiation |
| `/reset-password` | `ResetPasswordPage` | Setting new cryptographic password |
| `/verify-email` | `EmailVerificationPage` | 6-digit confirmation code verification |
| `/dashboard` | `DashboardPage` | Overview: recent DMs, online peers, room shortcuts |
| `/chat` | `ChatPage` | Primary messaging interface (DMs & group threads) |
| `/chat/:conversationId` | `ChatPage` | Deep link to specific direct message / group |
| `/rooms` | `RoomsPage` | Chatroom directory with category filters & creation |
| `/rooms/:roomId` | `RoomDetailPage` | Dedicated room message feed & active member list |
| `/notifications` | `NotificationsPage` | Filterable notifications feed |
| `/profile` | `ProfilePage` | User profile identity, presence badges, bio |
| `/settings` | `SettingsPage` | Theme appearance, notification sounds, active sessions |

---

## 4. State Management Layer

State is organized into focused React Contexts that interact exclusively through the mock service layer:

1. **`ToastContext`**: Emits floating dismissible alert pills (`success`, `error`, `warning`, `info`) with auto-dismiss timers.
2. **`AuthContext`**: Manages current user state, presence updates (`online`, `away`, `busy`, `offline`), login, register, and logout.
3. **`ChatContext`**: Holds active conversation threads, dispatches messages, edits/deletes messages, toggles reactions, and simulates incoming peer replies.
4. **`RoomContext`**: Handles directory filtering by category, search queries, room joining/leaving, and new channel creation.
5. **`NotificationContext`**: Tracks live unread counts and marks alerts as read.

---

## 5. Mock Service Architecture

UI components **never touch mock datasets directly**. They call asynchronous service methods returning Promises with simulated network latency (100–300ms):

```javascript
// Example: Sending a message from ChatContext
const newMsg = await chatService.sendMessage({
  conversationId: activeConversationId,
  text: 'Hello world',
  attachments: [],
  replyTo: null,
  sender: currentUser
});
```

When Django REST Framework is ready, **only the functions inside `src/services/*.js` need to be modified** to execute `fetch()` or `axios()` requests against backend endpoints.

---

## 6. Design System & Theme Tokens

- **Base Theme**: Pure dark mode (`#0a0b10` background, `#0e1017` secondary, `#121522` elevated cards).
- **Accents**: Electric Blue (`#3b82f6`), Ultraviolet (`#8b5cf6`), Cyan (`#06b6d4`), Emerald (`#10b981`).
- **Borders & Dividers**: Subtle `#1e2335` and `#24293d` outlines with 1px precision.
- **Glassmorphism**: `.glass-dropdown` and `.glass-panel` utilize backdrop blur filters with semi-opaque dark overlays.
- **Micro-Interactions**: Hover transitions, active press scaling, pulsing presence indicators, and custom dark scrollbars.
