# Deployment Steps

1. Create managed Postgres (Supabase/Neon).
2. Set server env vars from `.env.example`.
3. Deploy `apps/server` to Fly.io or Render.
4. Run `npm run prisma:generate -w apps/server` and `npm run prisma:migrate -w apps/server`.
5. Deploy `apps/client` to Vercel with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to server URL.
6. Verify `/health` and room join from two browsers.
