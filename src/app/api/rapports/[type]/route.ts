import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { REPORT_TYPES, getReportData, type ReportType } from "@/lib/reports";
import { renderExcel, renderPdf, renderPresentation, renderWord } from "@/lib/report-renderers";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const EXTENSIONS: Record<string, string> = { pdf: "pdf", excel: "xlsx", word: "docx", presentation: "pptx" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, PERMISSIONS.REPORT_EXPORT)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const { type } = await params;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return NextResponse.json({ error: "Type de rapport inconnu" }, { status: 400 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (!MIME_TYPES[format]) {
    return NextResponse.json({ error: "Format inconnu" }, { status: 400 });
  }

  const targetId = request.nextUrl.searchParams.get("targetId") ?? undefined;
  const report = await getReportData(type as ReportType, { targetId });
  const buffer =
    format === "excel"
      ? await renderExcel(report)
      : format === "word"
        ? await renderWord(report)
        : format === "presentation"
          ? await renderPresentation(report)
          : await renderPdf(report);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "report.exported",
      entityType: "Report",
      entityId: type,
      changes: { format },
    },
  });

  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME_TYPES[format],
      "Content-Disposition": `attachment; filename="${type.toLowerCase()}.${EXTENSIONS[format]}"`,
    },
  });
}
