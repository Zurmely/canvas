# Uncopyrighted images

Use a real photograph, portrait, map, artwork, or specimen only when it helps the reader **identify the subject**. Skip images on data dashboards, tables, and abstract topics. If no suitable public-domain file exists, omit the picture — never decorate with stock, AI images, or a loosely related stand-in.

## When to fetch

Fetch at **authoring time** after the subject is known and before writing the canvas. Do not hotlink. Do not `fetch()` in the canvas. Do not use Unsplash, Pexels, Pixabay, Google Images, or generated pictures.

Read this file only when an image would help.

## Source and license

Use Wikimedia Commons stills that are **public domain, CC0, or PDM**. Those are uncopyrighted. Do not use CC BY, CC BY-SA, GFDL, fair use, or unknown licenses.

If Commons has nothing, a known public-domain host is allowed with an explicit license: NASA, Smithsonian Open Access, Met Open Access, Library of Congress. Still embed the file; still credit it.

## Fetch

Write stills into the canvas folder as `*.canvas.jpg` (or `.jpeg` / `.png` / `.webp` / `.gif`). Scaffold and sync gitignore those suffixes.

Run the skill script (absolute path if the skill is installed elsewhere):

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --query "Marie Curie portrait" --candidates
```

Pick a candidate whose **file title and alt actually depict the subject**. Then write the still into the canvas folder:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --file "File:Marie_Curie_c1920.jpg" --write /abs/path/<name>/curie.canvas.jpg
```

One-shot (first matching still) when the query is specific:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --query "Saturn Voyager" --write /abs/path/<name>/saturn.canvas.jpg
```

Known public-domain URL:

```bash
node .cursor/skills/canvas-design/scripts/fetch-commons-image.mjs --from-url "https://..." --license "Public domain" --credit "NASA" --alt "Saturn from Voyager 2" --write /abs/path/<name>/saturn.canvas.jpg
```

The script prints JSON. Use `written`, `importPath`, `alt`, and `credit`. Do not paste image bytes into chat or into the canvas source.

Name files `*.canvas.jpg` (matching the mime) and keep them in the canvas folder next to `<name>.canvas.tsx`. At most three stills. If the script exits `ok: false`, omit the image.

## Embed

```tsx
import curiePortrait from "./curie.canvas.jpg"

<figure className="min-w-0 space-y-2">
  <img
    src={curiePortrait}
    alt="Marie Curie, c. 1920"
    className="max-h-80 w-full rounded-md object-contain bg-muted"
  />
  <figcaption className="text-xs text-muted-foreground">
    Wikimedia Commons · Public domain · Henri Manuel
  </figcaption>
</figure>
```

Copy `alt` and `credit` from the script JSON into the canvas. Import the still with the printed `importPath`.

- Portraits, art, maps, specimens: `object-contain` and `max-h-80` (or `max-h-96` for a single hero).
- Documentary photos that should fill a frame: `object-cover` with a fixed `max-h-*`.
- Always set `alt` from the fetch result. Always show `credit` in a `figcaption`.
- Do not lazy-load (`loading="lazy"`). Do not wrap with extra chrome, overlays, gradients, or colored borders.
- Do not import from `public/`. Do not use remote `src` URLs.

Query with the specific subject (`"Arctic tern Sterna paradisaea"`, `"Hagia Sophia exterior"`), not a generic theme (`"science"`, `"nature"`). If the top candidate is the wrong person, place, or species, try another file or omit.
