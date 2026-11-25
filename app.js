(function () {
  "use strict";
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^(https?:|mailto:|tel:|#|\/|[\w.-]+\/)/i.test(u) ? u : "#");

  /* ---------- Simple bindings ---------- */
  document.title = `${S.name} — ${S.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = S[el.dataset.bind] ?? ""));
  $("#year").textContent = new Date().getFullYear();
  $("#availText").textContent = S.available ? "Open to new opportunities" : "Currently not looking";
  if (!S.available) $("#availDot").classList.add("off");

  /* ---------- Hero ---------- */
  $("#stats").innerHTML = S.stats
    .map((s) => `<li><b data-count="${+s.value}" data-suffix="${esc(s.suffix)}">0</b><span>${esc(s.label)}</span></li>`)
    .join("");
  const words = [...new Set([...S.skills.flatMap((g) => g.items.map((i) => i[0])), ...S.projects.map((p) => p.category)])];
  const run = words.map((w) => `<span>${esc(w)}</span>`).join("");
  $("#marquee").innerHTML = run + run; // duplicated for seamless loop

  /* ---------- About ---------- */
  $("#bio").innerHTML = S.bio.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#facts").innerHTML = S.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

  /* ---------- Résumé: interactive timeline ---------- */
  const chips = (arr) => `<div class="chips">${arr.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
  function timeline(list, el) {
    el.innerHTML = list
      .map(
        (e, i) => `
      <li class="tl-item${i === 0 ? " open" : ""}">
        <div class="tl-date"><b>${esc(e.end)}</b>${esc(e.start)}</div>
        <div class="tl-card">
          <button class="tl-head" aria-expanded="${i === 0}">
            <h3>${esc(e.role)}</h3>
            <span class="tl-org"><b>${esc(e.org)}</b> · ${esc(e.place)}</span>
            <span class="tl-toggle" aria-hidden="true">+</span>
          </button>
          <div class="tl-body"><div><div class="tl-inner">
            <p>${esc(e.summary)}</p>
            <ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
            ${chips(e.tags || [])}
          </div></div></div>
        </div>
      </li>`
      )
      .join("");
  }
  timeline(S.experience, $("#tl-experience"));
  timeline(S.education, $("#tl-education"));
  $$(".timeline").forEach((tl) =>
    tl.addEventListener("click", (ev) => {
      const head = ev.target.closest(".tl-head");
      if (!head) return;
      const item = head.closest(".tl-item");
      const open = item.classList.toggle("open");
      head.setAttribute("aria-expanded", open);
    })
  );

  $("#skills").innerHTML =
    S.skills
      .map(
        (g) => `
    <div class="skill-group"><h3>${esc(g.group)}</h3>
      ${g.items
        .map(
          ([n, v]) => `<div class="skill"><div class="skill-top"><span>${esc(n)}</span><span>${+v}%</span></div>
          <div class="bar"><i style="--w:${+v}%"></i></div></div>`
        )
        .join("")}
    </div>`
      )
      .join("") +
    (S.certifications?.length ? `<div class="certs"><strong>Recognition</strong>${chips(S.certifications)}</div>` : "");

  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("is-active", x === t));
      $$(".tab-panel").forEach((p) => (p.hidden = p.id !== `panel-${t.dataset.tab}`));
      if (t.dataset.tab === "skills") requestAnimationFrame(() => $("#skills").classList.add("animate"));
    })
  );

  /* ---------- Résumé: paper / printable ---------- */
  const pEntry = (e) => `
    <div class="p-entry">
      <div class="p-entry-top"><strong>${esc(e.role)}</strong><span>${esc(e.start)} – ${esc(e.end)}</span></div>
      <em>${esc(e.org)}, ${esc(e.place)}</em>
      <ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    </div>`;
  $("#paper").innerHTML = `
    <header>
      <div><h1>${esc(S.name)}</h1><div class="p-role">${esc(S.role)}</div></div>
      <div class="p-contact">
        ${esc(S.location)}<br/>
        <a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br/>
        ${esc(S.phone)}<br/>${esc(S.website)}
      </div>
    </header>
    <p class="p-summary">${esc(S.tagline)}</p>
    <h2>Experience</h2>${S.experience.map(pEntry).join("")}
    <h2>Education</h2>${S.education.map(pEntry).join("")}
    <h2>Skills</h2>
    <dl class="p-skills">${S.skills.map((g) => `<dt>${esc(g.group)}</dt><dd>${g.items.map((i) => esc(i[0])).join(" · ")}</dd>`).join("")}</dl>
    ${S.certifications?.length ? `<h2>Recognition</h2><div>${S.certifications.map(esc).join(" · ")}</div>` : ""}
    <h2>Selected projects</h2>
    <dl class="p-skills">${S.projects.slice(0, 4).map((p) => `<dt>${esc(p.title)}</dt><dd>${esc(p.blurb)}</dd>`).join("")}</dl>`;

  const thumb = $(".seg-thumb");
  function moveThumb() {
    const a = $(".seg-btn.is-active");
    thumb.style.width = a.offsetWidth + "px";
    thumb.style.transform = `translateX(${a.offsetLeft - 4}px)`;
  }
  $$(".seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".seg-btn").forEach((x) => {
        x.classList.toggle("is-active", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      $("#view-timeline").hidden = b.dataset.view !== "timeline";
      $("#view-paper").hidden = b.dataset.view !== "paper";
      moveThumb();
    })
  );
  addEventListener("resize", moveThumb);
  document.fonts?.ready.then(moveThumb);
  moveThumb();

  $("#printBtn").addEventListener("click", () => (S.resumePdf ? open(S.resumePdf, "_blank") : print()));

  /* ---------- Portfolio ---------- */
  const coverHTML = (p) =>
    `<div class="cover" style="--c1:${esc(p.cover[0])};--c2:${esc(p.cover[1])};${p.image ? `background-image:url('${esc(p.image)}')` : ""}">
      <span class="cover-year">${esc(p.year)}</span>
      ${p.image ? "" : `<span class="cover-glyph">${esc(p.title.replace(/[^A-Za-z]/g, "").slice(0, 2))}</span>`}
    </div>`;
  $("#grid").innerHTML = S.projects
    .map(
      (p, i) => `
    <button class="card" data-i="${i}" data-cat="${esc(p.category)}" aria-label="Open ${esc(p.title)}">
      ${coverHTML(p)}
      <div class="card-body">
        <span class="card-cat">${esc(p.category)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.blurb)}</p>
        <span class="card-more">View project <i>→</i></span>
      </div>
    </button>`
    )
    .join("");

  const cats = ["All", ...new Set(S.projects.map((p) => p.category))];
  const count = (c) => (c === "All" ? S.projects.length : S.projects.filter((p) => p.category === c).length);
  $("#filters").innerHTML = cats
    .map((c, i) => `<button class="filter${i ? "" : " is-active"}" data-cat="${esc(c)}">${esc(c)}<sup>${count(c)}</sup></button>`)
    .join("");
  let visible = S.projects.map((_, i) => i);

  // Bento layout: first row has 2 large cards, then rows of 3; never leave a lone card.
  function layoutCards() {
    const cards = $$(".card:not(.is-hidden)");
    const n = cards.length, rows = [];
    if (n <= 3) rows.push(n);
    else {
      rows.push(2);
      let left = n - 2;
      while (left > 0) { rows.push(Math.min(3, left)); left -= 3; }
      if (rows[rows.length - 1] === 1) { rows[rows.length - 2] = 2; rows[rows.length - 1] = 2; }
    }
    let k = 0;
    rows.forEach((len) => {
      for (let j = 0; j < len; j++) cards[k++].style.setProperty("--span", len === 1 ? 3 : 6 / len);
    });
  }
  layoutCards();
  $("#filters").addEventListener("click", (ev) => {
    const f = ev.target.closest(".filter");
    if (!f) return;
    $$(".filter").forEach((x) => x.classList.toggle("is-active", x === f));
    visible = [];
    $$(".card").forEach((c) => {
      const show = f.dataset.cat === "All" || c.dataset.cat === f.dataset.cat;
      c.classList.toggle("is-hidden", !show);
      c.classList.remove("enter");
      if (show) {
        void c.offsetWidth; // restart animation
        c.classList.add("enter");
        visible.push(+c.dataset.i);
      }
    });
    layoutCards();
  });

  const modal = $("#modal");
  let current = 0;
  function openProject(i) {
    current = i;
    const p = S.projects[i];
    $("#modalCover").innerHTML = coverHTML(p);
    $("#modalCover .cover").style.aspectRatio = "21 / 8";
    $("#modalMeta").textContent = `${p.category} · ${p.year}`;
    $("#modalTitle").textContent = p.title;
    $("#modalDetails").textContent = p.details;
    $("#modalRole").textContent = p.role;
    $("#modalStack").innerHTML = chips(p.stack);
    $("#modalLinks").innerHTML = p.links
      .map((l) => `<a class="btn btn-solid" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`)
      .join("");
    if (!modal.open) modal.showModal();
  }
  $("#grid").addEventListener("click", (ev) => {
    const c = ev.target.closest(".card");
    if (c) openProject(+c.dataset.i);
  });
  const step = (d) => {
    const pos = visible.indexOf(current);
    openProject(visible[(pos + d + visible.length) % visible.length]);
  };
  $("#prevProj").addEventListener("click", () => step(-1));
  $("#nextProj").addEventListener("click", () => step(1));
  $("#modalClose").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (ev) => ev.target === modal && modal.close()); // backdrop
  modal.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") step(1);
    if (ev.key === "ArrowLeft") step(-1);
  });

  /* ---------- Contact ---------- */
  $("#socials").innerHTML = S.socials
    .map((s) => `<li><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`)
    .join("");
  $("#copyEmail").addEventListener("click", async () => {
    const chip = $("#copyChip");
    try {
      await navigator.clipboard.writeText(S.email);
      chip.textContent = "Copied!";
    } catch {
      location.href = `mailto:${S.email}`;
    }
    chip.classList.add("show");
    setTimeout(() => {
      chip.classList.remove("show");
      chip.textContent = "Copy";
    }, 1600);
  });

  /* ---------- Theme ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  });

  /* ---------- Scroll effects ---------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });

  const links = $$(".nav-links a");
  const spy = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.hash === "#" + e.target.id));
      }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => spy.observe(s));

  let counted = false;
  const reveal = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        reveal.unobserve(e.target);
        if (!counted && e.target.classList.contains("hero-card")) {
          counted = true;
          countUp();
        }
      }),
    { threshold: 0.15 }
  );
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (el.closest(".hero") ? i * 80 : 0) + "ms";
    reveal.observe(el);
  });

  function countUp() {
    $$("[data-count]").forEach((el) => {
      const end = +el.dataset.count, t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + (k === 1 ? el.dataset.suffix : "");
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
})();
