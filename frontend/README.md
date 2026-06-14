# imessage — Frontend

React 19 · Vite 8 · Tailwind 4 · Zustand · HeroUI · Clerk · Socket.IO client

## Setup

```bash
npm install
npm run dev      # Vite dev server (port 5173)
```

Proxy: In dev mode, API calls go to `http://localhost:3000/api` (the backend). In prod, they go to `/api` on the same host.

## Commands

| command | what |
|---------|------|
| `npm run dev` | Vite dev server |
| `npm run build` | production build → `dist/` |
| `npm run lint` | ESLint (flat config) |
| `npm run preview` | preview production build |

## Structure

```
src/
├── main.jsx           entry — ClerkProvider → BrowserRouter → App
├── App.jsx            routes, auth gate, theme/wallpaper providers
├── store/
│   ├── useAuthStore.js    auth state + socket lifecycle
│   └── useChatStore.js    messages, conversations, persisted (only isSoundEnabled)
├── lib/
│   ├── axios.js           preconfigured Axios instance
│   ├── imagekit.js        ImageKit URL transformation helpers
│   └── utils.js
├── pages/             AuthPage, ChatPage
├── components/        auth/, chat/, ThemeToggle, WallpaperPicker, PageLoader
├── context/           ThemeContext, WallpaperContext
├── hooks/             useKeyboardSound, useScrollToBottom, etc.
└── data/              wallpapers, HeroUI theme presets
```

## Key details

- **Auth**: Clerk SDK gates routes. `useAuthStore.checkAuth()` is called after Clerk confirms sign-in; it calls `GET /api/auth/check` then connects Socket.IO.
- **Socket.IO**: Connects automatically on auth with `userId` query param. Listens for `getOnlineUsers` and `newMessage` events.
- **Persistence**: Zustand middleware persists to localStorage key `imessage-storage`. Only `isSoundEnabled` is persisted (others reset on refresh).
- **Media**: Sent as `FormData` with key `"media"`. ImageKit URLs are transformed at render time via `?tr=` query param.
