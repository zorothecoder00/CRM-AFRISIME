-- Multi-tenant Phase 3, lot 15 (2026-08-20) — memes principes que les
-- migrations RLS precedentes : ENABLE sans FORCE, sans effet sur le role
-- proprietaire (celui de DATABASE_URL, utilise par toute l'app).

ALTER TABLE "AutomationCondition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrchestrationPlaybook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingAiAction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "AutomationCondition"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "OrchestrationPlaybook"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "AutomationRule"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "AutomationExecution"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "PendingAiAction"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
