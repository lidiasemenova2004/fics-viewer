import { loadLang, lang, t, applyI18n, langQuery } from "./i18n.js";

const path = location.pathname;

async function init() {
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang && ["ru", "en"].includes(urlLang)) {
    await loadLang(urlLang);
  } else {
    await loadLang(lang);
  }

  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
    btn.addEventListener("click", async () => {
      await loadLang(btn.dataset.lang);
      document.querySelectorAll("[data-lang]").forEach(b =>
        b.classList.toggle("active", b.dataset.lang === lang));
      const url = new URL(location.href);
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
      if (typeof window.rerender === "function") window.rerender();
    });
  });

  if (path.endsWith("index.html") || path.endsWith("/")) {
    await renderIndex();
  } else if (path.endsWith("work.html")) {
    await renderWork();
  } else if (path.endsWith("chapter.html")) {
    await renderChapter();
  }
}

let allWorks = [];

async function renderIndex() {
  const data = await fetch("data/works.json").then(r => r.json());
  allWorks = data.works;

  let filter = "all";
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(b =>
        b.classList.toggle("active", b.dataset.filter === filter));
      renderGrid();
    });
  });

  window.rerender = renderGrid;
  renderGrid();

  function renderGrid() {
    const list = allWorks.filter(w => filter === "all" || w.language === filter);
    document.querySelector("#works").innerHTML = list.map(w => `
      <article class="card">
        <a href="work.html?slug=${w.slug}${langQuery()}">
          ${w.cover ? `<img src="${w.cover}" alt="">` : ""}
          <h3>${w.title}</h3>
        </a>
        <span class="badge">${t("lang." + w.language)}</span>
        <p>${w.summary || ""}</p>
        <small>${t("chaptersCount", { n: w.chapters.length })}</small>
        ${translationLinks(w)}
      </article>
    `).join("");
  }
}

function translationLinks(w) {
  if (!w.translationGroup) return "";
  const others = allWorks.filter(x =>
    x.slug !== w.slug && x.translationGroup === w.translationGroup);
  if (!others.length) return "";
  return `<p class="alt-lang">${t("work.alsoIn")}: ${others.map(x =>
    `<a href="work.html?slug=${x.slug}${langQuery()}">${t("lang." + x.language)}</a>`
  ).join(", ")}</p>`;
}

async function renderWork() {
  const p = new URLSearchParams(location.search);
  const slug = p.get("slug");
  if (!slug) return;

  const data = await fetch("data/works.json").then(r => r.json());
  allWorks = data.works;
  const work = allWorks.find(w => w.slug === slug);
  if (!work) return;

  document.title = `${work.title} — ${t("site.title")}`;
  document.querySelector("#work-header").innerHTML = `
    <h1>${work.title}</h1>
    <span class="badge">${t("lang." + work.language)}</span>
    <p>${work.summary || ""}</p>
  `;

  const alt = document.querySelector("#alt-lang");
  if (work.translationGroup) {
    const others = allWorks.filter(x =>
      x.translationGroup === work.translationGroup && x.slug !== work.slug);
    if (others.length) {
      alt.innerHTML = `<p class="alt-lang">${t("work.alsoIn")}: ${others.map(x =>
        `<a href="work.html?slug=${x.slug}${langQuery()}">${x.title} (${t("lang." + x.language)})</a>`
      ).join(" · ")}</p>`;
    }
  }

  document.querySelector("#chapters-list").innerHTML = `
    <h2>${t("work.chapters")}</h2>
    <ol>${work.chapters.map(ch => `
      <li><a href="chapter.html?slug=${work.slug}&ch=${ch.slug}${langQuery()}">${ch.title}</a></li>
    `).join("")}</ol>
  `;

  renderDownloadButtons(work);
}

async function renderDownloadButtons(work) {
  const { downloadTxt, downloadHtml, downloadEpub, downloadFb2, downloadPdf } =
    await import("./download.js");

  const section = document.querySelector("#download-section");
  if (!section) return;

  section.innerHTML = `
    <h2>${t("work.downloadAll")}</h2>
    <div class="download-buttons">
      <button id="dl-txt">${t("formats.txt")}</button>
      <button id="dl-html">${t("formats.html")}</button>
      <button id="dl-epub">${t("formats.epub")}</button>
      <button id="dl-fb2">${t("formats.fb2")}</button>
      <button id="dl-pdf">${t("formats.pdf")}</button>
    </div>
  `;

  document.querySelector("#dl-txt").onclick = () => downloadTxt(work);
  document.querySelector("#dl-html").onclick = () => downloadHtml(work);
  document.querySelector("#dl-epub").onclick = () => downloadEpub(work);
  document.querySelector("#dl-fb2").onclick = () => downloadFb2(work);
  document.querySelector("#dl-pdf").onclick = () => downloadPdf();
}

async function renderChapter() {
  const p = new URLSearchParams(location.search);
  const slug = p.get("slug");
  const chSlug = p.get("ch");
  if (!slug || !chSlug) return;

  const data = await fetch("data/works.json").then(r => r.json());
  allWorks = data.works;
  const work = allWorks.find(w => w.slug === slug);
  if (!work) return;
  const idx = work.chapters.findIndex(c => c.slug === chSlug);
  if (idx === -1) return;
  const chapter = work.chapters[idx];

  const md = await fetch(chapter.file).then(r => r.text());
  const html = marked.parse(md);

  document.title = `${chapter.title} — ${work.title}`;
  document.querySelector("#chapter-title").textContent = chapter.title;
  document.querySelector("#chapter-text").innerHTML = html;

  const nav = document.querySelector("#reader-nav");
  const prev = work.chapters[idx - 1];
  const next = work.chapters[idx + 1];

  nav.innerHTML = `
    ${prev ? `<a href="chapter.html?slug=${slug}&ch=${prev.slug}${langQuery()}">${t("reader.prev")}</a>` : "<span></span>"}
    <a href="work.html?slug=${slug}${langQuery()}">${t("reader.back")}</a>
    ${next ? `<a href="chapter.html?slug=${slug}&ch=${next.slug}${langQuery()}">${t("reader.next")}</a>` : "<span></span>"}
  `;
}

init();