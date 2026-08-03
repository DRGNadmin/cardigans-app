-- AlterTable
ALTER TABLE "matches" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "matches_deleted_at_idx" ON "matches"("deleted_at");
