import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from "docx";
import type { ReportTable } from "@/lib/reports";

export async function renderExcel(report: ReportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.addRow(report.columns.map((c) => c.label));
  sheet.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    sheet.addRow(report.columns.map((c) => row[c.key] ?? ""));
  }
  sheet.columns.forEach((col) => {
    col.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function renderPdf(report: ReportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(report.title);
    doc.fontSize(9).fillColor("#666666").text(`Généré le ${report.generatedAt.toLocaleString("fr-FR")}`);
    doc.moveDown();

    const colWidth = (doc.page.width - 80) / report.columns.length;
    let y = doc.y;
    doc.fontSize(9).fillColor("#000000");
    report.columns.forEach((col, i) => {
      doc.text(col.label, 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
    });
    y += 16;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 6;

    for (const row of report.rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      report.columns.forEach((col, i) => {
        doc.text(row[col.key] ?? "", 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
      });
      y += 16;
    }

    doc.end();
  });
}

export async function renderWord(report: ReportTable): Promise<Buffer> {
  const headerRow = new TableRow({
    children: report.columns.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true })] })],
        })
    ),
  });
  const bodyRows = report.rows.map(
    (row) =>
      new TableRow({
        children: report.columns.map(
          (c) => new TableCell({ children: [new Paragraph(row[c.key] ?? "")] })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Généré le ${report.generatedAt.toLocaleString("fr-FR")}` }),
          new Paragraph({ text: "" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
