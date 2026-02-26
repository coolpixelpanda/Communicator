# Communicator

A real-time chat application with a **React** frontend and **C# ASP.NET Core** backend.

## Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)

### 1. Start the backend

```bash
cd backend/Communicator.Api
dotnet run
```

The API will start on `http://localhost:5000`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will open on `http://localhost:5173`. The Vite dev server proxies `/api` requests to the backend.

### 3. Try it out

1. Open two browser tabs at `http://localhost:5173`
2. Register two different accounts
3. Start chatting!

To test offline mode: open DevTools → Network → toggle "Offline", send a message, then go back online — queued messages will be delivered automatically.

---

## Architecture & Design Decisions

### Simplifications Made

| Area | Decision | Rationale |
|------|----------|-----------|
| **Storage** | In-memory (`ConcurrentDictionary`) | No database setup needed. Data resets on restart. |
| **Real-time** | Active polling (3s messages, 5s users, 4s unread) | Simpler than WebSockets/SignalR. Easy to understand and debug. |
| **Password hashing** | PBKDF2 (SHA-256, 100k iterations) | Built-in .NET crypto, no extra packages. Production-grade security. |
| **Styling** | Tailwind CSS | Utility-first CSS with no custom stylesheets. Slack-inspired dark sidebar layout. |
| **Token storage** | localStorage | Simpler than httpOnly cookies for a demo. In production, use secure cookies. |
| **Notifications** | Web Audio API for sound | Generates a tone programmatically — no audio file dependencies. |

### How Offline Support Works

1. The frontend detects connectivity via `navigator.onLine` and `online`/`offline` browser events.
2. When offline, outgoing messages are stored in `localStorage` with a client-generated UUID (`clientId`).
3. When connectivity returns, the queue is flushed — each message is sent to the server.
4. The server deduplicates by `clientId`, so retrying the same message is safe (idempotent).
5. Messages appear immediately in the UI (optimistic rendering) regardless of connection state.

### How Unread Tracking Works

1. Each `Message` has an `IsRead` boolean, defaulting to `false` when created.
2. When a user opens a conversation, `PUT /api/messages/read/{contactId}` marks all messages from that contact as read.
3. `GET /api/messages/unread-counts` returns per-sender unread counts — the sidebar polls this every 4 seconds.
4. Unread conversations show a **red badge** with the count and **bold white text** (Slack-style).
5. The browser tab title shows the total unread count: `(3) Communicator`.

### How Notifications Work

1. On first load, the app requests browser Notification permission.
2. When a new message arrives from someone *other than* the currently open conversation, a desktop notification is shown.
3. A short two-tone notification sound plays via the Web Audio API (no external audio file needed).
4. Clicking a notification focuses the browser window.
5. Notifications auto-dismiss after 5 seconds.
6. When the tab is in focus, only the sound plays (no intrusive popup).

### Security Measures

- JWT authentication on all endpoints except `/api/auth/*`
- Passwords hashed with PBKDF2 (SHA-256, 100,000 iterations, random 16-byte salt)
- CORS restricted to the frontend origin
- Input validation on all endpoints
- Token expiry (12 hours)

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/users` | Yes | List all other users |
| POST | `/api/messages` | Yes | Send a message (with clientId for dedup) |
| GET | `/api/messages/conversation/{contactId}` | Yes | Get conversation history |
| GET | `/api/messages/poll?since={datetime}` | Yes | Poll for new incoming messages |
| PUT | `/api/messages/read/{contactId}` | Yes | Mark messages from a contact as read |
| GET | `/api/messages/unread-counts` | Yes | Get unread counts per sender |

### Project Structure

```
Communicator/
├── backend/
│   └── Communicator.Api/
│       ├── Controllers/        # API endpoints (Auth, Users, Messages)
│       ├── Models/             # Domain models & DTOs
│       ├── Services/           # Business logic (UserStore, MessageStore, TokenService)
│       └── Program.cs          # App configuration & middleware pipeline
├── frontend/
│   └── src/
│       ├── api.ts              # HTTP client layer
│       ├── types.ts            # TypeScript interfaces
│       ├── context/            # React auth context
│       ├── hooks/              # usePolling, useOfflineQueue, useNotifications
│       ├── pages/              # AuthPage, ChatPage
│       ├── components/         # Avatar, UserList, ChatWindow
│       └── utils/              # Avatar color generation
└── README.md
```

### What I'd Add With More Time

- **SignalR** for real-time push instead of polling
- **SQLite/PostgreSQL** persistence
- Proper **refresh token** flow
- **Typing indicators**
- Message **pagination** (currently loads full conversation)
- **E2E tests** with Playwright
- **Docker Compose** for one-command startup
