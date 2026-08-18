-- CreateEnum
CREATE TYPE "SwotCategory" AS ENUM ('FORCE', 'FAIBLESSE', 'OPPORTUNITE', 'MENACE');

-- CreateTable
CREATE TABLE "SwotItem" (
    "id" TEXT NOT NULL,
    "categorie" "SwotCategory" NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwotItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwotItem_categorie_idx" ON "SwotItem"("categorie");

-- AddForeignKey
ALTER TABLE "SwotItem" ADD CONSTRAINT "SwotItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
