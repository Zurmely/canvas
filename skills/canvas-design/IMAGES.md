# Uncopyrighted images

Use a real photograph, portrait, map, artwork, or specimen only when it helps the reader **identify the subject**. Skip images on data dashboards, tables, and abstract topics. If no suitable public-domain file exists, omit the picture — never decorate with stock, AI images, or a loosely related stand-in.

## When to fetch

Fetch at **authoring time** after the subject is known and before writing the canvas. Do not hotlink. Do not `fetch()` in the canvas. Do not use Unsplash, Pexels, Pixabay, Google Images, or generated pictures.

Read this file only when an image would help.

## Source and license

Use Wikimedia Commons stills that are **public domain, CC0, or PDM**. Those are uncopyrighted. Do not use CC BY, CC BY-SA, GFDL, fair use, or unknown licenses.

If Commons has nothing, a known public-domain host is allowed with an explicit license: NASA, Smithsonian Open Access, Met Open Access, Library of Congress. Still embed the file; still credit it.

## Fetch

Run the skill script (absolute path if the skill is installed elsewhere):

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --query "Marie Curie portrait" --candidates
```

Pick a candidate whose **file title and alt actually depict the subject**. Then write a sibling module next to the canvas:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --file "File:Marie_Curie_c1920.jpg" --write /abs/path/curie-portrait.image.ts --export-name curiePortrait
```

One-shot (first matching still) when the query is specific:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --query "Saturn Voyager" --write /abs/path/saturn.image.ts --export-name saturnVoyager
```

Known public-domain URL:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --from-url "https://..." --license "Public domain" --credit "NASA" --alt "Saturn from Voyager 2" --write /abs/path/saturn.image.ts --export-name saturnVoyager
```

The script prints JSON. Use `written`, `exportName`, `alt`, and `credit`. Do not paste base64 into chat or into the canvas source.

Name modules `*.image.ts` and keep them beside the `.canvas.tsx` file. At most three stills. If the script exits `ok: false`, omit the image.

## Embed

```tsx
import { curiePortrait } from "./curie-portrait.image"

<figure className="min-w-0 space-y-2">
  <img
    src={curiePortrait.src}
    alt={curiePortrait.alt}
    className="max-h-80 w-full rounded-md object-contain bg-muted"
  />
  <figcaption className="text-xs text-muted-foreground">
    {curiePortrait.credit}
  </figcaption>
</figure>
```

- Portraits, art, maps, specimens: `object-contain` and `max-h-80` (or `max-h-96` for a single hero).
- Documentary photos that should fill a frame: `object-cover` with a fixed `max-h-*`.
- Always set `alt` from the module. Always show `credit` in a `figcaption`.
- Do not lazy-load (`loading="lazy"`). Do not wrap with extra chrome, overlays, gradients, or colored borders.
- Do not import from `public/`. Do not use remote `src` URLs.

Query with the specific subject (`"Arctic tern Sterna paradisaea"`, `"Hagia Sophia exterior"`), not a generic theme (`"science"`, `"nature"`). If the top candidate is the wrong person, place, or species, try another file or omit.
