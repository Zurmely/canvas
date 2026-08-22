---
name: canvas-design
description: Builds polished React canvases with direct shadcn/ui component imports and optional self-contained HTML export. Invoke only when the user explicitly references canvas-design or /canvas-design.
disable-model-invocation: true
---

# Canvas Design

Create standalone visual artifacts with React, TypeScript, Tailwind CSS, and shadcn/ui. This skill intentionally does not use Cursor's `cursor/canvas` runtime.

## First-use setup

At the start of every invocation, locate the workspace root and check for `.canvas/config.json`. The current scaffold schema is `18`.

### Hard gate

If `.canvas/config.json` does not exist, **stop before any write, shell command, package installation, component discovery, or artifact creation**. The first tool call that can change state MUST be `AskQuestion`. Do not infer a format from the request and do not choose the recommended option on the user's behalf.

Ask exactly one first-use question. Keep the option labels, but do not explain the runtime, source files, or bundling:

- **React + TypeScript (Recommended)** — a live page you can keep working on in this project.
- **Self-contained HTML** — a page you can open in a browser.

Wait for the answer. Only then scaffold the runtime and create the artifact.

Do not ask the user to choose a framework. Use Vite + React + TypeScript: it is the smallest official shadcn template that supports direct component source imports and reliable single-file bundling. Astro adds an unnecessary rendering and hydration layer for these interactive artifacts.

After the answer, read [SCAFFOLD.md](SCAFFOLD.md), scaffold `.canvas/`, store the choice in `.canvas/config.json`, and add `.canvas/` to the workspace `.gitignore`. The ignored folder owns dependencies, shadcn component source, Vite configuration, shared styles, build scripts, and temporary output. Never put a canvas deliverable inside `.canvas/`.

On later invocations, reuse the stored choice only when `schemaVersion` is `18` and `outputMode` is `react` or `html`. If the config is missing, malformed, or has another schema version, ask permission to reset the generated runtime; after reset, ask the first-use format question. Ask again when the user explicitly requests a different output mode.

If setup is broken or the scaffold schema is incompatible, read the reset section in [SCAFFOLD.md](SCAFFOLD.md). Never delete `.canvas/` without explicit user confirmation.

## Direct shadcn usage

shadcn/ui distributes component source through its CLI; it is not a conventional package containing every UI component. “Import shadcn directly” means:

1. Install requested components into `.canvas/src/components/ui/` with the shadcn CLI.
2. Import them in canvas source using `@/components/ui/<component>`.
3. Import shared helpers from `@/lib/utils` and icons from `lucide-react`.
4. Do not recreate a shadcn component by hand if its registry component is available.

Before authoring, inspect `.canvas/components.json` and installed files. Add only needed components:

```bash
npx shadcn@latest add <components...> --yes
```

Run this command with the shell working directory set to `<workspace>/.canvas`. **Never run `npm`, `npx`, `pnpm`, `yarn`, `bun`, Vite, TypeScript, or shadcn from the workspace root. Never create or modify root `node_modules`, `package.json`, or a package-manager lockfile.** Do not rely only on a CLI `--cwd` flag; set the process working directory to `.canvas`.

Use the CLI's current output and APIs as source of truth. Do not guess component props.

## Deliverable placement

Determine the user's anchor:

- A referenced file → place the canvas beside that file.
- A referenced directory → place it directly in that directory.
- No filesystem reference → place it in the workspace root.

Use a descriptive kebab-case name:

- React mode: `<name>.canvas.tsx`
- HTML mode: create `<name>.canvas.tsx`, then bundle `<name>.html` beside it.

Keep the React source in HTML mode; it is the editable source of the self-contained export.

## Workflow

1. Confirm this skill was explicitly invoked.
2. Complete first-use setup if needed. Do not narrate setup, config, or runtime checks to the user.
3. Gather real content and identify the primary user task.
4. Resolve the anchor path and output filenames before writing.
5. Read [SHADCN-MAPPING.md](SHADCN-MAPPING.md). For charts, also read [CHARTS.md](CHARTS.md).
6. Add only the required shadcn components to `.canvas/`.
7. Author a default-exported React component in the target `.canvas.tsx` file.
8. Wrap every artifact in the shared `CanvasShell` from `@/canvas-shell`, passing the exact page title.
9. Build in this order:
   - page heading and concise context;
   - primary artifact or insight;
   - supporting controls, metrics, details, and source note;
   - interactions only when they improve the artifact.
