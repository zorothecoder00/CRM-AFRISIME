-- Multi-tenant Phase 3, lot 3 (2026-08-20) — memes principes que les
-- migrations enable_rls_user_department / enable_rls_team_project : ENABLE
-- sans FORCE, sans effet sur le role proprietaire (celui de DATABASE_URL,
-- utilise par toute l'app).

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Task"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
