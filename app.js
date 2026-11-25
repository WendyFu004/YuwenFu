(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const App = (window.App = {
    data: window.SITE,
    assets: {}, // path -> object URL / data URL for images uploaded in the editor but not yet published
    asset(p) { return (p && this.assets[p]) || p || ""; },
    rerender() { renderShell(); route(true); },
    esc, slug,
  });

  /* ================= Markdown ================= */
  function embeds(src) {
    return String(src || "")
      .split("\n")
      .map((line) => {
        const t = line.trim();
        let m = t.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})\S*$/i);
        if (m) {
          const vertical = m[1] === "shorts/";
          return `\n<div class="embed${vertical ? " vertical" : ""}"><iframe src="https://www.youtube.com/embed/${esc(m[2])}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>\n`;
        }
        m = t.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)\S*$/i);
        if (m) return `\n<div class="embed"><iframe src="https://player.vimeo.com/video/${m[1]}" title="Vimeo video" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>\n`;
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
    return `${MONTHS[(m || 1) - 1]} ${day || 1}, ${y}`;
  };
  const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  function cover(p, cls = "") {
    if (p.cover) return `<div class="cover ${cls}"><img src="${esc(App.asset(p.cover))}" alt="" loading="lazy"/></div>`;
    const h = hue(p.title || "x");
    const mark = (p.category || p.title || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `<div class="cover gen ${cls}" style="--h:${h}"><span>${esc(mark)}</span></div>`;
  }
  const readTime = (p) => Math.max(1, Math.round(String(p.body || "").split(/\s+/).length / 200));
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
    ["home", "Home", "#/"],
    ["cat", "Categories", "#/categories"],
    ["tag", "Tags", "#/tags"],
    ["arch", "Archives", "#/archives"],
    ["cv", "Résumé", "#/resume"],
    ["about", "About", "#/about"],
  ];
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
        <p class="sb-tagline">${esc(p.tagline)}</p>
      </div>
      <nav class="sb-nav">${NAV.map(([ic, label, href]) => `<a href="${href}" data-nav="${href}">${icon(ic)}<span>${label}</span></a>`).join("")}</nav>
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
    $("#footer").innerHTML = `<span>© ${new Date().getFullYear()} ${esc(p.name)}</span><span>${mdInline(site.footer || "")}</span>`;
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
    const tags = countBy("tags").slice(0, 12);
    return `
      <section class="pn-block"><h3>Recently Updated</h3>
        <ul class="pn-list">${recent.map((p) => `<li><a href="#/post/${esc(p.id)}">${esc(p.title)}</a></li>`).join("")}</ul>
      </section>
      <section class="pn-block"><h3>Trending Tags</h3>
        <div class="tag-cloud small">${tags.map(([t]) => `<a class="tag" href="#/tags/${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
      </section>`;
  }
  function panelToc(root) {
    const hs = $$("h2, h3", root);
    const toc = hs.length
      ? `<section class="pn-block toc"><h3>Contents</h3><ul>${hs.map((h) => `<li class="${h.tagName.toLowerCase()}"><a href="#${h.id}" data-toc="${h.id}">${esc(h.textContent)}</a></li>`).join("")}</ul></section>`
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
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.summary)}</p>
        <div class="meta">
          <span>${icon("cal", 14)}${fmtDate(p.date)}</span>
          ${p.category ? `<span>${icon("cat", 14)}${esc(p.category)}</span>` : ""}
          ${p.pinned ? `<span class="pinned">${icon("pin", 14)}Pinned</span>` : ""}
        </div>
      </div>
      ${cover(p, "pc-cover")}
    </a>`;
  const postRow = (p) => `<li><a href="#/post/${esc(p.id)}"><time>${fmtDate(p.date)}</time><span>${esc(p.title)}</span></a></li>`;

  const views = {
    home() {
      const list = posts().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      return {
        crumbs: [["Home"]],
        html: `<h1 class="sr-only">${esc(App.data.site.title)}</h1>
          <div class="post-list">${list.map(postCard).join("") || `<p class="empty">No posts yet.</p>`}</div>`,
      };
    },
    post(id) {
      const all = posts();
      const i = all.findIndex((p) => p.id === id);
      if (i < 0) return views.notfound();
      const p = all[i], newer = all[i - 1], older = all[i + 1];
      return {
        crumbs: [["Home", "#/"], [p.title]],
        toc: true,
        html: `
          <article class="post">
            <header class="post-head">
              <h1>${esc(p.title)}</h1>
              ${p.summary ? `<p class="post-sub">${esc(p.summary)}</p>` : ""}
              <div class="meta">
                <span>${icon("cal", 14)}${fmtDate(p.date)}</span>
                ${p.updated ? `<span>Updated ${fmtDate(p.updated)}</span>` : ""}
                ${p.category ? `<a href="#/categories/${encodeURIComponent(p.category)}">${icon("cat", 14)}${esc(p.category)}</a>` : ""}
                <span>${icon("clock", 14)}${readTime(p)} min read</span>
              </div>
            </header>
            ${p.cover ? cover(p, "post-cover") : ""}
            <div class="md" id="postBody">${md(p.body)}</div>
            ${p.tags?.length ? `<div class="post-tags">${icon("tag", 16)}${p.tags.map((t) => `<a class="tag" href="#/tags/${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
            <nav class="post-nav">
              ${older ? `<a href="#/post/${esc(older.id)}"><small>Older</small>${esc(older.title)}</a>` : "<span></span>"}
              ${newer ? `<a class="right" href="#/post/${esc(newer.id)}"><small>Newer</small>${esc(newer.title)}</a>` : "<span></span>"}
            </nav>
          </article>`,
      };
    },
    categories(name) {
      if (name) {
        const list = posts().filter((p) => p.category === name);
        return { crumbs: [["Home", "#/"], ["Categories", "#/categories"], [name]], html: `<h1 class="page-title">${icon("cat", 26)}${esc(name)} <small>${list.length}</small></h1><ul class="rows">${list.map(postRow).join("")}</ul>` };
      }
      const cats = countBy("category");
      return {
        crumbs: [["Home", "#/"], ["Categories"]],
        html: `<h1 class="page-title">Categories</h1>
          <div class="cat-grid">${cats.map(([c, n]) => `
            <section class="cat-card">
              <a class="cat-head" href="#/categories/${encodeURIComponent(c)}">${icon("cat", 20)}<strong>${esc(c)}</strong><small>${n} post${n > 1 ? "s" : ""}</small></a>
              <ul>${posts().filter((p) => p.category === c).map((p) => `<li><a href="#/post/${esc(p.id)}">${esc(p.title)}</a></li>`).join("")}</ul>
            </section>`).join("")}</div>`,
      };
    },
    tags(name) {
      if (name) {
        const list = posts().filter((p) => (p.tags || []).includes(name));
        return { crumbs: [["Home", "#/"], ["Tags", "#/tags"], [name]], html: `<h1 class="page-title">${icon("tag", 26)}${esc(name)} <small>${list.length}</small></h1><ul class="rows">${list.map(postRow).join("")}</ul>` };
      }
      return {
        crumbs: [["Home", "#/"], ["Tags"]],
        html: `<h1 class="page-title">Tags</h1><div class="tag-cloud">${countBy("tags").map(([t, n]) => `<a class="tag big" href="#/tags/${encodeURIComponent(t)}">${esc(t)}<sup>${n}</sup></a>`).join("")}</div>`,
      };
    },
    archives() {
      const by = {};
      posts().forEach((p) => (by[(p.date || "----").slice(0, 4)] ||= []).push(p));
      return {
        crumbs: [["Home", "#/"], ["Archives"]],
        html: `<h1 class="page-title">Archives</h1><div class="archive">${Object.keys(by).sort().reverse().map((y) => `
          <section><h2>${y}</h2><ul>${by[y].map((p) => {
            const [, m, d] = (p.date || "").split("-");
            return `<li><time><b>${d || ""}</b>${MONTHS[(+m || 1) - 1]}</time><a href="#/post/${esc(p.id)}">${esc(p.title)}</a></li>`;
          }).join("")}</ul></section>`).join("")}</div>`,
      };
    },
    about() {
      const p = App.data.profile;
      return {
        crumbs: [["Home", "#/"], ["About"]],
        html: `<div class="about">
          <div class="about-head">${avatarHTML("about-avatar")}<div><h1>${esc(p.name)}</h1><p>${esc(p.title)} · ${esc(p.location)}</p></div></div>
          <div class="md">${md(p.about)}</div>
          <div class="contact-row">${contactChips()}</div>
        </div>`,
      };
    },
    resume: () => resumeView(),
    notfound() {
      return { crumbs: [["Home", "#/"], ["Not found"]], html: `<div class="empty big"><h1>404</h1><p>That page doesn't exist. <a href="#/">Go home →</a></p></div>` };
    },
  };

  function contactChips() {
    const p = App.data.profile;
    const chips = [];
    if (p.location) chips.push(`<span class="chip">${icon("loc", 15)}${esc(p.location)}</span>`);
    if (p.email) chips.push(`<a class="chip" href="mailto:${esc(p.email)}">${icon("mail", 15)}${esc(p.email)}</a>`);
    if (p.phone && p.showPhone) chips.push(`<a class="chip" href="tel:${esc(p.phone)}">${icon("phone", 15)}${esc(p.phone)}</a>`);
    socials().filter((s) => !s.url.startsWith("mailto:")).forEach((s) => chips.push(`<a class="chip" href="${esc(s.url)}" target="_blank" rel="noopener">${icon(s.type, 15)}${esc(s.label)}</a>`));
    return chips.join("");
  }

  /* ================= Résumé ================= */
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
    return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ");
  }
  const bullets = (arr) => (arr?.length ? `<ul>${arr.map((b) => `<li>${mdInline(b)}</li>`).join("")}</ul>` : "");
  let cvView = "interactive";

  function resumeView() {
    const { profile: p, resume: r } = App.data;
    const exp = r.experience || [], edu = r.education || [], prj = r.projects || [];
    const tl = (items, kind) => items.map((e, i) => {
      const title = kind === "edu" ? e.degree : kind === "prj" ? e.title : e.role;
      const org = kind === "edu" ? e.school : kind === "prj" ? "" : e.org;
      const dates = kind === "prj" ? e.period : `${e.start || ""} – ${e.end || ""}`;
      const dur = kind === "prj" ? "" : duration(e.start, e.end);
      const now = /present/i.test(e.end || "");
      let body = "";
      if (kind === "exp") body = (e.sections || []).map((s) => `
          <div class="cv-sub">${s.heading ? `<div class="cv-sub-head"><strong>${esc(s.heading)}</strong>${s.period ? `<span>${esc(s.period)}</span>` : ""}</div>` : ""}${bullets(s.bullets)}</div>`).join("");
      if (kind === "prj") body = bullets(e.bullets) + (e.links?.length ? `<div class="cv-links">${e.links.filter((l) => l.url).map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${icon("link", 14)}${esc(l.label)}</a>`).join("")}</div>` : "");
      if (kind === "edu") body = bullets(e.notes);
      const open = i === 0 && body;
      return `
        <li class="cv-item${open ? " open" : ""}${now ? " now" : ""}${body ? "" : " static"}">
          <span class="cv-dot" aria-hidden="true"></span>
          <button class="cv-head" ${body ? `aria-expanded="${!!open}"` : 'tabindex="-1"'}>
            <span class="cv-when">${esc(dates)}${dur ? ` · ${dur}` : ""}${now ? ' <em class="live">Current</em>' : ""}</span>
            <span class="cv-title">${esc(title)}</span>
            ${org || e.place ? `<span class="cv-org">${esc(org)}${org && e.place ? " · " : ""}${esc(e.place || "")}</span>` : ""}
            ${body ? '<span class="cv-toggle" aria-hidden="true"></span>' : ""}
          </button>
          ${body ? `<div class="cv-body"><div><div class="cv-inner">${body}</div></div></div>` : ""}
        </li>`;
    }).join("");

    const firstJob = exp[0];
    const interactive = `
      <div class="cv-grid">
        <div class="cv-main">
          <h2 class="cv-h">${icon("cv", 20)}Experience</h2><ol class="cv-tl">${tl(exp, "exp")}</ol>
          ${prj.length ? `<h2 class="cv-h">${icon("link", 20)}Projects</h2><ol class="cv-tl">${tl(prj, "prj")}</ol>` : ""}
          <h2 class="cv-h">${icon("arch", 20)}Education</h2><ol class="cv-tl">${tl(edu, "edu")}</ol>
        </div>
        <aside class="cv-side">
          <section class="cv-card glance">
            <h3>At a glance</h3>
            ${firstJob ? `<div><small>Now</small><strong>${esc(firstJob.role)}</strong><span>${esc(firstJob.org)}</span></div>` : ""}
            ${(firstJob?.sections || []).filter((s) => s.heading).length ? `<div><small>Titles</small><span>${firstJob.sections.filter((s) => s.heading).map((s) => esc(s.heading)).join(" · ")}</span></div>` : ""}
            ${edu[0] ? `<div><small>Education</small><span>${esc(edu[0].school)}</span></div>` : ""}
          </section>
          ${(r.skills || []).map((g) => `<section class="cv-card"><h3>${esc(g.group)}</h3><div class="skill-chips">${(g.items || []).map((s) => `<span>${esc(s)}</span>`).join("")}</div></section>`).join("")}
          ${r.awards?.length ? `<section class="cv-card"><h3>Awards</h3>${r.awards.map((a) => `<div class="award"><strong>${esc(a.title)}</strong><small>${esc(a.date)}</small></div>`).join("")}</section>` : ""}
        </aside>
      </div>`;

    const pEntry = (title, org, dates, inner) => `<div class="p-entry"><div class="p-top"><strong>${esc(title)}</strong><span>${esc(dates)}</span></div>${org ? `<em>${esc(org)}</em>` : ""}${inner}</div>`;
    const paper = `
      <article class="paper">
        <header>
          <div><h1>${esc(p.name)}</h1><div class="p-role">${esc(p.title)}</div></div>
          <div class="p-contact">${[p.location, p.email, p.showPhone ? p.phone : "", ...socials().filter((s) => !s.url.startsWith("mailto:")).map((s) => s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))].filter(Boolean).map(esc).join("<br/>")}</div>
        </header>
        ${r.summary ? `<p class="p-summary">${esc(r.summary)}</p>` : ""}
        <h2>Experience</h2>
        ${exp.map((e) => pEntry(e.role, `${e.org}${e.place ? ", " + e.place : ""}`, `${e.start} – ${e.end}`,
          (e.sections || []).map((s) => `${s.heading ? `<div class="p-subhead">${esc(s.heading)}${s.period ? ` <span>(${esc(s.period)})</span>` : ""}</div>` : ""}${bullets(s.bullets)}`).join(""))).join("")}
        ${prj.length ? `<h2>Projects</h2>${prj.map((e) => pEntry(e.title, "", e.period, bullets(e.bullets) + (e.links?.length ? `<div class="p-links">${e.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(" · ")}</div>` : ""))).join("")}` : ""}
        <h2>Education</h2>
        ${edu.map((e) => pEntry(e.degree, `${e.school}${e.place ? ", " + e.place : ""}`, `${e.start} – ${e.end}`, bullets(e.notes))).join("")}
        <h2>Skills</h2>
        <dl class="p-skills">${(r.skills || []).map((g) => `<dt>${esc(g.group)}</dt><dd>${(g.items || []).map(esc).join(", ")}</dd>`).join("")}</dl>
        ${r.awards?.length ? `<h2>Awards</h2>${r.awards.map((a) => `<div class="p-top"><span class="p-award">${esc(a.title)}</span><span>${esc(a.date)}</span></div>`).join("")}` : ""}
      </article>`;

    return {
      crumbs: [["Home", "#/"], ["Résumé"]],
      html: `
        <section class="cv">
          <header class="cv-hero">
            ${avatarHTML("cv-avatar")}
            <div class="cv-id">
              <h1>${esc(p.name)}</h1>
              <p class="cv-role">${esc(p.title)}</p>
              <div class="contact-row">${contactChips()}</div>
            </div>
            <div class="cv-actions">
              <div class="seg" role="tablist" aria-label="Résumé view">
                <button role="tab" data-cv="interactive" class="${cvView === "interactive" ? "on" : ""}">Interactive</button>
                <button role="tab" data-cv="document" class="${cvView === "document" ? "on" : ""}">Document</button>
              </div>
              <button class="btn" id="cvPrint">${icon("cv", 16)}Download PDF</button>
            </div>
          </header>
          ${r.summary ? `<p class="cv-summary">${esc(r.summary)}</p>` : ""}
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
        $("#cvPrint", root).onclick = () => print();
      },
    };
  }

  /* ================= Search ================= */
  function searchView(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = posts().filter((p) => {
      const hay = [p.title, p.summary, p.category, ...(p.tags || []), p.body].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    return {
      crumbs: [["Home", "#/"], ["Search"]],
      html: `<h1 class="page-title">Search <small>${hits.length} result${hits.length === 1 ? "" : "s"} for “${esc(q)}”</small></h1>
        <div class="post-list">${hits.map(postCard).join("") || `<p class="empty">Nothing found. Try another keyword.</p>`}</div>`,
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
      : name === "tags" ? views.tags(a)
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
  addEventListener("hashchange", () => {
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
