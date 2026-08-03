-- AlterTable
ALTER TABLE "matches" ADD COLUMN "soon_reminder_sent_at" TIMESTAMP(3),
ADD COLUMN "result_notified_at" TIMESTAMP(3);
