export async function commitFile({
  owner, repo, path, content, token, message
}) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  let sha;
  const head = await fetch(api, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (head.ok) {
    const data = await head.json();
    sha = data.sha;
  }

  const encoded = btoa(unescape(encodeURIComponent(content)));

  const res = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message || `Update ${path}`,
      content: encoded,
      sha
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error ${res.status}`);
  }

  return res.json();
}

export async function updateWorksJson({
  owner, repo, token, workSlug, language, chapterSlug, chapterTitle, filePath
}) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/data/works.json`;
  const head = await fetch(api, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!head.ok) throw new Error("Не удалось прочитать works.json");
  const { content, sha } = await head.json();
  const json = JSON.parse(decodeURIComponent(escape(atob(content))));

  let work = json.works.find(w => w.slug === workSlug);
  if (!work) {
    work = {
      slug: workSlug,
      title: workSlug,
      language,
      summary: "",
      chapters: []
    };
    json.works.push(work);
  }

  if (!work.chapters.some(c => c.slug === chapterSlug)) {
    work.chapters.push({
      slug: chapterSlug,
      title: chapterTitle || chapterSlug,
      file: filePath
    });
  }

  const newContent = btoa(unescape(encodeURIComponent(
    JSON.stringify(json, null, 2)
  )));

  const res = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update works.json: add chapter ${chapterSlug}`,
      content: newContent,
      sha
    })
  });

  if (!res.ok) throw new Error("Не удалось обновить works.json");
  return res.json();
}