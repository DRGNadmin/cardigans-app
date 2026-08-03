import type { FastifyBaseLogger } from "fastify";
import type {
  Match,
  Order,
  OrderStatus,
  PredictionOption,
  ShopItem,
  SupportTicket,
  User,
} from "@prisma/client";
import type { Config } from "../config.js";
import { prisma } from "../db.js";

const TG_API = "https://api.telegram.org";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Одно сообщение пользователю (chat_id = telegram user id в личке). */
export async function sendTelegramMessage(
  botToken: string,
  telegramId: bigint,
  text: string,
  options?: { parseMode?: "HTML" }
): Promise<{ ok: boolean; description?: string }> {
  const payload: Record<string, unknown> = {
    chat_id: telegramId.toString(),
    text: text.slice(0, 4096),
  };
  if (options?.parseMode) payload.parse_mode = options.parseMode;

  const res = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok: boolean; description?: string };
}

function formatMatchStartsAt(d: Date): string {
  try {
    return d.toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Moscow",
    });
  } catch {
    return d.toISOString();
  }
}

export function buildNewMatchMessage(
  match: Match & { options: PredictionOption[] },
  config: Config
): string {
  const game = match.game === "DOTA2" ? "Dota 2" : "CS2";
  const when = formatMatchStartsAt(match.startsAt);
  const rewardPartsNew: string[] = [];
  if (match.rewardGems > 0) rewardPartsNew.push(`база <b>${match.rewardGems}</b> гемов`);
  rewardPartsNew.push(`бонус уровня <b>+5…+50</b> к награде матча`);
  const reward = `\nЗа верный прогноз: ${rewardPartsNew.join(" + ")}.`;
  let body =
    `🎮 <b>Новый матч</b>\n\n` +
    `${escapeHtml(match.teamA)} <b>vs</b> ${escapeHtml(match.teamB)}\n` +
    `Игра: ${escapeHtml(game)}\n` +
    `Старт: ${escapeHtml(when)}` +
    `${reward}\n\n` +
    `Сделайте прогноз в мини-приложении.`;

  const u = config.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (u) {
    body += `\n\n<a href="https://t.me/${escapeHtml(u)}?startapp">Открыть приложение</a>`;
  }
  return body;
}

function openAppLinkHtml(config: Config): string {
  const u = config.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!u) return "";
  return `\n\n<a href="https://t.me/${escapeHtml(u)}?startapp">Открыть приложение</a>`;
}

export function orderStatusLabelRu(status: OrderStatus): string {
  switch (status) {
    case "new":
      return "Новый";
    case "contact_sent":
      return "Связались";
    case "completed":
      return "Выполнен";
    case "cancelled":
      return "Отменён";
    default:
      return status;
  }
}

/** Уведомление о смене статуса заказа (после сохранения в БД). */
export async function notifyOrderStatusChange(
  config: Config,
  order: Order & { user: User; shopItem: ShopItem },
  newStatus: OrderStatus,
  log?: FastifyBaseLogger
): Promise<void> {
  const label = orderStatusLabelRu(newStatus);
  const text =
    `📦 <b>Заказ</b>\n\n` +
    `${escapeHtml(order.shopItem.title)}\n` +
    `Статус: <b>${escapeHtml(label)}</b>` +
    openAppLinkHtml(config);
  const r = await sendTelegramMessage(config.BOT_TOKEN, order.user.telegramId, text, { parseMode: "HTML" });
  if (!r.ok && log) {
    log.warn({ msg: "order_status_notify_failed", description: r.description, orderId: order.id });
  }
}

/** Пользователям с прогнозом по матчу: напоминание до старта. */
export async function notifyMatchStartingSoonUsers(
  config: Config,
  match: Match,
  log: FastifyBaseLogger
): Promise<void> {
  const preds = await prisma.prediction.findMany({
    where: { matchId: match.id },
    include: { user: true },
  });
  const seen = new Set<string>();
  const game = match.game === "DOTA2" ? "Dota 2" : "CS2";
  const when = formatMatchStartsAt(match.startsAt);
  const rewardPartsSoon: string[] = [];
  if (match.rewardGems > 0) rewardPartsSoon.push(`база <b>${match.rewardGems}</b> гемов`);
  rewardPartsSoon.push(`бонус уровня <b>+5…+50</b> к награде матча`);
  const reward = `\nЗа верный прогноз: ${rewardPartsSoon.join(" + ")}.`;
  const text =
    `⏰ <b>Матч скоро начнётся</b>\n\n` +
    `${escapeHtml(match.teamA)} <b>vs</b> ${escapeHtml(match.teamB)}\n` +
    `Игра: ${escapeHtml(game)}\n` +
    `Старт: ${escapeHtml(when)}` +
    `${reward}\n\n` +
    `Сделайте прогноз в мини-приложении, если ещё не сделали.` +
    openAppLinkHtml(config);

  for (const p of preds) {
    if (seen.has(p.userId)) continue;
    seen.add(p.userId);
    const r = await sendTelegramMessage(config.BOT_TOKEN, p.user.telegramId, text, { parseMode: "HTML" });
    if (!r.ok) {
      log.warn({ msg: "match_soon_notify_failed", userId: p.userId, description: r.description });
    }
    await sleep(40);
  }
}

