-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderIndex" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "addressHash" TEXT NOT NULL,
    "emailHash" TEXT,
    "status" TEXT NOT NULL,
    "mergedGroupId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MergeGroup" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "windowMinutes" INTEGER NOT NULL,
    "originalIds" TEXT[],
    "draftOrderId" TEXT,
    "newOrderId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopSettings" (
    "shop" TEXT NOT NULL,
    "windowMinutes" INTEGER NOT NULL DEFAULT 120,
    "byAddress" BOOLEAN NOT NULL DEFAULT true,
    "byEmail" BOOLEAN NOT NULL DEFAULT false,
    "requireBoth" BOOLEAN NOT NULL DEFAULT false,
    "autoCompleteDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("shop")
);

-- CreateIndex
CREATE INDEX "OrderIndex_shop_createdAt_idx" ON "public"."OrderIndex"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "OrderIndex_shop_addressHash_createdAt_idx" ON "public"."OrderIndex"("shop", "addressHash", "createdAt");

-- CreateIndex
CREATE INDEX "MergeGroup_shop_createdAt_idx" ON "public"."MergeGroup"("shop", "createdAt");
