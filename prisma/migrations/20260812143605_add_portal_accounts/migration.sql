-- CreateTable
CREATE TABLE "PortalAccount" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedById" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalInviteToken" (
    "id" TEXT NOT NULL,
    "portalAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalAccount_contactId_key" ON "PortalAccount"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalAccount_email_key" ON "PortalAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalInviteToken_tokenHash_key" ON "PortalInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalInviteToken_portalAccountId_idx" ON "PortalInviteToken"("portalAccountId");

-- AddForeignKey
ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccount" ADD CONSTRAINT "PortalAccount_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInviteToken" ADD CONSTRAINT "PortalInviteToken_portalAccountId_fkey" FOREIGN KEY ("portalAccountId") REFERENCES "PortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
