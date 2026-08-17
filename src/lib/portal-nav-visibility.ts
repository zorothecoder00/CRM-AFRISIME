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
};

export async function computePortalNavVisibility(contactId: string): Promise<PortalNavVisibility> {
  const [missionsCount, projectIds, pendingMeetingsCount, programmeIds, unreadMessages] = await Promise.all([
    prisma.task.count({ where: { externalContactId: contactId } }),
    getAuthorizedProjectIds(contactId),
    prisma.meetingExternalParticipant.count({ where: { contactId } }),
    getAuthorizedProgrammeIds(contactId),
    prisma.portalMessage.count({ where: { contactId, authorType: "INTERNAL", isReadByContact: false } }),
  ]);

  return {
    missions: missionsCount > 0,
    projects: projectIds.length > 0,
    meetings: pendingMeetingsCount > 0,
    programmes: programmeIds.length > 0,
    news: projectIds.length > 0 || programmeIds.length > 0,
    unreadMessages,
  };
}