/**
 * Итог матча: выигрыш / проигр. по прогнозу. Повторный вызов без эффекта (resultNotifiedAt).
 */
export async function notifyMatchFinishedPredictions(
  config: Config,
  matchId: string,
  log?: FastifyBaseLogger
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { predictions: { include: { user: true, option: true } } },
  });
  if (!match || match.status !== "finished" || !match.winningOptionId || match.resultNotifiedAt || match.deletedAt) {
    return;
  }

  const game = match.game === "DOTA2" ? "Dota 2" : "CS2";
  const link = openAppLinkHtml(config);
  const header =
    `📊 <b>Итог матча</b> (${escapeHtml(game)})\n\n` +
    `${escapeHtml(match.teamA)} <b>vs</b> ${escapeHtml(match.teamB)}\n\n`;

  for (const p of match.predictions) {
    const won = p.optionId === match.winningOptionId;
    const paidGems = won ? (p.rewardGemsPaid ?? match.rewardGems) : 0;
    const body = won
      ? `✅ Прогноз верный: <b>${escapeHtml(p.option.label)}</b>\n` +
        (paidGems > 0 ? `+<b>${paidGems}</b> гемов на баланс.` : `Награда начислена.`)
      : `Ваш прогноз: ${escapeHtml(p.option.label)} — не сыграл.\nУдачи в следующих матчах!`;
    const text = header + body + link;
    const r = await sendTelegramMessage(config.BOT_TOKEN, p.user.telegramId, text, { parseMode: "HTML" });
    if (!r.ok && log) {
      log.warn({ msg: "match_result_notify_failed", userId: p.userId, description: r.description });
    }
    await sleep(40);
  }

  await prisma.match.updateMany({
    where: { id: matchId, resultNotifiedAt: null },
    data: { resultNotifiedAt: new Date() },
  });
}

/** Рассылка всем пользователям из БД. Ошибки отдельных чатов (бот заблокирован и т.д.) игнорируются. */
export async function notifyAllUsersNewMatch(
  config: Config,
  match: Match & { options: PredictionOption[] },
  log?: FastifyBaseLogger
): Promise<void> {
  const text = buildNewMatchMessage(match, config);
  const users = await prisma.user.findMany({ select: { telegramId: true } });
  let failed = 0;
  for (const u of users) {
    const r = await sendTelegramMessage(config.BOT_TOKEN, u.telegramId, text, { parseMode: "HTML" });
    if (!r.ok) failed += 1;
    await sleep(35);
  }
  if (failed > 0 && log) {
    log.warn({ msg: "match_notify_partial_failures", failed, total: users.length });
  }
}


export function buildSupportReplyMessage(ticket: SupportTicket): string {
  const preview =
    ticket.adminReply && ticket.adminReply.length > 500
      ? `${escapeHtml(ticket.adminReply.slice(0, 500))}…`
      : escapeHtml(ticket.adminReply ?? "");
  return (
    `💬 <b>Ответ поддержки</b>\n\n` +
    `${preview}\n\n` +
    `Смотрите полный текст в профиле → Поддержка.`
  );
}

export async function notifyUserSupportReply(
  config: Config,
  ticket: SupportTicket,
  user: User,
  log?: FastifyBaseLogger
): Promise<void> {
  if (!ticket.adminReply?.trim()) return;
  const text = buildSupportReplyMessage(ticket);
  const r = await sendTelegramMessage(config.BOT_TOKEN, user.telegramId, text, { parseMode: "HTML" });
  if (!r.ok && log) {
    log.error({ msg: "support_reply_notify_failed", description: r.description, userId: user.id });
  }
}
