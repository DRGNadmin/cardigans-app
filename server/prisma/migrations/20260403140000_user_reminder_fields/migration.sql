-- AlterTable
ALTER TABLE "users" ADD COLUMN "last_daily_login_reminder_at" TIMESTAMP(3),
ADD COLUMN "last_weekly_streak_reminder_at" TIMESTAMP(3);
