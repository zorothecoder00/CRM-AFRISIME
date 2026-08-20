-- Multi-tenant Phase 3, lot 10 (2026-08-20) — memes principes que les
-- migrations RLS precedentes : ENABLE sans FORCE, sans effet sur le role
-- proprietaire (celui de DATABASE_URL, utilise par toute l'app). Colonne
-- platformOrganizationId (et non organizationId, deja pris par le sens CRM
-- existant sur ces tables).

ALTER TABLE "CrmOrganization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalInviteToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalMessage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "CrmOrganization"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "CrmContact"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "PortalAccount"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "PortalInviteToken"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "CrmOpportunity"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "CrmInteraction"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "Contract"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "PortalMessage"
  USING ("platformOrganizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("platformOrganizationId" = current_setting('app.current_org_id', true));
