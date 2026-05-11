# Tavern Table — D&D Virtual Tabletop

A browser-based, real-time multiplayer 2D D&D virtual tabletop for private friend groups (6–8 players + DM).

## Architecture

```
packages/
  shared/   — TypeScript types and constants shared by client + server
  server/   — Node.js + Express + Socket.io + Prisma (PostgreSQL)
  client/   — React + Vite + Pixi.js + Zustand + Tailwind
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Vite | Fast DX, great ecosystem |
| 2D Canvas | Pixi.js v7 | Best-in-class 2D WebGL renderer |
| State | Zustand | Minimal, fast, no boilerplate |
| Real-time | Socket.io | Room-based, automatic reconnect |
| Backend | Node.js + Express | Simple, well-understood |
| ORM | Prisma + PostgreSQL | Type-safe, great migrations |
| Styling | Tailwind CSS | Rapid dark-theme UI |
| Auth | JWT (7-day tokens) | Low-friction for friend groups |

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm i -g pnpm`)
- Docker + Docker Compose (for PostgreSQL)

### 1. Clone and install
```bash
pnpm install
```

### 2. Start PostgreSQL
```bash
docker-compose up -d
```

### 3. Configure environment
```bash
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env
# Edit packages/server/.env with your JWT_SECRET
```

### 4. Set up database
```bash
pnpm db:push
pnpm --filter server db:seed
```

### 5. Build shared package
```bash
pnpm --filter shared build
```

### 6. Run in development
```bash
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

### Demo accounts (after seeding)
| Role | Email | Password |
|------|-------|----------|
| DM | dm@example.com | password123 |
| Fighter | fighter@example.com | password123 |
| Wizard | wizard@example.com | password123 |
| Rogue | rogue@example.com | password123 |

Campaign invite code: `demo-invite`

---

## How to Play

1. **DM creates a campaign** from the Dashboard, shares the invite code
2. **Players join** via the invite code on the Dashboard
3. **DM creates a session** → session page opens with the campsite map
4. **DM shares the session URL** with players — they open it and connect live
5. Everyone sees the **shared map** with tokens, chat, dice rolls in real time
6. DM uses the **DM Panel** to place tokens, manage fog, save state

---

## MVP Features

- Email/password auth with JWT
- Campaign creation + invite codes
- Session creation + live room joining
- Real-time multiplayer (Socket.io rooms)
- Pixi.js 2D canvas: pan, zoom, grid snapping
- Procedurally drawn Forest Campsite map (trees, tents, campfire, logs)
- Drag-and-drop token system
- Token HP bars, conditions, type indicators
- Fog of war (DM reveal/hide)
- In-room text chat with history
- Dice roller (d4–d100, advantage/disadvantage, private DM rolls)
- Initiative tracker with round counter
- Session save/load (state persisted to PostgreSQL)
- Role-based permissions (DM vs player vs observer)
- Player movement lock
- Presence bar (online users)
- Reconnect handling
- Map ping markers (right-click)

## Deployment

### Railway (recommended)
1. Push to GitHub
2. Create Railway project with PostgreSQL + Node.js service
3. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, `CLIENT_URL`
4. Deploy client to Vercel with `VITE_SERVER_URL` pointing to Railway

### Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string (`openssl rand -hex 32`) |
| `PORT` | Server port (default 3001) |
| `CLIENT_URL` | Frontend origin (for CORS) |
| `VITE_SERVER_URL` | Backend URL for Socket.io |
