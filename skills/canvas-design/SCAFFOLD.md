# First-use scaffold

The shared runtime lives at `<workspace>/.canvas/` and is always gitignored. It uses Vite + React + TypeScript because this is the lightest official shadcn setup that also bundles reliably to one HTML file.

## Setup

After asking for the output mode and look, run:

```bash
node .cursor/skills/canvas-design/scripts/scaffold.mjs <workspace-root> <react|html> <neutral|content>
```

If the project skill is resolved from another location, use the absolute path to its script.

Run only the scaffold script from the workspace root. The script sets `.canvas/` as the process working directory for every package-manager and shadcn subprocess. All later `npm`, `npx`, Vite, TypeScript, and shadcn commands must also use `<workspace>/.canvas` as their shell working directory. Never install dependencies at the workspace root.

The script:

1. Adds `.canvas/` to the workspace `.gitignore`.
2. Creates a minimal Vite React TypeScript project under `.canvas/`.
3. Copies the skill's pinned `package.json` (and lockfile when present) and runs one `npm install --legacy-peer-deps` (or `npm ci` when the lockfile is present). Pins include Vite 6, `@vitejs/plugin-react` 4, TypeScript 5.7, and `react-is`.
4. Initializes shadcn with `npx shadcn init --defaults --template vite --base base --yes`.
5. Installs the shared shell's Button component and copies Dropdown Menu from the skill templates.
6. Writes the owned Vite config (external canvas resolver) and copies `scripts/build.mjs` and `scripts/export-pdf.mjs`.
7. Writes `.canvas/config.json` with the selected output mode and look (`schemaVersion` `27`).
8. Copies `CanvasShell`, print CSS, and print layout from the skill's `runtime/` templates.

Do not rerun setup when `.canvas/config.json` exists. On every later invocation, silently run `scripts/sync-runtime.mjs` so owned shell, print, Vite, build, and PDF export files stay current. Repair missing runtime files in place rather than deleting the folder. If the file is schema `18` with a valid `outputMode` and no `themeMode`, follow the in-place look upgrade in [SKILL.md](SKILL.md), then sync. Schema `19`, `20`, `21`, `22`, `23`, `24`, `25`, or `26` with valid mode and look syncs in place to `27`.

## Reset a broken setup

The runtime is disposable. If setup code changes or `.canvas/` becomes inconsistent, ask for confirmation and run:

```bash
node .cursor/skills/canvas-design/scripts/reset-runtime.mjs <workspace-root> --yes
```

This deletes only the generated `<workspace>/.canvas/` runtime. It does not delete canvas deliverables or remove `.canvas/` from `.gitignore`. The next invocation asks for the output mode and look, then scaffolds from zero.

## Authoring outside the runtime

Canvas source belongs beside the user's referenced file or directory, not under `.canvas/`. Source imports resolve through the runtime:

```tsx
import { CanvasShell } from "@/canvas-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

Default-export the artifact:

```tsx
export default function UsageReviewCanvas() {
  return (
    <CanvasShell title="Usage review">
      {/* real content */}
    </CanvasShell>
  )
}
```

## Validate or export

For React mode, build to a temporary single-file preview to validate imports and types:

```bash
node .canvas/scripts/build.mjs path/to/name.canvas.tsx .canvas/preview/name.html
```

The preview remains ignored. The `.canvas.tsx` source is the deliverable.

If the user chooses to open the React canvas after creation, start the shared preview server from `<workspace>/.canvas`:

```bash
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Check for an existing matching server first. Keep the server running only because the user explicitly selected the preview option.

For HTML mode, build beside the source:

```bash
node .canvas/scripts/build.mjs path/to/name.canvas.tsx path/to/name.html
```

The build script writes one HTML file with JavaScript and CSS inlined. Do not use assets from `public/`; they are not guaranteed to be inlined. Embed small images as data URLs when a truly self-contained artifact requires them.

## PDF export (not print design)

The priority is screen. **Save as PDF** is a share snapshot of the live page, not a brief to design slides. Author the on-screen layout first — grids, filters, hover, scrolling. Then mark only what the export cannot infer. Do not reverse that order.

The live `CanvasShell` has no Save as PDF button. After the page builds, if the user chooses **Save as PDF**, run the CLI export against the already-built self-contained HTML. Do not open a browser for the user and do not start a preview server for this option.

```bash
node .canvas/scripts/export-pdf.mjs path/to/name.html path/to/name.pdf
```

HTML mode uses the sibling `.html`. React mode uses the validated preview under `.canvas/preview/`. Write the PDF beside the canvas source. The script prepares the page with the same print layout as before: expands disclosures and `<details>`, expands every tab panel into a labeled section, expands scrollable regions so clipped tables and lists are fully visible, and hides interactive chrome (tab lists, chevrons, tooltips, selects). It then writes one custom-sized vector page. Overflow still expands; padding is kept. Text is selectable; charts stay vector. The first export in a workspace may install a local browser engine under `.canvas/`. `@media print` remains for File → Print only. There are no slides, no orientation picker, and no authored page breaks.

Do not author `print:text-*` or enlarge on-screen type for the PDF. The export keeps on-screen type. Do not add print markup for overflow; expanding scroll containers is runtime-owned. Code blocks wrap instead of stretching the page.

Required marks:

- `canvas-print-only` — hidden on screen and visible in the PDF snapshot (chart value tables; full unfiltered filter listings).
- `canvas-print-hidden` — visible on screen and hidden in the PDF snapshot (filters and other view switchers that are not tabs).

Do not use `canvas-print-section`, `canvas-print-flow`, or `canvas-print-keep`. Do not author page breaks. Do not flatten a multi-column screen layout. Those older classes are ignored.

Tabs stay on screen. Keep every `TabsContent` mounted so the export can print all panels as labeled sections. Do not duplicate tab panels as `canvas-print-only` content.

Filter controls that slice data belong on screen. Hide the control with `canvas-print-hidden` only for the PDF snapshot. Render a `canvas-print-only` listing of the full dataset, grouped under headings that use the same category names as the filter. Do not leave the PDF showing only the currently selected slice.

Export captures `.canvas-root` after expanding overflow (no 1080/1920 reflow). The PDF uses the same light or dark tokens as the on-screen canvas. Never set width or height on `.recharts-wrapper`, `.recharts-responsive-container`, or `.recharts-surface`. Do not dispatch `window.resize` to remasure charts — Recharts v3 uses ResizeObserver, and the snapshot uses the on-screen plot size. Do not expand Recharts overflow; plot clipping stays as authored.

## Add shadcn components

Install only the components needed by the current artifact:

```bash
npx shadcn@latest add card table badge --yes
```

Run from `<workspace>/.canvas`.

For charts:

```bash
npx shadcn@latest add chart --yes
```

Run from `<workspace>/.canvas`.

## Verification

- `.canvas/config.json` records `outputMode` as `react` or `html`.
- `.canvas/config.json` records `themeMode` as `neutral` or `content`.
- `.canvas/config.json` has `schemaVersion: 27`.
- `.gitignore` contains `.canvas/` exactly once.
- `.canvas/components.json` exists.
- `.canvas/src/components/ui/button.tsx` exists.
- `.canvas/src/components/ui/dropdown-menu.tsx` exists.
- `.canvas/src/print-layout.ts` exists.
- `.canvas/scripts/export-pdf.mjs` exists.
- No root `node_modules`, `package.json`, or package-manager lockfile was created by the skill.
- The source imports `CanvasShell` and shadcn components through `@/`.
- The build command succeeds.
- HTML mode has one output HTML file and no sibling asset directory.
