# shadcn/ui canvas composition

Use actual shadcn/ui component source installed under `.canvas/src/components/ui/`.

## Discovery before coding

1. Inspect `.canvas/components.json`.
2. Inspect `.canvas/src/components/ui/` for installed components.
3. Add missing components with the current CLI:

```bash
npx shadcn@latest add button card --yes
```

Run the command with `<workspace>/.canvas` as the shell working directory.

Read generated source or current shadcn documentation for exact APIs. Components are owned source and can change across presets and base libraries.

## Typical component choices

- Actions → `Button`, `ButtonGroup`, `DropdownMenu`
- Compact state → `Badge`
- Bounded content → `Card`
- Important feedback → `Alert`
- Data → `Table` or a purpose-built data table
- Forms → `Field`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Select`
- Navigation within one artifact → `Tabs`
- Secondary disclosure → `Collapsible` or `Accordion`. After installing `collapsible`, set `keepMounted` on `CollapsibleContent` so closed panels remain in the DOM for PDF export.
- Modal task → `Dialog` or `Sheet`
- Progress → `Progress`
- Charts → `ChartContainer` plus Recharts primitives
- Long content region → semantic HTML; do not force it into `ScrollArea`
- Empty state → omit it in generated canvases rather than rendering placeholder UI

Install only what the artifact needs. `CanvasShell` already requires `Button`.

## Import pattern

```tsx
import { CanvasShell } from "@/canvas-shell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
```

Use `@/` imports even though the deliverable sits elsewhere. The `.canvas` Vite configuration resolves that alias to `.canvas/src`.

## Composition principles

### Keep the page open

Use semantic HTML and Tailwind for the page grid, prose, and hierarchy. Use shadcn components where a component adds interaction, semantics, or a bounded visual unit. Do not wrap every section in `Card`.

### Semantic variants

- Use the default `Button` for the primary action and `secondary`, `outline`, or `ghost` for lower emphasis.
- Use destructive styling only for destructive actions or critical failures.
- Use `Badge` for compact labels, not as decoration.
- Use theme variables for chart colors and custom visuals.

### Forms

Prefer the installed `Field` composition when available. Every input needs a label, related fields need a group, and validation needs text—not color alone. Keep submit actions visually separate from fields.

### Cards

Use cards for named entities, grouped controls, or independently scannable units. Keep introductions, primary analysis, and straightforward sections borderless. Do not nest cards.

### Tables and dense data

Use concise headers, right-align numeric values, format units consistently, and keep wide tables horizontally scrollable. Add sorting or filtering only when the data volume benefits. If the canvas filters or tabs a dataset, hide those controls in print and show every category in a grouped `canvas-print-only` listing, with each category in `canvas-print-keep`.

### Icons

Use `lucide-react`, which the shadcn setup installs. Icon-only controls require an accessible label and usually a tooltip. Do not use emojis as control icons.

## Theme and styling

- Prefer `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, and other semantic classes.
- Avoid arbitrary hex values when a semantic variable applies.
- Use chart variables for categorical data.
- Keep custom CSS in the canvas source only when Tailwind utilities cannot express the requirement.
- Print-specific shared behavior belongs in `.canvas/src/index.css`, not individual artifacts.
