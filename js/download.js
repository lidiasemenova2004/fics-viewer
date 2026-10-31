function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function saveBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadChapters(work) {
  const out = [];
  for (const c of work.chapters) {
    const md = await fetch(c.file).then(r => r.text());
    out.push({ title: c.title, text: md, html: marked.parse(md) });
  }
  return out;
}

export async function downloadTxt(work) {
  const chapters = await loadChapters(work);
  const text = `${work.title}\n${work.author || ""}\n\n` +
    chapters.map(c => `\n\n=== ${c.title} ===\n\n${c.text}`).join("\n");
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }),
    `${work.slug}.txt`);
}

export async function downloadHtml(work) {
  const chapters = await loadChapters(work);
  const html = `<!doctype html><html lang="${work.language}"><meta charset="utf-8">
  <title>${esc(work.title)}</title>
  <style>body{max-width:70ch;margin:auto;line-height:1.7;font-family:serif}</style>
  <h1>${esc(work.title)}</h1><p>${esc(work.author || "")}</p>
  ${chapters.map(c => `<h2>${esc(c.title)}</h2>${c.html}`).join("")}
  </html>`;
  saveBlob(new Blob([html], { type: "text/html;charset=utf-8" }),
    `${work.slug}.html`);
}

export async function downloadEpub(work) {
  const chapters = await loadChapters(work);
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);

  const manifest = chapters.map((_, i) =>
    `<item id="ch${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`).join("");
  const spine = chapters.map((_, i) => `<itemref idref="ch${i}"/>`).join("");

  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${esc(work.title)}</dc:title>
<dc:creator>${esc(work.author || "")}</dc:creator>
<dc:language>${work.language}</dc:language>
<dc:identifier id="id">urn:uuid:${crypto.randomUUID()}</dc:identifier>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>${manifest}</manifest>
<spine>${spine}</spine></package>`);

  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head><body>
<nav epub:type="toc"><ol>${chapters.map((c, i) =>
`<li><a href="ch${i}.xhtml">${esc(c.title)}</a></li>`).join("")}</ol></nav>
</body></html>`);

  chapters.forEach((c, i) => {
    zip.file(`OEBPS/ch${i}.xhtml`, `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(c.title)}</title></head>
<body><h1>${esc(c.title)}</h1>${c.html}</body></html>`);
  });

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  saveBlob(blob, `${work.slug}.epub`);
}

export async function downloadFb2(work) {
  const chapters = await loadChapters(work);
  const body = chapters.map(c => `
<section><title><p>${esc(c.title)}</p></title>
${c.text.split(/\n{2,}/).map(p => `<p>${esc(p.trim())}</p>`).join("")}
</section>`).join("");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
<description><title-info>
<book-title>${esc(work.title)}</book-title>
<author><nickname>${esc(work.author || "")}</nickname></author>
<lang>${work.language}</lang>
</title-info></description>
<body>${body}</body></FictionBook>`;

  saveBlob(new Blob([xml], { type: "application/xml;charset=utf-8" }),
    `${work.slug}.fb2`);
}

export function downloadPdf() {
  window.print();
}