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

Those choices are stored for the workspace. After that, say `/canvas-design` again to add or revise pages. The skill scaffolds a disposable `.canvas/` runtime (gitignored) and writes the deliverable next to the file or folder you referenced.

## Update

```bash
npx skills add Zurmely/canvas -g -a cursor
```

Re-running the same command overwrites the installed skill with the latest from this repo.

## What it produces

- Semantic layout, shadcn components imported from source, and charts via Recharts
- Either stock shadcn colors or a palette matched to the page subject (chosen once per workspace; no theme picker on the page)
- Light and dark themes that follow the system until you toggle
- Save as PDF in portrait (1080×1920) or landscape (1920×1080), with a layout engine that packs cards and charts onto those pages
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
        ├── runtime/              # CanvasShell, print CSS, and PDF layout engine
        │   ├── dropdown-menu.tsx
        │   ├── canvas-shell.tsx
        │   ├── print-layout.ts
        │   └── print.css
        └── scripts/
            ├── scaffold.mjs      # Creates the gitignored .canvas/ runtime
            ├── sync-runtime.mjs  # Copies owned shell/print files into .canvas/
            └── reset-runtime.mjs # Deletes that runtime so first-use can run again
```

`npx skills add Zurmely/canvas` discovers `skills/canvas-design/` and copies only that folder into `.cursor/skills/canvas-design/` (or `~/.cursor/skills/canvas-design/` with `-g`). It does not copy this README or `.gitignore`.
