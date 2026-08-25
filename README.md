# Canvas Design

[English](README.md) · [Português (Brasil)](README.pt-BR.md) · [Website](https://canvas.zurmely.com)

A Cursor skill for building standalone visual pages with React, TypeScript, Tailwind CSS, and [shadcn/ui](https://ui.shadcn.com). Invoke it with `/canvas-design`.

It does **not** use Cursor’s built-in canvas runtime. Pages are real files in your project: a live React source you can keep editing, or a single HTML file you can open in a browser.

The page is designed for the **screen**. PDF is an optional share snapshot of that page — not a print layout, paper report, or slide deck.

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

- **React + TypeScript (Recommended)** — a live page you can keep working on in this project
- **Self-contained HTML** — a page you can open in a browser

and:

- **Default shadcn** — keep the standard shadcn colors
- **Match the topic (Recommended)** — color the page to fit the subject

Those choices are stored for the workspace. After that, say `/canvas-design` again to add or revise pages. The skill scaffolds a disposable `.canvas/` runtime (gitignored) and writes a **named folder** next to the file or folder you referenced:

```text
marie-curie/
  marie-curie.canvas.tsx   # editable React source
  marie-curie.html         # HTML mode only
  marie-curie.pdf          # if you export a PDF
  curie.canvas.jpg         # optional still; gitignored
```

## After creation

The skill asks what to do with the finished page:

- **Open in browser** — the HTML file, or a local React preview
- **Present** — leave the files in the project without opening anything
- **Export as PDF** — one vector page of the full canvas (selectable text and SVG charts)

If you export a PDF, it then asks for **light** or **dark**, either once or as the default for later exports in that workspace. Accordions open, tabs become labeled sections, filters drop out in favor of the full dataset, and scrollable regions expand so nothing is clipped. The live page has no Save as PDF button; export runs from the terminal after the page is built.

## Update

```bash
npx skills add Zurmely/canvas -g -a cursor
```

Re-running the same command overwrites the installed skill with the latest from this repo.

## What it produces

- Semantic layout, shadcn components imported from source, and charts via Recharts
- Optional public-domain stills from Wikimedia Commons (and similar uncopyrighted hosts), saved as gitignored `*.canvas.jpg` files in the canvas folder and inlined into HTML/PDF exports. Stills are used only when they help identify the subject — not as decoration.
- Either stock shadcn colors or a palette matched to the page subject (chosen once per workspace; no theme picker on the page)
- Light and dark themes that follow the system until you toggle
- Optional one-page vector PDF of the whole screen layout (light or dark), written beside the source
- Optional one-file HTML export with no sibling assets

## Layout

```text
.
├── README.md             # Install and usage (English)
├── README.pt-BR.md       # Same guide in Brazilian Portuguese
├── .gitignore            # Repository ignore rules; not part of the skill
├── docs/                 # Public site at canvas.zurmely.com; not part of the skill
│   ├── CNAME
│   ├── index.canvas.tsx  # Editable React source
│   └── index.html        # Built page served by GitHub Pages
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

`npx skills add Zurmely/canvas` discovers `skills/canvas-design/` and copies only that folder into `.cursor/skills/canvas-design/` (or `~/.cursor/skills/canvas-design/` with `-g`). It does not copy this README, `README.pt-BR.md`, `.gitignore`, or `docs/`.
