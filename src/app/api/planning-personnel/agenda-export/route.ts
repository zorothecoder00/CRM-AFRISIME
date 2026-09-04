import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { subYears, addYears } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { ENTRY_TYPE_META, ENTRY_STATUT_LABELS, type PersonalPlanningEntryType, type PersonalPlanningEntryStatut } from "@/lib/personal-planning-types";
import { renderPdf, renderWord } from "@/lib/report-renderers";
import type { ReportDocument } from "@/lib/reports";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const EXTENSIONS: Record<string, string> = { pdf: "pdf", word: "docx" };

/**
 * Export PDF/Word de l'agenda consolidé (demande utilisateur — le xlsx
 * existant, lui, reste généré côté client via exportToXlsx). Distinct de
 * /api/rapports/[type] (catalogue fixe de rapports organisationnels) : ici
 * les données sont propres à l'utilisateur courant, pas à un type de
 * rapport enregistré — refetch server-side (mêmes requêtes que la page
 * /planning-personnel/agenda) plutôt que de faire confiance à des lignes
 * envoyées par le client.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (!MIME_TYPES[format]) {
    return NextResponse.json({ error: "Format inconnu" }, { status: 400 });
  }

  const userId = session.user.id;
  const now = new Date();
  const rangeStart = subYears(now, 2);
  const rangeEnd = addYears(now, 2);

  const [entriesRaw, meetingsRaw] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
  ]);

  const entries = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const report: ReportDocument = {
    title: "Agenda consolidé",
    generatedAt: now,
    sections: [
      {
        heading: `Agenda de ${session.user.name ?? "l'utilisateur"}`,
        columns: [
          { key: "date", label: "Date" },
          { key: "debut", label: "Heure début" },
          { key: "fin", label: "Heure fin" },
          { key: "titre", label: "Titre" },
          { key: "type", label: "Type" },
          { key: "statut", label: "Statut" },
          { key: "lieu", label: "Lieu" },
        ],
        rows: entries.map((e) => {
          const debut = new Date(e.dateDebut);
          const fin = new Date(e.dateFin);
          return {
            date: debut.toLocaleDateString("fr-FR"),
            debut: debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            fin: fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            titre: e.titre,
            type: ENTRY_TYPE_META[e.type as PersonalPlanningEntryType]?.label ?? e.type,
            statut: ENTRY_STATUT_LABELS[e.statut as PersonalPlanningEntryStatut] ?? e.statut,
            lieu: e.lieu ?? "",
          };
        }),
      },
    ],
  };

  const buffer = format === "word" ? await renderWord(report) : await renderPdf(report);
  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME_TYPES[format],
      "Content-Disposition": `attachment; filename="agenda-${now.toISOString().slice(0, 10)}.${EXTENSIONS[format]}"`,
    },
  });
}
