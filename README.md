# Personal Website — Résumé & Portfolio

A static, dependency-free personal site: hero intro, about, an **interactive résumé**
(expandable timeline, animated skill meters, and a printable "paper" document view that
exports to PDF), and a **filterable portfolio** with project detail modals. Light/dark theme included.

```
index.html   page structure
styles.css   all styling (incl. print stylesheet for the résumé)
app.js       rendering + interactions
data.js      ← YOUR CONTENT. Edit only this file.
.nojekyll    tells GitHub Pages to serve files as-is
```

## 1. Make it yours

Open `data.js` and replace the placeholder name, bio, jobs, skills and projects.

- **Photo:** put `assets/me.jpg` in the folder, then add to `styles.css`:
  `.avatar { background-image: url(assets/me.jpg); color: transparent; }`
- **Project images:** set `image: "assets/project.jpg"` on a project (otherwise a gradient cover is drawn from `cover`).
- **PDF résumé:** set `resumePdf: "assets/resume.pdf"`, or leave it empty and the
  "Download PDF" button prints the Document view (choose *Save as PDF*).

Preview locally by opening `index.html` in a browser, or run `python -m http.server` in this folder.

## 2. Publish for free (free domain included)

### Option A — GitHub Pages → `https://<username>.github.io`
1. Create a GitHub account; create a **public** repo named exactly `<username>.github.io`.
2. Upload the contents of this folder to the repo root (web "Add file → Upload files" works).
3. Repo **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main` / `root` → Save.
4. Visit `https://<username>.github.io` after ~1 minute.

### Option B — Cloudflare Pages → `https://<name>.pages.dev`
dash.cloudflare.com → Workers & Pages → Create → Pages → *Upload assets* → drag this folder.

### Option C — Netlify → `https://<name>.netlify.app`
app.netlify.com/drop → drag this folder in. Rename the site under *Site configuration*.

All three give free HTTPS. If you later buy a custom domain, each host has a "Custom domain" setting.
