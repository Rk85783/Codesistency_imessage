# imessage — Backend

Express 5 + Mongoose + Socket.IO + Clerk auth. Supports media uploads via ImageKit.

## Setup

Copy `.env` (see `AGENTS.md` for required vars) and install:

```bash
npm install
npm run dev      # nodemon on src/index.js (port 3000)
```

## Commands

| command | what |
|---------|------|
| `npm run dev` | nodemon dev server |
| `npm run start` | `node src/index.js` |
| `npm run build` | copies `src/` → `dist/` (no bundler) |
| `npm run db:seed` | seeds 20 fake users into MongoDB |

## API

| method | path | auth | description |
|--------|------|------|-------------|
| GET | `/health` | — | health check |
| GET | `/api/auth/check` | ✓ | returns the current MongoDB user doc |
| GET | `/api/messages/users` | ✓ | all users except the logged-in user |
| GET | `/api/messages/conversations` | ✓ | conversation partners, sorted by most recent message |
| GET | `/api/messages/:id` | ✓ | messages between you and user `:id` |
| POST | `/api/messages/send/:id` | ✓ | send a message (text + optional image/video via `media` field) |
| POST | `/api/webhooks/clerk` | — | Clerk webhook (raw body, registered before `express.json()`) |

## Auth

Clerk SDK handles sign-in/sign-up. The `protectRoute` middleware reads the Clerk JWT via `@clerk/express`, then finds the MongoDB user by `clerkId`. The Clerk webhook syncs `user.created` / `user.updated` / `user.deleted` events to MongoDB.

## Production

In production Express serves the Vite-built SPA from `public/`. The Dockerfile handles multi-stage building.
