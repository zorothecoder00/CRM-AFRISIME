-- Recherche floue tolerante aux fautes de frappe (globalSearch, src/lib/search.ts)
-- Aucune cle LLM/embeddings disponible dans cette instance : pas de vraie
-- recherche "par sens", mais pg_trgm (similarite trigramme, standard
-- PostgreSQL) tolere fautes de frappe/variantes sans dependance externe.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index GIN trigramme sur chaque colonne cherchee par globalSearch(), pour
-- que la similarite reste accelaree par index (pas un scan complet) meme
-- quand le volume de donnees grossit.
CREATE INDEX IF NOT EXISTS "Project_nom_trgm_idx" ON "Project" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Task_titre_trgm_idx" ON "Task" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TaskComment_content_trgm_idx" ON "TaskComment" USING GIN ("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Meeting_titre_trgm_idx" ON "Meeting" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "MeetingDecision_description_trgm_idx" ON "MeetingDecision" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "GovernanceDecision_objet_trgm_idx" ON "GovernanceDecision" USING GIN ("objet" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Document_nom_trgm_idx" ON "Document" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_titre_trgm_idx" ON "KnowledgeArticle" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_content_trgm_idx" ON "KnowledgeArticle" USING GIN ("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Courrier_objet_trgm_idx" ON "Courrier" USING GIN ("objet" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Courrier_reference_trgm_idx" ON "Courrier" USING GIN ("reference" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CrmContact_nom_trgm_idx" ON "CrmContact" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CrmContact_prenom_trgm_idx" ON "CrmContact" USING GIN ("prenom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CrmContact_email_trgm_idx" ON "CrmContact" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CrmOrganization_nom_trgm_idx" ON "CrmOrganization" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contract_nom_trgm_idx" ON "Contract" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Processus_nom_trgm_idx" ON "Processus" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrganizationalRisk_titre_trgm_idx" ON "OrganizationalRisk" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProjectRisk_titre_trgm_idx" ON "ProjectRisk" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Indicator_nom_trgm_idx" ON "Indicator" USING GIN ("nom" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
