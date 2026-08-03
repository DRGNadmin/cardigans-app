-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'predictions_game';
ALTER TYPE "TaskType" ADD VALUE 'trade_url';
ALTER TYPE "TaskType" ADD VALUE 'onboarding';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "game" "Game";
