import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string(),
  BOT_TOKEN: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ADMIN_JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  REDIS_URL: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  /** Числовые Telegram ID через запятую — доступ к мини-апп админке и флагу isAdmin */
  ADMIN_TELEGRAM_IDS: z.string().default(""),
  /** Имя бота без @ — для ссылки «Открыть приложение» в уведомлениях (опционально) */
  TELEGRAM_BOT_USERNAME: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
