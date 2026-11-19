import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { hasArabic, type ExportModel } from "@/lib/domain/export";

const INK = "172B4D";
const MUTED = "6B778C";
const LINE = "DFE1E6";
const SHADE = "F4F5F7";

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 4, color: LINE },
};

/** a paragraph whose direction follows its text (Arabic cards read right-to-left) */
function textPara(text: string, extra: TextRun[] = [], opts: { bullet?: boolean } = {}): Paragraph {
  const rtl = hasArabic(text);
  return new Paragraph({
    bidirectional: rtl || undefined,
    bullet: opts.bullet ? { level: 0 } : undefined,
    children: [new TextRun({ text, rightToLeft: rtl || undefined }), ...extra],
  });
}

function cell(children: Paragraph[], opts: { shade?: boolean; width?: number } = {}): TableCell {
  return new TableCell({
    children,
    borders,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { fill: SHADE, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

const label = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true })] });

function infoTable(m: ExportModel): Table {
  const row = (name: string, value: Paragraph) =>
    new TableRow({ children: [cell([label(name)], { shade: true, width: 28 }), cell([value], { width: 72 })] });
  const people = m.participants.length
    ? new Paragraph({
        children: m.participants.flatMap((p, i) => [
          ...(i ? [new TextRun({ text: ", " })] : []),
          new TextRun({ text: p.name, rightToLeft: hasArabic(p.name) || undefined }),
          new TextRun({ text: ` (${p.role})`, color: MUTED }),
        ]),
      })
    : new Paragraph("—");
  const s = m.stats;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      row("Date", new Paragraph(m.dateLabel)),
      row("Facilitator", textPara(m.facilitator ?? "—")),
      row("Participants", people),
      row(
        "At a glance",
        new Paragraph(`${s.participants} participants · ${s.cards} cards · ${s.votes} votes · ${s.actions} actions`),
      ),
    ],
  });
}

function actionsTable(m: ExportModel): Table {
  const head = (t: string, width: number) => cell([label(t)], { shade: true, width });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [head("Action", 40), head("Owner", 18), head("Due", 16), head("From", 26)],
      }),
      ...m.actions.map(
        (a) =>
          new TableRow({
            children: [
              cell([
                new Paragraph({
                  bidirectional: hasArabic(a.text) || undefined,
                  children: [
                    new TextRun({ text: "☐ " }),
                    new TextRun({ text: a.text, rightToLeft: hasArabic(a.text) || undefined }),
                  ],
                }),
              ]),
              cell([textPara(a.owner || "—")]),
              cell([new Paragraph(a.due ?? "—")]),
              cell(a.from.length ? a.from.map((f) => textPara(f)) : [new Paragraph("—")]),
            ],
          }),
      ),
    ],
  });
}

const voteLabel = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

const section = (text: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, text, spacing: { before: 320, after: 120 } });

export async function buildDocx(m: ExportModel): Promise<Blob> {
  const body: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      bidirectional: hasArabic(m.title) || undefined,
      spacing: { after: 200 },
      children: [new TextRun({ text: m.title, rightToLeft: hasArabic(m.title) || undefined })],
    }),
    infoTable(m),
  ];

  for (const s of m.sections) {
    body.push(section(s.heading));
    if (s.items.length === 0) body.push(new Paragraph({ children: [new TextRun({ text: "None", color: MUTED })] }));
    for (const c of s.items) {
      const votes = c.votes
        ? [
            new TextRun({
              // in an RTL paragraph: keep the gap on the Arabic side (RLM) and the label as one LTR block (LRE…PDF)
              text: hasArabic(c.text) ? `‏   ‪${voteLabel(c.votes)}‬` : `   ${voteLabel(c.votes)}`,
              rightToLeft: hasArabic(c.text) || undefined,
              color: "BF2600",
              bold: true,
              size: 18,
            }),
          ]
        : [];
      body.push(textPara(c.text, votes, { bullet: true }));
    }
  }

  body.push(section("Action items"));
  body.push(
    m.actions.length
      ? actionsTable(m)
      : new Paragraph({ children: [new TextRun({ text: "No action items.", color: MUTED })] }),
  );
  body.push(
    new Paragraph({
      spacing: { before: 480 },
      children: [new TextRun({ text: "Generated by Fox Retro", color: "97A0AF", size: 16 })],
    }),
  );

  const doc = new Document({
    creator: "Fox Retro",
    title: m.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: INK } } } },
    sections: [{ children: body }],
  });
  return Packer.toBlob(doc);
}
