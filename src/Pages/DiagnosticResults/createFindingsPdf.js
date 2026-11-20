const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 48;
const RIGHT = 564;

const ascii = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/[^\x20-\x7E]/g, "?");

const escapePdfText = (value) => ascii(value).replace(/([\\()])/g, "\\$1");

const text = (x, y, value, size = 11, font = "F1", color = "0.12 0.20 0.27") =>
  `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(value)}) Tj ET`;

const line = (x1, y1, x2, y2, color = "0.83 0.88 0.91", width = 0.8) =>
  `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;

const wrap = (value, maxChars = 49) => {
  const words = ascii(value).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (!word) return;
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
};

const createPageContent = (rows, pageNumber, pageCount, processedDate, patientLabel) => {
  const commands = [];
  commands.push(text(LEFT, 748, "MEDVISION AI", 11, "F2", "0.04 0.48 0.54"));
  commands.push(text(LEFT, 714, "Diagnostic Findings Report", 22, "F2", "0.08 0.18 0.27"));
  commands.push(text(LEFT, 693, `Date processed: ${processedDate}`, 10, "F1", "0.35 0.43 0.49"));
  if (patientLabel) commands.push(text(LEFT, 676, patientLabel, 10, "F1", "0.35 0.43 0.49"));

  const tableTop = patientLabel ? 649 : 666;
  commands.push(`0.91 0.95 0.97 rg ${LEFT} ${tableTop - 25} ${RIGHT - LEFT} 27 re f`);
  commands.push(text(LEFT + 12, tableTop - 16, "DISEASE DETECTED", 9, "F2", "0.27 0.38 0.47"));
  commands.push(text(451, tableTop - 16, "CONFIDENCE SCORE", 9, "F2", "0.27 0.38 0.47"));
  let y = tableTop - 43;
  rows.forEach((row, index) => {
    const diseaseLines = wrap(row.disease, 53);
    const rowHeight = Math.max(34, 15 * diseaseLines.length + 17);
    if (index % 2 === 1) commands.push(`0.985 0.991 0.994 rg ${LEFT} ${y - rowHeight + 9} ${RIGHT - LEFT} ${rowHeight} re f`);
    diseaseLines.forEach((part, lineIndex) => commands.push(text(LEFT + 12, y - 7 - lineIndex * 14, part, 11, "F1", "0.13 0.23 0.31")));
    commands.push(text(462, y - 7, row.confidence, 11, "F2", "0.05 0.48 0.54"));
    commands.push(line(LEFT, y - rowHeight + 9, RIGHT, y - rowHeight + 9));
    y -= rowHeight;
  });
  commands.push(line(LEFT, 43, RIGHT, 43));
  commands.push(text(LEFT, 27, "AI-generated findings are intended to support qualified clinical review.", 8, "F1", "0.42 0.50 0.56"));
  commands.push(text(504, 27, `${pageNumber} / ${pageCount}`, 8, "F1", "0.42 0.50 0.56"));
  return commands.join("\n");
};

const buildPdf = (pageContents) => {
  const objects = [];
  const addObject = (body) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds = [];

  pageContents.forEach((content) => {
    const stream = `${content}\n`;
    const streamId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%MedVisionAI\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

export function downloadFindingsPdf({ findings = [], processedDate, patientName, patientId }) {
  const diseaseRows = findings
    .filter((finding) => finding.name && String(finding.name).toLowerCase() !== "no significant findings")
    .map((finding) => ({ disease: finding.name, confidence: finding.probability == null ? "N/A" : `${finding.probability}%` }));
  const rows = diseaseRows.length ? diseaseRows : [{ disease: "No significant findings detected", confidence: "N/A" }];
  const processed = processedDate || new Date().toISOString().slice(0, 10);
  const patientLabel = [patientName, patientId ? `Patient ID: ${patientId}` : ""].filter(Boolean).join("  |  ");
  const pages = [];
  let pageRows = [];
  let pageHeight = 0;
  rows.forEach((row) => {
    const rowHeight = Math.max(34, 15 * wrap(row.disease, 53).length + 17);
    if (pageRows.length && pageHeight + rowHeight > 530) {
      pages.push(pageRows);
      pageRows = [];
      pageHeight = 0;
    }
    pageRows.push(row);
    pageHeight += rowHeight;
  });
  if (pageRows.length) pages.push(pageRows);
  const pageCount = pages.length;
  const contents = pages.map((pageRowsOnPage, index) => createPageContent(
    pageRowsOnPage, index + 1, pageCount, processed, patientLabel,
  ));
  const pdf = buildPdf(contents);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `MedVision-AI-Findings-${processed}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
