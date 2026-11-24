const encoder = new TextEncoder();
const pageW = 612;
const pageH = 792;
const left = 44;
const right = 568;

const ascii = (input) => String(input ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/[^\x20-\x7E]/g, "?");
const esc = (value) => ascii(value).replace(/([\\()])/g, "\\$1");
const drawText = (x, y, value, size = 10, bold = false, color = "0.13 0.23 0.31") =>
  `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${esc(value)}) Tj ET`;
const drawLine = (x, y, x2, y2, color = "0.82 0.87 0.90") => `${color} RG 0.7 w ${x} ${y} m ${x2} ${y2} l S`;

function wrap(value, limit = 54) {
  const out = [];
  let current = "";
  ascii(value).split(/\s+/).forEach((word) => {
    if (current && `${current} ${word}`.length > limit) { out.push(current); current = word; }
    else current = current ? `${current} ${word}` : word;
  });
  if (current) out.push(current);
  return out.length ? out : ["-"];
}

async function rasterizeImage(source) {
  if (!source) return null;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed (${response.status})`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to decode report image"));
      element.src = objectUrl;
    });
    const scale = Math.min(1, 900 / image.naturalWidth, 800 / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image, 0, 0, width, height);
    const binary = atob(canvas.toDataURL("image/jpeg", 0.88).split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawImage(commands, image, resourceName, x, y, boxW, boxH) {
  if (!image) {
    commands.push(`0.95 0.97 0.98 rg ${x} ${y} ${boxW} ${boxH} re f`);
    commands.push(drawText(x + 55, y + boxH / 2, "Image unavailable", 9, false, "0.43 0.53 0.60"));
    return;
  }
  const scale = Math.min(boxW / image.width, boxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  commands.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${(x + (boxW - w) / 2).toFixed(2)} ${(y + (boxH - h) / 2).toFixed(2)} cm /${resourceName} Do Q`);
}

function drawTable(commands, rows, y, maxY, fontSize = 9) {
  commands.push(`0.91 0.95 0.97 rg ${left} ${y - 24} ${right - left} 25 re f`);
  commands.push(drawText(left + 11, y - 16, "DISEASE", 8, true, "0.29 0.40 0.49"));
  commands.push(drawText(442, y - 16, "CONFIDENCE SCORE", 8, true, "0.29 0.40 0.49"));
  let cursor = y - 35;
  rows.forEach((row, index) => {
    const parts = wrap(row.disease);
    const rowHeight = Math.max(24, parts.length * 12 + 10);
    if (cursor - rowHeight < maxY) return;
    if (index % 2) commands.push(`0.985 0.991 0.994 rg ${left} ${cursor - rowHeight + 3} ${right - left} ${rowHeight} re f`);
    parts.forEach((part, lineIndex) => commands.push(drawText(left + 11, cursor - 7 - lineIndex * 12, part, fontSize)));
    commands.push(drawText(462, cursor - 7, row.confidence, fontSize, true, "0.04 0.48 0.54"));
    commands.push(drawLine(left, cursor - rowHeight + 3, right, cursor - rowHeight + 3));
    cursor -= rowHeight;
  });
  return cursor;
}