10. Validate by running the runtime's typecheck/build command against the source.
11. In HTML mode, run `.canvas/scripts/build.mjs <source> <output>` and verify the output is one HTML file with no sibling assets.
12. Run the pre-delivery review.
13. Ask the required post-creation question below and perform the selected action.
14. Present the result in the user's chosen format only, using the completion guidance below.

## Composition rules

- Use shadcn components directly for controls and structured UI.
- Prefer semantic HTML for page structure and prose.
- Use one `h1`, descriptive section headings, real table headers, visible form labels, and explicit button text.
- Use `Card` for bounded entities or grouped controls, not every section.
- Use semantic Tailwind tokens such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border`.
- Use the configured shadcn chart component with Recharts; do not hand-roll SVG charts.
- Every chart with hover-only values must include an exact print-only value table using the shared `canvas-print-only` class. PDF readers must not need a tooltip to recover chart values.
- Filter controls, tab lists used as filters, and other view-switching UI have no purpose in a PDF. Mark them `canvas-print-hidden`. The printed artifact must include the full unfiltered dataset, grouped with visible headings that match the filter or tab categories. Never export only the currently selected slice.
- Structure the canvas as sibling print topics, one per h2-level subject (plus one opening unit for the title, metrics, and lead-in). Use `canvas-print-section` when the topic fits on one page and `canvas-print-flow` when it must paginate. Adjacent topics start a new PDF page. Do not give metrics, alerts, or individual cards their own top-level print class.
- Wrap atomic inner pieces — a chart with its caption, a filter category, a keep-together group — in `canvas-print-keep`. Keep the print-only value table outside that wrapper so a tall table can paginate instead of clipping the chart. Headings stay with the following block. Cards, collapsibles, and accordion items stay together automatically.
- A keep-together chart block must fit on one printed page. Cap `ChartContainer` with `max-h-[26rem]` (or an explicit `h-[280px]`–`h-[320px]`). Do not use a tall aspect ratio such as `aspect-[4/5]` without a max height — print `break-inside: avoid` will clip the x-axis and its title at the page edge.
- Never give printable cards, charts, tables, or their parents a fixed pixel width or positive `min-width`. Use `w-full`, `min-w-0`, responsive grids, and wrapping text so the shared print stylesheet can fit them within the page.
- Store interactive state in the canvas component. Do not add persistence unless the user requests it.
- Embed artifact data in the source. No runtime network calls unless the user explicitly requests a live data source.
- Never render placeholders, empty charts, empty tables, fabricated samples, or “No data” sections. Omit empty sections; if the entire artifact would be empty, ask for the missing data.

## Required shell behavior

Every canvas must use `CanvasShell`, which provides:

- A top header containing the canvas title.
- A light/dark toggle in the header. Initial mode and live system changes follow `prefers-color-scheme` until the user toggles explicitly.
- A top-right **Save as PDF** button that expands closed collapsible/accordion sections, constrains the page to print width so charts remasure, caps any chart taller than 150mm and remasures again, then calls `window.print()`.
- Print styles that keep the shell header with the page title only. The theme toggle and Save as PDF action are hidden. The current light or dark theme and readable page output are preserved. Closed disclosure panels are opened for the PDF. Filter and other view-switching controls stay hidden; printed content is the complete dataset grouped by those categories. Page breaks fall between print topics, not through headings or atomic pieces.
- A bottom-right back-to-top floating action button only when:
  - document height exceeds `1.5 ×` the viewport height; and
  - the user has scrolled more than `600px`.

Do not duplicate these controls inside canvas content.

## Visual system

- Use shadcn theme tokens and Tailwind utilities. Avoid arbitrary colors when a semantic token exists.
- Support light and dark system themes through the scaffold's variables.
- Prefer flat surfaces, subtle borders, restrained radius, and clear spacing.
- No gradients, decorative emojis, giant type, rainbow coloring, or ornamental borders.
- Use shadows only when a standard shadcn component uses one for layering.
- Establish hierarchy through layout, spacing, typography, and one deliberate accent.
- Avoid a wall of equal cards. Mix open sections, one dominant artifact, compact summaries, and bounded entities.

## Responsive and accessible behavior

- Start mobile-first and add `sm:`, `md:`, and `lg:` layout changes only when needed.
- Wrap wide tables in an overflow container.
- Every interactive control needs a visible label or accessible name.
- Do not communicate status by color alone; include text.
- Preserve keyboard focus indicators.
- Use precise links and actions rather than “click here.”

## Pre-delivery review

- The most important content is visually dominant.
- The artifact is useful without the surrounding chat.
- Every displayed value comes from provided or inspected data.
- No empty component or placeholder is rendered.
- The composition is not a uniform stack of cards.
- Components are imported from `.canvas` shadcn source, not reimplemented.
- The title, system-aware theme toggle, Save as PDF button, and conditional back-to-top control come from `CanvasShell`.
- Charts and tables are self-describing.
- Every chart's exact values are visible in PDF output.
- Filter UI is hidden in PDF output; the printed view shows every category with labeled separations, not only the active filter.
- PDF page breaks fall between h2-level topics. Headings are not left at the bottom of a page; cards, charts, and disclosure items are not split when they fit.
- The PDF header shows the page title and no header actions.
- PDF pages keep a 12mm top and bottom inset; horizontal spacing stays on the printed sections.
- No card, chart, table, SVG, or text block overflows or is clipped at either page edge. First and last line/area points stay fully visible. Tall charts (many horizontal bars, portrait aspect) still show the full plot, tick labels, and axis titles — they are not cut at the page bottom.
- The source typechecks and builds.
- HTML mode produces one self-contained `.html` file.
- The final response links only the page that matches how the user asked to receive it.

## User-facing language

Every message to the user — progress updates, questions, and the completion — is for them, not a changelog. Let them know you are working. Do not explain setup, config, runtime, files, validation, or format internals. The first-use format labels are the exception; after that choice, do not keep using those terms.

- Say **page**, not HTML, `.html`, self-contained file, or bundle.
- Say **open in browser**, not preview server, Vite, or “open the HTML.”
- Do not mention the canvas runtime, config, HTML mode, React mode, design mapping, React source, `.canvas.tsx`, `.canvas/`, TypeScript, typecheck, dependencies, or schema unless the user asks.

Progress updates stay short and about the page or its content. Check setup and config silently.

- Wrong: “I'll start by checking whether the canvas runtime is already set up, then gather accurate Cursor company history for the page.”
- Right: “I'll gather Cursor's company history, then build the page.”
- Wrong: “Config is already HTML mode, so I’ll pull primary sources and the design mapping next, then build the page.”
- Right: “I’ll pull primary sources next, then build the page.”

## Required post-creation question

After the artifact builds successfully and before the final response, call `AskQuestion`. Do not infer whether the user wants it opened.

Ask the same two options in both modes:

- **Open page in browser (recommended)** — open the page in the system browser.
- **Present it only** — do not open anything; then show the page link.

Wait for the answer and do exactly what the user selects:

- HTML mode, open: use the platform's normal file opener on the generated `.html`.
- React mode, open: first check existing terminal processes so a matching server is not duplicated. Start `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort` with `.canvas` as the shell working directory, verify Vite reached a healthy ready state, then open `http://127.0.0.1:4173/`.
- **Present it only**: perform no external open and start no server.

If opening fails, keep the successfully created artifact and say the page could not be opened. If port `4173` is occupied by an unrelated process, choose an available local port, start the server there, and use that URL in the link.

## Required completion format

Present only the view that matches how the user asked to receive it. Do not also link the other file, and do not add a details, format, or validation section.

If they asked to open it:

```markdown
Opened in your browser: [Page title](absolute-path-or-url)

- [Two or three concise bullets naming the actual sections or interactions]
- Light and dark mode, Save as PDF, and back to top on long pages
```

If they asked to present it only:

```markdown
[Open page](absolute-path-or-url)

- [Two or three concise bullets naming the actual sections or interactions]
- Light and dark mode, Save as PDF, and back to top on long pages
```

Link target:

- HTML mode → the generated page file.
- React mode after opening → the preview URL that was opened.
- React mode, present only → the validated preview under `.canvas/preview/`.

Use an absolute markdown link. Name the page in plain language. Describe what was actually created rather than only saying the task is complete.

## References

- [SCAFFOLD.md](SCAFFOLD.md) — first-use runtime setup and validation
- [SHADCN-MAPPING.md](SHADCN-MAPPING.md) — component selection and composition
- [CHARTS.md](CHARTS.md) — Recharts and shadcn chart guidance
