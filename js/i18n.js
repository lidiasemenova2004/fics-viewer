export let lang = localStorage.getItem("lang")
  || (navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en");

let data = {};

export async function loadLang(next) {
  lang = next;
  localStorage.setItem("lang", lang);
  data = await fetch(`i18n/${lang}.json`).then(r => r.json());
  document.documentElement.lang = lang;
  applyI18n();
}

export function t(path, vars = {}) {
  let node = path.split(".").reduce((o, k) => o?.[k], data);
  if (typeof node === "string") {
    return node.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }
  if (node && typeof node === "object" && "other" in node) {
    const rule = new Intl.PluralRules(lang).select(vars.n ?? 0);
    const str = node[rule] ?? node.other;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }
  return path;
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}

export function langQuery() {
  return `&lang=${lang}`;
}