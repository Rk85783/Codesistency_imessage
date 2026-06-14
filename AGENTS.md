# imessage — MERN real-time chat app

## Structure

Two independent packages at repo root, no workspace manager:

```
backend/     Express 5 + Mongoose + Socket.IO + Clerk auth
frontend/    React 19 + Vite 8 + Tailwind 4 + Zustand + HeroUI
```

## Commands

| directory | command | what |
|-----------|---------|------|
| `backend/` | `npm run dev` | nodemon on `src/index.js` (PORT=3000) |
| `backend/` | `npm run start` | `node src/index.js` |
| `backend/` | `npm run build` | cross-platform: `node -e "fs.rmSync('dist',{recursive:true,force:true});fs.cpSync('src','dist',{recursive:true})"` |
| `backend/` | `npm run db:seed` | seeds 20 fake users into MongoDB |
| `frontend/` | `npm run dev` | Vite dev server (PORT=5173) |
| `frontend/` | `npm run build` | Vite production build |
| `frontend/` | `npm run lint` | ESLint flat config |
| repo root  | `docker build .` | multi-stage: builds frontend then backend, runtime serves SPA from `backend/public/` |

## Key files and entrypoints

- **Backend entry**: `backend/src/index.js` — imports socket, DB, cron, routes
- **Socket.IO setup**: `backend/src/lib/socket.js` — exports `app`, `server`, `io`, `getReceiverSocketId()`. Uses `Map<userId, Set<socketId>>` for multi-tab support. Handles `typing:start`, `typing:stop`, and `markAsRead` events (forwards to receiver's sockets).
- **Auth middleware**: `backend/src/middleware/auth.middleware.js` — reads Clerk `userId`, looks up MongoDB user by `clerkId`, sets `req.user`
- **Clerk webhook**: `backend/src/webhooks/clerk.webhook.js` — synced BEFORE `express.json()` via `express.raw()`
- **Frontend entry**: `frontend/src/main.jsx` — ClerkProvider > BrowserRouter > App
- **Zustand stores**: `frontend/src/store/useAuthStore.js` (auth + socket lifecycle), `useChatStore.js` (messages, conversations, persisted to localStorage key `imessage-storage`, only `isSoundEnabled` survives refresh)
- **Axios instance**: `frontend/src/lib/axios.js` — baseURL is `http://localhost:3000/api` (dev) or `/api` (prod); `withCredentials: true`

## Architecture notes

- **Auth flow**: Clerk SDK handles sign-in/sign-up. Clerk webhook creates/updates/deletes MongoDB users. Backend `protectRoute` reads `userId` from Clerk's JWT via `@clerk/express`, then queries MongoDB by `clerkId`. The `GET /api/auth/check` endpoint returns the full MongoDB user doc.
- **Socket.IO lifecycle**: `useAuthStore.connectSocket()` connects after `checkAuth` succeeds, passing `userId` as query param. The server uses `Map<userId, Set<socketId>>` for multi-tab support. Emits `newMessage` to all receiver sockets (or `markAsRead` to all sender sockets). `getUserSocketIds()` returns all socket IDs for a user.
- **Media uploads**: multer reads into memory (25 MB cap, images/video only). `@imagekit/nodejs` uploads to ImageKit folder `/chat`. The returned URL is stored in the message document. Frontend transforms ImageKit URLs on-the-fly via `tr` query param (`frontend/src/lib/imagekit.js`).
- **Typing indicators**: `ChatComposer` emits `typing:start`/`typing:stop` via socket with 2s idle timeout. Backend forwards to receiver's sockets. `ChatHeader` displays "Typing..." when `isPeerTyping` is true. Resets on conversation switch.
- **markAsRead**: Emitted via socket when opening a conversation and on each new peer message. Backend forwards to sender's sockets.
- **Cron**: pings `GET /health` every 14 minutes in production (keep free-tier services awake).
- **Conversations endpoint**: `GET /api/messages/conversations` uses MongoDB aggregate pipeline to invert sender/receiver and return the other user's profile (not a separate conversation collection — conversations are computed from message pairs).
- **Dev vs prod**: In dev, frontend Vite dev server calls backend at `http://localhost:3000/api`. In prod, Express serves the built SPA from `backend/public/` and a catch-all `/{*any}` route serves `index.html`.
- **Docker**: Build requires `--build-arg VITE_CLERK_PUBLISHABLE_KEY`. The runtime image runs as `node` user on port 3001.

## Environment variables

**Backend** (`backend/.env`):
```
NODE_ENV, PORT (default 3000), MONGO_URI, CLERK_PUBLISHABLE_KEY,
CLERK_SECRET_KEY, CLERK_WEBHOOK_SIGNING_SECRET,
IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT,
FRONTEND_URL (default http://localhost:5173)
```

**Frontend** (`frontend/.env`):
```
VITE_CLERK_PUBLISHABLE_KEY
```

## Conventions and gotchas

- Webhook route (`/api/webhooks/clerk`) must be registered before `express.json()` — it uses `express.raw()`.
- Backend uses ESM (`"type": "module"`) throughout.
- No tests exist in the repo.
- ESLint uses flat config (`eslint.config.js`), no `.eslintrc`.
- `useChatStore.setActiveConversationId()` resolves both `users` and `conversations` arrays to set `selectedUser`.
- `useChatStore.sendMediaMessage()` wraps `file` in `FormData` with key `"media"`.
- **Message pagination**: `GET /api/messages/:id?page=1&limit=50` — page 1 = newest, reversed after fetch for asc display. `hasMore` field indicates more pages.
- **Message search**: `GET /api/messages/search/:userId?q=` — regex search between the two users, limited to 20 results.
- **Reply-to**: Message model has `replyTo` field (ObjectId ref to Message). Populated on fetch. Frontend previews quoted message above composer and in message bubble.
- **Emoji picker**: Uses `emoji-picker-react` in a HeroUI Popover inside `ChatComposer`. Clicking inserts emoji at cursor position.
- ESLint 10.5.0 has `util.styleText` error on Node 20.11.1 — pre-existing.
- `backend/.env` is NOT in `.gitignore` at repo root (only `.env` is), but has its own `.gitignore` that ignores `.env`. Both `.env` files contain real dev secrets — never commit them.
