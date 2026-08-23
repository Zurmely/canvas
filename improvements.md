# Canvas Design — PDF Export Improvements

Handoff report for incorporating fixes at the skill level. Based on a real export of `mx-master-4.html` in a fresh workspace (Aug 2026).

---

## Summary

Two separate issues affected PDF export:

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Cold-start dependencies** | First PDF export took ~4 minutes (npm install + ~210 MB browser download) | Pre-install Playwright + Chromium during scaffold/sync, not on first export |
| **Multi-page output** | PDF had 2 pages despite content fitting one screen | Stop using `preferCSSPageSize: true` + CSS `@page`; pass explicit `width`/`height` to `page.pdf()` |
| **Playwright import** | First export crashed: `Cannot read properties of undefined (reading 'launch')` | Import `chromium` from `playwrightModule.default.chromium`, not named destructuring |

The single-page fix is already in `scripts/export-pdf.mjs` in this skill folder. The pre-install recommendation is **not** implemented yet — that is the main follow-up for scaffold/sync.

---

## 1. Pre-install PDF dependencies at scaffold time

### Current behavior (slow)

`export-pdf.mjs` lazily installs everything on the **first** PDF request:

1. `npm install --save-dev playwright@1.55.0` (with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`)
2. On launch failure, `npx playwright install chromium` (~130 MB Chromium + ~82 MB headless shell + ~1 MB ffmpeg)
3. Bundle `print-layout.ts` with esbuild (already present via Vite)
4. Run export

Observed timings on first use:

- `npm install playwright`: ~23–46 s
- `playwright install chromium`: ~3–4 min (download-bound)
- Successful export after fix: ~2–5 s

Users who choose **Save as PDF** on their first canvas hit this cold start. The skill text says *"The first PDF export may install a local browser engine under `.canvas/`; do not narrate that"* — pre-installing at scaffold makes that true without a surprise wait later.

### Recommended behavior (fast)

Install PDF tooling during **scaffold** and re-validate during **sync-runtime**, same as other pinned runtime deps.

#### A. Pin Playwright in `runtime/package.json`

Add to `devDependencies`:

```json
"playwright": "1.55.0"
```

Keep the version aligned with `PLAYWRIGHT_SPEC` in `export-pdf.mjs`.

#### B. Run browser install after `npm ci` in `scaffold.mjs`

After the existing `npm ci` / `npm install` step (around line 162), add:

```bash
npx playwright install chromium
```

Run from `<workspace>/.canvas` as cwd. Do **not** set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` here — the browser must download once.

Optional: gate behind an env var (e.g. `CANVAS_SKIP_PDF_BROWSER=1`) for CI or air-gapped environments.

#### C. Mirror in `sync-runtime.mjs`

In `ensureRuntimeDeps()` (or a new `ensurePdfDeps()`), if `playwright` is declared but Chromium is missing, run:

```bash
npx playwright install chromium
```

This repairs workspaces that scaffolded before the change.

#### D. Simplify `export-pdf.mjs`

Once Playwright is a guaranteed runtime dep:

- Keep `ensurePlaywright()` as a safety net, or replace with a hard error if missing.
- Keep `installChromium()` only as fallback when `chromium.launch()` fails.
- Do not narrate install to the user (unchanged).

#### E. Document in `SCAFFOLD.md` / `SKILL.md`

Update verification checklist:

- `.canvas/node_modules/playwright` exists after scaffold
- Chromium browser binaries cached under `.canvas/` or Playwright cache

Bump `schemaVersion` if scaffold steps change materially.

### Dependencies summary

| Package | When to install | Size / notes |
|---------|-----------------|--------------|
| `playwright@1.55.0` | Scaffold (`npm ci`) | npm package only if browser skipped |
| Chromium (Playwright) | Scaffold (`playwright install chromium`) | ~210 MB total download |
| `esbuild` | Already transitive via Vite | Used to bundle `print-layout.ts`; no extra step |

No workspace-root `package.json` changes. Everything stays under `.canvas/`.

---

## 2. Single-page PDF fix

### Problem

Exports used a CSS-driven page size:

```js
// OLD — causes 2 pages in Chromium/Playwright
await page.evaluate(({ widthPx, heightPx }) => {
  const style = document.createElement("style")
  style.textContent = `@page { size: ${widthPx}px ${heightPx}px; margin: 0; }`
  document.head.appendChild(style)
}, metrics)

await page.pdf({
  preferCSSPageSize: true,
  // ...
})
```

**Result:** PDF had `/Count 2` even when:

- Measured content height was **2,886 px**
- Injected `@page` height was **2,895 px** (+2 mm slack from `print-layout.ts`)
- Adding **+128 px** extra height still produced 2 pages

This is **not** a measurement-buffer problem. `preferCSSPageSize: true` with a custom pixel `@page` size triggers incorrect pagination in Chromium’s print path (each page reused the full custom size, so page 2 was mostly blank).

### Diagnosis method

```bash
strings output.pdf | rg '/Count|/MediaBox'
# Before: /Count 2, two MediaBox entries
# After:  /Count 1, one MediaBox entry
```

Controlled tests:

| Strategy | Pages |
|----------|-------|
| `@page` + `preferCSSPageSize: true` | **2** |
| Explicit `width`/`height` + `preferCSSPageSize: false` | **1** |

### Fix (already applied in `scripts/export-pdf.mjs`)

Remove `@page` injection. Pass measured dimensions directly:

```js
const metrics = await page.evaluate(() => globalThis.CanvasPrintLayout.measureCanvasPage())

await page.pdf({
  displayHeaderFooter: false,
  width: `${metrics.widthPx}px`,
  height: `${metrics.heightPx}px`,
  preferCSSPageSize: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  printBackground: true,
  path: outputPdf,
})
```

`measureCanvasPage()` in `print-layout.ts` is unchanged. It still:

1. Expands tabs, disclosures, and overflow regions via `prepareCanvasForPdf()`
2. Measures `.canvas-root` bounding box
3. Adds +2 mm height slack in `pageSizeMm()`

No canvas-author changes required. No new `canvas-print-*` classes.

### Verification

Test artifact: `mx-master-4.html`

```bash
node .canvas/scripts/export-pdf.mjs mx-master-4.html mx-master-4.pdf
```

Expected:

- `/Count 1`
- MediaBox ≈ `960 × 2171 pt` (1280 × 2895 px at 96 dpi)
- Export time ~2–5 s when Chromium is already cached

---

## 3. Playwright ESM import fix

### Problem

```js
const { chromium } = await import(pathToFileURL(playwrightPath).href)
// chromium === undefined → launch() throws
```

Playwright’s entry resolves to CJS interop; `chromium` lives on `default`.

### Fix

```js
const playwrightModule = await import(pathToFileURL(playwrightPath).href)
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium
if (!chromium) {
  throw new Error("Playwright chromium launcher is unavailable")
}
```

Already in `scripts/export-pdf.mjs`. `sync-runtime.mjs` copies this file into `.canvas/scripts/` on every invocation.

---

## 4. Files to update (checklist for implementing agent)

- [x] `scripts/export-pdf.mjs` — single-page fix + Playwright import (done)
- [ ] `runtime/package.json` — add `playwright@1.55.0` to `devDependencies`
- [ ] `runtime/package-lock.json` — regenerate after package.json change
- [ ] `scripts/scaffold.mjs` — run `npx playwright install chromium` after `npm ci`
- [ ] `scripts/sync-runtime.mjs` — ensure Playwright dep + optional Chromium install check
- [ ] `SCAFFOLD.md` — document PDF deps in setup and verification sections
- [ ] `SKILL.md` — optional: note that PDF browser is installed at scaffold (agent stays silent)
- [ ] Bump `schemaVersion` if scaffold contract changes

**Do not change** `print-layout.ts` for the single-page fix. The measurement pipeline is correct; only the Playwright `page.pdf()` call was wrong.

---

## 5. What not to do

- **Do not** increase `pageSizeMm` slack as the primary fix — tested up to +128 px; still 2 pages with `preferCSSPageSize: true`.
- **Do not** add `canvas-print-section` / page-break classes — skill forbids authored page breaks; export should remain one custom-sized page.
- **Do not** install Playwright at the workspace root — only under `.canvas/`.
- **Do not** use `preferCSSPageSize: true` for this runtime unless Chromium behavior changes and is re-verified.

---

## 6. Background context

Canvas PDF export is a **share snapshot** of the live page (one tall/wide vector page), not a print-designed document. The CLI:

1. Loads built HTML in headless Chromium
2. Runs `prepareCanvasForPdf()` (expand tabs, show `canvas-print-only`, hide `canvas-print-hidden`)
3. Measures `.canvas-root`
4. Writes PDF with Playwright

Screen layout is authored first; PDF marks (`canvas-print-only`, `canvas-print-hidden`) are secondary. This fix ensures step 4 produces exactly one page matching the measured canvas.
