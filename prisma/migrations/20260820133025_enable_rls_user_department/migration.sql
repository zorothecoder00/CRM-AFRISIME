-- Multi-tenant Phase 3 (V3.0 §27, preuve de concept) — Row-Level Security
-- sur les 2 tables couvertes par la Phase 1 (User, Department).
--
-- IMPORTANT : ENABLE ROW LEVEL SECURITY sans FORCE. Le role proprietaire des
-- tables (celui utilise par DATABASE_URL pour toute l'app aujourd'hui,
-- migrations comme requetes applicatives) reste EXEMPTE de RLS par defaut en
-- PostgreSQL, avec ou sans ENABLE : c'est FORCE qui l'y soumettrait, et FORCE
-- casserait immediatement l'app entiere (des centaines d'appels Prisma non
-- scopes sur ces 2 tables, y compris l'authentification NextAuth elle-meme,
-- qui doit pouvoir lire User sans connaitre l'organisation au prealable).
-- Cette migration est donc sans effet sur le comportement actuel de l'app,
-- meme appliquee en production : elle prepare seulement le terrain pour un
-- role applicatif restreint (non proprietaire), qui lui sera bien soumis a
-- ces politiques des sa creation. Voir scripts/setup-local-rls-test-role.ts
-- pour la preuve que la politique bloque reellement un role non-proprietaire.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;

-- current_setting(..., true) renvoie NULL si non definie (le "true" = missing_ok) ;
-- une comparaison a NULL n'est jamais vraie en SQL, donc un role non-owner qui
-- n'a pas defini app.current_org_id ne voit et n'ecrit aucune ligne (deny-by-default).
CREATE POLICY tenant_isolation ON "User"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation ON "Department"
  USING ("organizationId" = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_org_id', true));
