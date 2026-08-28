-- §22 (segment 3) — motif de blocage.
CREATE TYPE "PersonalPlanningMotifBlocage" AS ENUM ('DEPENDANCE', 'INFORMATION_MANQUANTE', 'VALIDATION', 'FOURNISSEUR', 'MANQUE_RESSOURCES', 'AUTRE');

-- §26 — notification additionnelle au delegant.
ALTER TYPE "NotificationType" ADD VALUE 'DELEGATION_EN_RETARD';

-- §24 — rappel devient multi-selection (tableau) ; l'ancienne colonne
-- singuliere "rappel" est abandonnee (peu de donnees existantes, segment
-- livre le meme jour que le segment 2 qui l'a introduite).
ALTER TABLE "PersonalPlanningEntry" DROP COLUMN "rappel";
DROP TYPE "PersonalPlanningRappel";
CREATE TYPE "PersonalPlanningRappel" AS ENUM ('LE_JOUR_MEME', 'VEILLE', 'PERSONNALISE');

ALTER TABLE "PersonalPlanningEntry"
  ADD COLUMN "rappels" "PersonalPlanningRappel"[] NOT NULL DEFAULT ARRAY[]::"PersonalPlanningRappel"[],
  ADD COLUMN "rappelPersonnaliseDate" TIMESTAMP(3),
  ADD COLUMN "motifBlocage" "PersonalPlanningMotifBlocage",
  ADD COLUMN "missionDestination" TEXT,
  ADD COLUMN "missionBudget" DECIMAL(12,2),
  ADD COLUMN "missionMoyenTransport" TEXT,
  ADD COLUMN "missionHebergement" TEXT,
  ADD COLUMN "missionRapport" TEXT;
