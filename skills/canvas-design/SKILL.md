---
name: canvas-design
description: Builds polished React canvases with direct shadcn/ui component imports and optional self-contained HTML export. Invoke only when the user explicitly references canvas-design or /canvas-design.
disable-model-invocation: true
---

# Canvas Design

Create standalone visual artifacts with React, TypeScript, Tailwind CSS, and shadcn/ui. This skill intentionally does not use Cursor's `cursor/canvas` runtime.

## Screen first

**The priority is screen.** The canvas is a live page in a browser. Layout, density, interaction, and visual hierarchy are for that screen. Do not design a print document, a paper report, or a sequence of PDF pages and then squeeze it onto a display.

**The print fallback isn't really a print, just a PDF export for easier sharing.** `Save as PDF` exists so the user can send a snapshot as a 1080×1920 (portrait) or 1920×1080 (landscape) PDF. A layout engine in `CanvasShell` reflows cards, charts, and sections to fill those pages. Mark only what the engine cannot infer — screen-only controls and print-only data. Do not design a sequence of PDF pages.

**PDF type and chrome are runtime-owned.** The live page uses dashboard type (`text-sm`, `text-xs`) and keeps interactions. At export the shell raises root type to a slide-deck scale (24px body, 18px floor), hides interactive chrome, then packs the enlarged layout. Do not author giant type, `print:text-*` utilities, or slide-sized headings to compensate.

Do not:

- Stack the page as one paper-width column because a PDF exists
- Size charts, type, or sections to A4 / letter / a slide instead of the viewport
- Hide filters, tabs, or hover tooltips from the screen because they do not exist in the PDF
- Treat `canvas-print-only` tables as the primary reading experience
- Author page-break classes or flatten a multi-column screen layout for the PDF
- Author `print:` font utilities or enlarge on-screen type so the PDF will “read as a slide”

## First-use setup

At the start of every invocation, locate the workspace root and check for `.canvas/config.json`. The current scaffold schema is `21`.

### Hard gate

If `.canvas/config.json` does not exist, **stop before any write, shell command, package installation, component discovery, or artifact creation**. The first tool call that can change state MUST be `AskQuestion`. Do not infer a format or look from the request and do not choose the recommended options on the user's behalf.

Ask exactly two first-use questions in one `AskQuestion` call. Keep the option labels, but do not explain the runtime, source files, bundling, CSS variables, or config:

1. Format
   - **React + TypeScript (Recommended)** — a live page you can keep working on in this project.
   - **Self-contained HTML** — a page you can open in a browser.
2. Look
   - **Default shadcn** — keep the standard shadcn colors.
   - **Match the topic (Recommended)** — color the page to fit the subject.

Wait for both answers. Map the labels to config values:

- React + TypeScript → `outputMode: "react"`
- Self-contained HTML → `outputMode: "html"`
- Default shadcn → `themeMode: "neutral"`
- Match the topic → `themeMode: "content"`

Only then scaffold the runtime and create the artifact.

Do not ask the user to choose a framework. Use Vite + React + TypeScript: it is the smallest official shadcn template that supports direct component source imports and reliable single-file bundling. Astro adds an unnecessary rendering and hydration layer for these interactive artifacts.

After the answers, read [SCAFFOLD.md](SCAFFOLD.md), scaffold `.canvas/` with both choices, store them in `.canvas/config.json`, and add `.canvas/` to the workspace `.gitignore`. The ignored folder owns dependencies, shadcn component source, Vite configuration, shared styles, build scripts, and temporary output. Never put a canvas deliverable inside `.canvas/`.

On later invocations, reuse the stored choices when `schemaVersion` is `19`, `20`, or `21`, `outputMode` is `react` or `html`, and `themeMode` is `neutral` or `content`. After config is valid, silently run:

```bash
node .cursor/skills/canvas-design/scripts/sync-runtime.mjs <workspace-root>
```

Use the absolute path to the skill's script if it is resolved from another location. That copy updates `CanvasShell`, print CSS, and the PDF layout engine, adds `dropdown-menu` if missing, and bumps `schemaVersion` to `21`. Do not narrate the sync.

