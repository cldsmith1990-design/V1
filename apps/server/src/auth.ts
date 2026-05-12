import { FastifyInstance } from "fastify";

const DEMO_USERS = new Map([
  ["dm@example.com", { userId: "seed-dm-1", password: "dm-pass", role: "dm" as const }],
  ["player@example.com", { userId: "seed-player-1", password: "player-pass", role: "player" as const }]
]);

export const registerAuthRoutes = (app: FastifyInstance) => {
  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as { email: string; password: string; displayName?: string };
    const user = DEMO_USERS.get(body.email);

    if (!user || user.password !== body.password) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = await reply.jwtSign({
      sub: user.userId,
      role: user.role,
      displayName: body.displayName ?? body.email.split("@")[0]
    });

    return { token };
  });
};
