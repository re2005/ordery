-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderCreatedAt" DATETIME NOT NULL,
    "email" TEXT,
    "shippingAddrHash" TEXT,
    "raw" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OrderEvent_shop_createdAt_idx" ON "OrderEvent"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_shop_orderId_key" ON "OrderEvent"("shop", "orderId");