If the config has `schemaVersion` `18` and a valid `outputMode` but no valid `themeMode`, do not reset. Ask only the look question, then update `.canvas/config.json` in place: set `themeMode` to `neutral` or `content` and keep the existing `outputMode`. Then run the sync script so the schema becomes `21`. If schema `18` already has a valid `themeMode`, only run the sync.

If the config is missing, malformed, or has a schema version other than `18`, `19`, `20`, or `21`, ask permission to reset the generated runtime; after reset, ask both first-use questions. Ask the format question again when the user explicitly requests a different output mode. Ask the look question again when the user explicitly requests a different look, then update `themeMode` in `.canvas/config.json`.

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
7. Author a default-exported React component in the target `.canvas.tsx` file. Follow `themeMode` from `.canvas/config.json`. If it is `content`, override shadcn CSS variables on `:root` and `.dark` to match the subject, inject that stylesheet, and style only with semantic tokens. If it is `neutral`, do not override those variables or inject a subject palette. Do not include theming sections in the final canvas ever; theming is only useful for styling.
8. Wrap every artifact in the shared `CanvasShell` from `@/canvas-shell`, passing the exact page title.
9. Build the **screen** page in this order:
   - page heading and concise context;
   - primary artifact or insight;
   - supporting controls, metrics, details, and source note;
   - on-screen interactions that help the reader (filters, tabs, hover, disclosure) — do not skip them because the PDF export hides them;
   - then mark only screen-only controls and print-only data (below). Do not author page breaks.
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
- Follow `themeMode`. Do not include theming sections in the final canvas ever; theming is only useful for styling.
- Use the configured shadcn chart component with Recharts; do not hand-roll SVG charts.
- Design the on-screen page first: responsive grids, filters, tabs, hover tooltips, scrolling, and compact dashboard type. After that structure exists, mark only what the PDF layout engine cannot infer. Do not reverse this order. Do not enlarge type or add `print:text-*` so the PDF will read as a slide — the runtime owns that.
- Every chart with hover-only values must keep the tooltip on screen and include an exact `canvas-print-only` value table so the PDF snapshot can show numbers without hover.
- Filter controls, tab lists used as filters, and other view-switching UI belong on screen. Mark them `canvas-print-hidden` so they drop out of the PDF. The exported snapshot must include the full unfiltered dataset, grouped with visible headings that match the filter or tab categories. Never export only the currently selected slice.
- Do not mark page breaks. Do not use `canvas-print-section` or `canvas-print-flow`. The shell packs topics onto 1080×1920 or 1920×1080 pages, keeps related cards in a grid, and sizes charts to the remaining slot.
- Optional: wrap a heading with its chart (and source caption) in `canvas-print-keep` so they stay together. Leave the print-only value table outside that wrapper so a tall table can paginate. Do not wrap a block that is taller than a slide.
- Size charts for the screen. Cap `ChartContainer` with `max-h-[26rem]` (or an explicit `h-[280px]`–`h-[320px]`) as a screen sanity limit. The PDF engine caps plot height to the page slot; do not shrink plots to look like printed figures.
- Never give cards, charts, tables, or their parents a fixed pixel width or positive `min-width`. Use `w-full`, `min-w-0`, responsive grids, and wrapping text so the screen layout can reflow and the PDF engine can fit the page.
- Store interactive state in the canvas component. Do not add persistence unless the user requests it.
- Embed artifact data in the source. No runtime network calls unless the user explicitly requests a live data source.
- Never render placeholders, empty charts, empty tables, fabricated samples, or “No data” sections. Omit empty sections; if the entire artifact would be empty, ask for the missing data.

## Required shell behavior

Every canvas must use `CanvasShell`, which provides:

- A top header containing the canvas title.
- A light/dark toggle in the header. Initial mode and live system changes follow `prefers-color-scheme` until the user toggles explicitly.
- A top-right **Save as PDF** dropdown with **Portrait 1080×1920** and **Landscape 1920×1080**. That share snapshot expands closed collapsible/accordion sections, raises type to a 24px body with an 18px floor, hides interactive chrome, locks the page size with inset on every slide, packs cards and charts into the slide, keeps section titles with the following block, remasures plots, then calls `window.print()`.
- PDF export styles that keep the shell header with the page title only. The theme toggle and Save as PDF action are hidden. The current light or dark theme is preserved. Closed disclosure panels are opened. Tab lists, chevrons, tooltips, and other view-switching controls stay hidden; the snapshot is the complete dataset grouped by those categories. Type is presentation-sized so the PDF reads without zoom. The layout engine chooses page breaks so related cards share a page and leftover empty slides are avoided.
- A bottom-right back-to-top floating action button only when:
  - document height exceeds `1.5 ×` the viewport height; and
  - the user has scrolled more than `600px`.

Do not duplicate these controls inside canvas content.

## Visual system

Follow `themeMode` from `.canvas/config.json`. Do not mix the two looks.

### `content`

Override the shadcn CSS variables on `:root` and `.dark` so primary, accent, background, chart, and related tokens match the subject. Inject that stylesheet in the canvas and style only with semantic tokens. Keep light and dark variants.

### `neutral`

Do not override shadcn CSS variables. Do not inject a subject palette or a custom `:root` / `.dark` stylesheet. Use the scaffold's default tokens as installed. Style only with semantic tokens. Keep the scaffold's light and dark variants.

Do not include theming sections in the final canvas ever. Theming is only useful for styling. Never render a theme picker, palette swatches, token samples, "Theme" headings, or any UI whose purpose is to show or switch themes.

- Use shadcn theme tokens and Tailwind utilities. Avoid arbitrary colors when a semantic token exists.
- Support light and dark system themes through the scaffold's variables.
- Prefer flat surfaces, subtle borders, restrained radius, and clear spacing.
- No gradients, decorative emojis, giant type on screen, rainbow coloring, or ornamental borders. PDF slide type is applied by the runtime at export.
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

- The page is designed for the screen. PDF export classes do not flatten it into a paper report.
- The most important content is visually dominant.
- The artifact is useful without the surrounding chat.
- `content`: the page palette matches the requested subject. `neutral`: the page uses default shadcn tokens with no subject palette override.
- No theming section, picker, swatch, or token sample is rendered.
- Every displayed value comes from provided or inspected data.
- No empty component or placeholder is rendered.
- The composition is not a uniform stack of cards.
- Components are imported from `.canvas` shadcn source, not reimplemented.
- The title, system-aware theme toggle, Save as PDF (portrait or landscape) control, and conditional back-to-top control come from `CanvasShell`.
- Charts and tables are self-describing.
- Every chart's exact values are visible in the PDF snapshot.
- Filter UI stays on screen and is hidden in the PDF snapshot; the snapshot shows every category with labeled separations, not only the active filter.
- No `canvas-print-section`, `canvas-print-flow`, or other page-break classes. Only `canvas-print-hidden` / `canvas-print-only` (and optional `canvas-print-keep` on a heading+chart) are used.
- No `print:text-*` or slide-sized type in the canvas source. On-screen type stays compact.
- The PDF snapshot is readable at 1080×1920 / 1920×1080 fit-to-window without zoom. Body copy is presentation-sized; no leftover tab lists, chevrons, or tooltips.
- The PDF header shows the page title and no header actions.
- No card, chart, table, SVG, or text block overflows or is clipped at either page edge. First and last line/area points stay fully visible. Section titles are not stranded on a page break or flush against the slide edge.
- The source typechecks and builds.
- HTML mode produces one self-contained `.html` file.
- The final response links only the page that matches how the user asked to receive it.

## User-facing language

Every message to the user — progress updates, questions, and the completion — is for them, not a changelog. Let them know you are working. Do not explain setup, config, runtime, files, validation, or format internals. The first-use format and look labels are the exception; after those choices, do not keep using those terms.

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
- Light and dark mode, Save as PDF (portrait or landscape), and back to top on long pages
```

If they asked to present it only:

```markdown
[Open page](absolute-path-or-url)

- [Two or three concise bullets naming the actual sections or interactions]
- Light and dark mode, Save as PDF (portrait or landscape), and back to top on long pages
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