function makeFirstPage(report, images, firstRows, pageCount) {
  const c = [
    drawText(left, 755, "Diagnostic Report", 22, true, "0.08 0.18 0.27"),
    drawText(left, 733, `Service provider: ${report.serviceProvider || "MedVision AI"}`, 10, true, "0.02 0.49 0.55"),
    drawLine(left, 720, right, 720, "0.10 0.55 0.60"),
    drawText(left, 699, "PATIENT", 8, true, "0.42 0.51 0.58"),
    drawText(left, 684, report.patientName || "Not provided", 9, true),
    drawText(310, 699, "PATIENT ID", 8, true, "0.42 0.51 0.58"),
    drawText(310, 684, report.patientId || "Not provided", 9, true),
    drawText(left, 662, "GENDER", 8, true, "0.42 0.51 0.58"),
    drawText(left, 647, report.gender || "Not provided", 9, true),
    drawText(310, 662, "AGE", 8, true, "0.42 0.51 0.58"),
    drawText(310, 647, report.age ? `${report.age} years` : "Not provided", 9, true),
    drawText(left, 625, "REPORT NUMBER", 8, true, "0.42 0.51 0.58"),
    drawText(left, 610, report.reportNumber || "Not provided", 9, true),
    drawText(310, 625, "DATE PROCESSED", 8, true, "0.42 0.51 0.58"),
    drawText(310, 610, report.processedDate || "Not provided", 9, true),
    `0.08 0.25 0.35 rg ${left} 583 ${right - left} 21 re f`,
    drawText(left + 11, 590, "I  SCAN IMAGES", 9, true, "1 1 1"),
  ];
  const imageY = 416;
  const imageH = 145;
  const imageW = 250;
  c.push(`0.96 0.975 0.98 rg ${left} ${imageY} ${imageW} ${imageH} re f`);
  c.push(`0.96 0.975 0.98 rg 318 ${imageY} ${imageW} ${imageH} re f`);
  c.push(drawLine(left, imageY, left + imageW, imageY));
  c.push(drawLine(left, imageY + imageH, left + imageW, imageY + imageH));
  c.push(drawLine(318, imageY, 318 + imageW, imageY));
  c.push(drawLine(318, imageY + imageH, 318 + imageW, imageY + imageH));
  drawImage(c, images.original, "OriginalImage", left + 4, imageY + 4, imageW - 8, imageH - 8);
  drawImage(c, images.heatmap, "HeatmapImage", 322, imageY + 4, imageW - 8, imageH - 8);
  c.push(drawText(left + 4, 399, "Original image", 9, true, "0.29 0.40 0.49"));
  c.push(drawText(322, 399, "AI heatmap", 9, true, "0.29 0.40 0.49"));
  c.push(`0.08 0.25 0.35 rg ${left} 371 ${right - left} 21 re f`);
  c.push(drawText(left + 11, 378, "II  DISEASES DETECTED AND CONFIDENCE", 9, true, "1 1 1"));
  drawTable(c, firstRows, 364, 61, 9);
  c.push(drawLine(left, 48, right, 48));
  c.push(drawText(left, 31, "AI findings support clinical review and do not replace professional diagnosis.", 7, false, "0.44 0.52 0.58"));
  c.push(drawText(529, 31, `1 / ${pageCount}`, 7, false, "0.44 0.52 0.58"));
  return c.join("\n");
}

function makeValidationPage(rows, pageNumber, pageCount, continued = false) {
  const c = [
    drawText(left, 755, "Diagnostic Report", 22, true, "0.08 0.18 0.27"),
    drawText(left, 733, "Service provider: MedVision AI", 10, true, "0.02 0.49 0.55"),
    drawLine(left, 720, right, 720, "0.10 0.55 0.60"),
    `0.08 0.25 0.35 rg ${left} 684 ${right - left} 21 re f`,
    drawText(left + 11, 691, `III  CLINICAL VALIDATION${continued ? " (CONTINUED)" : ""}`, 9, true, "1 1 1"),
  ];
  let y = 660;
  rows.forEach((row) => {
    c.push(drawText(left + 4, y, row.disease, 11, true, "0.08 0.30 0.40"));
    y -= 17;
    wrap(row.description || "Clinical interpretation should be made by a qualified clinician.", 88).forEach((line) => {
      c.push(drawText(left + 4, y, line, 9, false, "0.20 0.29 0.35"));
      y -= 13;
    });
    y -= 9;
    c.push(drawLine(left, y + 4, right, y + 4));
  });
  c.push(drawText(left, 61, "Automated observations require validation by a qualified clinician with the full clinical context.", 8, false, "0.44 0.52 0.58"));
  c.push(drawLine(left, 48, right, 48));
  c.push(drawText(529, 31, `${pageNumber} / ${pageCount}`, 7, false, "0.44 0.52 0.58"));
  return c.join("\n");
}

function makeLaterPage(rows, pageNumber, pageCount) {
  const c = [
    drawText(left, 755, "MEDVISION AI", 11, true, "0.02 0.49 0.55"),
    drawText(left, 723, "Diagnostic Findings Report", 22, true, "0.08 0.18 0.27"),
    drawLine(left, 710, right, 710, "0.10 0.55 0.60"),
    `0.08 0.25 0.35 rg ${left} 675 ${right - left} 21 re f`,
    drawText(left + 11, 682, "II  DISEASES DETECTED AND CONFIDENCE (CONTINUED)", 9, true, "1 1 1"),
  ];
  drawTable(c, rows, 668, 62, 10);
  c.push(drawLine(left, 48, right, 48));
  c.push(drawText(left, 31, "AI findings support clinical review and do not replace professional diagnosis.", 7, false, "0.44 0.52 0.58"));
  c.push(drawText(529, 31, `${pageNumber} / ${pageCount}`, 7, false, "0.44 0.52 0.58"));
  return c.join("\n");
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let position = 0;
  chunks.forEach((chunk) => { out.set(chunk, position); position += chunk.length; });
  return out;
}

