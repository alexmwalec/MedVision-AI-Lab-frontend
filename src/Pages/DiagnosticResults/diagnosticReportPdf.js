const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 46;
const RIGHT = 566;
const enc = new TextEncoder();

function cleanText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfEscape(value) {
  return cleanText(value).replace(/([\\()])/g, "\\$1");
}

function text(x, y, value, size = 10, bold = false, color = "0.12 0.22 0.30") {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${pdfEscape(value)}) Tj ET`;
}

function rule(x1, y1, x2, y2, color = "0.82 0.87 0.90", width = 0.8) {
  return `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function wrapLine(value, maxChars = 50) {
  const words = cleanText(value).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (!word) return;
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  });
  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}

function loadImageData(source) {
  if (!source) return Promise.resolve(null);
  return fetch(source)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load report image (${response.status})`);
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          try {
            const scale = Math.min(1, 900 / image.naturalWidth, 700 / image.naturalHeight);
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(image, 0, 0, width, height);
            const data = canvas.toDataURL("image/jpeg", 0.86).split(",")[1];
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            URL.revokeObjectURL(url);
            resolve({ bytes, width, height });
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to decode report image")); };
        image.src = url;
      });
    });
}

function drawImage(commands, image, name, x, y, boxWidth, boxHeight) {
  if (!image) {
    commands.push(`0.95 0.97 0.98 rg ${x} ${y} ${boxWidth} ${boxHeight} re f`);
    commands.push(text(x + 30, y + boxHeight / 2, "Image unavailable", 9, false, "0.45 0.54 0.60"));
    return;
  }
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const drawX = x + (boxWidth - width) / 2;
  const drawY = y + (boxHeight - height) / 2;
  commands.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /${name} Do Q`);
}

function pageOne(report, images, pageCount, rows) {
  const commands = [];
  commands.push(text(LEFT, 754, "MEDVISION AI", 11, true, "0.02 0.49 0.55"));
  commands.push(text(LEFT, 721, "Diagnostic Findings Report", 22, true, "0.09 0.18 0.26"));
  commands.push(text(RIGHT - 78, 754, "CLINICAL REPORT", 8, true, "0.42 0.51 0.58"));
  commands.push(rule(LEFT, 708, RIGHT, 708, "0.10 0.55 0.60", 1.4));

  commands.push(text(LEFT, 684, "PATIENT", 8, true, "0.42 0.51 0.58"));
  commands.push(text(LEFT, 667, report.patientName || "Not provided", 10, true));
  commands.push(text(310, 684, "PATIENT ID", 8, true, "0.42 0.51 0.58"));
  commands.push(text(310, 667, report.patientId || "Not provided", 10, true));
  commands.push(text(LEFT, 642, "SCAN TYPE", 8, true, "0.42 0.51 0.58"));
  commands.push(text(LEFT, 625, report.scanType || "Medical imaging", 10, true));
  commands.push(text(310, 642, "DATE PROCESSED", 8, true, "0.42 0.51 0.58"));
  commands.push(text(310, 625, report.processedDate || "Not provided", 10, true));

  commands.push(`0.08 0.25 0.35 rg ${LEFT} 594 ${RIGHT - LEFT} 22 re f`);
  commands.push(text(LEFT + 11, 601, "I  SCAN IMAGES", 9, true, "1 1 1"));
  const imageY = 423;
  const imageWidth = 248;
  const imageHeight = 140;
  commands.push(`0.96 0.975 0.98 rg ${LEFT} ${imageY} ${imageWidth} ${imageHeight} re f`);
  commands.push(`0.96 0.975 0.98 rg 318 ${imageY} ${imageWidth} ${imageHeight} re f`);
  commands.push(rule(LEFT, imageY, LEFT + imageWidth, imageY));
  commands.push(rule(LEFT, imageY + imageHeight, LEFT + imageWidth, imageY + imageHeight));
  commands.push(rule(318, imageY, 318 + imageWidth, imageY));
  commands.push(rule(318, imageY + imageHeight, 318 + imageWidth, imageY + imageHeight));
  drawImage(commands, images.original, "OriginalImage", LEFT + 4, imageY + 4, imageWidth - 8, imageHeight - 8);
  drawImage(commands, images.heatmap, "HeatmapImage", 322, imageY + 4, imageWidth - 8, imageHeight - 8);
  commands.push(text(LEFT + 5, 405, "Original image", 9, true, "0.29 0.40 0.49"));
  commands.push(text(322, 405, "AI heatmap", 9, true, "0.29 0.40 0.49"));

  commands.push(`0.08 0.25 0.35 rg ${LEFT} 378 ${RIGHT - LEFT} 22 re f`);
  commands.push(text(LEFT + 11, 385, "II  DETECTED DISEASES AND CONFIDENCE", 9, true, "1 1 1"));
  commands.push(`0.91 0.95 0.97 rg ${LEFT} 348 ${RIGHT - LEFT} 25 re f`);
  commands.push(text(LEFT + 12, 357, "DISEASE", 8, true, "0.28 0.39 0.48"));
  commands.push(text(459, 357, "CONFIDENCE SCORE", 8, true, "0.28 0.39 0.48"));
  let y = 337;
  rows.forEach((row, index) => {
    const wrapped = wrapLine(row.disease, 53);
    const rowHeight = Math.max(25, wrapped.length * 12 + 12);
    if (y - rowHeight < 63) return;
    if (index % 2 === 1) commands.push(`0.985 0.991 0.994 rg ${LEFT} ${y - rowHeight + 4} ${RIGHT - LEFT} ${rowHeight} re f`);
    wrapped.forEach((part, lineIndex) => commands.push(text(LEFT + 12, y - 7 - lineIndex * 12, part, 9, false, "0.13 0.23 0.31")));
    commands.push(text(467, y - 7, row.confidence, 9, true, "0.04 0.48 0.54"));
    commands.push(rule(LEFT, y - rowHeight + 4, RIGHT, y - rowHeight + 4));
    y -= rowHeight;
  });
  commands.push(rule(LEFT, 48, RIGHT, 48));
  commands.push(text(LEFT, 32, "AI-generated findings support clinical review and do not replace professional diagnosis.", 7, false, "0.44 0.52 0.58"));
  commands.push(text(530, 32, `1 / ${pageCount}`, 7, false, "0.44 0.52 0.58"));
  return commands.join("\n");
}

