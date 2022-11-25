-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "networkId" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Network" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentNetwork" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Network_hash_key" ON "Network"("hash");
