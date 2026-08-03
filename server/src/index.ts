import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { loadConfig } from "./config.js";
import { createLogger } from "./lib/logger.js";
import { parseAdminTelegramIds } from "./lib/adminTelegramIds.js";
import { verifyAdminToken } from "./adminJwt.js";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { matchesRoutes } from "./routes/matches.js";
import { predictionsRoutes } from "./routes/predictions.js";
import { tasksRoutes } from "./routes/tasks.js";
import { shopRoutes } from "./routes/shop.js";
import { supportRoutes } from "./routes/support.js";
import { adminRoutes, bootstrapAdmin } from "./routes/admin.js";
import { prisma } from "./db.js";
import { ensureDefaultTasks } from "./services/defaultTasks.js";
import { runScheduledNotifications } from "./jobs/scheduledNotifications.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.NODE_ENV);

  const fastify = Fastify({
    logger,
    genReqId: () => randomUUID(),
    disableRequestLogging: false,
  });

  fastify.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await fastify.register(cors, {
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(",") : true,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });

  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: "7d" },
  });

  fastify.decorate("authenticate", async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
      const u = request.user as { sub: string; role?: string };
      if (u.role !== "user") throw new Error("wrong role");
      request.userId = u.sub;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  fastify.decorate("authenticateAdmin", async function authenticateAdmin(request, reply) {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const token = auth.slice(7);
    try {
      const { sub } = verifyAdminToken(token, config.ADMIN_JWT_SECRET);
      request.adminId = sub;
      return;
    } catch {
      /* не админский JWT — пробуем пользовательский (мини-приложение без отдельного admin-login) */
    }
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as { sub?: string; role?: string };
      if (payload.role !== "user" || !payload.sub) throw new Error("wrong role");
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error("no user");
      const allow = parseAdminTelegramIds(config.ADMIN_TELEGRAM_IDS);
      if (!allow.includes(user.telegramId.toString())) throw new Error("not telegram admin");
      request.adminId = user.id;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  fastify.get("/health", async () => ({ ok: true }));

  await authRoutes(fastify, config);
  await meRoutes(fastify, config);
  await matchesRoutes(fastify);
  await predictionsRoutes(fastify);
  await tasksRoutes(fastify, config);
  await shopRoutes(fastify);
  await supportRoutes(fastify);
  await adminRoutes(fastify, config);

  await fastify.listen({ port: config.PORT, host: config.HOST });

  const initDb = async () => {
    await prisma.$connect();
    await bootstrapAdmin(config);
    await ensureDefaultTasks();
    fastify.log.info("database ready");
  };

  initDb().catch((err) => {
    fastify.log.error(err, "startup_db_init_failed");
    setTimeout(() => {
      initDb().catch((retryErr) => fastify.log.error(retryErr, "startup_db_init_retry_failed"));
    }, 5000);
  });

  const notifyTickMs = 60 * 60 * 1000;
  setInterval(() => {
    void runScheduledNotifications(config, fastify.log).catch((err) => fastify.log.error(err));
  }, notifyTickMs);
  setTimeout(() => {
    void runScheduledNotifications(config, fastify.log).catch((err) => fastify.log.error(err));
  }, 15_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
