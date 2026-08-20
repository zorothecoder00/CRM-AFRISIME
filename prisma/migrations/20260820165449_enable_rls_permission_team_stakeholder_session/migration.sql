-- Multi-tenant Phase 3, lot 17 (2026-08-20) — memes principes que les
-- migrations RLS precedentes : ENABLE sans FORCE, sans effet sur le role
-- proprietaire (celui de DATABASE_URL, utilise par toute l'app y compris le
-- flux d'authentification NextAuth) — PasswordResetToken/UserSession restent
-- donc lus/ecrits normalement par auth.ts, aucune regression sur la
-- connexion.

ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stakeholder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StakeholderProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StakeholderCommunication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "PasswordResetToken"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "PermissionOverride"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "TeamMember"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "Stakeholder"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "StakeholderProject"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "StakeholderCommunication"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "UserSession"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
