import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { createServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { registerAuthRoutes } from "./auth.js";
import { registerRealtime } from "./realtime.js";
import { starterMap } from "@vtt/shared";

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = Fastify({ logger: true });
await app.register(cors, { origin: CLIENT_ORIGIN, credentials: true });
await app.register(fastifyJwt, { secret: process.env.JWT_SECRET || "dev-secret-change-me" });

registerAuthRoutes(app);

app.get("/health", async () => ({ ok: true }));
app.get("/api/maps/starter", async () => starterMap);

const server = createServer(app.server);
const io = new IOServer(server, {
  cors: { origin: CLIENT_ORIGIN }
});
registerRealtime(io);

await app.ready();
server.listen(PORT, () => {
  app.log.info(`Server listening on ${PORT}`);
});