function followingPage(rows, pageNumber, pageCount) {
  const commands = [
    text(LEFT, 754, "MEDVISION AI", 11, true, "0.02 0.49 0.55"),
    text(LEFT, 721, "Diagnostic Findings Report", 22, true, "0.09 0.18 0.26"),
    rule(LEFT, 708, RIGHT, 708, "0.10 0.55 0.60", 1.4),
    `0.08 0.25 0.35 rg ${LEFT} 674 ${RIGHT - LEFT} 22 re f`,
    text(LEFT + 11, 681, "II  DETECTED DISEASES AND CONFIDENCE (CONTINUED)", 9, true, "1 1 1"),
    `0.91 0.95 0.97 rg ${LEFT} 648 ${RIGHT - LEFT} 25 re f`,
    text(LEFT + 12, 657, "DISEASE", 8, true, "0.28 0.39 0.48"),
    text(459, 657, "CONFIDENCE SCORE", 8, true, "0.28 0.39 0.48"),
  ];
  let y = 637;
  rows.forEach((row, index) => {
    const wrapped = wrapLine(row.disease, 53);
    const rowHeight = Math.max(27, wrapped.length * 13 + 12);
    if (index % 2 === 1) commands.push(`0.985 0.991 0.994 rg ${LEFT} ${y - rowHeight + 4} ${RIGHT - LEFT} ${rowHeight} re f`);
    wrapped.forEach((part, lineIndex) => commands.push(text(LEFT + 12, y - 8 - lineIndex * 13, part, 10, false, "0.13 0.23 0.31")));
    commands.push(text(467, y - 8, row.confidence, 10, true, "0.04 0.48 0.54"));
    commands.push(rule(LEFT, y - rowHeight + 4, RIGHT, y - rowHeight + 4));
    y -= rowHeight;
  });
  commands.push(rule(LEFT, 48, RIGHT, 48));
  commands.push(text(LEFT, 32, "AI-generated findings support clinical review and do not replace professional diagnosis.", 7, false, "0.44 0.52 0.58"));
  commands.push(text(530, 32, `${pageNumber} / ${pageCount}`, 7, false, "0.44 0.52 0.58"));
  return commands.join("\n");
}

