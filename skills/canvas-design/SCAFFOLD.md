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
3. Installs current React, Vite, Tailwind CSS, shadcn, and single-file build dependencies.
4. Initializes shadcn for Vite.
5. Installs the shared shell's Button component and copies Dropdown Menu from the skill templates.
6. Writes `.canvas/config.json` with the selected output mode and look (`schemaVersion` `22`).
7. Copies `CanvasShell`, print CSS, and the PDF export from the skill's `runtime/` templates, plus the single-file build utility.

Do not rerun setup when `.canvas/config.json` exists. On every later invocation, silently run `scripts/sync-runtime.mjs` so owned shell/print files stay current. Repair missing runtime files in place rather than deleting the folder. If the file is schema `18` with a valid `outputMode` and no `themeMode`, follow the in-place look upgrade in [SKILL.md](SKILL.md), then sync. Schema `19`, `20`, or `21` with valid mode and look syncs in place to `22`.

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

`CanvasShell` offers **Portrait** (1080 wide) and **Landscape** (1920 wide). At export it expands disclosures and `<details>`, expands every tab panel into a labeled section, hides interactive chrome (tab lists, chevrons, tooltips, selects), sizes one `@page` to the full canvas (chosen width, content height, with inset), remasures Recharts, then calls `window.print()`. There are no slides and no authored page breaks. The user should keep **Save as PDF** and not override the paper size or margins.

Do not author `print:text-*` or enlarge on-screen type for the PDF. The snapshot keeps on-screen type.

Required marks:

- `canvas-print-only` — hidden on screen and visible in the PDF snapshot (chart value tables; full unfiltered filter listings).
- `canvas-print-hidden` — visible on screen and hidden in the PDF snapshot (filters and other view switchers that are not tabs).

Do not use `canvas-print-section`, `canvas-print-flow`, or `canvas-print-keep`. Do not author page breaks. Do not flatten a multi-column screen layout. Those older classes are ignored.

Tabs stay on screen. Keep every `TabsContent` mounted so the export can print all panels as labeled sections. Do not duplicate tab panels as `canvas-print-only` content.

Filter controls that slice data belong on screen. Hide the control with `canvas-print-hidden` only for the PDF snapshot. Render a `canvas-print-only` listing of the full dataset, grouped under headings that use the same category names as the filter. Do not leave the PDF showing only the currently selected slice.

Export paints `@page`, `html`, `body`, and `.canvas-root` with `var(--background)` so the PDF sheet matches the on-screen page. The PDF uses the same light or dark tokens as the on-screen canvas. Do not force `color-scheme: light` while `.dark` is still applied. Never set width or height on `.recharts-wrapper`, `.recharts-responsive-container`, or `.recharts-surface`. Do not dispatch `window.resize` to remasure charts — Recharts v3 uses ResizeObserver, and the export already constrains width before print.

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
- `.canvas/config.json` has `schemaVersion: 22`.
- `.gitignore` contains `.canvas/` exactly once.
- `.canvas/components.json` exists.
- `.canvas/src/components/ui/button.tsx` exists.
- `.canvas/src/components/ui/dropdown-menu.tsx` exists.
- `.canvas/src/print-layout.ts` exists.
- No root `node_modules`, `package.json`, or package-manager lockfile was created by the skill.
- The source imports `CanvasShell` and shadcn components through `@/`.
- The build command succeeds.
- HTML mode has one output HTML file and no sibling asset directory.
