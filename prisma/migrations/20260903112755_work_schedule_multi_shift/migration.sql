-- Un jour peut desormais porter plusieurs horaires (shifts) et chaque
-- horaire peut porter plusieurs pauses (demande utilisateur, remplace
-- l'ancien pauseDebut/pauseFin unique par ligne).

-- CreateTable (avant le DROP COLUMN suivant, pour pouvoir migrer les
-- pauses existantes avant de perdre pauseDebut/pauseFin).
CREATE TABLE "UserWorkScheduleBreak" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserWorkScheduleBreak_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserWorkScheduleBreak_scheduleId_idx" ON "UserWorkScheduleBreak"("scheduleId");

ALTER TABLE "UserWorkScheduleBreak" ADD CONSTRAINT "UserWorkScheduleBreak_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "UserWorkSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des donnees : une pause existante par UserWorkSchedule devient
-- une ligne UserWorkScheduleBreak (ordre 0), avant de perdre les colonnes.
INSERT INTO "UserWorkScheduleBreak" ("id", "scheduleId", "heureDebut", "heureFin", "ordre")
SELECT gen_random_uuid()::text, "id", "pauseDebut", "pauseFin", 0
FROM "UserWorkSchedule"
WHERE "pauseDebut" IS NOT NULL AND "pauseFin" IS NOT NULL;

-- DropIndex
DROP INDEX "UserWorkSchedule_userId_jourSemaine_key";

-- AlterTable
ALTER TABLE "UserWorkSchedule" DROP COLUMN "pauseDebut",
DROP COLUMN "pauseFin",
ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkSchedule_userId_jourSemaine_ordre_key" ON "UserWorkSchedule"("userId", "jourSemaine", "ordre");
