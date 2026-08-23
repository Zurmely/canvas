# Charts

Use shadcn/ui's `chart` component with Recharts v3.

Install it on demand:

```bash
npx shadcn@latest add chart --yes
```

Run the command with `<workspace>/.canvas` as the shell working directory.

Inspect `.canvas/src/components/ui/chart.tsx` and the current [shadcn chart documentation](https://ui.shadcn.com/docs/components/chart) before coding.

## Choose the chart

- Line or area chart → change across ordered categories or time.
- Bar chart → comparison across categories.
- Horizontal bar chart → long labels or rankings.
- Stacked bar chart → additive composition where totals matter.
- 100% stacked chart → percentage composition where shares matter.
- Pie or donut chart → a small part-to-whole breakdown.
- Table → exact values, many dimensions, or data that is not clearer as a plot.

Avoid pie charts with many slices, line charts for unordered categories, and charts that merely decorate one number.

## Required implementation

1. Define data separately from `chartConfig`.
2. Type the config with `satisfies ChartConfig`.
3. Wrap Recharts primitives in `ChartContainer`.
4. Give `ChartContainer` an explicit height, minimum height, or aspect ratio so `ResponsiveContainer` can measure it. Size the plot for the **screen**. If the chart uses Recharts `Label` or a category `YAxis`, add height so extra `margin` does not crush the plot. Cap that height as a screen sanity limit: `max-h-[26rem]` or an explicit `h-[280px]`–`h-[320px]`. The PDF export keeps that on-screen height. Do not shrink charts to look like printed figures.
5. Use `accessibilityLayer` on supported Recharts chart components.
6. Use `ChartTooltip` with `ChartTooltipContent`.
7. Use `ChartLegend` with `ChartLegendContent` for multiple series.
8. Reference configured colors as `var(--color-KEY)`.
9. Keep hover tooltips on screen. Add a `canvas-print-only` exact-value table immediately after the chart so the PDF snapshot can show numbers without hover.
10. Keep `ChartContainer` and every ancestor `w-full min-w-0`; never use a fixed pixel width.
11. Do not write print CSS against `.recharts-wrapper`, `.recharts-responsive-container`, or `.recharts-surface`. Recharts measures from a 0×0 overflow box; width/height overrides hide the SVG. Do not dispatch `window.resize` to remasure charts — Recharts v3 uses ResizeObserver, and the PDF snapshot uses the on-screen plot size. `react-is` is already a runtime dependency; do not add it when installing chart.
12. Reserve Recharts `margin` for every axis title and category tick so labels are not clipped. Follow **Axis titles and clipping** below.
13. Line and area series: `isAnimationActive={false}` and `dot={{ r: 3, clipDot: false }}`. Recharts clips dots to the plot by default, which hides the first and last points. Disable animation so the PDF export captures the finished series after the export resize.
14. Give line/area category `XAxis` `padding={{ left: 16, right: 16 }}`. When a point sits at the series max (typical for a growth line), add Y-axis domain headroom so the last marker is not clipped at the top-right corner.

Recharts v3 rules:

- Use `var(--chart-1)`, not `hsl(var(--chart-1))`.
- Use tooltip `defaultIndex` only for initial state.
- Keep persistent active shapes in component state.
- Do not repeat `layout` on a `Bar` when the parent `BarChart` defines it.

## Axis titles and clipping

Recharts clips anything that leaves the SVG. Axis titles, tick labels, and legends that sit on the chart must be laid out *inside* that surface. `position="insideBottom"` with a small or negative `offset` (for example `offset={-4}`) will cut the title in half unless the parent chart also has a large enough `bottom` margin.

Do not fix this with `overflow: visible` on `.recharts-wrapper` or `.recharts-surface`. That fights print CSS and ResponsiveContainer measurement.

Required pattern when using Recharts `Label`:

```tsx
<ChartContainer config={chartConfig} className="h-[280px] w-full min-w-0">
  <BarChart
    data={data}
    layout="vertical"
    accessibilityLayer
    margin={{ top: 8, right: 16, bottom: 28, left: 8 }}
  >
    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8}>
      <Label
        value="Value (units)"
        position="insideBottom"
        offset={-16}
        className="fill-muted-foreground"
      />
    </XAxis>
    <YAxis
      type="category"
      dataKey="cohort"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      width={168}
      interval={0}
    />
  </BarChart>
</ChartContainer>
```

For a many-category horizontal bar chart that needs a taller frame on screen, still cap height as a screen sanity limit:

```tsx
<ChartContainer
  config={chartConfig}
  className="aspect-[4/5] max-h-[26rem] w-full min-w-0 sm:aspect-[16/11] sm:max-h-[28rem]"
>
```

```tsx
<ChartContainer
  config={chartConfig}
  className="aspect-[4/5] max-h-[26rem] w-full min-w-0 sm:aspect-[16/11] sm:max-h-[28rem]"
>
```

Rules:

- Set explicit `margin` on `BarChart` / `LineChart` / `AreaChart`. Include `bottom: 28` for an X-axis title. Include extra `left` (and a wider `YAxis`, about `width={64}`) for a rotated Y-axis title: `<Label angle={-90} position="insideLeft" offset={10} />`.
- X-axis titles use `position="insideBottom"` with `offset={-16}`, not `-4`. Match that offset with the `bottom` margin so the full string stays on-canvas.
- Category `YAxis` (horizontal bars): set `width` to fit the longest label on **one line**, plus `interval={0}` and `tickMargin={8}`. Do not pick a width that wraps or clips ticks.
- After adding margin, increase `ChartContainer` height (or aspect) so the plot itself does not become a cramped strip — but keep the result at or under `max-h-[26rem]` on screen. The PDF keeps that height.
- If a title still will not fit, put the units in surrounding HTML instead of forcing a clipped SVG `Label`.

## Tall charts and the PDF export

The PDF is one page as tall as the canvas. Charts keep their on-screen height. Do not author page breaks or a fixed print height.

Required:

- Cap `ChartContainer` height on screen as above. Prefer `h-[280px]` for typical plots.
- Leave the `canvas-print-only` value table as a sibling of the chart.
- Do not rely on print CSS `max-height` on `.recharts-*` internals. The PDF snapshot keeps the on-screen plot size.

## Required context

Every chart section needs:

- A specific title naming the metric.
- Axis labels and units. Use Recharts `Label` with matching chart `margin`, visible surrounding text, or both. Never leave a `Label` with default or tiny `margin` — the SVG will clip it.
- Exact series names and a legend for multiple series.
- Source and time range in a small caption.
- Transformation details such as mean, p95, normalized share, or smoothing.

## Data and API rules

- Use `dataKey` consistently between data, `chartConfig`, series, tooltip, and legend.
- Format units consistently in axes, tooltips, and labels.
- Truncate a value-axis baseline only when it reveals meaningful variation; disclose it in nearby text.
- Use `ReferenceLine` for thresholds, SLOs, targets, or averages.
- Use semantic destructive/success colors only when the data has that meaning.
- Use value labels only when sparse enough to remain legible.
- Do not create an empty chart or fabricate filler values.
- Keep multi-column screen grids. Do not flatten them for the PDF; the export captures the on-screen layout at the chosen width.

## PDF values

Hover tooltips stay on screen. They do not exist in the PDF export snapshot, so every chart whose exact values are otherwise available only through hover must also include a compact table inside a wrapper with `className="canvas-print-only"`. That table is a share fallback, not the primary reading experience.

```tsx
<div className="canvas-print-only mt-4">
  <p className="mb-2 text-sm font-medium">Chart values</p>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Month</TableHead>
        <TableHead className="text-right">Desktop</TableHead>
        <TableHead className="text-right">Mobile</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {chartData.map((row) => (
        <TableRow key={row.month}>
          <TableCell>{row.month}</TableCell>
          <TableCell className="text-right">{row.desktop.toLocaleString()}</TableCell>
          <TableCell className="text-right">{row.mobile.toLocaleString()}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

Rules:

- Use the same source array as the chart; never duplicate numeric data manually.
- Include units in headers or formatted values.
- Include every plotted series and category.
- Use `canvas-print-only` on the value-table wrapper so it is hidden on screen and visible in the PDF snapshot. Keep `text-sm` in the source; the PDF keeps on-screen type.
- For a sparse chart, `LabelList` may also show values directly on the plot, but it does not replace the PDF value table when labels could overlap or be clipped.

## Accessibility and interpretation

- Pair the visual with a concise written takeaway when the conclusion is not obvious.
- Do not rely on hue alone; use series names, labels, and nearby text.
- Prefer a table when users need exact lookup or when color/shape cannot communicate the distinctions reliably.
- Keep category labels short but unambiguous.
