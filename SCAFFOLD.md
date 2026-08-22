# First-use scaffold

The shared runtime lives at `<workspace>/.canvas/` and is always gitignored. It uses Vite + React + TypeScript because this is the lightest official shadcn setup that also bundles reliably to one HTML file.

## Setup

After asking for the output mode, run:

```bash
node .cursor/skills/canvas-design/scripts/scaffold.mjs <workspace-root> <react|html>
```

If the project skill is resolved from another location, use the absolute path to its script.

Run only the scaffold script from the workspace root. The script sets `.canvas/` as the process working directory for every package-manager and shadcn subprocess. All later `npm`, `npx`, Vite, TypeScript, and shadcn commands must also use `<workspace>/.canvas` as their shell working directory. Never install dependencies at the workspace root.

The script:

1. Adds `.canvas/` to the workspace `.gitignore`.
2. Creates a minimal Vite React TypeScript project under `.canvas/`.
3. Installs current React, Vite, Tailwind CSS, shadcn, and single-file build dependencies.
4. Initializes shadcn for Vite.
5. Installs the shared shell's Button component.
6. Writes `.canvas/config.json` with the selected output mode.
7. Creates the system-aware light/dark `CanvasShell`, print utilities, and the single-file build utility.

Do not rerun setup when `.canvas/config.json` exists. Repair missing runtime files in place rather than deleting the folder.

## Reset a broken setup

The runtime is disposable. If setup code changes or `.canvas/` becomes inconsistent, ask for confirmation and run:

```bash
node .cursor/skills/canvas-design/scripts/reset-runtime.mjs <workspace-root> --yes
```

This deletes only the generated `<workspace>/.canvas/` runtime. It does not delete canvas deliverables or remove `.canvas/` from `.gitignore`. The next invocation asks for the output mode and scaffolds from zero.

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

## Print layout

The shared print stylesheet uses a 12mm top and bottom `@page` margin so content is not flush with page edges after a break. Left and right spacing stays on the printed sections:

- `canvas-print-section` — one h2-level topic that should stay on a single page. Adjacent topics start a new PDF page.
- `canvas-print-flow` — one h2-level topic that may paginate (long tables, timelines, source lists). Adjacent topics start a new PDF page.
- `canvas-print-keep` — an atomic piece inside a topic that should not split (chart plus caption, filter category, compact group).
- `canvas-print-only` — hidden on screen and visible in print.
- `canvas-print-hidden` — visible on screen and hidden in print.

Author the canvas as sibling print topics: one opening unit (title, metrics, lead-in) and one unit per h2. Do not mark metrics, alerts, or cards as their own top-level print topics — that is what makes PDF breaks look random. Nested charts in a screen grid belong in one `canvas-print-flow` wrapper, with `canvas-print-keep` on each chart block. Do not apply `canvas-print-section` to content taller than one page; use `canvas-print-flow`. Do not wrap a chart in `canvas-print-keep` unless heading, plot, caption, and axis titles fit on one page — cap `ChartContainer` at `max-h-[26rem]` (or ≤150mm) so print keep-together cannot clip the axis.

Filters, tab bars used as filters, and other view switchers belong on screen only. Hide the control with `canvas-print-hidden`. Render a `canvas-print-only` listing of the full dataset, grouped under headings that use the same category names as the filter, each group wrapped in `canvas-print-keep`. Do not leave the PDF showing only the currently selected slice.

At print time the shared stylesheet constrains content to page width, removes horizontal clipping, collapses grids to one column, and wraps flex layouts and long text. Print paints `@page`, `html`, `body`, and `.canvas-root` with `var(--background)` so the PDF sheet matches the on-screen page. Print uses the same light or dark tokens as the on-screen canvas. Do not force `color-scheme: light` while `.dark` is still applied. Never target `.recharts-wrapper` or other Recharts internals in print CSS. `CanvasShell` keeps the header title in the PDF, hides header actions, expands closed collapsible and accordion panels, shrinks the layout to print width so Recharts can remasure, then caps any `[data-slot="chart"]` taller than 150mm and remasures again. Do not dispatch `window.resize` for that — ResponsiveContainer listens to ResizeObserver only. Headings stay with the following block. Cards, collapsibles, and accordion items keep together.

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

- `.canvas/config.json` records `react` or `html`.
- `.canvas/config.json` has `schemaVersion: 18`.
- `.gitignore` contains `.canvas/` exactly once.
- `.canvas/components.json` exists.
- `.canvas/src/components/ui/button.tsx` exists.
- No root `node_modules`, `package.json`, or package-manager lockfile was created by the skill.
- The source imports `CanvasShell` and shadcn components through `@/`.
- The build command succeeds.
- HTML mode has one output HTML file and no sibling asset directory.
