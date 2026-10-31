import { loadLang, lang, t } from "./i18n.js";
import { commitFile, updateWorksJson } from "./github.js";

await loadLang(new URLSearchParams(location.search).get("lang") || lang);

document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.classList.toggle("active", btn.dataset.lang === lang);
  btn.addEventListener("click", async () => {
    await loadLang(btn.dataset.lang);
    document.querySelectorAll("[data-lang]").forEach(b =>
      b.classList.toggle("active", b.dataset.lang === lang));
  });
});

let generatedMarkdown = "";

document.querySelector("#convert-btn").addEventListener("click", async () => {
  const file = document.querySelector("#docx-file").files[0];
  if (!file) return;

  const btn = document.querySelector("#convert-btn");
  btn.disabled = true;
  btn.textContent = t("upload.converting");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-"
    });
    td.use(turndownPluginGfm.gfm);

    generatedMarkdown = td.turndown(html);
    document.querySelector("#markdown-preview").textContent = generatedMarkdown;
    document.querySelector("#preview-section").hidden = false;
  } catch (e) {
    alert(t("upload.error") + ": " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = t("upload.convert");
  }
});

document.querySelector("#publish-btn").addEventListener("click", async () => {
  if (!generatedMarkdown) return;

  const owner = document.querySelector("#gh-owner").value.trim();
  const repo = document.querySelector("#gh-repo").value.trim();
  const token = document.querySelector("#gh-token").value.trim();
  const workSlug = document.querySelector("#work-slug").value.trim();
  const chapterSlug = document.querySelector("#chapter-slug").value.trim();
  const chapterTitle = document.querySelector("#chapter-title-input").value.trim();
  const language = document.querySelector("#lang-select").value;

  if (!owner || !repo || !token || !workSlug || !chapterSlug) {
    alert(t("upload.error"));
    return;
  }

  const status = document.querySelector("#upload-status");
  const btn = document.querySelector("#publish-btn");
  btn.disabled = true;
  status.textContent = t("upload.publishing");

  try {
    const filePath = `content/${workSlug}/${language}/${chapterSlug}.md`;

    await commitFile({
      owner, repo, path: filePath,
      content: generatedMarkdown,
      token,
      message: `Add chapter: ${workSlug}/${chapterSlug}`
    });

    await updateWorksJson({
      owner, repo, token,
      workSlug, language,
      chapterSlug, chapterTitle,
      filePath
    });

    status.textContent = t("upload.success");
  } catch (e) {
    status.textContent = `${t("upload.error")}: ${e.message}`;
  } finally {
    btn.disabled = false;
  }
});