-- AlterEnum
-- §12 (segment 2) — statuts additionnels, changement additif sans risque de
-- perte de donnees.
ALTER TYPE "PersonalPlanningEntryStatut" ADD VALUE 'A_PLANIFIER';
ALTER TYPE "PersonalPlanningEntryStatut" ADD VALUE 'EN_ATTENTE';
ALTER TYPE "PersonalPlanningEntryStatut" ADD VALUE 'BLOQUEE';

-- AlterEnum
-- §11 (segment 2) — priorite passe de 3 a 4 niveaux, IMPORTANTE devient
-- HAUTE. Postgres ne permet pas de renommer/retirer une valeur d'enum
-- directement : on repasse la colonne en TEXT le temps de remapper les
-- lignes existantes, puis on recree le type avec les 4 valeurs finales.
BEGIN;
ALTER TABLE "PersonalPlanningEntry" ALTER COLUMN "priorite" DROP DEFAULT;
ALTER TABLE "PersonalPlanningEntry" ALTER COLUMN "priorite" TYPE TEXT USING "priorite"::text;
UPDATE "PersonalPlanningEntry" SET "priorite" = 'HAUTE' WHERE "priorite" = 'IMPORTANTE';
CREATE TYPE "PersonalPlanningPriorite_new" AS ENUM ('CRITIQUE', 'HAUTE', 'NORMALE', 'FAIBLE');
ALTER TABLE "PersonalPlanningEntry" ALTER COLUMN "priorite" TYPE "PersonalPlanningPriorite_new" USING ("priorite"::"PersonalPlanningPriorite_new");
DROP TYPE "PersonalPlanningPriorite";
ALTER TYPE "PersonalPlanningPriorite_new" RENAME TO "PersonalPlanningPriorite";
ALTER TABLE "PersonalPlanningEntry" ALTER COLUMN "priorite" SET DEFAULT 'NORMALE';
COMMIT;
