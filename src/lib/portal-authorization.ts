import { prisma } from "@/lib/prisma";

/**
 * Autorisation unique pour tout le portail externe (cahier des charges
 * §16-20) : un Stakeholder (V2.2 §21) rattache a ce CrmContact et lie a un
 * projet (StakeholderProject) determine qu'un contact CRM peut voir ce
 * projet. Sert Partenaire ("projets communs"), Investisseur ("projets
 * autorises"/"portefeuille") et, via la chaine programme -> projet,
 * Institution ("programmes") — pas trois mecanismes differents.
 */
export async function getAuthorizedProjectIds(contactId: string): Promise<string[]> {
  const links = await prisma.stakeholderProject.findMany({
    where: { stakeholder: { contactId } },
    select: { projectId: true },
  });
  return Array.from(new Set(links.map((l) => l.projectId)));
}

/** Un programme est visible au portail des qu'au moins un de ses projets l'est. */
export async function getAuthorizedProgrammeIds(contactId: string): Promise<string[]> {
  const projectIds = await getAuthorizedProjectIds(contactId);
  if (projectIds.length === 0) return [];
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds }, programmeId: { not: null } },
    select: { programmeId: true },
  });
  return Array.from(new Set(projects.map((p) => p.programmeId).filter((id): id is string => Boolean(id))));
}

export async function isProjectAuthorized(contactId: string, projectId: string): Promise<boolean> {
  const count = await prisma.stakeholderProject.count({ where: { projectId, stakeholder: { contactId } } });
  return count > 0;
}

export async function isProgrammeAuthorized(contactId: string, programmeId: string): Promise<boolean> {
  const programmeIds = await getAuthorizedProgrammeIds(contactId);
  return programmeIds.includes(programmeId);
}
