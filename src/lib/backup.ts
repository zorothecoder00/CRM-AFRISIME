import { prisma } from "@/lib/prisma";

export const BACKUP_VERSION = 1;

// Sauvegarde applicative (cahier des charges V2.2 §37 — "sauvegarde" /
// "restauration"). Les vraies sauvegardes de base de données sont gerees par
// l'hebergeur (Neon) — hors de portee de l'app. Ceci est complementaire :
// un instantane JSON des tables les plus sensibles, exportable/reimportable
// par un admin. Volontairement borne a des colonnes SCALAIRES uniquement
// (pas de relations imbriquees) : chaque table s'exporte via findMany() sans
// include/select, donc uniquement les colonnes propres + cles etrangeres en
// chaines brutes — un vrai instantane des donnees principales, pas un dump
// relationnel complet (assignations, commentaires, versions... restent hors
// perimetre de cet export).
export const BACKUP_TABLES = ["project", "task", "crmOrganization", "crmContact", "crmOpportunity", "document", "objective"] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupPayload = {
  version: number;
  exportedAt: string;
  tables: Record<BackupTable, Record<string, unknown>[]>;
};

export async function exportBackupData(): Promise<BackupPayload> {
  const [project, task, crmOrganization, crmContact, crmOpportunity, document, objective] = await Promise.all([
    prisma.project.findMany(),
    prisma.task.findMany(),
    prisma.crmOrganization.findMany(),
    prisma.crmContact.findMany(),
    prisma.crmOpportunity.findMany(),
    prisma.document.findMany(),
    prisma.objective.findMany(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables: { project, task, crmOrganization, crmContact, crmOpportunity, document, objective } as BackupPayload["tables"],
  };
}

export type ImportResult = { table: BackupTable; upserted: number; failed: number }[];

/**
 * Réimport (cahier §37 — "restauration") — upsert par id, jamais de delete.
 * Une ligne qui échoue (contrainte FK vers une entité absente de la cible,
 * par ex.) est comptée dans `failed` et ignorée plutôt que de faire échouer
 * tout l'import — un admin restaurant un instantané partiel doit récupérer
 * ce qui est restaurable, pas tout perdre pour une seule ligne orpheline.
 */
export async function importBackupData(payload: BackupPayload): Promise<ImportResult> {
  const results: ImportResult = [];

  const importers: Record<BackupTable, (row: Record<string, unknown>) => Promise<unknown>> = {
    project: (row) => prisma.project.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    task: (row) => prisma.task.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    crmOrganization: (row) =>
      prisma.crmOrganization.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    crmContact: (row) => prisma.crmContact.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    crmOpportunity: (row) =>
      prisma.crmOpportunity.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    document: (row) => prisma.document.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
    objective: (row) => prisma.objective.upsert({ where: { id: row.id as string }, create: row as never, update: row as never }),
  };

  for (const table of BACKUP_TABLES) {
    const rows = payload.tables[table] ?? [];
    let upserted = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await importers[table](row);
        upserted++;
      } catch {
        failed++;
      }
    }
    results.push({ table, upserted, failed });
  }

  return results;
}
