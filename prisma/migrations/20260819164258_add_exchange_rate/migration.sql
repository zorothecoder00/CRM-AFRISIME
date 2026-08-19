-- DropIndex
DROP INDEX "Contract_nom_trgm_idx";

-- DropIndex
DROP INDEX "Courrier_objet_trgm_idx";

-- DropIndex
DROP INDEX "Courrier_reference_trgm_idx";

-- DropIndex
DROP INDEX "CrmContact_email_trgm_idx";

-- DropIndex
DROP INDEX "CrmContact_nom_trgm_idx";

-- DropIndex
DROP INDEX "CrmContact_prenom_trgm_idx";

-- DropIndex
DROP INDEX "CrmOrganization_nom_trgm_idx";

-- DropIndex
DROP INDEX "Document_nom_trgm_idx";

-- DropIndex
DROP INDEX "GovernanceDecision_objet_trgm_idx";

-- DropIndex
DROP INDEX "Indicator_nom_trgm_idx";

-- DropIndex
DROP INDEX "KnowledgeArticle_content_trgm_idx";

-- DropIndex
DROP INDEX "KnowledgeArticle_titre_trgm_idx";

-- DropIndex
DROP INDEX "Meeting_titre_trgm_idx";

-- DropIndex
DROP INDEX "MeetingDecision_description_trgm_idx";

-- DropIndex
DROP INDEX "OrganizationalRisk_titre_trgm_idx";

-- DropIndex
DROP INDEX "Processus_nom_trgm_idx";

-- DropIndex
DROP INDEX "Project_nom_trgm_idx";

-- DropIndex
DROP INDEX "ProjectRisk_titre_trgm_idx";

-- DropIndex
DROP INDEX "Task_titre_trgm_idx";

-- DropIndex
DROP INDEX "TaskComment_content_trgm_idx";

-- DropIndex
DROP INDEX "User_name_trgm_idx";

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromDevise" TEXT NOT NULL,
    "toDevise" TEXT NOT NULL,
    "taux" DECIMAL(18,6) NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromDevise_toDevise_key" ON "ExchangeRate"("fromDevise", "toDevise");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
