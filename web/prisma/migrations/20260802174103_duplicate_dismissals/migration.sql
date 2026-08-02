-- CreateTable
CREATE TABLE "duplicate_dismissals" (
    "id" SERIAL NOT NULL,
    "product_lo_id" INTEGER NOT NULL,
    "product_hi_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_dismissals_product_lo_id_product_hi_id_key" ON "duplicate_dismissals"("product_lo_id", "product_hi_id");
