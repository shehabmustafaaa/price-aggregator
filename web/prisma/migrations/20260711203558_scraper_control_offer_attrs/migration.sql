-- CreateEnum
CREATE TYPE "ScrapeJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "attrs" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "request_delay_seconds" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "scrape_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scrape_interval_minutes" INTEGER NOT NULL DEFAULT 360;

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "status" "ScrapeJobStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scrape_jobs_status_requested_at_idx" ON "scrape_jobs"("status", "requested_at");

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
