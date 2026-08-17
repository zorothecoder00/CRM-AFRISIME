-- CreateEnum
CREATE TYPE "PortalMessageAuthorType" AS ENUM ('CONTACT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MeetingExternalRsvp" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'DECLINE');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "partageExterne" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "authorType" "PortalMessageAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "content" TEXT NOT NULL,
    "isReadByContact" BOOLEAN NOT NULL DEFAULT false,
    "isReadByInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingExternalParticipant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "rsvp" "MeetingExternalRsvp" NOT NULL DEFAULT 'EN_ATTENTE',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingExternalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiaire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "programmeId" TEXT,
    "projectId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beneficiaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalMessage_contactId_createdAt_idx" ON "PortalMessage"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "MeetingExternalParticipant_contactId_idx" ON "MeetingExternalParticipant"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingExternalParticipant_meetingId_contactId_key" ON "MeetingExternalParticipant"("meetingId", "contactId");

-- CreateIndex
CREATE INDEX "Beneficiaire_programmeId_idx" ON "Beneficiaire"("programmeId");

-- CreateIndex
CREATE INDEX "Beneficiaire_projectId_idx" ON "Beneficiaire"("projectId");

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingExternalParticipant" ADD CONSTRAINT "MeetingExternalParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingExternalParticipant" ADD CONSTRAINT "MeetingExternalParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiaire" ADD CONSTRAINT "Beneficiaire_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiaire" ADD CONSTRAINT "Beneficiaire_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiaire" ADD CONSTRAINT "Beneficiaire_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
