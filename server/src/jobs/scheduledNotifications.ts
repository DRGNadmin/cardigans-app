import type { FastifyBaseLogger } from "fastify";
import type { Config } from "../config.js";
import { prisma } from "../db.js";
import { parseAdminTelegramIds } from "../lib/adminTelegramIds.js";
import { isDailyInCooldown, type UserTaskMeta } from "../services/taskProgress.js";
import { promoteScheduledMatchesToLive } from "../services/matchLifecycle.js";
import { notifyMatchStartingSoonUsers, sendTelegramMessage } from "../services/telegramNotify.js";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayYmd(todayYmd: string): string {
  const dt = new Date(`${todayYmd}T12:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MS_24H = 24 * 60 * 60 * 1000;
/** Напоминание «матч скоро»: окно до старта (включительно). */
const MATCH_SOON_MS = 2 * 60 * 60 * 1000;

async function remindMatchesStartingSoon(config: Config, log: FastifyBaseLogger): Promise<void> {
  const now = new Date();
  const horizon = new Date(now.getTime() + MATCH_SOON_MS);
  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: "scheduled",
      soonReminderSentAt: null,
      startsAt: { gt: now, lte: horizon },
    },
  });
  for (const m of matches) {
    await notifyMatchStartingSoonUsers(config, m, log);
    await prisma.match.update({
      where: { id: m.id },
      data: { soonReminderSentAt: new Date() },
    });
  }
}

/**
 * Ежедневный вход: награда снова доступна (кулдаун 24ч прошёл).
 * Не чаще одного раза за «окно» после последнего claim (см. lastClaimedAt).
 */
async function remindDailyLogin(config: Config, log: FastifyBaseLogger): Promise<void> {
  const dailyTask = await prisma.task.findFirst({
    where: { type: "daily_login", isActive: true },
  });
  if (!dailyTask) return;

  const adminIds = parseAdminTelegramIds(config.ADMIN_TELEGRAM_IDS);
  const now = new Date();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      telegramId: true,
      lastDailyLoginReminderAt: true,
    },
  });

  const botUser = config.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  const link = botUser
    ? `\n\n<a href="https://t.me/${escapeHtml(botUser)}?startapp">Открыть приложение</a>`
    : "";

  for (const u of users) {
    if (adminIds.includes(u.telegramId.toString())) continue;

    const ut = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId: u.id, taskId: dailyTask.id } },
    });
    if (!ut) continue;

    if (isDailyInCooldown(ut.lastClaimedAt, now)) continue;

    if (ut.lastClaimedAt) {
      if (u.lastDailyLoginReminderAt && u.lastDailyLoginReminderAt >= ut.lastClaimedAt) continue;
    } else {
      if (u.lastDailyLoginReminderAt && now.getTime() - u.lastDailyLoginReminderAt.getTime() < MS_24H) {
        continue;
      }
    }

    const text =
      `⏰ <b>Ежедневный вход</b>\n\n` +
      `Награда снова доступна — зайдите и нажмите «Забрать» в заданиях.` +
      link;

    const r = await sendTelegramMessage(config.BOT_TOKEN, u.telegramId, text, { parseMode: "HTML" });
    if (r.ok) {
      await prisma.user.update({
        where: { id: u.id },
        data: { lastDailyLoginReminderAt: now },
      });
    } else {
      log.warn({ msg: "daily_login_reminder_failed", userId: u.id, description: r.description });
    }
    await sleep(40);
  }
}

/**
 * Недельная серия 7 дней (UTC): вчера был вход, сегодня ещё не заходили — напомнить не потерять серию.
 */
async function remindWeeklyStreak(config: Config, log: FastifyBaseLogger): Promise<void> {
  const weeklyTask = await prisma.task.findFirst({
    where: { type: "weekly_streak", isActive: true },
  });
  if (!weeklyTask) return;

  const now = new Date();
  const today = utcYmd(now);
  const yesterday = yesterdayYmd(today);
  const dayStart = startOfUtcDay(now);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      telegramId: true,
      lastWeeklyStreakReminderAt: true,
    },
  });

  const botUser = config.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  const link = botUser
    ? `\n\n<a href="https://t.me/${escapeHtml(botUser)}?startapp">Открыть приложение</a>`
    : "";

  for (const u of users) {
    const ut = await prisma.userTask.findUnique({
      where: { userId_taskId: { userId: u.id, taskId: weeklyTask.id } },
    });
    if (!ut || ut.progress < 1 || ut.progress >= 7) continue;

    const meta = (ut.meta as UserTaskMeta) || {};
    const lastDay = meta.lastCheckinDay;
    if (!lastDay || lastDay === today) continue;
    if (lastDay !== yesterday) continue;

    if (u.lastWeeklyStreakReminderAt && u.lastWeeklyStreakReminderAt >= dayStart) continue;

    const text =
      `🔥 <b>Недельная серия</b>: ${ut.progress}/7 дней\n\n` +
      `Зайдите в приложение <b>сегодня</b> (UTC+3), иначе прогресс серии сбросится.` +
      link;

    const r = await sendTelegramMessage(config.BOT_TOKEN, u.telegramId, text, { parseMode: "HTML" });
    if (r.ok) {
      await prisma.user.update({
        where: { id: u.id },
        data: { lastWeeklyStreakReminderAt: now },
      });
    } else {
      log.warn({ msg: "weekly_streak_reminder_failed", userId: u.id, description: r.description });
    }
    await sleep(40);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runScheduledNotifications(config: Config, log: FastifyBaseLogger): Promise<void> {
  await promoteScheduledMatchesToLive();
  await remindDailyLogin(config, log);
  await remindWeeklyStreak(config, log);
  await remindMatchesStartingSoon(config, log);
}
