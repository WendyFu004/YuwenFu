/* Site editor — loaded only when the URL contains ?edit
   - Edits window.SITE through forms; the page re-renders live as you type.
   - Drafts autosave to this browser (localStorage + IndexedDB for images).
   - "Publish" commits data.js + new images to your GitHub repo in a single commit. */
(function () {
  "use strict";
  const App = window.App, esc = App.esc, slug = App.slug;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const LS_DRAFT = "site-editor-draft", LS_GH = "site-editor-github";
  const fromFile = clone(window.SITE); // data.js as served
  let data = clone(window.SITE);
  let state = { dirty: false, savedAt: null, publishedAt: null };
  const pending = {}; // path -> { path, type, b64 }

  /* ---------------- IndexedDB (pending uploads) ---------------- */
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      const open = indexedDB.open("site-editor", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("assets", { keyPath: "path" });
      open.onerror = () => rej(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction("assets", mode);
        const req = fn(tx.objectStore("assets"));
        tx.oncomplete = () => res(req && req.result);
        tx.onerror = () => rej(tx.error);
      };
    });
  }
  const idbAll = () => idb("readonly", (s) => s.getAll());
  const idbPut = (v) => idb("readwrite", (s) => s.put(v));
  const idbClear = () => idb("readwrite", (s) => s.clear());

  /* ---------------- Draft persistence ---------------- */
  let saveT, renderT;
  function saveDraft() {
    state.savedAt = new Date().toISOString();
    try { localStorage.setItem(LS_DRAFT, JSON.stringify({ data, ...state })); }
    catch (e) { toast("Couldn't save draft locally: " + e.message, "err"); }
    status();
  }
  function changed(opts = {}) {
    state.dirty = true;
    status();
    clearTimeout(saveT); saveT = setTimeout(saveDraft, 300);
    clearTimeout(renderT); renderT = setTimeout(() => App.rerender(), opts.now ? 0 : 220);
  }
  const ghCfg = () => {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(LS_GH) || "{}"); } catch {}
    if (!c.owner && location.hostname.endsWith(".github.io")) {
      c.owner = location.hostname.split(".")[0];
      const seg = location.pathname.split("/").filter(Boolean)[0];
      c.repo = seg && !seg.includes(".") ? seg : location.hostname;
    }
    return { owner: "", repo: "", branch: "main", dir: "", token: "", ...c };
  };

  /* ---------------- Schemas ---------------- */
  const SOCIAL_TYPES = ["artstation", "linkedin", "github", "email", "youtube", "instagram", "x", "website"];
  const SCHEMA = {
    site: [
      { key: "title", label: "Site title", hint: "Shown in the sidebar and browser tab." },
      { key: "description", label: "Description", type: "textarea" },
      { key: "footer", label: "Footer text", hint: "Markdown allowed." },
      { type: "heading", label: "中文版本 · Chinese (optional)", hint: "Shown when a visitor picks 中文. Leave empty to show the English text." },
      { key: "description_zh", label: "Description · 中文", type: "textarea" },
      { key: "footer_zh", label: "Footer text · 中文" },
      { key: "categoryNames", label: "Category names in Chinese · 分类中文名", type: "map", rows: 4, hint: "One per line: English name = 中文名, e.g. Work = 工作" },
    ],
    profile: [
      { key: "avatar", label: "Avatar / photo", type: "image", prefix: "avatar" },
      { key: "name", label: "Name" },
      { key: "title", label: "Job title", half: true },
      { key: "title_zh", label: "Job title · 中文", half: true },
      { key: "tagline", label: "Tagline (sidebar)", type: "textarea", rows: 2, half: true },
      { key: "tagline_zh", label: "Tagline · 中文", type: "textarea", rows: 2, half: true },
      { key: "location", label: "Location", half: true },
      { key: "location_zh", label: "Location · 中文", half: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "showPhone", label: "Show phone number publicly", type: "bool" },
      { key: "about", label: "About page", type: "md", rows: 12 },
      { key: "about_zh", label: "About page · 中文 (optional)", type: "md", rows: 12, hint: "Shown when a visitor picks 中文. Leave empty to show the English version." },
      {
        key: "socials", label: "Social links", type: "list", itemLabel: (s) => s.label || s.type || "Link",
        blank: () => ({ type: "website", label: "Website", url: "" }),
        fields: [
          { key: "type", label: "Icon", type: "select", options: SOCIAL_TYPES },
          { key: "label", label: "Label" },
          { key: "url", label: "URL", hint: "Leave empty to hide. Email: mailto:you@example.com" },
        ],
      },
    ],
    resume: [
      { key: "summary", label: "Summary", type: "textarea", rows: 4 },
      {
        key: "experience", label: "Experience", type: "list", itemLabel: (e) => `${e.role || "Role"} — ${e.org || ""}`,
        blank: () => ({ role: "", org: "", place: "", start: "", end: "Present", sections: [{ heading: "", period: "", bullets: [] }] }),
        fields: [
          { key: "role", label: "Role" },
          { key: "org", label: "Company" },
          { key: "place", label: "Location" },
          { key: "start", label: "Start", hint: "e.g. July 2022", half: true },
          { key: "end", label: "End", hint: "e.g. Present", half: true },
          {
            key: "sections", label: "Projects / sections", type: "list", itemLabel: (s) => s.heading || "(no heading)",
            blank: () => ({ heading: "", period: "", bullets: [] }),
            fields: [
              { key: "heading", label: "Heading (e.g. game title)", hint: "Optional" },
              { key: "period", label: "Period", hint: "Optional" },
              { key: "bullets", label: "Bullet points", type: "lines", rows: 6, hint: "One per line. [text](url) for links." },
            ],
          },
        ],
      },
      {
        key: "projects", label: "Projects", type: "list", itemLabel: (p) => p.title || "Project",
        blank: () => ({ title: "", period: "", links: [], bullets: [] }),
        fields: [
          { key: "title", label: "Title" },
          { key: "period", label: "Period" },
          { key: "bullets", label: "Bullet points", type: "lines", rows: 5 },
          { key: "links", label: "Links", type: "list", itemLabel: (l) => l.label || "Link", blank: () => ({ label: "", url: "" }), fields: [{ key: "label", label: "Label" }, { key: "url", label: "URL" }] },
        ],
      },
      {
        key: "education", label: "Education", type: "list", itemLabel: (e) => e.degree || "Degree",
        blank: () => ({ degree: "", school: "", place: "", start: "", end: "", notes: [] }),
        fields: [
          { key: "degree", label: "Degree" },
          { key: "school", label: "School" },
          { key: "place", label: "Location" },
          { key: "start", label: "Start", half: true },
          { key: "end", label: "End", half: true },
          { key: "notes", label: "Notes", type: "lines", rows: 3 },
        ],
      },
      {
        key: "skills", label: "Skill groups", type: "list", itemLabel: (g) => g.group || "Group",
        blank: () => ({ group: "", items: [] }),
        fields: [{ key: "group", label: "Group name" }, { key: "items", label: "Skills", type: "tags", hint: "Comma separated" }],
      },
      {
        key: "awards", label: "Awards", type: "list", itemLabel: (a) => a.title || "Award",
        blank: () => ({ title: "", date: "" }),
        fields: [{ key: "title", label: "Title" }, { key: "date", label: "Date" }],
      },
    ],
    post: [
      { key: "title", label: "Title" },
      { key: "id", label: "URL slug", hint: "Address: #/post/slug — auto-generated from the title." },
      { key: "date", label: "Date", type: "date", half: true },
      { key: "updated", label: "Updated", type: "date", half: true },
      { key: "category", label: "Category", list: "ed-cats", half: true },
      { key: "pinned", label: "Pin to top", type: "bool", half: true },
      { key: "cover", label: "Cover image", type: "image", prefix: "cover" },
      { key: "summary", label: "Summary", type: "textarea", rows: 3, hint: "Shown on the home page card." },
      { key: "body", label: "Content", type: "md", rows: 20 },
      { type: "heading", label: "中文版本 · Chinese version (optional)", hint: "Fill these in to give this post a Chinese version: visitors who pick 中文 see it, and the post gets an English / 中文 switch. Leave empty and Chinese visitors see the original with a short note. For a Chinese-only post, just write Chinese in the fields above." },
      { key: "title_zh", label: "Title · 中文" },
      { key: "summary_zh", label: "Summary · 中文", type: "textarea", rows: 3 },
      { key: "body_zh", label: "Content · 中文", type: "md", rows: 20 },
    ],
  };

  /* ---------------- Form builder ---------------- */
  function build(fields, obj, onChange, ctx = {}) {
    const wrap = document.createElement("div");
    wrap.className = "ed-fields";
    fields.forEach((f) => wrap.appendChild(field(f, obj, onChange, ctx)));
    return wrap;
  }
  function field(f, obj, onChange, ctx) {
    const type = f.type || "text";
    const el = document.createElement("div");
    el.className = `ed-field t-${type}${f.half ? " half" : ""}`;
    const hint = f.hint ? `<small class="ed-hint">${esc(f.hint)}</small>` : "";
    const set = (v) => { obj[f.key] = v; onChange(f.key, v); };

    if (type === "list") return listField(f, obj, onChange, ctx);
    if (type === "heading") {
      el.innerHTML = `<h4 class="ed-section">${esc(f.label)}</h4>${hint}`;
      return el;
    }
    if (type === "map") {
      const v = Object.entries(obj[f.key] || {}).map(([k, x]) => `${k} = ${x}`).join("\n");
      el.innerHTML = `<label><span class="ed-label">${esc(f.label)}</span><textarea rows="${f.rows || 4}">${esc(v)}</textarea></label>${hint}`;
      $("textarea", el).addEventListener("input", (e) => {
        const m = {};
        e.target.value.split("\n").forEach((line) => {
          const i = line.indexOf("=");
          if (i > 0 && line.slice(0, i).trim() && line.slice(i + 1).trim()) m[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        });
        set(m);
      });
      return el;
    }
    if (type === "bool") {
      el.innerHTML = `<label class="ed-check"><input type="checkbox" ${obj[f.key] ? "checked" : ""}/><span>${esc(f.label)}</span></label>${hint}`;
      $("input", el).onchange = (e) => set(e.target.checked);
      return el;
    }
    if (type === "image") return imageField(f, obj, set, hint, ctx);

    let input;
    if (type === "select") {
      input = `<select>${f.options.map((o) => `<option ${o === obj[f.key] ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (type === "textarea" || type === "lines" || type === "md") {
      const v = type === "lines" ? (obj[f.key] || []).join("\n") : obj[f.key] || "";
      input = `<textarea rows="${f.rows || 4}" spellcheck="true">${esc(v)}</textarea>`;
    } else {
      const v = type === "tags" ? (obj[f.key] || []).join(", ") : obj[f.key] ?? "";
      input = `<input type="${type === "date" ? "date" : "text"}" value="${esc(v)}" ${f.list ? `list="${f.list}"` : ""}/>`;
    }
    el.innerHTML = `<label><span class="ed-label">${esc(f.label)}</span>${type === "md" ? mdToolbar() : ""}${input}</label>${hint}`;
    const inp = $("textarea, select, input:not([type=file])", el);
    inp.addEventListener("input", () => {
      const v = inp.value;
      if (type === "lines") set(v.split("\n").map((s) => s.trim()).filter(Boolean));
      else if (type === "tags") set(v.split(",").map((s) => s.trim()).filter(Boolean));
      else set(v);
    });
    if (type === "md") wireToolbar(el, inp, ctx);
    if (f.key === "id" || f.key === "title") inp.dataset.key = f.key;
    return el;
  }

  function listField(f, obj, onChange, ctx) {
    const el = document.createElement("div");
    el.className = "ed-field t-list";
    const arr = (obj[f.key] ||= []);
    let openIdx = -1;
    const draw = () => {
      el.innerHTML = `<div class="ed-list-head"><span class="ed-label">${esc(f.label)}</span><button type="button" class="ed-mini add">＋ Add</button></div>`;
      arr.forEach((item, i) => {
        const d = document.createElement("details");
        d.className = "ed-item";
        d.open = i === openIdx;
        d.innerHTML = `<summary><span class="ed-item-title">${esc(f.itemLabel(item))}</span>
          <span class="ed-item-tools">
            <button type="button" data-a="up" title="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-a="down" title="Move down" ${i === arr.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" data-a="del" title="Remove">✕</button>
          </span></summary>`;
        d.appendChild(build(f.fields, item, (k, v) => { $(".ed-item-title", d).textContent = f.itemLabel(item); onChange(f.key, arr); }, ctx));
        $$("[data-a]", d).forEach((b) => (b.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          const a = b.dataset.a;
          if (a === "del") { if (!confirm(`Remove “${f.itemLabel(item)}”?`)) return; arr.splice(i, 1); openIdx = -1; }
          if (a === "up") { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; openIdx = i - 1; }
          if (a === "down") { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; openIdx = i + 1; }
          draw(); onChange(f.key, arr);
        }));
        d.addEventListener("toggle", () => { if (d.open) openIdx = i; });
        el.appendChild(d);
      });
      $(".add", el).onclick = () => { arr.push(f.blank()); openIdx = arr.length - 1; draw(); onChange(f.key, arr); };
    };
    draw();
    return el;
  }

  function imageField(f, obj, set, hint, ctx) {
    const el = document.createElement("div");
    el.className = "ed-field t-image";
    const draw = () => {
      const v = obj[f.key] || "";
      el.innerHTML = `<span class="ed-label">${esc(f.label)}</span>
        <div class="ed-img">
          <div class="ed-thumb">${v ? `<img src="${esc(App.asset(v))}" alt=""/>` : "<span>No image</span>"}</div>
          <div class="ed-img-tools">
            <label class="ed-btn small">Upload…<input type="file" accept="image/*" hidden/></label>
            ${v ? `<button type="button" class="ed-btn small ghost" data-clear>Remove</button>` : ""}
            <input type="text" placeholder="assets/… or https://…" value="${esc(v)}"/>
          </div>
        </div>${hint}`;
      $("input[type=file]", el).onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const path = await addUpload(file, (ctx.prefix || "") + f.prefix);
        if (path) { set(path); draw(); }
      };
      $("input[type=text]", el).onchange = (e) => { set(e.target.value.trim()); draw(); };
      const c = $("[data-clear]", el);
      if (c) c.onclick = () => { set(""); draw(); };
    };
    draw();
    return el;
  }

  /* ---------------- Uploads ---------------- */
  const readAsDataURL = (blob) => new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(blob); });
  async function addUpload(file, prefix) {
    const MAX = 25 * 1024 * 1024;
    let blob = file, type = file.type || "application/octet-stream";
    let ext = (file.name.split(".").pop() || "bin").toLowerCase();
    try {
      if (/^image\/(png|jpeg|webp)$/.test(type)) {
        const bmp = await createImageBitmap(file);
        const maxW = 2000;
        if (bmp.width > maxW || file.size > 1.5 * 1024 * 1024) {
          const s = Math.min(1, maxW / bmp.width);
          const c = document.createElement("canvas");
          c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
          c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
          const keepPng = type === "image/png" && file.size < 3 * 1024 * 1024;
          type = keepPng ? "image/png" : "image/jpeg";
          ext = keepPng ? "png" : "jpg";
          blob = await new Promise((r) => c.toBlob(r, type, 0.88));
        }
      }
    } catch (e) { console.warn("Image resize skipped:", e); }
    if (blob.size > MAX) { toast(`File is ${(blob.size / 1048576).toFixed(1)} MB — max is 25 MB. For long videos, upload to YouTube and paste the link.`, "err"); return null; }
    const base = slug(file.name.replace(/\.[^.]+$/, "")).slice(0, 40) || "file";
    const path = `assets/${prefix ? prefix + "-" : ""}${base}-${Date.now().toString(36)}.${ext}`;
    const url = await readAsDataURL(blob);
    const rec = { path, type, b64: url.split(",")[1] };
    pending[path] = rec;
    App.assets[path] = url;
    try { await idbPut(rec); } catch (e) { toast("Upload kept in memory only — publish before closing this tab.", "err"); }
    toast(`Added ${path} (${(blob.size / 1024).toFixed(0)} KB)`);
    return path;
  }

  /* ---------------- Markdown toolbar ---------------- */
  function mdToolbar() {
    return `<div class="ed-mdbar">
      <button type="button" data-md="b" title="Bold"><b>B</b></button>
      <button type="button" data-md="i" title="Italic"><i>I</i></button>
      <button type="button" data-md="h2" title="Heading">H2</button>
      <button type="button" data-md="h3" title="Sub-heading">H3</button>
      <button type="button" data-md="ul" title="Bullet list">•</button>
      <button type="button" data-md="quote" title="Quote">❝</button>
      <button type="button" data-md="code" title="Code">&lt;/&gt;</button>
      <button type="button" data-md="link" title="Link">🔗</button>
      <span class="ed-sep"></span>
      <label class="ed-mdbtn" title="Upload image or GIF">🖼 Image<input type="file" accept="image/*" multiple hidden data-up="img"/></label>
      <label class="ed-mdbtn" title="Upload a short MP4/WebM clip">🎞 Clip<input type="file" accept="video/mp4,video/webm" hidden data-up="vid"/></label>
      <button type="button" data-md="video" title="Embed Bilibili / YouTube / Vimeo">▶ Video link</button>
    </div>`;
  }
  function wireToolbar(el, ta, ctx) {
    const fire = () => ta.dispatchEvent(new Event("input", { bubbles: true }));
    const wrapSel = (a, b, ph) => {
      const { selectionStart: s, selectionEnd: e, value: v } = ta;
      const sel = v.slice(s, e) || ph;
      ta.setRangeText(a + sel + b, s, e, "end");
      ta.setSelectionRange(s + a.length, s + a.length + sel.length);
      ta.focus(); fire();
    };
    const linePrefix = (p) => {
      const { selectionStart: s, value: v } = ta;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      ta.setRangeText(p, ls, ls, "end"); ta.focus(); fire();
    };
    const insertBlock = (text) => {
      const { selectionStart: s, value: v } = ta;
      const before = s > 0 && v[s - 1] !== "\n" ? "\n\n" : s > 1 && v[s - 2] !== "\n" ? "\n" : "";
      ta.setRangeText(`${before}${text}\n\n`, s, ta.selectionEnd, "end"); ta.focus(); fire();
    };
    $$("[data-md]", el).forEach((b) => (b.onclick = () => {
      const k = b.dataset.md;
      if (k === "b") wrapSel("**", "**", "bold text");
      if (k === "i") wrapSel("_", "_", "italic text");
      if (k === "code") wrapSel("`", "`", "code");
      if (k === "h2") linePrefix("## ");
      if (k === "h3") linePrefix("### ");
      if (k === "ul") linePrefix("- ");
      if (k === "quote") linePrefix("> ");
      if (k === "link") { const u = prompt("Link URL:", "https://"); if (u) wrapSel("[", `](${u})`, "link text"); }
      if (k === "video") { const u = prompt("Paste a Bilibili, YouTube or Vimeo link (Bilibili plays in mainland China; YouTube does not):"); if (u) insertBlock(u.trim()); }
    }));
    $$("[data-up]", el).forEach((inp) => (inp.onchange = async () => {
      for (const file of inp.files) {
        const path = await addUpload(file, ctx.prefix ? ctx.prefix.replace(/-$/, "") : "post");
        if (!path) continue;
        insertBlock(inp.dataset.up === "vid" ? path : `![${file.name.replace(/\.[^.]+$/, "")}](${path})`);
      }
      inp.value = "";
    }));
    ta.addEventListener("paste", async (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
      if (!f) return;
      e.preventDefault();
      const path = await addUpload(f, "paste");
      if (path) insertBlock(`![](${path})`);
    });
  }

  /* ---------------- UI ---------------- */
  let root, body, currentTab = "posts", editingPost = null;
  function ui() {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "editor.css";
    document.head.appendChild(css);
    root = document.createElement("div");
    root.className = "ed-root";
    root.innerHTML = `
      <button class="ed-fab" id="edFab" title="Open editor">✎ Edit site</button>
      <aside class="ed-drawer" id="edDrawer" aria-label="Site editor">
        <div class="ed-grip" id="edGrip" title="Drag to resize · double-click to reset"></div>
        <header class="ed-top">
          <div class="ed-title"><strong>Site editor</strong><span class="ed-status" id="edStatus"></span></div>
          <button class="ed-btn" id="edPublish">Publish</button>
          <button class="ed-icon" id="edFull" title="Full-width editor">⤢</button>
          <button class="ed-icon" id="edClose" title="Hide editor">⟩</button>
        </header>
        <nav class="ed-tabs">${["posts:Posts", "profile:Profile", "resume:Resume", "site:Site", "publish:Publish settings"].map((t) => { const [k, l] = t.split(":"); return `<button data-tab="${k}">${l}</button>`; }).join("")}</nav>
        <div class="ed-body" id="edBody"></div>
      </aside>
      <datalist id="ed-cats"></datalist>
      <div class="ed-toasts" id="edToasts"></div>`;
    document.body.appendChild(root);
    body = $("#edBody");
    $("#edFab").onclick = () => toggle(true);
    $("#edClose").onclick = () => toggle(false);
    $("#edPublish").onclick = publish;
    setupResize();
    $$(".ed-tabs button").forEach((b) => (b.onclick = () => { currentTab = b.dataset.tab; editingPost = null; drawTab(); }));
    addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveDraft(); toast("Draft saved in this browser."); }
    });
    toggle(localStorage.getItem("site-editor-open") !== "0");
    drawTab();
    status();
  }
  function toggle(open) {
    document.body.classList.toggle("ed-open", open);
    localStorage.setItem("site-editor-open", open ? "1" : "0");
    if (open) requestAnimationFrame(() => fitAll());
  }

  /* ---------------- Drawer width: drag to resize, full-width toggle ---------------- */
  const LS_W = "site-editor-width", LS_FULL = "site-editor-full";
  const defaultW = () => Math.round(Math.max(560, innerWidth * 0.5));
  const clampW = (w) => Math.round(Math.min(Math.max(w, 380), Math.max(380, innerWidth - 160)));
  let edW = clampW(+localStorage.getItem(LS_W) || defaultW());
  const applyW = () => document.documentElement.style.setProperty("--ed-w", clampW(edW) + "px");
  function setFull(on) {
    document.body.classList.toggle("ed-full", on);
    localStorage.setItem(LS_FULL, on ? "1" : "0");
    const b = $("#edFull");
    b.textContent = on ? "⤡" : "⤢";
    b.title = on ? "Exit full width" : "Full-width editor";
    requestAnimationFrame(() => fitAll());
  }
  function setupResize() {
    applyW();
    setFull(localStorage.getItem(LS_FULL) === "1");
    $("#edFull").onclick = () => setFull(!document.body.classList.contains("ed-full"));
    const grip = $("#edGrip");
    let fitT;
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      document.body.classList.add("ed-resizing");
      const move = (ev) => {
        edW = clampW(innerWidth - ev.clientX);
        applyW();
        clearTimeout(fitT); fitT = setTimeout(fitAll, 60);
      };
      const up = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", up);
        grip.removeEventListener("pointercancel", up);
        document.body.classList.remove("ed-resizing");
        localStorage.setItem(LS_W, edW);
        fitAll();
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
      grip.addEventListener("pointercancel", up);
    });
    grip.ondblclick = () => { edW = clampW(defaultW()); applyW(); localStorage.setItem(LS_W, edW); fitAll(); };
    addEventListener("resize", () => { applyW(); clearTimeout(fitT); fitT = setTimeout(fitAll, 100); });
  }

  /* ---------------- Auto-growing text areas ---------------- */
  function fit(ta) {
    if (!ta.offsetParent) return; // hidden (collapsed list item / closed drawer)
    const minH = parseFloat(getComputedStyle(ta).minHeight) || 0;
    const body = $("#edBody"), keep = body && body.scrollTop;
    ta.style.height = "auto";
    ta.style.height = Math.max(minH, ta.scrollHeight + 2) + "px";
    if (body) body.scrollTop = keep;
  }
  const fitAll = (root = document) => $$(".ed-drawer textarea", root).forEach(fit);
  document.addEventListener("input", (e) => { if (e.target.matches?.(".ed-drawer textarea")) fit(e.target); });
  document.addEventListener("toggle", (e) => { if (e.target.matches?.(".ed-drawer details") && e.target.open) fitAll(e.target); }, true);
  function drawTab() {
    $$(".ed-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === currentTab));
    body.innerHTML = "";
    body.scrollTop = 0;
    $("#ed-cats").innerHTML = [...new Set(data.posts.map((p) => p.category).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join("");
    if (currentTab === "posts") editingPost ? drawPost(editingPost) : drawPosts();
    if (currentTab === "profile") { body.appendChild(intro("Your name, photo, contact and the About page.")); body.appendChild(build(SCHEMA.profile, data.profile, () => changed())); go("#/about"); }
    if (currentTab === "resume") { body.appendChild(intro("Everything on the Resume page and the printable PDF. Resume content is shown in English in both languages.")); body.appendChild(build(SCHEMA.resume, data.resume, () => changed())); go("#/resume"); }
    if (currentTab === "site") { body.appendChild(intro("Site-wide settings.")); body.appendChild(build(SCHEMA.site, data.site, () => changed())); drawDataTools(); }
    if (currentTab === "publish") drawPublishSettings();
    requestAnimationFrame(() => fitAll());
  }
  const intro = (t) => Object.assign(document.createElement("p"), { className: "ed-intro", textContent: t });
  const go = (h) => { if (location.hash !== h) location.hash = h; };

  function drawPosts() {
    const list = [...data.posts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    body.innerHTML = `
      <div class="ed-row"><p class="ed-intro">Portfolio posts appear on Home, Categories and Archives.</p><button class="ed-btn" id="edNew">＋ New post</button></div>
      <ul class="ed-posts">${list.map((p) => `
        <li><button data-id="${esc(p.id)}">
          ${p.cover ? `<img src="${esc(App.asset(p.cover))}" alt=""/>` : `<span class="ed-ph"></span>`}
          <span><strong>${esc(p.title || "Untitled")}</strong><small>${esc(p.date)} · ${esc(p.category || "—")}${p.pinned ? " · 📌" : ""}</small></span>
        </button></li>`).join("")}</ul>`;
    $("#edNew").onclick = () => {
      const today = new Date().toISOString().slice(0, 10);
      const p = { id: uniqueId("new-post"), title: "Untitled post", date: today, updated: "", category: "Work", cover: "", pinned: false, summary: "", body: "## Overview\n\nWrite about the project here. Use the toolbar to add images, GIFs or videos.\n" };
      data.posts.unshift(p);
      changed({ now: true });
      editingPost = p.id; drawTab();
    };
    $$(".ed-posts button").forEach((b) => (b.onclick = () => { editingPost = b.dataset.id; drawTab(); }));
    go("#/");
  }
  function uniqueId(base, self) {
    let id = slug(base) || "post", n = 1;
    while (data.posts.some((p) => p.id === id && p !== self)) id = `${slug(base)}-${++n}`;
    return id;
  }
  function drawPost(id) {
    const p = data.posts.find((x) => x.id === id);
    if (!p) { editingPost = null; return drawPosts(); }
    const head = document.createElement("div");
    head.className = "ed-row";
    head.innerHTML = `<button class="ed-btn ghost" id="edBack">← All posts</button><button class="ed-btn ghost danger" id="edDel">Delete</button>`;
    body.appendChild(head);
    let autoSlug = p.id === slug(p.title) || p.id.startsWith("new-post");
    const form = build(SCHEMA.post, p, (k) => {
      if (k === "title" && autoSlug) { p.id = uniqueId(p.title, p); $("[data-key=id]", form).value = p.id; }
      if (k === "id") { autoSlug = false; p.id = slug(p.id) || uniqueId("post", p); }
      if (k === "title" || k === "id") { editingPost = p.id; history.replaceState(null, "", "#/post/" + p.id); }
      changed();
    }, { prefix: (p.id || "post").slice(0, 24) + "-" });
    body.appendChild(form);
    $("#edBack").onclick = () => { editingPost = null; drawTab(); };
    $("#edDel").onclick = () => {
      if (!confirm(`Delete “${p.title}”? This can't be undone after publishing.`)) return;
      data.posts.splice(data.posts.indexOf(p), 1);
      editingPost = null; changed({ now: true }); drawTab();
    };
    go("#/post/" + p.id);
  }

  function drawDataTools() {
    const box = document.createElement("section");
    box.className = "ed-box";
    box.innerHTML = `<h4>Backup & reset</h4>
      <p class="ed-hint">Download your content as <code>data.js</code> (a backup, or to upload manually). Images that aren't published yet are only stored in this browser.</p>
      <div class="ed-row wrap">
        <button class="ed-btn ghost" id="edDl">Download data.js</button>
        <button class="ed-btn ghost danger" id="edReset">Discard draft</button>
      </div>`;
    body.appendChild(box);
    $("#edDl").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([serialize()], { type: "text/javascript" }));
      a.download = "data.js"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $("#edReset").onclick = async () => {
      if (!confirm("Throw away all unpublished changes in this browser and reload the published content?")) return;
      localStorage.removeItem(LS_DRAFT);
      await idbClear().catch(() => {});
      location.reload();
    };
  }

  function drawPublishSettings() {
    const c = ghCfg();
    body.innerHTML = `
      <p class="ed-intro">Connect your GitHub repository once. After that, <b>Publish</b> saves your changes straight to your live site — no uploading files by hand.</p>
      <div class="ed-fields">
        <div class="ed-field half"><label><span class="ed-label">GitHub username</span><input id="ghOwner" value="${esc(c.owner)}" placeholder="yourname"/></label></div>
        <div class="ed-field half"><label><span class="ed-label">Repository</span><input id="ghRepo" value="${esc(c.repo)}" placeholder="yourname.github.io"/></label></div>
        <div class="ed-field half"><label><span class="ed-label">Branch</span><input id="ghBranch" value="${esc(c.branch)}"/></label></div>
        <div class="ed-field half"><label><span class="ed-label">Folder in repo</span><input id="ghDir" value="${esc(c.dir)}" placeholder="(root)"/></label></div>
        <div class="ed-field"><label><span class="ed-label">Access token</span><input id="ghToken" type="password" value="${esc(c.token)}" placeholder="github_pat_…" autocomplete="off"/></label>
          <small class="ed-hint">Stored only in this browser — never published. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Create a token ↗</a>: choose <i>Only select repositories</i> → your site repo, then <i>Repository permissions → Contents → Read and write</i>.</small></div>
      </div>
      <div class="ed-row wrap">
        <button class="ed-btn" id="ghSave">Save & test connection</button>
        <button class="ed-btn ghost" id="ghPull">Load content from GitHub</button>
        <button class="ed-btn ghost danger" id="ghForget">Forget token</button>
      </div>
      <p class="ed-hint" id="ghMsg"></p>`;
    const read = () => ({ owner: $("#ghOwner").value.trim(), repo: $("#ghRepo").value.trim(), branch: $("#ghBranch").value.trim() || "main", dir: $("#ghDir").value.trim().replace(/^\/|\/$/g, ""), token: $("#ghToken").value.trim() });
    const msg = (t, ok) => { const m = $("#ghMsg"); m.textContent = t; m.className = "ed-hint " + (ok ? "ok" : "err"); };
    $("#ghSave").onclick = async () => {
      const cfg = read();
      localStorage.setItem(LS_GH, JSON.stringify(cfg));
      msg("Testing…", true);
      try {
        const r = await gh(cfg, "");
        if (!r.permissions?.push) throw new Error("This token can read the repo but can't write to it. Give it Contents: Read and write.");
        await gh(cfg, `/branches/${encodeURIComponent(cfg.branch)}`);
        msg(`Connected to ${r.full_name} (${cfg.branch}). You can publish now.`, true);
      } catch (e) { msg(e.message, false); }
    };
    $("#ghPull").onclick = async () => {
      const cfg = read();
      if (state.dirty && !confirm("Replace your unpublished changes with the content currently on GitHub?")) return;
      try {
        const text = await gh(cfg, `/contents/${pathIn(cfg, "data.js")}?ref=${encodeURIComponent(cfg.branch)}`, { raw: true });
        const next = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        replaceData(next);
        state.dirty = false; saveDraft();
        msg("Loaded the latest content from GitHub.", true);
      } catch (e) { msg("Couldn't load: " + e.message, false); }
    };
    $("#ghForget").onclick = () => { const c2 = read(); c2.token = ""; localStorage.setItem(LS_GH, JSON.stringify(c2)); $("#ghToken").value = ""; msg("Token removed from this browser.", true); };
  }

  /* ---------------- GitHub ---------------- */
  const pathIn = (cfg, p) => (cfg.dir ? cfg.dir + "/" : "") + p;
  async function gh(cfg, path, opt = {}) {
    if (!cfg.owner || !cfg.repo || !cfg.token) throw new Error("Fill in username, repository and token first.");
    const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`, {
      method: opt.method || "GET",
      headers: {
        Accept: opt.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        Authorization: `Bearer ${cfg.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opt.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const hints = { 401: "Token is invalid or expired.", 403: "Token lacks permission for this repo.", 404: "Repository/branch/file not found — check the names (and that the token has access to this repo).", 409: "The repository is empty — upload the site files once first (see README)." };
      throw new Error(`${hints[r.status] || "GitHub error"} (${r.status}${j.message ? ": " + j.message : ""})`);
    }
    return opt.raw ? r.text() : r.json();
  }
  const serialize = () => "window.SITE = " + JSON.stringify(data, null, 2) + ";\n";
  let publishing = false;
  async function publish() {
    if (publishing) return;
    const cfg = ghCfg();
    if (!cfg.token || !cfg.owner || !cfg.repo) { currentTab = "publish"; drawTab(); toast("Connect your GitHub repository first.", "err"); toggle(true); return; }
    publishing = true; status("Publishing…");
    try {
      const json = serialize();
      const uploads = Object.values(pending).filter((a) => json.includes(a.path));
      const ref = await gh(cfg, `/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
      const head = await gh(cfg, `/git/commits/${ref.object.sha}`);
      const tree = [];
      const files = [{ path: "data.js", content: json, encoding: "utf-8" }, ...uploads.map((a) => ({ path: a.path, content: a.b64, encoding: "base64" }))];
      for (let i = 0; i < files.length; i++) {
        status(`Uploading ${i + 1}/${files.length}…`);
        const b = await gh(cfg, "/git/blobs", { method: "POST", body: { content: files[i].content, encoding: files[i].encoding } });
        tree.push({ path: pathIn(cfg, files[i].path), mode: "100644", type: "blob", sha: b.sha });
      }
      const t = await gh(cfg, "/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree } });
      const when = new Date().toLocaleString();
      const c = await gh(cfg, "/git/commits", { method: "POST", body: { message: `Update site content (${when})${uploads.length ? ` + ${uploads.length} file(s)` : ""}`, tree: t.sha, parents: [ref.object.sha] } });
      await gh(cfg, `/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { method: "PATCH", body: { sha: c.sha } });
      Object.keys(pending).forEach((k) => delete pending[k]); // object URLs stay in App.assets for this session
      await idbClear().catch(() => {});
      state.dirty = false; state.publishedAt = new Date().toISOString();
      saveDraft();
      toast("Published! Your live site updates in about a minute.", "ok");
    } catch (e) {
      status();
      toast("Publish failed: " + e.message, "err");
    } finally { publishing = false; status(); }
  }

  /* ---------------- Status / toasts ---------------- */
  function status(busy) {
    const s = $("#edStatus");
    if (!s) return;
    const n = Object.keys(pending).length;
    s.className = "ed-status " + (busy ? "busy" : state.dirty ? "dirty" : "clean");
    s.textContent = busy || (state.dirty ? `Unpublished changes${n ? ` · ${n} new file${n > 1 ? "s" : ""}` : ""}` : state.publishedAt ? "All changes published" : "No changes");
    $("#edPublish").disabled = !!busy;
  }
  function toast(t, kind = "") {
    const box = $("#edToasts");
    if (!box) return alert(t);
    const el = document.createElement("div");
    el.className = "ed-toast " + kind;
    el.textContent = t;
    box.appendChild(el);
    setTimeout(() => el.classList.add("out"), kind === "err" ? 7000 : 3500);
    setTimeout(() => el.remove(), kind === "err" ? 7600 : 4100);
  }
  function replaceData(next) {
    data = next;
    App.data = data;
    App.rerender();
    editingPost = null;
    drawTab();
  }

  /* ---------------- Boot ---------------- */
  (async function boot() {
    let restored = false;
    try {
      const saved = JSON.parse(localStorage.getItem(LS_DRAFT) || "null");
      // Use the local draft if it has unpublished edits, or if it was published in the last
      // 15 minutes (GitHub Pages may still be serving the previous data.js).
      const recent = saved?.publishedAt && Date.now() - Date.parse(saved.publishedAt) < 15 * 60 * 1000;
      if (saved?.data && (saved.dirty || recent)) {
        data = saved.data;
        state = { dirty: !!saved.dirty, savedAt: saved.savedAt, publishedAt: saved.publishedAt || null };
        restored = JSON.stringify(saved.data) !== JSON.stringify(fromFile);
      }
    } catch {}
    try {
      for (const a of (await idbAll()) || []) { pending[a.path] = a; App.assets[a.path] = `data:${a.type};base64,${a.b64}`; }
    } catch {}
    ["site", "profile", "resume"].forEach((k) => (data[k] ||= {}));
    data.posts ||= [];
    App.data = data;
    App.boot();
    ui();
    if (restored && state.dirty) toast("Restored your unpublished draft from " + new Date(state.savedAt).toLocaleString() + ".");
  })();
})();
