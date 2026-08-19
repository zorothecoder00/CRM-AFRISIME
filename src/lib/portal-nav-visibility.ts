import { prisma } from "@/lib/prisma";
import { getAuthorizedProjectIds, getAuthorizedProgrammeIds } from "@/lib/portal-authorization";

/**
 * Visibilite des sections du portail (cahier des charges §16-20) : basee sur
 * les donnees reellement presentes pour le contact plutot que sur son
 * `type` en dur, pour rester correcte meme si un contact a un profil mixte
 * (ex : un PARTENAIRE aussi rattache a des missions).
 */
export type PortalNavVisibility = {
  missions: boolean;
  projects: boolean;
  meetings: boolean;
  programmes: boolean;
  news: boolean;
  unreadMessages: number;
  droitMessages: boolean;
  droitDocuments: boolean;
  droitTeleversement: boolean;
};

export async function computePortalNavVisibility(contactId: string): Promise<PortalNavVisibility> {
  const [missionsCount, projectIds, pendingMeetingsCount, programmeIds, unreadMessages, account] = await Promise.all([
    prisma.task.count({ where: { externalContactId: contactId } }),
    getAuthorizedProjectIds(contactId),
    prisma.meetingExternalParticipant.count({ where: { contactId } }),
    getAuthorizedProgrammeIds(contactId),
    prisma.portalMessage.count({ where: { contactId, authorType: "INTERNAL", isReadByContact: false } }),
    prisma.portalAccount.findUnique({
      where: { contactId },
      select: { droitProjets: true, droitDocuments: true, droitTeleversement: true, droitMessages: true },
    }),
  ]);

  // Droits (cahier des charges V3.0 §25) — restreint la visibilité pilotée
  // par les données (au-dessus) sans jamais l'élargir : un droit à false
  // masque une section même si la donnée existe pour ce contact.
  const droitProjets = account?.droitProjets ?? true;
  const droitMessages = account?.droitMessages ?? true;

  return {
    missions: missionsCount > 0,
    projects: (projectIds.length > 0) && droitProjets,
    meetings: pendingMeetingsCount > 0,
    programmes: programmeIds.length > 0,
    news: (projectIds.length > 0 || programmeIds.length > 0) && droitProjets,
    unreadMessages: droitMessages ? unreadMessages : 0,
    droitMessages,
    droitDocuments: account?.droitDocuments ?? true,
    droitTeleversement: account?.droitTeleversement ?? true,
  };
}
