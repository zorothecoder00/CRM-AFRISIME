import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { PortalMeetingRsvp } from "@/components/portal/portal-meeting-rsvp";

const RSVP_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente de votre réponse",
  CONFIRME: "Vous avez confirmé",
  DECLINE: "Vous avez décliné",
};

/** Participation aux réunions (cahier des charges §17) — invitation + RSVP réel. */
export default async function PortalMeetingsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const [participations, visibility] = await Promise.all([
    prisma.meetingExternalParticipant.findMany({
      where: { contactId: contact.id },
      include: { meeting: { include: { project: true } } },
      orderBy: { meeting: { dateHeure: "desc" } },
    }),
    computePortalNavVisibility(contact.id),
  ]);

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <h1 className="text-2xl font-semibold">Réunions</h1>
      {participations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune invitation pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {participations.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {p.meeting.titre}
                  <Badge variant={p.rsvp === "CONFIRME" ? "success" : p.rsvp === "DECLINE" ? "destructive" : "warning"}>
                    {RSVP_LABELS[p.rsvp]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.meeting.project?.nom ?? "Sans projet"}</p>
                <p className="text-sm">
                  {p.meeting.dateHeure.toLocaleString("fr-FR")}
                  {p.meeting.lieu ? ` — ${p.meeting.lieu}` : ""}
                </p>
                {p.meeting.ordreDuJour && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.meeting.ordreDuJour}</p>
                )}
                {p.rsvp === "EN_ATTENTE" && <PortalMeetingRsvp participantId={p.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
