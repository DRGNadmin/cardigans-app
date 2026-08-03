import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { prisma } from "../db.js";
import { parseAdminTelegramIds } from "../lib/adminTelegramIds.js";
import { applyLedgerTx } from "../services/ledger.js";
import { XP_TASK_CLAIM, addXp } from "../services/xp.js";
import {
  dailyCooldownUntil,
  isDailyInCooldown,
  isUserAdminById,
  syncUserTaskProgress,
} from "../services/taskProgress.js";

function taskIdFromLedgerRef(refId: string | null): string | null {
  if (!refId) return null;
  const i = refId.indexOf(":");
  return i === -1 ? refId : refId.slice(0, i);
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function tasksRoutes(fastify: FastifyInstance, config: Config) {
  const adminIds = parseAdminTelegramIds(config.ADMIN_TELEGRAM_IDS);

  fastify.get(
    "/api/v1/tasks",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      await syncUserTaskProgress(userId, adminIds);

      const isAdmin = await isUserAdminById(userId, adminIds);

      const tasks = await prisma.task.findMany({
        where: { isActive: true },
        orderBy: { sort: "asc" },
      });
      const userTasks = await prisma.userTask.findMany({ where: { userId } });
      const byTask = new Map(userTasks.map((ut) => [ut.taskId, ut]));

      const ledgerRows = await prisma.ledgerTransaction.findMany({
        where: { userId, type: "task_reward", refType: "task" },
        select: { refId: true },
      });
      const claimedTaskIds = new Set<string>();
      for (const r of ledgerRows) {
        const tid = taskIdFromLedgerRef(r.refId);
        if (tid) claimedTaskIds.add(tid);
      }

      const now = new Date();

      return tasks.map((t) => {
        const ut = byTask.get(t.id);
        const claimedLedger = claimedTaskIds.has(t.id);
        let claimed: boolean;
        if (t.type === "daily_login") {
          claimed = isAdmin ? false : isDailyInCooldown(ut?.lastClaimedAt ?? null, now);
        } else if (t.type === "weekly_streak" || t.type === "correct_streak") {
          claimed = false;
        } else {
          claimed = claimedLedger;
        }

        return {
          id: t.id,
          key: t.key,
          title: t.title,
          description: t.description,
          rewardGems: t.rewardGems,
          type: t.type,
          game: t.game,
          targetCount: t.targetCount,
          progress: ut?.progress ?? 0,
          completed: ut?.completed ?? false,
          claimed,
          ...(t.type === "daily_login"
            ? {
                cooldownUntil: isAdmin
                  ? null
                  : (dailyCooldownUntil(ut?.lastClaimedAt ?? null)?.toISOString() ?? null),
              }
            : {}),
        };
      });
    }
  );

  fastify.post(
    "/api/v1/tasks/:id/claim",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.userId!;
      const { id: taskId } = request.params as { id: string };
      const now = new Date();

      const task = await prisma.task.findFirst({
        where: { id: taskId, isActive: true },
      });
      if (!task) return reply.status(404).send({ error: "Task not found" });

      const ut = await prisma.userTask.findUnique({
        where: { userId_taskId: { userId, taskId } },
      });

      const isAdmin = await isUserAdminById(userId, adminIds);

      if (task.type === "daily_login") {
        if (!ut?.completed) {
          return reply.status(400).send({ error: "Task not completed" });
        }
        if (!isAdmin && isDailyInCooldown(ut.lastClaimedAt, now)) {
          return reply.status(400).send({ error: "Reward already claimed" });
        }
        await applyLedgerTx(userId, task.rewardGems, "task_reward", {
          refType: "task",
          refId: `${taskId}:${now.getTime()}`,
        });
        await addXp(userId, XP_TASK_CLAIM);
        await prisma.userTask.update({
          where: { id: ut.id },
          data: { lastClaimedAt: now, completed: false },
        });
        return { ok: true, gems: task.rewardGems };
      }

      if (task.type === "weekly_streak") {
        const target = task.targetCount ?? 7;
        if (!ut?.completed || ut.progress < target) {
          return reply.status(400).send({ error: "Task not completed" });
        }
        await applyLedgerTx(userId, task.rewardGems, "task_reward", {
          refType: "task",
          refId: `${taskId}:${now.getTime()}`,
        });
        await addXp(userId, XP_TASK_CLAIM);
        await prisma.userTask.update({
          where: { id: ut.id },
          data: {
            progress: 0,
            completed: false,
            meta: { lastCheckinDay: utcYmd(now) } as object,
          },
        });
        return { ok: true, gems: task.rewardGems };
      }

      if (task.type === "correct_streak") {
        const target = task.targetCount ?? 3;
        if (!ut?.completed || ut.progress < target) {
          return reply.status(400).send({ error: "Task not completed" });
        }
        await applyLedgerTx(userId, task.rewardGems, "task_reward", {
          refType: "task",
          refId: `${taskId}:${now.getTime()}`,
        });
        await addXp(userId, XP_TASK_CLAIM);
        await prisma.userTask.update({
          where: { id: ut.id },
          data: {
            progress: 0,
            completed: false,
            completedAt: null,
            meta: {},
          },
        });
        return { ok: true, gems: task.rewardGems };
      }

      const alreadyPaid = await prisma.ledgerTransaction.findFirst({
        where: {
          userId,
          type: "task_reward",
          refType: "task",
          refId: taskId,
        },
      });
      if (alreadyPaid) {
        return reply.status(400).send({ error: "Reward already claimed" });
      }

      if (!ut || !ut.completed) {
        return reply.status(400).send({ error: "Task not completed" });
      }

      await applyLedgerTx(userId, task.rewardGems, "task_reward", {
        refType: "task",
        refId: taskId,
      });
      await addXp(userId, XP_TASK_CLAIM);

      return { ok: true, gems: task.rewardGems };
    }
  );
}