function assemblePdf(contents, images) {
  const objects = [];
  const add = (data) => { objects.push(data); return objects.length; };
  const addString = (string) => add(encoder.encode(string));
  const catalogId = addString("");
  const pagesId = addString("");
  const fontId = addString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addString("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imageIds = {};
  Object.entries(images).forEach(([name, image]) => {
    if (!image) return;
    const start = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    imageIds[name] = add(concat([start, image.bytes, encoder.encode("\nendstream")]));
  });
  const pageIds = [];
  contents.forEach((content, index) => {
    const stream = encoder.encode(`${content}\n`);
    const streamObject = concat([encoder.encode(`<< /Length ${stream.length} >>\nstream\n`), stream, encoder.encode("endstream")]);
    const contentId = add(streamObject);
    const xobjects = index === 0 && Object.keys(imageIds).length
      ? `/XObject << ${Object.entries(imageIds).map(([name, id]) => `/${name} ${id} 0 R`).join(" ")} >>`
      : "";
    pageIds.push(addString(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> ${xobjects} >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = encoder.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId - 1] = encoder.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

  const chunks = [encoder.encode("%PDF-1.4\n%MedVisionAI\n")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((body, index) => {
    const start = encoder.encode(`${index + 1} 0 obj\n`);
    const end = encoder.encode("\nendobj\n");
    offsets.push(offset);
    chunks.push(start, body, end);
    offset += start.length + body.length + end.length;
  });
  const xrefOffset = offset;
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  offsets.slice(1).forEach((item) => xref.push(`${String(item).padStart(10, "0")} 00000 n \n`));
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(encoder.encode(xref.join("")));
  return concat(chunks);
}

export async function downloadDiagnosticPdf(report) {
  const [original, heatmap] = await Promise.all([
    rasterizeImage(report.originalImage), rasterizeImage(report.heatmapImage)
  ]);
  const rows = report.findings.length ? report.findings : [{ disease: "No significant findings detected", confidence: "N/A" }];
  const firstRows = [];
  const extraRows = [];
  let firstHeight = 0;
  rows.forEach((row) => {
    const rowHeight = Math.max(24, wrap(row.disease).length * 12 + 10);
    if (firstHeight + rowHeight <= 270) { firstRows.push(row); firstHeight += rowHeight; }
    else extraRows.push(row);
  });
  const laterPages = [];
  let current = [];
  let currentHeight = 0;
  extraRows.forEach((row) => {
    const height = Math.max(24, wrap(row.disease).length * 12 + 10);
    if (current.length && currentHeight + height > 575) { laterPages.push(current); current = []; currentHeight = 0; }
    current.push(row);
    currentHeight += height;
  });
  if (current.length) laterPages.push(current);
  const validationRows = report.findings?.length ? report.findings : [{ disease: "No significant findings detected", description: "No disease finding was flagged by the model. This automated result should still be interpreted with the complete study and clinical context." }];
  const validationPages = [];
  let validationCurrent = [];
  let validationHeight = 0;
  validationRows.forEach((row) => {
    const entryHeight = 26 + wrap(row.description || "Clinical interpretation should be made by a qualified clinician.", 88).length * 13;
    if (validationCurrent.length && validationHeight + entryHeight > 560) {
      validationPages.push(validationCurrent);
      validationCurrent = [];
      validationHeight = 0;
    }
    validationCurrent.push(row);
    validationHeight += entryHeight;
  });
  if (validationCurrent.length) validationPages.push(validationCurrent);
  const pageCount = 1 + laterPages.length + validationPages.length;
  const contents = [makeFirstPage(report, { original, heatmap }, firstRows, pageCount)];
  laterPages.forEach((pageRows, index) => contents.push(makeLaterPage(pageRows, index + 2, pageCount)));
  validationPages.forEach((pageRows, index) => contents.push(makeValidationPage(pageRows, 2 + laterPages.length + index, pageCount, index > 0)));
  const bytes = assemblePdf(contents, { OriginalImage: original, HeatmapImage: heatmap });
  const file = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MedVision-AI-Report-${ascii(report.processedDate).replace(/[^a-zA-Z0-9-]/g, "-") || "report"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
