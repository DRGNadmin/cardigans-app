import { prisma } from "../db.js";

const MS_24H = 24 * 60 * 60 * 1000;

export type UserTaskMeta = {
  lastCheckinDay?: string;
  lastStreakMatchId?: string;
};

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayYmd(todayYmd: string): string {
  const d = new Date(`${todayYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function isUserAdminById(userId: string, adminIds: string[]): Promise<boolean> {
  if (adminIds.length === 0) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true },
  });
  if (!u) return false;
  return adminIds.includes(u.telegramId.toString());
}

/** Вызывать при GET /tasks и GET /me — обновляет ежедневный вход и недельную серию. */
export async function syncUserTaskProgress(userId: string, adminIds: string[] = []): Promise<void> {
  const now = new Date();
  const today = utcYmd(now);

  const [dailyTasks, weeklyTasks] = await Promise.all([
    prisma.task.findMany({ where: { isActive: true, type: "daily_login" } }),
    prisma.task.findMany({ where: { isActive: true, type: "weekly_streak" } }),
  ]);

  for (const t of dailyTasks) {
    await syncDailyLogin(userId, t.id, now, adminIds);
  }
  for (const t of weeklyTasks) {
    await syncWeeklyStreak(userId, t.id, today);
  }

  await syncTradeUrlTasks(userId);
  await syncOnboardingTasks(userId);
}

/** Открытие магазина — онбординг «загляните в магазин». */
export async function syncOnboardingShopVisit(userId: string): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { isActive: true, type: "onboarding", key: "onb_visit_shop" },
  });
  if (!task) return;
  const existing = await prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId: task.id } },
    select: { completed: true },
  });
  if (existing?.completed) return;
  await prisma.userTask.upsert({
    where: { userId_taskId: { userId, taskId: task.id } },
    create: {
      userId,
      taskId: task.id,
      progress: 1,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      progress: 1,
      completed: true,
      completedAt: new Date(),
    },
  });
}

async function syncTradeUrlTasks(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamTradeUrl: true },
  });
  const ok = Boolean(user?.steamTradeUrl?.trim());
  const tasks = await prisma.task.findMany({ where: { isActive: true, type: "trade_url" } });
  for (const t of tasks) {
    await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: t.id } },
      create: { userId, taskId: t.id, progress: ok ? 1 : 0, completed: ok },
      update: { progress: ok ? 1 : 0, completed: ok },
    });
  }
}

async function syncOnboardingTasks(userId: string): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: {
      isActive: true,
      type: "onboarding",
      key: { in: ["onb_first_prediction", "onb_first_order"] },
    },
  });
  if (tasks.length === 0) return;
  const [predCount, orderCount] = await Promise.all([
    prisma.prediction.count({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
  ]);
  for (const t of tasks) {
    const done =
      t.key === "onb_first_prediction" ? predCount >= 1 : t.key === "onb_first_order" ? orderCount >= 1 : false;
    await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: t.id } },
      create: { userId, taskId: t.id, progress: done ? 1 : 0, completed: done },
      update: { progress: done ? 1 : 0, completed: done },
    });
  }
}

async function syncDailyLogin(userId: string, taskId: string, now: Date, adminIds: string[]) {
  const ut = await prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });
  const last = ut?.lastClaimedAt;
  const inCooldown = last != null && now.getTime() - last.getTime() < MS_24H;
  const admin = await isUserAdminById(userId, adminIds);

  if (!ut) {
    await prisma.userTask.create({
      data: { userId, taskId, progress: 0, completed: true },
    });
    return;
  }

  if (admin) {
    await prisma.userTask.update({
      where: { id: ut.id },
      data: { completed: true },
    });
    return;
  }

  await prisma.userTask.update({
    where: { id: ut.id },
    data: { completed: !inCooldown },
  });
}

async function syncWeeklyStreak(userId: string, taskId: string, todayYmd: string) {
  const ut = await prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });
  const meta = (ut?.meta as UserTaskMeta) || {};
  const lastDay = meta.lastCheckinDay;

  if (lastDay === todayYmd) {
    return;
  }

  let progress = ut?.progress ?? 0;
  if (lastDay == null) {
    progress = 1;
  } else if (lastDay === yesterdayYmd(todayYmd)) {
    progress = Math.min(7, progress + 1);
  } else {
    progress = 1;
  }

  const newMeta: UserTaskMeta = { ...meta, lastCheckinDay: todayYmd };
  const completed = progress >= 7;

  await prisma.userTask.upsert({
    where: { userId_taskId: { userId, taskId } },
    create: {
      userId,
      taskId,
      progress,
      completed,
      meta: newMeta as object,
    },
    update: {
      progress,
      completed,
      meta: newMeta as object,
    },
  });
}

/**
 * После завершения матча: для каждого прогноза один раз учитываем удачу/неудачу в серии «угадал подряд».
 */
export async function applyCorrectStreakForFinishedMatch(
  matchId: string,
  winningOptionId: string
): Promise<void> {
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  const tasks = await prisma.task.findMany({ where: { type: "correct_streak", isActive: true } });
  if (tasks.length === 0) return;

  for (const p of preds) {
    const wasCorrect = p.optionId === winningOptionId;
    for (const t of tasks) {
      await applyOneStreakTask(p.userId, t.id, matchId, wasCorrect, t.targetCount ?? 3);
    }
  }
}

async function applyOneStreakTask(
  userId: string,
  taskId: string,
  matchId: string,
  wasCorrect: boolean,
  target: number
) {
  const ut = await prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });
  const meta = (ut?.meta as UserTaskMeta) || {};
  if (meta.lastStreakMatchId === matchId) {
    return;
  }

  let progress = ut?.progress ?? 0;
  if (!wasCorrect) {
    progress = 0;
  } else {
    progress += 1;
  }
  const completed = progress >= target;
  const newMeta: UserTaskMeta = { ...meta, lastStreakMatchId: matchId };

  await prisma.userTask.upsert({
    where: { userId_taskId: { userId, taskId } },
    create: {
      userId,
      taskId,
      progress,
      completed,
      completedAt: completed ? new Date() : null,
      meta: newMeta as object,
    },
    update: {
      progress,
      completed,
      completedAt: completed ? new Date() : null,
      meta: newMeta as object,
    },
  });
}

export function dailyCooldownUntil(lastClaimedAt: Date | null): Date | null {
  if (!lastClaimedAt) return null;
  return new Date(lastClaimedAt.getTime() + MS_24H);
}

export function isDailyInCooldown(lastClaimedAt: Date | null, now: Date): boolean {
  if (!lastClaimedAt) return false;
  return now.getTime() - lastClaimedAt.getTime() < MS_24H;
}
