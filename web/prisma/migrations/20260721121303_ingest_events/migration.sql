-- CreateEnum
CREATE TYPE "IngestOutcome" AS ENUM ('GRABBED', 'AUTO_CREATED', 'SKIPPED_ACCESSORY', 'REJECTED_PRICE', 'REVIEW_QUEUED', 'ERROR');

-- CreateTable
CREATE TABLE "ingest_events" (
    "id" BIGSERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "outcome" "IngestOutcome" NOT NULL,
    "reason" TEXT,
    "product_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingest_events_run_id_idx" ON "ingest_events"("run_id");

-- CreateIndex
CREATE INDEX "ingest_events_outcome_idx" ON "ingest_events"("outcome");

-- AddForeignKey
ALTER TABLE "ingest_events" ADD CONSTRAINT "ingest_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
