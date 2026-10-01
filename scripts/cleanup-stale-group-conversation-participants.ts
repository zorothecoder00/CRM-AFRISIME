import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/lib/permissions";

/**
 * Rattrapage ponctuel (2026-10-01) : avant src/lib/conversation-membership.ts,
 * quitter un departement ou une equipe ne retirait pas l'utilisateur du
 * canal correspondant — il continuait d'en recevoir les messages et
 * documents joints. Ce script retire ces participants obsoletes.
 *
 * Volontairement prudent, pour ne pas expulser un non-membre qui a ouvert le
 * canal legitimement (ensure*Conversation ajoute aussi l'acteur) :
 *  - canal de departement : participant dont User.departmentId n'est plus
 *    ce departement ET dont le role n'a pas department.manage (les
 *    gestionnaires des departements peuvent ouvrir tout canal) ;
 *  - canal d'equipe : participant qui n'est plus TeamMember ET dont le
 *    retrait de cette equipe est journalise (audit team.member_removed).
 * Les canaux de projet ne sont pas rattrapes (l'audit project.member_removed
 * ne porte pas le projectId) — seuls les retraits futurs s'appliquent.
 *
 * Usage (simulation par defaut, --apply pour supprimer) :
 *   DATABASE_URL="<url>" npx tsx scripts/cleanup-stale-group-conversation-participants.ts [--apply]
 */

const apply = process.argv.includes("--apply");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const stale: { conversationId: string; userId: string; label: string }[] = [];

  const departmentParticipants = await prisma.conversationParticipant.findMany({
    where: { conversation: { departmentId: { not: null } } },
    select: {
      conversationId: true,
      userId: true,
      conversation: { select: { nom: true, departmentId: true } },
      user: {
        select: {
          name: true,
          departmentId: true,
          role: { select: { permissions: { select: { permission: { select: { key: true } } } } } },
        },
      },
    },
  });
  for (const p of departmentParticipants) {
    if (p.user.departmentId === p.conversation.departmentId) continue;
    const canManage = p.user.role.permissions.some((rp) => rp.permission.key === PERMISSIONS.DEPARTMENT_MANAGE);
    if (canManage) continue;
    stale.push({ conversationId: p.conversationId, userId: p.userId, label: `${p.conversation.nom} — ${p.user.name}` });
  }

  const [teamParticipants, removals] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { conversation: { teamId: { not: null } } },
      select: {
        conversationId: true,
        userId: true,
        conversation: { select: { nom: true, teamId: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { action: "team.member_removed", entityType: "Team" },
      select: { entityId: true, changes: true },
    }),
  ]);
  const removedKeys = new Set(
    removals
      .map((r) => {
        const userId = (r.changes as { userId?: string } | null)?.userId;
        return userId ? `${r.entityId}:${userId}` : null;
      })
      .filter((k): k is string => k !== null)
  );
  const currentMembers = new Set(
    (await prisma.teamMember.findMany({ select: { teamId: true, userId: true } })).map((m) => `${m.teamId}:${m.userId}`)
  );
  for (const p of teamParticipants) {
    const key = `${p.conversation.teamId}:${p.userId}`;
    if (currentMembers.has(key) || !removedKeys.has(key)) continue;
    stale.push({ conversationId: p.conversationId, userId: p.userId, label: `${p.conversation.nom} — ${p.user.name}` });
  }

  console.log(`${stale.length} participant(s) obsolete(s) :`);
  for (const s of stale) console.log(`  - ${s.label}`);

  if (!apply) {
    console.log("Simulation uniquement. Relancer avec --apply pour supprimer.");
    return;
  }
  for (const s of stale) {
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: s.conversationId, userId: s.userId } });
  }
  console.log(`${stale.length} participant(s) retire(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
