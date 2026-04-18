# V1 — Online 2D D&D Virtual Tabletop

This repository contains a build-ready scaffold for a private, browser-based 2D virtual tabletop (VTT) for 6–8 players plus one Dungeon Master.

## Monorepo layout

- `apps/client`: React + Vite + PixiJS tabletop client.
- `apps/server`: Node.js + Fastify + Socket.IO authoritative multiplayer server.
- `packages/shared`: shared TypeScript types, event contracts, and validation schemas.
- `infra`: deployment templates and environment examples.

## Quick start

```bash
npm install
npm run dev
```

This starts both the client and server in development mode.

## Why this scaffold exists

It implements:

- DM / player / observer permission boundaries.
- Room-based real-time sessions over WebSockets.
- Server-authoritative token movement and dice rolling.
- Campaign/session persistence schema (Prisma/PostgreSQL).
- A starter forest campsite map configuration.

See `ARCHITECTURE.md` for the full implementation plan and phased roadmap.
