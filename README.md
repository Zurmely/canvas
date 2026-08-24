# Canvas Design

A Cursor skill for building standalone visual pages with React, TypeScript, Tailwind CSS, and [shadcn/ui](https://ui.shadcn.com). Invoke it with `/canvas-design`.

It does **not** use Cursor’s built-in canvas runtime. Pages are real files in your project: a live React source you can keep editing, or a single HTML file you can open in a browser.

## Install

```bash
npx skills add Zurmely/canvas -g -a cursor
```

That installs the skill for every Cursor workspace (`~/.cursor/skills/canvas-design/`).

Project-only (this repo, committed with the team):

```bash
npx skills add Zurmely/canvas -a cursor
```

Other agents that speak the [Agent Skills](https://agentskills.io) standard:

```bash
npx skills add Zurmely/canvas
```

## Use

In Cursor Agent chat:

```text
/canvas-design
```

Then describe the page. On first use in a workspace, the skill asks:

- **React + TypeScript** — a live page you can keep working on in this project
- **Self-contained HTML** — a page you can open in a browser

and:

- **Default shadcn** — keep the standard shadcn colors
- **Match the topic** — color the page to fit the subject

Those choices are stored for the workspace. After that, say `/canvas-design` again to add or revise pages. The skill scaffolds a disposable `.canvas/` runtime (gitignored) and writes a named folder next to the file or folder you referenced, containing the page source plus any HTML, PDF, or stills.

## Update

```bash
npx skills add Zurmely/canvas -g -a cursor
```

Re-running the same command overwrites the installed skill with the latest from this repo.

## What it produces

- Semantic layout, shadcn components imported from source, and charts via Recharts
- Optional public-domain stills from Wikimedia Commons (and similar uncopyrighted hosts), saved as gitignored `*.canvas.jpg` files in the canvas folder and inlined into HTML/PDF exports
- Either stock shadcn colors or a palette matched to the page subject (chosen once per workspace; no theme picker on the page)
- Light and dark themes that follow the system until you toggle
- Optional Export as PDF of the whole page as one vector file (selectable text and SVG charts), written from the terminal after the page is built. After creation you can open the page, present it, or export a PDF in light or dark. Interactions are flattened so accordions, tabs, and similar controls read as static sections, and scrollable regions expand so nothing is clipped.
- Optional one-file HTML export with no sibling assets

## Layout

```text
.
├── README.md             # Install and usage for humans; not part of the skill
├── .gitignore            # Repository ignore rules; not part of the skill
└── skills/
    └── canvas-design/
        ├── SKILL.md              # Agent instructions
        ├── SCAFFOLD.md           # First-use runtime setup
        ├── SHADCN-MAPPING.md     # Component selection
        ├── CHARTS.md             # Chart guidance
        ├── IMAGES.md             # Public-domain stills from Wikimedia Commons
        ├── runtime/              # CanvasShell, print CSS, print layout, Vite config, pinned package.json
        │   ├── dropdown-menu.tsx
        │   ├── canvas-shell.tsx
        │   ├── print-layout.ts
        │   ├── print.css
        │   ├── vite-env.d.ts
        │   ├── vite.config.ts
        │   ├── package.json
        │   └── package-lock.json
        └── scripts/
            ├── scaffold.mjs              # Creates the gitignored .canvas/ runtime
            ├── sync-runtime.mjs          # Copies owned shell/print/Vite/build files into .canvas/
            ├── build.mjs                 # Copied into .canvas/ to typecheck and bundle a canvas
            ├── export-pdf.mjs            # Copied into .canvas/ to convert a built page to PDF
            ├── fetch-commons-image.mjs   # Author-time public-domain stills from Wikimedia Commons
            └── reset-runtime.mjs         # Deletes that runtime so first-use can run again
```

`npx skills add Zurmely/canvas` discovers `skills/canvas-design/` and copies only that folder into `.cursor/skills/canvas-design/` (or `~/.cursor/skills/canvas-design/` with `-g`). It does not copy this README or `.gitignore`.