function concatBytes(chunks) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(size);
  let cursor = 0;
  chunks.forEach((chunk) => { result.set(chunk, cursor); cursor += chunk.length; });
  return result;
}

function makePdf(pageContents, images) {
  const objects = [];
  const add = (bytes) => { objects.push(bytes); return objects.length; };
  const addText = (value) => add(enc.encode(value));
  const catalogId = addText("");
  const pagesId = addText("");
  const fontId = addText("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldId = addText("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imageIds = {};
  Object.entries(images).forEach(([name, image]) => {
    if (!image) return;
    const prefix = enc.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    const suffix = enc.encode("\nendstream");
    imageIds[name] = add(concatBytes([prefix, image.bytes, suffix]));
  });
  const pageIds = [];
  pageContents.forEach((content, index) => {
    const stream = enc.encode(`${content}\n`);
    const streamPrefix = enc.encode(`<< /Length ${stream.length} >>\nstream\n`);
    const streamBytes = concatBytes([streamPrefix, stream, enc.encode("endstream")]);
    const contentId = add(streamBytes);
    const xobjects = index === 0 && Object.keys(imageIds).length
      ? `/XObject << ${Object.entries(imageIds).map(([name, id]) => `/${name} ${id} 0 R`).join(" ")} >>`
      : "";
    pageIds.push(addText(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> ${xobjects} >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = enc.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId - 1] = enc.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

  const chunks = [enc.encode("%PDF-1.4\n%MedVisionAI\n")];
  let offset = chunks[0].length;
  const offsets = [0];
  objects.forEach((body, index) => {
    const start = enc.encode(`${index + 1} 0 obj\n`);
    const end = enc.encode("\nendobj\n");
    offsets.push(offset);
    chunks.push(start, body, end);
    offset += start.length + body.length + end.length;
  });
  const xrefOffset = offset;
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  offsets.slice(1).forEach((item) => xref.push(`${String(item).padStart(10, "0")} 00000 n \n`));
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(enc.encode(xref.join("")));
  return concatBytes(chunks);
}

export async function downloadDiagnosticPdf(report) {
  const [original, heatmap] = await Promise.all([
    loadImageData(report.originalImage),
    loadImageData(report.heatmapImage),
  ]);
  const rows = report.findings.length ? report.findings : [{ disease: "No significant findings detected", confidence: "N/A" }];
  const firstPageRows = [];
  const extraRows = [];
  let usedHeight = 0;
  rows.forEach((row) => {
    const rowHeight = Math.max(25, wrapLine(row.disease, 53).length * 12 + 12);
    if (usedHeight + rowHeight <= 265) {
      firstPageRows.push(row);
      usedHeight += rowHeight;
    } else extraRows.push(row);
  });
  const laterPages = [];
  let currentRows = [];
  let currentHeight = 0;
  extraRows.forEach((row) => {
    const rowHeight = Math.max(27, wrapLine(row.disease, 53).length * 13 + 12);
    if (currentRows.length && currentHeight + rowHeight > 560) {
      laterPages.push(currentRows);
      currentRows = [];
      currentHeight = 0;
    }
    currentRows.push(row);
    currentHeight += rowHeight;
  });
  if (currentRows.length) laterPages.push(currentRows);
  const pageCount = 1 + laterPages.length;
  const contents = [pageOne(report, { original, heatmap }, pageCount, firstPageRows)];
  laterPages.forEach((pageRows, index) => contents.push(followingPage(pageRows, index + 2, pageCount)));
  const bytes = makePdf(contents, { OriginalImage: original, HeatmapImage: heatmap });
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `MedVision-AI-Diagnostic-Report-${cleanText(report.processedDate).replace(/[^A-Za-z0-9-]/g, "-") || "report"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
