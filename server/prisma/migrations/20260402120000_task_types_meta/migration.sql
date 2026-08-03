-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'daily_login';
ALTER TYPE "TaskType" ADD VALUE 'weekly_streak';
ALTER TYPE "TaskType" ADD VALUE 'correct_streak';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_key_key" ON "tasks"("key");

-- AlterTable
ALTER TABLE "user_tasks" ADD COLUMN "last_claimed_at" TIMESTAMP(3);
ALTER TABLE "user_tasks" ADD COLUMN "meta" JSONB NOT NULL DEFAULT '{}';
