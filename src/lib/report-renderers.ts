import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from "docx";
import PptxGenJS from "pptxgenjs";
import type { ReportDocument } from "@/lib/reports";

export async function renderExcel(report: ReportDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const section of report.sections) {
    // Nom d'onglet Excel limite a 31 caracteres et interdit certains
    // caracteres — reutilise juste le heading tronque, un seul rapport
    // n'a jamais deux sections au heading identique dans ce projet.
    const sheet = workbook.addWorksheet(section.heading.slice(0, 31).replace(/[[\]*/\\?:]/g, ""));
    if (section.note) {
      sheet.addRow([section.note]);
      sheet.addRow([]);
    }
    // section.columns peut etre vide (sections "note only" comme
    // Activites/Risques/Performances/Recommandations de la Weekly Business
    // Review, §31) — sheet.columns reste alors undefined tant qu'aucune
    // ligne de donnees n'est ajoutee, d'ou la garde ci-dessous.
    if (section.columns.length > 0) {
      sheet.addRow(section.columns.map((c) => c.label));
      sheet.getRow(sheet.rowCount).font = { bold: true };
      for (const row of section.rows) {
        sheet.addRow(section.columns.map((c) => row[c.key] ?? ""));
      }
      sheet.columns.forEach((col) => {
        col.width = 22;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function renderPdf(report: ReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(report.title);
    doc.fontSize(9).fillColor("#666666").text(`Généré le ${report.generatedAt.toLocaleString("fr-FR")}`);
    doc.moveDown();

    for (const section of report.sections) {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }
      doc.fontSize(13).fillColor("#000000").text(section.heading);
      doc.moveDown(0.3);

      if (section.note) {
        doc.fontSize(9).fillColor("#333333").text(section.note, { width: doc.page.width - 80 });
        doc.moveDown(0.3);
      }

      if (section.columns.length > 0) {
        const colWidth = (doc.page.width - 80) / section.columns.length;
        let y = doc.y;
        doc.fontSize(9).fillColor("#000000");
        section.columns.forEach((col, i) => {
          doc.text(col.label, 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
        });
        y += 16;
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor("#cccccc").stroke();
        y += 6;

        for (const row of section.rows) {
          if (y > doc.page.height - 60) {
            doc.addPage();
            y = 40;
          }
          section.columns.forEach((col, i) => {
            doc.text(row[col.key] ?? "", 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
          });
          y += 16;
        }
        doc.y = y;
      }
      doc.moveDown();
    }

    doc.end();
  });
}

export async function renderWord(report: ReportDocument): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Généré le ${report.generatedAt.toLocaleString("fr-FR")}` }),
    new Paragraph({ text: "" }),
  ];

  for (const section of report.sections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    if (section.note) {
      children.push(new Paragraph({ text: section.note }));
    }
    if (section.columns.length > 0) {
      const headerRow = new TableRow({
        children: section.columns.map(
          (c) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true })] })],
            })
        ),
      });
      const bodyRows = section.rows.map(
        (row) =>
          new TableRow({
            children: section.columns.map((c) => new TableCell({ children: [new Paragraph(row[c.key] ?? "")] })),
          })
      );
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// Format "présentation" (cahier des charges §32) — une diapositive titre +
// une diapositive par section (tableau simple, tronqué à 12 lignes/slide
// pour rester lisible ; au-delà, seules les 12 premières lignes sont
// affichées, le rapport complet reste disponible en PDF/Excel/Word).
const MAX_ROWS_PER_SLIDE = 12;

export async function renderPresentation(report: ReportDocument): Promise<Buffer> {
  const pres = new PptxGenJS();

  const titleSlide = pres.addSlide();
  titleSlide.addText(report.title, { x: 0.5, y: 2, w: 9, h: 1.5, fontSize: 28, bold: true });
  titleSlide.addText(`Généré le ${report.generatedAt.toLocaleString("fr-FR")}`, {
    x: 0.5,
    y: 3.3,
    w: 9,
    h: 0.5,
    fontSize: 12,
    color: "666666",
  });

  for (const section of report.sections) {
    const slide = pres.addSlide();
    slide.addText(section.heading, { x: 0.4, y: 0.3, w: 9, h: 0.6, fontSize: 20, bold: true });

    if (section.note) {
      slide.addText(section.note, { x: 0.4, y: 1, w: 9, h: 1, fontSize: 12 });
    }

    if (section.columns.length > 0 && section.rows.length > 0) {
      const rows = [
        section.columns.map((c) => ({ text: c.label, options: { bold: true } })),
        ...section.rows.slice(0, MAX_ROWS_PER_SLIDE).map((row) => section.columns.map((c) => ({ text: row[c.key] ?? "" }))),
      ];
      slide.addTable(rows, { x: 0.4, y: section.note ? 2.1 : 1.1, w: 9, fontSize: 9, autoPage: false });
    }
  }

  const data = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return data;
}
