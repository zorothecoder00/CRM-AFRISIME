import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { markPortalMessagesReadByContact } from "@/actions/portal.actions";
import { PortalMessageThread } from "@/components/portal/portal-message-thread";

export default async function PortalMessagesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const messages = await prisma.portalMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "asc" },
  });

  await markPortalMessagesReadByContact();

  const visibility = await computePortalNavVisibility(contact.id);

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={{ ...visibility, unreadMessages: 0 }}
      maxWidthClassName="max-w-2xl"
    >
      <h1 className="text-2xl font-semibold">Messages</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Échanges avec l&apos;équipe AfriSime</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalMessageThread
            messages={messages.map((m) => ({
              id: m.id,
              authorType: m.authorType,
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </PortalShell>
  );
}
