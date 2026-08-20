-- Multi-tenant Phase 3, lot 2 (2026-08-20) — memes principes que
-- enable_rls_user_department : ENABLE sans FORCE, sans effet sur le role
-- proprietaire (celui de DATABASE_URL, utilise par toute l'app). Voir cette
-- migration precedente pour le detail du raisonnement.

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Team"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "Project"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
