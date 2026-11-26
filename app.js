(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ================= Language (UI strings + optional *_zh content fields) ================= */
  const STR = {
    en: {
      home: "Home", categories: "Categories", archives: "Archives", resume: "Resume", about: "About",
      recent: "Recently Updated", contents: "Contents", search: "Search", searchPh: "Search…",
      results: (n, q) => `${n} result${n === 1 ? "" : "s"} for “${q}”`, noResults: "Nothing found. Try another keyword.",
      noPosts: "No posts yet.", notFound: "Not found", notFoundText: "That page doesn't exist.", goHome: "Go home →",
      pinned: "Pinned", minRead: (n) => `${n} min read`, updated: (d) => `Updated ${d}`, older: "Older", newer: "Newer",
      nPosts: (n) => `${n} post${n > 1 ? "s" : ""}`,
      experience: "Experience", projects: "Projects", education: "Education", glance: "At a glance", now: "Now",
      titles: "Titles", awards: "Awards", skills: "Skills", interactive: "Interactive", document: "Document",
      pdf: "Download PDF", current: "Current", cvView: "Resume view",
      onlyOther: "This post is only available in Chinese.", readIn: "Read in",
      videoOpen: (s) => `Can't play? Open on ${s} ↗`,
      dur: (y, m) => [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" "),
    },
    zh: {
      home: "首页", categories: "分类", archives: "归档", resume: "简历", about: "关于我",
      recent: "最近更新", contents: "目录", search: "搜索", searchPh: "搜索…",
      results: (n, q) => `“${q}” 共 ${n} 条结果`, noResults: "没有找到相关内容，换个关键词试试。",
      noPosts: "暂无文章。", notFound: "页面不存在", notFoundText: "这个页面不存在。", goHome: "返回首页 →",
      pinned: "置顶", minRead: (n) => `约 ${n} 分钟`, updated: (d) => `更新于 ${d}`, older: "上一篇", newer: "下一篇",
      nPosts: (n) => `${n} 篇`,
      experience: "工作经历", projects: "项目", education: "教育背景", glance: "概览", now: "目前",
      titles: "参与项目", awards: "奖项", skills: "技能", interactive: "交互版", document: "文档版",
      pdf: "下载 PDF", current: "在职", cvView: "简历视图",
      onlyOther: "本文暂无中文版，以下为英文原文。", readIn: "阅读语言",
      videoOpen: (s) => `无法播放？在 ${s} 中打开 ↗`,
      dur: (y, m) => [y && `${y}年`, m && `${m}个月`].filter(Boolean).join(""),
    },
  };
  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "zh") { try { localStorage.setItem("lang", q); } catch {} return q; }
    const s = localStorage.getItem("lang");
    if (s === "en" || s === "zh") return s;
    return (navigator.languages || [navigator.language || ""]).some((l) => /^zh/i.test(l)) ? "zh" : "en";
  }
  const t = (k, ...a) => { const v = STR[App.lang][k] ?? STR.en[k]; return typeof v === "function" ? v(...a) : v; };
  /* Localized field: obj[key + "_zh"] in Chinese mode when filled in, else obj[key]. */
  const L = (o, k, lang = App.lang) => (o && lang === "zh" && String(o[k + "_zh"] ?? "").trim() ? o[k + "_zh"] : o?.[k] ?? "");
  const cjkRatio = (s) => { const x = String(s || "").replace(/[\s\d\p{P}\p{S}]/gu, ""); return x ? (x.match(/[㐀-鿿]/g) || []).length / x.length : 0; };
  const catName = (c) => (App.lang === "zh" && App.data.site?.categoryNames?.[c]) || c;

  const App = (window.App = {
    data: window.SITE,
    lang: "en",
    assets: {}, // path -> object URL / data URL for images uploaded in the editor but not yet published
    asset(p) { return (p && this.assets[p]) || p || ""; },
    rerender() { renderShell(); route(true); },
    setLang(l) { setLang(l); },
    esc, slug, L,
  });
  App.lang = initialLang();

  /* ================= Markdown ================= */
  function embeds(src) {
    return String(src || "")
      .split("\n")
      .map((line) => {
        const t = line.trim();
        let m = t.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})\S*$/i);
        // Note under blocked-in-China players, so visitors still get a working link.
        const note = (site) => `<p class="embed-note"><a href="${esc(t)}" target="_blank" rel="noopener">${esc(STR[App.lang].videoOpen(site))}</a></p>`;
        if (m) {
          const vertical = m[1] === "shorts/";
          return `\n<div class="embed${vertical ? " vertical" : ""}"><iframe src="https://www.youtube.com/embed/${esc(m[2])}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>\n${note("YouTube")}\n`;
        }
        m = t.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)\S*$/i);
        if (m) return `\n<div class="embed"><iframe src="https://player.vimeo.com/video/${m[1]}" title="Vimeo video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>\n${note("Vimeo")}\n`;
        m = t.match(/^https?:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(BV[0-9A-Za-z]+)\S*$/i);
        if (m) return `\n<div class="embed"><iframe src="https://player.bilibili.com/player.html?bvid=${esc(m[1])}&autoplay=0&high_quality=1" title="Bilibili video" loading="lazy" scrolling="no" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>\n`;
        m = t.match(/^(\S+\.(?:mp4|webm|mov))$/i);
        if (m) return `\n<video class="md-video" src="${esc(m[1])}" controls playsinline preload="metadata"></video>\n`;
        return line;
      })
      .join("\n");
  }
  function md(src) {
    if (window.marked) return marked.parse(embeds(src), { gfm: true });
    return String(src || "").split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join("");
  }
  function mdInline(src) {
    return window.marked ? marked.parseInline(String(src || "")) : esc(src);
  }
  /* After injecting markdown: resolve local asset paths, add heading ids, lightbox, external links. */
  function enhance(root) {
    $$("img[src], video[src]", root).forEach((el) => {
      const s = el.getAttribute("src");
      if (App.assets[s]) el.src = App.assets[s];
      if (el.tagName === "IMG") el.loading = "lazy";
    });
    $$("a[href^='http']", root).forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
    const used = {};
    $$("h2, h3", root).forEach((h) => {
      let id = slug(h.textContent) || "section";
      used[id] = (used[id] || 0) + 1;
      if (used[id] > 1) id += "-" + used[id];
      h.id = id;
    });
  }

  /* ================= Helpers ================= */
  const posts = () => [...(App.data.posts || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const fmtDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-").map(Number);
    return App.lang === "zh" ? `${y}年${m || 1}月${day || 1}日` : `${MONTHS[(m || 1) - 1]} ${day || 1}, ${y}`;
  };
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  function cover(p, cls = "") {
    if (p.cover) return `<div class="cover ${cls}"><img src="${esc(App.asset(p.cover))}" alt="" loading="lazy"/></div>`;
    const h = hue(p.title || "x");
    const mark = (p.category || p.title || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `<div class="cover gen ${cls}" style="--h:${h}"><span>${esc(mark)}</span></div>`;
  }
  const readTime = (body) => {
    const s = String(body || "");
    const cjk = (s.match(/[㐀-鿿]/g) || []).length; // ~400 Chinese characters per minute
    const words = s.replace(/[㐀-鿿]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200 + cjk / 400));
  };
  const countBy = (key) => {
    const m = new Map();
    posts().forEach((p) => [].concat(p[key] || []).forEach((v) => v && m.set(v, (m.get(v) || 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };

  /* ================= Icons ================= */
  const I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    cat: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    arch: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    cv: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    about: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    pin: '<path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    loc: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    artstation: '<path d="M2 17l2.4 4h12.2l-2.4-4zM22 17.3L14.5 4H9.6l7.6 13.3 2.4 4.2zM13.4 14.6L9.8 8.3 6.2 14.6z" fill="currentColor" stroke="none"/>',
    github: '<path d="M12 .8a11.2 11.2 0 0 0-3.5 21.9c.6.1.8-.3.8-.6v-2c-3.1.7-3.8-1.5-3.8-1.5-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.5 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.4.1-3 0 0 .9-.3 3.1 1.2a10.7 10.7 0 0 1 5.6 0c2.1-1.5 3.1-1.2 3.1-1.2.6 1.6.2 2.7.1 3 .7.8 1.2 1.8 1.2 3 0 4.3-2.6 5.2-5.1 5.5.4.3.8 1 .8 2v3c0 .3.2.7.8.6A11.2 11.2 0 0 0 12 .8z" fill="currentColor" stroke="none"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  };
  const icon = (n, s = 18) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n] || I.link}</svg>`;

  /* ================= Shell ================= */
  const NAV = [
    ["home", "home", "#/"],
    ["cat", "categories", "#/categories"],
    ["arch", "archives", "#/archives"],
    ["cv", "resume", "#/resume"],
    ["about", "about", "#/about"],
  ];
  function setLang(l) {
    if (l !== "en" && l !== "zh") return;
    App.lang = l;
    postLang = null;
    try { localStorage.setItem("lang", l); } catch {}
    const u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.set("lang", l); history.replaceState(null, "", u); }
    applyLangChrome();
    App.rerender();
  }
  function applyLangChrome() {
    document.documentElement.lang = App.lang === "zh" ? "zh-CN" : "en";
    $$("#langSwitch [data-lang]").forEach((b) => { const on = b.dataset.lang === App.lang; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    $("#searchInput").placeholder = t("searchPh");
    const d = $('meta[name="description"]');
    if (d) d.content = L(App.data.site, "description");
  }
  function avatarHTML(cls) {
    const p = App.data.profile;
    const initials = (p.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return p.avatar
      ? `<img class="${cls}" src="${esc(App.asset(p.avatar))}" alt="${esc(p.name)}"/>`
      : `<span class="${cls} initials">${esc(initials)}</span>`;
  }
  const socials = () => (App.data.profile.socials || []).filter((s) => s.url);
  function renderShell() {
    const { profile: p, site } = App.data;
    document.title = site.title || p.name;
    $("#sidebar").innerHTML = `
      <div class="sb-profile">
        <a href="#/" class="sb-avatar-link" aria-label="Home">${avatarHTML("sb-avatar")}</a>
        <a href="#/" class="sb-name">${esc(site.title || p.name)}</a>
        <p class="sb-tagline">${esc(L(p, "tagline"))}</p>
      </div>
      <nav class="sb-nav">${NAV.map(([ic, key, href]) => `<a href="${href}" data-nav="${href}">${icon(ic)}<span>${t(key)}</span></a>`).join("")}</nav>
      <div class="sb-bottom">
        <button class="sb-icon" id="themeToggle" aria-label="Toggle dark mode" title="Toggle theme">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>
        <span class="sb-sep"></span>
        ${socials().map((s) => `<a class="sb-icon" href="${esc(s.url)}" ${s.url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'} aria-label="${esc(s.label)}" title="${esc(s.label)}">${icon(s.type)}</a>`).join("")}
      </div>`;
    $("#themeToggle").onclick = () => {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      localStorage.setItem("theme", t);
      renderShell();
      markNav();
    };
    $("#footer").innerHTML = `<span>© ${new Date().getFullYear()} ${esc(p.name)}</span><span>${mdInline(L(site, "footer"))}</span>`;
  }
  function markNav() {
    const h = location.hash || "#/";
    $$(".sb-nav a").forEach((a) => {
      const n = a.dataset.nav;
      a.classList.toggle("active", n === "#/" ? h === "#/" || h === "#" || h.startsWith("#/post/") : h.startsWith(n));
    });
  }

  /* ================= Panel ================= */
  function panelDefault() {
    const recent = [...posts()].sort((a, b) => (b.updated || b.date || "").localeCompare(a.updated || a.date || "")).slice(0, 5);
    return `
      <section class="pn-block"><h3>${t("recent")}</h3>
        <ul class="pn-list">${recent.map((p) => `<li><a href="#/post/${esc(p.id)}">${esc(L(p, "title"))}</a></li>`).join("")}</ul>
      </section>`;
  }
  function panelToc(root) {
    const hs = $$("h2, h3", root);
    const toc = hs.length
      ? `<section class="pn-block toc"><h3>${t("contents")}</h3><ul>${hs.map((h) => `<li class="${h.tagName.toLowerCase()}"><a href="#${h.id}" data-toc="${h.id}">${esc(h.textContent)}</a></li>`).join("")}</ul></section>`
      : "";
    $("#panel").innerHTML = toc + panelDefault();
    $$("[data-toc]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); document.getElementById(a.dataset.toc)?.scrollIntoView({ behavior: "smooth" }); }));
    if (!hs.length) return;
    const obs = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) $$("[data-toc]").forEach((a) => a.classList.toggle("active", a.dataset.toc === en.target.id));
    }), { rootMargin: "-10% 0px -75% 0px" });
    hs.forEach((h) => obs.observe(h));
    cleanup.push(() => obs.disconnect());
  }

  /* ================= Views ================= */
  const postCard = (p) => `
    <a class="post-card" href="#/post/${esc(p.id)}">
      <div class="pc-text">
        <h2>${esc(L(p, "title"))}</h2>
        <p>${esc(L(p, "summary"))}</p>
        <div class="meta">
          <span>${icon("cal", 14)}${fmtDate(p.date)}</span>
          ${p.category ? `<span>${icon("cat", 14)}${esc(catName(p.category))}</span>` : ""}
          ${p.pinned ? `<span class="pinned">${icon("pin", 14)}${t("pinned")}</span>` : ""}
        </div>
      </div>
      ${cover(p, "pc-cover")}
    </a>`;
  const postRow = (p) => `<li><a href="#/post/${esc(p.id)}"><time>${fmtDate(p.date)}</time><span>${esc(L(p, "title"))}</span></a></li>`;
  let postLang = null; // per-post language override from the "English / 中文" switch on a bilingual post

  const views = {
    home() {
      const list = posts().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      return {
        crumbs: [[t("home")]],
        html: `<h1 class="sr-only">${esc(App.data.site.title)}</h1>
          <div class="post-list">${list.map(postCard).join("") || `<p class="empty">${t("noPosts")}</p>`}</div>`,
      };
    },
    post(id) {
      const all = posts();
      const i = all.findIndex((p) => p.id === id);
      if (i < 0) return views.notfound();
      const p = all[i], newer = all[i - 1], older = all[i + 1];
      const hasZh = !!String(p.body_zh || "").trim();
      const baseIsZh = cjkRatio(p.title + " " + p.body) > 0.3;
      const vl = (hasZh && postLang) || App.lang;
      const F = (k) => L(p, k, vl);
      const showingZh = vl === "zh" ? hasZh || baseIsZh : baseIsZh;
      const notice = !hasZh && (App.lang === "zh" ? !baseIsZh : baseIsZh) ? `<p class="lang-note">${t("onlyOther")}</p>` : "";
      const sw = hasZh
        ? `<div class="post-lang"><span>${t("readIn")}</span><div class="seg small">
            <button type="button" data-plang="en" class="${vl === "en" ? "on" : ""}" lang="en">English</button>
            <button type="button" data-plang="zh" class="${vl === "zh" ? "on" : ""}" lang="zh-CN">中文</button></div></div>`
        : "";
      return {
        crumbs: [[t("home"), "#/"], [F("title")]],
        toc: true,
        html: `
          <article class="post" lang="${showingZh ? "zh-CN" : "en"}">
            <header class="post-head">
              <h1>${esc(F("title"))}</h1>
              ${F("summary") ? `<p class="post-sub">${esc(F("summary"))}</p>` : ""}
              <div class="meta" lang="${App.lang === "zh" ? "zh-CN" : "en"}">
                <span>${icon("cal", 14)}${fmtDate(p.date)}</span>
                ${p.updated ? `<span>${t("updated", fmtDate(p.updated))}</span>` : ""}
                ${p.category ? `<a href="#/categories/${encodeURIComponent(p.category)}">${icon("cat", 14)}${esc(catName(p.category))}</a>` : ""}
                <span>${icon("clock", 14)}${t("minRead", readTime(F("body")))}</span>
              </div>
              ${sw}
            </header>
            ${notice}
            ${p.cover ? cover(p, "post-cover") : ""}
            <div class="md" id="postBody">${md(F("body"))}</div>
            <nav class="post-nav" lang="${App.lang === "zh" ? "zh-CN" : "en"}">
              ${older ? `<a href="#/post/${esc(older.id)}"><small>${t("older")}</small>${esc(L(older, "title"))}</a>` : "<span></span>"}
              ${newer ? `<a class="right" href="#/post/${esc(newer.id)}"><small>${t("newer")}</small>${esc(L(newer, "title"))}</a>` : "<span></span>"}
            </nav>
          </article>`,
        after(root) {
          $$("[data-plang]", root).forEach((b) => (b.onclick = () => { postLang = b.dataset.plang; route(true); }));
        },
      };
    },
    categories(name) {
      if (name) {
        const list = posts().filter((p) => p.category === name);
        return { crumbs: [[t("home"), "#/"], [t("categories"), "#/categories"], [catName(name)]], html: `<h1 class="page-title">${icon("cat", 26)}${esc(catName(name))} <small>${list.length}</small></h1><ul class="rows">${list.map(postRow).join("")}</ul>` };
      }
      const cats = countBy("category");
      return {
        crumbs: [[t("home"), "#/"], [t("categories")]],
        html: `<h1 class="page-title">${t("categories")}</h1>
          <div class="cat-grid">${cats.map(([c, n]) => `
            <section class="cat-card">
              <a class="cat-head" href="#/categories/${encodeURIComponent(c)}">${icon("cat", 20)}<strong>${esc(catName(c))}</strong><small>${t("nPosts", n)}</small></a>
              <ul>${posts().filter((p) => p.category === c).map((p) => `<li><a href="#/post/${esc(p.id)}">${esc(L(p, "title"))}</a></li>`).join("")}</ul>
            </section>`).join("")}</div>`,
      };
    },
    archives() {
      const by = {};
      posts().forEach((p) => (by[(p.date || "----").slice(0, 4)] ||= []).push(p));
      return {
        crumbs: [[t("home"), "#/"], [t("archives")]],
        html: `<h1 class="page-title">${t("archives")}</h1><div class="archive">${Object.keys(by).sort().reverse().map((y) => `
          <section><h2>${y}</h2><ul>${by[y].map((p) => {
            const [, m, d] = (p.date || "").split("-");
            const mon = App.lang === "zh" ? `${+m || 1}月` : MONTHS[(+m || 1) - 1];
            return `<li><time><b>${d || ""}</b>${mon}</time><a href="#/post/${esc(p.id)}">${esc(L(p, "title"))}</a></li>`;
          }).join("")}</ul></section>`).join("")}</div>`,
      };
    },
    about() {
      const p = App.data.profile;
      return {
        crumbs: [[t("home"), "#/"], [t("about")]],
        html: `<div class="about">
          <div class="about-head">${avatarHTML("about-avatar")}<div><h1>${esc(p.name)}</h1><p>${esc(L(p, "title"))} · ${esc(L(p, "location"))}</p></div></div>
          <div class="md">${md(L(p, "about"))}</div>
          <div class="contact-row">${contactChips()}</div>
        </div>`,
      };
    },
    resume: () => resumeView(),
    notfound() {
      return { crumbs: [[t("home"), "#/"], [t("notFound")]], html: `<div class="empty big"><h1>404</h1><p>${t("notFoundText")} <a href="#/">${t("goHome")}</a></p></div>` };
    },
  };

  function contactChips() {
    const p = App.data.profile;
    const chips = [];
    if (p.location) chips.push(`<span class="chip">${icon("loc", 15)}${esc(L(p, "location"))}</span>`);
    if (p.email) chips.push(`<a class="chip" href="mailto:${esc(p.email)}">${icon("mail", 15)}${esc(p.email)}</a>`);
    if (p.phone && p.showPhone) chips.push(`<a class="chip" href="tel:${esc(p.phone)}">${icon("phone", 15)}${esc(p.phone)}</a>`);
    socials().filter((s) => !s.url.startsWith("mailto:")).forEach((s) => chips.push(`<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener">${icon(s.type, 15)}${esc(s.label)}</a>`));
    return chips.join("");
  }

  /* ================= Resume (content stays English; UI labels follow the language) ================= */
  const parseMonth = (s) => {
    if (!s || /present|now|current/i.test(s)) return new Date();
    const d = new Date("1 " + s.replace(/[–-]/g, " "));
    return isNaN(d) ? null : d;
  };
  function duration(a, b) {
    const s = parseMonth(a), e = parseMonth(b);
    if (!s || !e) return "";
    let m = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1;
    if (m <= 0) return "";
    const y = Math.floor(m / 12); m %= 12;
    return t("dur", y, m);
  }
  const bullets = (arr) => (arr?.length ? `<ul>${arr.map((b) => `<li>${mdInline(b)}</li>`).join("")}</ul>` : "");
  let cvView = "interactive";
  /* Uploaded résumé PDF for a language: resume.pdf (English) / resume.pdf_zh (Chinese). No cross-language fallback. */
  const cvPdf = (lang) => String(App.data.resume?.[lang === "zh" ? "pdf_zh" : "pdf"] || "").trim();
  const cvFileName = (lang) => `${App.data.profile.name || "Resume"} - ${lang === "zh" ? "简历" : "Resume"}.pdf`;
  /* No uploaded file: print the Document view in that language (browser "Save as PDF"). */
  function printResume(lang) {
    const prev = App.lang, title = document.title;
    if (lang !== prev) { App.lang = lang; route(true); }
    document.title = cvFileName(lang).replace(/\.pdf$/, "");
    print();
    document.title = title;
    if (lang !== prev) { App.lang = prev; route(true); }
  }

  function resumeView() {
    const { profile: p, resume: r } = App.data;
    const exp = r.experience || [], edu = r.education || [], prj = r.projects || [];
    const range = (e) => `${L(e, "start")} – ${L(e, "end")}`;
    const tl = (items, kind) => items.map((e, i) => {
      const title = L(e, kind === "edu" ? "degree" : kind === "prj" ? "title" : "role");
      const org = kind === "prj" ? "" : L(e, kind === "edu" ? "school" : "org");
      const place = L(e, "place");
      const dates = kind === "prj" ? L(e, "period") : range(e);
      const dur = kind === "prj" ? "" : duration(e.start, e.end);
      const now = /present/i.test(e.end || "");
      let body = "";
      if (kind === "exp") body = (e.sections || []).map((s) => `
          <div class="cv-sub">${L(s, "heading") ? `<div class="cv-sub-head"><strong>${esc(L(s, "heading"))}</strong>${L(s, "period") ? `<span>${esc(L(s, "period"))}</span>` : ""}</div>` : ""}${bullets(L(s, "bullets"))}</div>`).join("");
      if (kind === "prj") body = bullets(L(e, "bullets")) + (e.links?.length ? `<div class="cv-links">${e.links.filter((l) => l.url).map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${icon("link", 14)}${esc(L(l, "label"))}</a>`).join("")}</div>` : "");
      if (kind === "edu") body = bullets(L(e, "notes"));
      const open = i === 0 && body;
      return `
        <li class="cv-item${open ? " open" : ""}${now ? " now" : ""}${body ? "" : " static"}">
          <span class="cv-dot" aria-hidden="true"></span>
          <button class="cv-head" ${body ? `aria-expanded="${!!open}"` : 'tabindex="-1"'}>
            <span class="cv-when">${esc(dates)}${dur ? ` · ${dur}` : ""}${now ? ` <em class="live">${t("current")}</em>` : ""}</span>
            <span class="cv-title">${esc(title)}</span>
            ${org || place ? `<span class="cv-org">${esc(org)}${org && place ? " · " : ""}${esc(place)}</span>` : ""}
            ${body ? '<span class="cv-toggle" aria-hidden="true"></span>' : ""}
          </button>
          ${body ? `<div class="cv-body"><div><div class="cv-inner">${body}</div></div></div>` : ""}
        </li>`;
    }).join("");

    const firstJob = exp[0];
    const heads = (firstJob?.sections || []).filter((s) => s.heading);
    const interactive = `
      <div class="cv-grid">
        <div class="cv-main">
          <h2 class="cv-h">${icon("cv", 20)}${t("experience")}</h2><ol class="cv-tl">${tl(exp, "exp")}</ol>
          ${prj.length ? `<h2 class="cv-h">${icon("link", 20)}${t("projects")}</h2><ol class="cv-tl">${tl(prj, "prj")}</ol>` : ""}
          <h2 class="cv-h">${icon("arch", 20)}${t("education")}</h2><ol class="cv-tl">${tl(edu, "edu")}</ol>
        </div>
        <aside class="cv-side">
          <section class="cv-card glance">
            <h3>${t("glance")}</h3>
            ${firstJob ? `<div><small>${t("now")}</small><strong>${esc(L(firstJob, "role"))}</strong><span>${esc(L(firstJob, "org"))}</span></div>` : ""}
            ${heads.length ? `<div><small>${t("titles")}</small><span>${heads.map((s) => esc(L(s, "heading"))).join(" · ")}</span></div>` : ""}
            ${edu[0] ? `<div><small>${t("education")}</small><span>${esc(L(edu[0], "school"))}</span></div>` : ""}
          </section>
          ${(r.skills || []).map((g) => `<section class="cv-card"><h3>${esc(L(g, "group"))}</h3><div class="skill-chips">${(g.items || []).map((s) => `<span>${esc(s)}</span>`).join("")}</div></section>`).join("")}
          ${r.awards?.length ? `<section class="cv-card"><h3>${t("awards")}</h3>${r.awards.map((a) => `<div class="award"><strong>${esc(L(a, "title"))}</strong><small>${esc(L(a, "date"))}</small></div>`).join("")}</section>` : ""}
        </aside>
      </div>`;

    const pEntry = (title, org, dates, inner) => `<div class="p-entry"><div class="p-top"><strong>${esc(title)}</strong><span>${esc(dates)}</span></div>${org ? `<em>${esc(org)}</em>` : ""}${inner}</div>`;
    const sep = App.lang === "zh" ? "，" : ", ";
    const paper = `
      <article class="paper" lang="${App.lang === "zh" ? "zh-CN" : "en"}">
        <header>
          <div><h1>${esc(p.name)}</h1><div class="p-role">${esc(L(p, "title"))}</div></div>
          <div class="p-contact">${[L(p, "location"), p.email, p.showPhone ? p.phone : "", ...socials().filter((s) => !s.url.startsWith("mailto:")).map((s) => s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))].filter(Boolean).map(esc).join("<br/>")}</div>
        </header>
        ${L(r, "summary") ? `<p class="p-summary">${esc(L(r, "summary"))}</p>` : ""}
        <h2>${t("experience")}</h2>
        ${exp.map((e) => pEntry(L(e, "role"), `${L(e, "org")}${L(e, "place") ? sep + L(e, "place") : ""}`, range(e),
          (e.sections || []).map((s) => `${L(s, "heading") ? `<div class="p-subhead">${esc(L(s, "heading"))}${L(s, "period") ? ` <span>(${esc(L(s, "period"))})</span>` : ""}</div>` : ""}${bullets(L(s, "bullets"))}`).join(""))).join("")}
        ${prj.length ? `<h2>${t("projects")}</h2>${prj.map((e) => pEntry(L(e, "title"), "", L(e, "period"), bullets(L(e, "bullets")) + (e.links?.length ? `<div class="p-links">${e.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}">${esc(L(l, "label"))}</a>`).join(" · ")}</div>` : ""))).join("")}` : ""}
        <h2>${t("education")}</h2>
        ${edu.map((e) => pEntry(L(e, "degree"), `${L(e, "school")}${L(e, "place") ? sep + L(e, "place") : ""}`, range(e), bullets(L(e, "notes")))).join("")}
        <h2>${t("skills")}</h2>
        <dl class="p-skills">${(r.skills || []).map((g) => `<dt>${esc(L(g, "group"))}</dt><dd>${(g.items || []).map(esc).join(", ")}</dd>`).join("")}</dl>
        ${r.awards?.length ? `<h2>${t("awards")}</h2>${r.awards.map((a) => `<div class="p-top"><span class="p-award">${esc(L(a, "title"))}</span><span>${esc(L(a, "date"))}</span></div>`).join("")}` : ""}
      </article>`;

    const other = App.lang === "zh" ? "en" : "zh";
    const pdfMain = cvPdf(App.lang)
      ? `<a class="btn" href="${esc(App.asset(cvPdf(App.lang)))}" download="${esc(cvFileName(App.lang))}" target="_blank" rel="noopener">${icon("cv", 16)}${t("pdf")}</a>`
      : `<button class="btn" type="button" data-print="${App.lang}">${icon("cv", 16)}${t("pdf")}</button>`;
    const otherLabel = other === "zh" ? "中文版 PDF" : "English PDF";
    const pdfOther = cvPdf(other)
      ? `<a class="cv-alt" href="${esc(App.asset(cvPdf(other)))}" download="${esc(cvFileName(other))}" target="_blank" rel="noopener" lang="${other === "zh" ? "zh-CN" : "en"}">${otherLabel} ↓</a>`
      : `<button class="cv-alt" type="button" data-print="${other}" lang="${other === "zh" ? "zh-CN" : "en"}">${otherLabel} ↓</button>`;

    return {
      crumbs: [[t("home"), "#/"], [t("resume")]],
      html: `
        <section class="cv">
          <header class="cv-hero">
            ${avatarHTML("cv-avatar")}
            <div class="cv-id">
              <h1>${esc(p.name)}</h1>
              <p class="cv-role">${esc(L(p, "title"))}</p>
              <div class="contact-row">${contactChips()}</div>
            </div>
            <div class="cv-actions">
              <div class="seg" role="tablist" aria-label="${t("cvView")}">
                <button role="tab" data-cv="interactive" class="${cvView === "interactive" ? "on" : ""}">${t("interactive")}</button>
                <button role="tab" data-cv="document" class="${cvView === "document" ? "on" : ""}">${t("document")}</button>
              </div>
              ${pdfMain}
              ${pdfOther}
            </div>
          </header>
          ${L(r, "summary") ? `<p class="cv-summary">${esc(L(r, "summary"))}</p>` : ""}
          <div class="cv-view cv-interactive" ${cvView === "document" ? "hidden" : ""}>${interactive}</div>
          <div class="cv-view cv-document" ${cvView === "interactive" ? "hidden" : ""}>${paper}</div>
        </section>`,
      after(root) {
        $$(".cv-item:not(.static) .cv-head", root).forEach((b) => (b.onclick = () => {
          const li = b.closest(".cv-item");
          b.setAttribute("aria-expanded", li.classList.toggle("open"));
        }));
        $$("[data-cv]", root).forEach((b) => (b.onclick = () => {
          cvView = b.dataset.cv;
          $$("[data-cv]", root).forEach((x) => x.classList.toggle("on", x === b));
          $(".cv-interactive", root).hidden = cvView !== "interactive";
          $(".cv-document", root).hidden = cvView !== "document";
        }));
        $$("[data-print]", root).forEach((b) => (b.onclick = () => printResume(b.dataset.print)));
      },
    };
  }

  /* ================= Search ================= */
  function searchView(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = posts().filter((p) => {
      const hay = [p.title, p.summary, p.category, catName(p.category), p.body, p.title_zh, p.summary_zh, p.body_zh].join(" ").toLowerCase();
      return terms.every((w) => hay.includes(w));
    });
    return {
      crumbs: [[t("home"), "#/"], [t("search")]],
      html: `<h1 class="page-title">${t("search")} <small>${esc(t("results", hits.length, q))}</small></h1>
        <div class="post-list">${hits.map(postCard).join("") || `<p class="empty">${t("noResults")}</p>`}</div>`,
    };
  }

  /* ================= Router ================= */
  let cleanup = [];
  function route(keepScroll) {
    cleanup.forEach((f) => f()); cleanup = [];
    const q = $("#searchInput").value.trim();
    const [, name, arg] = (location.hash.replace(/^#\/?/, "").match(/^([^/]*)\/?(.*)$/) || []);
    const a = arg ? decodeURIComponent(arg) : "";
    const v = q ? searchView(q)
      : !name ? views.home()
      : name === "post" ? views.post(a)
      : name === "categories" ? views.categories(a)
      : views[name] && !["post", "notfound"].includes(name) ? views[name](a)
      : views.notfound();
    document.body.dataset.route = q ? "search" : name || "home";
    const view = $("#view");
    view.innerHTML = v.html;
    view.classList.remove("enter"); void view.offsetWidth; if (!keepScroll) view.classList.add("enter");
    $("#crumbs").innerHTML = v.crumbs.map(([l, h], i) => (h ? `<a href="${h}">${esc(l)}</a>` : `<span${i === v.crumbs.length - 1 ? ' aria-current="page"' : ""}>${esc(l)}</span>`)).join('<i aria-hidden="true">›</i>');
    $$(".md", view).forEach(enhance);
    v.after?.(view);
    if (v.toc) panelToc(view); else $("#panel").innerHTML = panelDefault();
    markNav();
    document.body.classList.remove("menu-open");
    if (!keepScroll) scrollTo({ top: 0 });
    App.onRoute?.(name, a);
  }

  /* ================= Lightbox ================= */
  const lb = document.createElement("div");
  lb.className = "lightbox"; lb.hidden = true;
  lb.innerHTML = `<img alt=""/><button class="icon-btn" aria-label="Close">✕</button>`;
  document.body.appendChild(lb);
  lb.onclick = () => (lb.hidden = true);
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".md img, .post-cover img");
    if (!img || img.closest("a")) return;
    $("img", lb).src = img.currentSrc || img.src;
    lb.hidden = false;
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") lb.hidden = true;
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e" && !App.editing) {
      const u = new URL(location.href); u.searchParams.set("edit", ""); location.href = u;
    }
  });

  /* ================= Boot ================= */
  let st;
  $("#searchInput").addEventListener("input", () => { clearTimeout(st); st = setTimeout(() => route(), 150); });
  $("#searchInput").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.target.value = ""; route(); } });
  $("#menuBtn").onclick = () => document.body.classList.toggle("menu-open");
  $("#scrim").onclick = () => document.body.classList.remove("menu-open");
  const toTop = $("#toTop");
  addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 600), { passive: true });
  toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
  $$("#langSwitch [data-lang]").forEach((b) => (b.onclick = () => setLang(b.dataset.lang)));
  applyLangChrome();
  addEventListener("hashchange", () => {
    postLang = null;
    if ($("#searchInput").value) $("#searchInput").value = "";
    // in-page TOC anchors are handled separately; only route on real routes
    if (location.hash.startsWith("#/") || location.hash === "") route();
  });

  App.boot = () => { renderShell(); route(); };
  if (new URLSearchParams(location.search).has("edit")) {
    App.editing = true;
    const s = document.createElement("script");
    s.src = "editor.js";
    document.head.appendChild(s); // editor.js calls App.boot() after restoring any draft
  } else {
    App.boot();
  }
})();
