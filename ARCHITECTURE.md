## 1. PRODUCT SUMMARY
A browser-based, real-time 2D D&D virtual tabletop for private friend groups, with DM-controlled sessions, invite-link room joins, persistent campaign state, and synchronized map/token/chat/dice/initiative gameplay.

## 2. FEATURE BREAKDOWN
### MVP features
- Email+password auth with optional guest join bound to invite token.
- Campaign + session creation, room links, and presence.
- Top-down map rendering with square grid, pan, zoom, boundaries.
- DM tools: token placement, fog reveal, initiative, encounter start/end, movement lock.
- Player tools: control owned token, roll dice, chat, view initiative.
- Persistent save/load for session state, map, token positions, and encounter state.

### Version 2 features
- Dynamic line-of-sight and per-token vision cones.
- Rich map asset uploads with layer editor.
- Character sheet templates and action macro buttons.
- Private whisper channels and hidden DM handouts.
- Audio channels (voice + ambient loop controls).

### Stretch goals
- Mobile-optimized touch gestures.
- Rules plug-in system for full 5e automation.
- Replay timeline and session event scrubber.
- AI-assisted encounter setup and terrain tagging.

## 3. TECH STACK RECOMMENDATION
- Frontend: React + TypeScript + Vite + PixiJS.
- State/query: Zustand + TanStack Query.
- Backend: Node.js + Fastify + Socket.IO.
- Database: PostgreSQL + Prisma.
- Auth: JWT (access+refresh) + invite tokens; optional guest identity.
- Storage: S3-compatible bucket for maps/token portraits.
- Deployment: Fly.io or Render for server, Vercel/Netlify for client, Supabase/Neon for Postgres.

Why this stack:
- PixiJS gives performant 2D rendering with camera controls and token layers.
- Fastify + Socket.IO is ergonomic for authoritative event handling with ack/reconnect.
- Prisma accelerates schema evolution for indie-scale development.
- React ecosystem keeps UI iteration fast for DM-heavy control panels.

## 4. SYSTEM ARCHITECTURE
### Frontend
- React shell with route-level auth gates (`/login`, `/lobby`, `/room/:roomCode`).
- Pixi scene graph for map, grid, fog, tokens, pings.
- Role-aware sidebars (DM panel vs player panel).

### Backend
- REST for auth/campaign/session metadata.
- Socket.IO namespace for room realtime events.
- Server-authoritative state reducer for token movement, turn state, and visibility.

### Real-time sync
- Join flow emits `room:join` with JWT and invite code.
- Server verifies role, returns full room snapshot.
- Clients send intent events (`token:move`, `dice:roll`, `initiative:update`).
- Server validates permission, mutates state, broadcasts compact deltas.

### Database
- Normalized relational schema for users, campaigns, rooms, characters, tokens, maps.
- Event log table for chat/system/dice feed.
- JSON columns for flexible map metadata and fog masks.

### Auth
- Registered users: email/password -> JWT.
- Guest users: invite link + display name -> scoped guest JWT.
- Refresh token rotation with revocation list.

### Deployment
- Separate client/server services.
- Postgres managed instance.
- Redis optional for Socket.IO adapter when horizontally scaling.

## 5. DATABASE / DATA MODEL
- Users: account identity, auth credentials, profile.
- Campaigns: owned by DM, contains long-lived narrative state.
- Sessions: scheduled play instance under campaign.
- Rooms: active multiplayer endpoint with invite token + current map.
- Characters: player-linked sheet data.
- Tokens: map entities including NPCs/monsters/objects.
- Maps: asset URL + dimensions + terrain/fog metadata.
- Messages: chat/system events.
- Dice rolls: structured dice formula/results/private visibility.
- Initiative state: turn order, current turn index, round count.
- Fog/reveal state: persisted revealed polygons/grid masks.

(Concrete SQL schema is in `apps/server/prisma/schema.prisma`.)

## 6. PERMISSION MODEL
### DM permissions
- Full CRUD over maps/tokens/encounters/initiative/fog.
- Override movement and lock player movement.
- View hidden objects and private rolls.

### Player permissions
- Move only owned character token when unlocked and valid.
- Public dice rolls + optional private-to-DM roll.
- Chat, initiative visibility, character sheet edits (owned fields).

### Observer permissions
- Read-only room snapshot and public event feed.
- No token movement, no encounter control, no hidden data.

## 7. UX / UI PLAN
- Main screens: login, campaign lobby, session room.
- Session lobby: invite link copy, roster, role assignment, map pick.
- Live tabletop: center map canvas, right chat/log panel, bottom dice/initiative strip.
- DM panel: collapsible left rail for token, fog, encounter, environment controls.
- Player panel: character quick sheet, move budget, actions notes.
- Character sheet panel: HP/AC/speed/stats/inventory/spell notes.
- Chat + dice log: merged chronological feed with filter chips.

## 8. IMPLEMENTATION ROADMAP
### Phase 1
- Monorepo setup, shared contracts, auth, room creation, invite flow.
- Basic socket join/presence and room snapshot sync.

### Phase 2
- Pixi map/grid camera, token rendering, server-authoritative move events.
- Chat + dice roller with event feed persistence.

### Phase 3
- Initiative tracker, encounter controls, fog-of-war reveal tools.
- Save/load and reconnect replay from latest persisted snapshot.

### Phase 4
- Asset upload pipeline, terrain tagging, line-of-sight optimization.
- QA hardening, rate limiting, anti-abuse + production deployment.

## 9. FILE / FOLDER STRUCTURE
See root plus:
- `apps/client/src/features/tabletop`: Pixi renderer + interaction hooks.
- `apps/server/src/realtime`: socket handlers and authoritative reducers.
- `apps/server/src/services`: room/session persistence services.
- `packages/shared/src`: runtime-validated event schemas and DTOs.

## 10. WORKING CODE SCAFFOLD
Provided in this repository:
- Real server bootstrap, socket handlers, permission checks.
- React app with tabletop room route and live socket binding.
- Shared event contracts and starter map configuration.

## 11. CORE REAL-TIME SESSION LOGIC
- Join: authenticate, join socket room, push snapshot.
- State sync: server mutates canonical room state and emits deltas.
- DM enforcement: permission guard on every mutating event.
- Token move + dice roll: validated intents -> authoritative broadcast -> UI update.

## 12. STARTER MAP IMPLEMENTATION
Starter `forest_campsite_v1` map includes:
- Tree ring around map boundary.
- Central clearing with 3 tent objects.
- Campfire center and two fallen logs.
- Grid dimensions and terrain zones for difficult patches.

## 13. DEPLOYMENT PLAN
- Provision Postgres + object storage.
- Deploy server with env vars (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `PORT`).
- Deploy client with `VITE_API_URL` and `VITE_SOCKET_URL`.
- Run migrations and seed map data.
- Share room invite URLs generated by DM from lobby.

## 14. TESTING PLAN
- Multiplayer sync tests: simultaneous move/dice events, delta convergence.
- Permission tests: reject unauthorized token moves and DM actions.
- Reconnect tests: socket disconnect/rejoin + snapshot restoration.
- Save/load tests: persist and reload encounter/fog/token states.
- UI tests: join flow, initiative controls, chat/dice panel behavior.

## 15. NEXT BUILD ACTIONS
1. Implement auth endpoints + JWT refresh rotation.
2. Connect Prisma migrations and seed default campsite map.
3. Implement Room page join flow and presence list UI.
4. Add token drag intent + server validation + delta broadcast.
5. Wire initiative panel to real-time encounter state.
6. Add fog reveal brush in DM panel with persisted mask patches.
