-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('ENQUETE', 'SATISFACTION', 'FEEDBACK', 'PLAINTE', 'SUGGESTION', 'TEMOIGNAGE');

-- CreateEnum
CREATE TYPE "FeedbackStatut" AS ENUM ('NOUVEAU', 'EN_TRAITEMENT', 'TRAITE');

-- CreateTable
CREATE TABLE "ProjectFeedback" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "FeedbackType" NOT NULL,
    "contenu" TEXT NOT NULL,
    "note" INTEGER,
    "auteurNom" TEXT,
    "statut" "FeedbackStatut" NOT NULL DEFAULT 'NOUVEAU',
    "reponse" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFeedback_projectId_idx" ON "ProjectFeedback"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectFeedback" ADD CONSTRAINT "ProjectFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFeedback" ADD CONSTRAINT "ProjectFeedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFeedback" ADD CONSTRAINT "ProjectFeedback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
