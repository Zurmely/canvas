#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join, resolve } from "node:path"

const [rootArg, modeArg] = process.argv.slice(2)

if (!rootArg || !["react", "html"].includes(modeArg)) {
  console.error("Usage: scaffold.mjs <workspace-root> <react|html>")
  process.exit(1)
}

const workspaceRoot = resolve(rootArg)
const runtimeRoot = join(workspaceRoot, ".canvas")
const configPath = join(runtimeRoot, "config.json")

if (existsSync(configPath)) {
  console.log(`Canvas runtime already initialized at ${runtimeRoot}`)
  process.exit(0)
}

function write(relativePath, content) {
  const destination = join(runtimeRoot, relativePath)
  mkdirSync(resolve(destination, ".."), { recursive: true })
  writeFileSync(destination, content)
}

function run(command, args, cwd = workspaceRoot) {
  console.log(`Running ${command} ${args.join(" ")}`)
  execFileSync(command, args, { cwd, stdio: "inherit" })
}

mkdirSync(runtimeRoot, { recursive: true })

const gitignorePath = join(workspaceRoot, ".gitignore")
const ignored = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : ""
if (!ignored.split(/\r?\n/).includes(".canvas/")) {
  appendFileSync(gitignorePath, `${ignored.length && !ignored.endsWith("\n") ? "\n" : ""}.canvas/\n`)
}

write(
  "package.json",
  JSON.stringify(
    {
      name: "canvas-design-runtime",
      private: true,
      type: "module",
      scripts: {
        build: "vite build",
        dev: "vite",
      },
    },
    null,
    2,
  ) + "\n",
)

write(
  "index.html",
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>Canvas</title>
    <script>
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", dark)
      document.documentElement.style.colorScheme = dark ? "dark" : "light"
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/generated-entry.tsx"></script>
  </body>
</html>
`,
)

write(
  "tsconfig.json",
  JSON.stringify(
    {
      files: [],
      references: [{ path: "./tsconfig.app.json" }],
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
    },
    null,
    2,
  ) + "\n",
)

write(
  "tsconfig.app.json",
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src"],
    },
    null,
    2,
  ) + "\n",
)

write(
  "vite.config.ts",
  `import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
`,
)

write("src/index.css", '@import "tailwindcss";\n')
write(
  "src/generated-entry.tsx",
  `import React from "react"
import ReactDOM from "react-dom/client"
import "@/index.css"

function EmptyRuntime() {
  return <main className="p-8">Select a canvas source to build.</main>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EmptyRuntime />
  </React.StrictMode>,
)
`,
)

run("npm", ["install", "react", "react-dom", "shadcn"], runtimeRoot)
run(
  "npm",
  [
    "install",
    "--save-dev",
    "vite",
    "typescript",
    "@types/node",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "tailwindcss",
    "@tailwindcss/vite",
    "vite-plugin-singlefile",
  ],
  runtimeRoot,
)

run("npx", ["shadcn", "init", "--template", "vite", "--yes"], runtimeRoot)
run("npx", ["shadcn", "add", "button", "--yes"], runtimeRoot)

write(
  "vite.config.ts",
  `import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
`,
)

write(
  "src/canvas-shell.tsx",
  `import { useEffect, useState, type ReactNode } from "react"
import { ArrowUp, Moon, Printer, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

type CanvasShellProps = {
  title: string
  children: ReactNode
}

async function expandDisclosuresForPrint() {
  const clicked: HTMLElement[] = []

  for (let pass = 0; pass < 12; pass += 1) {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="collapsible-trigger"], [data-slot="accordion-trigger"]'
      )
    ).filter((trigger) => {
      const root =
        trigger.closest("[data-slot='collapsible']") ??
        trigger.closest("[data-slot='accordion-item']")
      return root?.hasAttribute("data-closed") ?? false
    })

    if (triggers.length === 0) {
      break
    }

    for (const trigger of triggers) {
      trigger.click()
      clicked.push(trigger)
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  }

  return clicked
}

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function applyPrintContentWidth() {
  const root = document.querySelector(".canvas-root")
  const main = root?.querySelector(":scope > main")
  if (!(root instanceof HTMLElement)) {
    return () => {}
  }

  const previous: Array<{ el: HTMLElement; prop: string; value: string }> = []

  const setStyle = (el: HTMLElement, prop: string, value: string) => {
    previous.push({ el, prop, value: el.style.getPropertyValue(prop) })
    el.style.setProperty(prop, value)
  }

  // Print sections are inset 8mm; stay inside that so SVG width cannot
  // overflow the page even with rounding between screen CSS mm and print.
  setStyle(root, "width", "180mm")
  setStyle(root, "max-width", "180mm")
  setStyle(root, "margin-left", "auto")
  setStyle(root, "margin-right", "auto")

  if (main instanceof HTMLElement) {
    setStyle(main, "width", "100%")
    setStyle(main, "max-width", "none")
    setStyle(main, "padding-left", "0px")
    setStyle(main, "padding-right", "0px")
  }

  return () => {
    previous.reverse().forEach(({ el, prop, value }) => {
      if (value) {
        el.style.setProperty(prop, value)
      } else {
        el.style.removeProperty(prop)
      }
    })
  }
}

function applyPrintChartHeights() {
  const previous: Array<{ el: HTMLElement; prop: string; value: string }> = []

  const setStyle = (el: HTMLElement, prop: string, value: string) => {
    previous.push({ el, prop, value: el.style.getPropertyValue(prop) })
    el.style.setProperty(prop, value)
  }

  // A4/Letter minus 12mm page margins, section padding, and a heading.
  // Keep-together clips any box taller than the remaining page; cap now so
  // Recharts ResizeObserver remasures before print.
  const maxChartPx = Math.round((150 / 25.4) * 96)

  document.querySelectorAll<HTMLElement>('[data-slot="chart"]').forEach((el) => {
    if (el.getBoundingClientRect().height > maxChartPx) {
      setStyle(el, "height", `${maxChartPx}px`)
      setStyle(el, "max-height", `${maxChartPx}px`)
      setStyle(el, "aspect-ratio", "auto")
    }
  })

  return () => {
    previous.reverse().forEach(({ el, prop, value }) => {
      if (value) {
        el.style.setProperty(prop, value)
      } else {
        el.style.removeProperty(prop)
      }
    })
  }
}

function printCanvas() {
  void (async () => {
    const restoreDisclosures = await expandDisclosuresForPrint()
    const restoreWidth = applyPrintContentWidth()
    await waitForPaint()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150)
    })
    await waitForPaint()
    const restoreChartHeights = applyPrintChartHeights()
    await waitForPaint()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150)
    })
    await waitForPaint()

    const onAfterPrint = () => {
      restoreChartHeights()
      restoreWidth()
      ;[...restoreDisclosures].reverse().forEach((trigger) => trigger.click())
      window.removeEventListener("afterprint", onAfterPrint)
    }
    window.addEventListener("afterprint", onAfterPrint)
    window.print()
  })()
}

export function CanvasShell({ title, children }: CanvasShellProps) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(null)
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  const isDark = themeOverride ? themeOverride === "dark" : systemDark

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches)

    setSystemDark(query.matches)
    query.addEventListener("change", updateSystemTheme)
    return () => query.removeEventListener("change", updateSystemTheme)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    document.documentElement.style.colorScheme = isDark ? "dark" : "light"
  }, [isDark])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "p") {
        return
      }
      event.preventDefault()
      printCanvas()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const update = () => {
      const isTall = document.documentElement.scrollHeight > window.innerHeight * 1.5
      setShowBackToTop(isTall && window.scrollY > 600)
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    const observer = new ResizeObserver(update)
    observer.observe(document.documentElement)

    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="canvas-root min-h-screen bg-background text-foreground">
      <header className="canvas-shell-header sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
          <div className="canvas-print-hidden flex shrink-0 items-center gap-2">
            <Button
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              size="icon"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              variant="ghost"
              onClick={() => setThemeOverride(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <Button variant="outline" onClick={printCanvas}>
              <Printer aria-hidden="true" />
              Save as PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      {showBackToTop ? (
        <Button
          aria-label="Back to top"
          className="canvas-print-hidden fixed right-5 bottom-5 z-50 rounded-full"
          size="icon"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
`,
)

write(
  "src/print.css",
  `.canvas-print-only {
  display: none !important;
}

@media print {
  @page {
    size: auto;
    margin: 12mm 0;
    background: var(--background);
    background-color: var(--background);
  }

  html {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  html:not(.dark) {
    color-scheme: light;
  }

  html.dark {
    color-scheme: dark;
  }

  html,
  body,
  .canvas-root {
    background: var(--background) !important;
    background-color: var(--background) !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
  }

  .canvas-print-hidden {
    display: none !important;
  }

  .canvas-print-only {
    display: block !important;
  }

  .canvas-root > .canvas-shell-header {
    position: static !important;
    top: auto !important;
    z-index: auto !important;
    box-sizing: border-box !important;
    width: calc(100% - 16mm) !important;
    max-width: calc(100% - 16mm) !important;
    margin: 0 8mm !important;
    backdrop-filter: none !important;
    background: var(--background) !important;
    background-color: var(--background) !important;
    overflow: visible !important;
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  .canvas-root > .canvas-shell-header > div {
    max-width: none !important;
    min-height: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .canvas-root > .canvas-shell-header h1 {
    overflow: visible !important;
    text-overflow: unset !important;
    white-space: normal !important;
  }

  .canvas-root > main {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  .canvas-print-section,
  .canvas-print-flow {
    box-sizing: border-box !important;
    width: calc(100% - 16mm) !important;
    max-width: calc(100% - 16mm) !important;
    margin: 0 8mm !important;
    padding: 6mm 0 !important;
    overflow: visible !important;
  }

  .canvas-print-section .canvas-print-section,
  .canvas-print-section .canvas-print-flow,
  .canvas-print-section .canvas-print-keep,
  .canvas-print-flow .canvas-print-section,
  .canvas-print-flow .canvas-print-flow,
  .canvas-print-flow .canvas-print-keep {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 4mm 0 !important;
  }

  .canvas-print-section *:not(svg):not(svg *):not([class*="recharts-"]):not([data-slot="chart"]),
  .canvas-print-flow *:not(svg):not(svg *):not([class*="recharts-"]):not([data-slot="chart"]) {
    box-sizing: border-box !important;
    min-width: 0 !important;
  }

  .canvas-print-section ~ .canvas-print-section,
  .canvas-print-section ~ .canvas-print-flow,
  .canvas-print-flow ~ .canvas-print-section,
  .canvas-print-flow ~ .canvas-print-flow {
    break-before: page;
    page-break-before: always;
  }

  .canvas-print-section {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  .canvas-print-flow {
    break-inside: auto;
    page-break-inside: auto;
  }

  .canvas-print-keep,
  [data-slot="card"],
  [data-slot="collapsible"],
  [data-slot="accordion-item"] {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  [data-slot="card"] {
    max-width: 100% !important;
    overflow: visible !important;
  }

  figure {
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  .canvas-root > main .grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .canvas-root > main .flex:not([data-slot="chart"]) {
    flex-wrap: wrap !important;
  }

  [class*="overflow-x-"]:not([class*="recharts-"]) {
    overflow-x: visible !important;
  }

  [data-slot="chart"] {
    width: 100% !important;
    max-width: 100% !important;
    justify-content: flex-start !important;
    flex-wrap: nowrap !important;
    overflow: visible !important;
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  [data-slot="collapsible-content"],
  [data-slot="accordion-content"] {
    display: block !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    opacity: 1 !important;
    visibility: visible !important;
    --collapsible-panel-height: auto !important;
    --collapsible-panel-width: auto !important;
  }

  [data-slot="collapsible-content"][hidden],
  [data-slot="accordion-content"][hidden] {
    display: block !important;
  }

  table {
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed;
  }

  th,
  td,
  pre,
  code {
    max-width: 100%;
    white-space: normal !important;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  img {
    max-width: 100% !important;
    height: auto !important;
  }

  h1,
  h2,
  h3,
  h4 {
    break-after: avoid-page;
    page-break-after: avoid;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }

  thead {
    display: table-header-group;
  }

  tfoot {
    display: table-footer-group;
  }

  tr,
  img {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  .canvas-root {
    width: 100% !important;
    max-width: 100% !important;
    min-height: auto !important;
    overflow: visible !important;
  }
}
`,
)

write("src/canvas-source.css", "")

const indexCssPath = join(runtimeRoot, "src/index.css")
const indexCss = readFileSync(indexCssPath, "utf8")
const sharedImports = ['@import "./print.css";', '@import "./canvas-source.css";']
const missingImports = sharedImports.filter((entry) => !indexCss.includes(entry))
if (missingImports.length) {
  writeFileSync(indexCssPath, `${missingImports.join("\n")}\n${indexCss}`)
}

write(
  "scripts/build.mjs",
  `#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const [sourceArg, outputArg] = process.argv.slice(2)
if (!sourceArg || !outputArg) {
  console.error("Usage: build.mjs <source.canvas.tsx> <output.html>")
  process.exit(1)
}

const runtimeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = resolve(runtimeRoot, "..")
const source = isAbsolute(sourceArg) ? sourceArg : resolve(workspaceRoot, sourceArg)
const output = isAbsolute(outputArg) ? outputArg : resolve(workspaceRoot, outputArg)

if (!existsSync(source)) {
  console.error(\`Canvas source does not exist: \${source}\`)
  process.exit(1)
}

const sourceFromEntry = relative(join(runtimeRoot, "src"), source).split("\\\\").join("/")
const importPath = sourceFromEntry.startsWith(".") ? sourceFromEntry : \`./\${sourceFromEntry}\`

writeFileSync(
  join(runtimeRoot, "src/canvas-source.css"),
  \`@source \${JSON.stringify(importPath)};\\n\`,
)

writeFileSync(
  join(runtimeRoot, "src/generated-entry.tsx"),
  \`import React from "react"
import ReactDOM from "react-dom/client"
import "@/index.css"
import Canvas from \${JSON.stringify(importPath)}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Canvas />
  </React.StrictMode>,
)
\`,
)

writeFileSync(
  join(runtimeRoot, "tsconfig.canvas.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        strict: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src", source],
    },
    null,
    2,
  ) + "\\n",
)

const binary = (name) => join(runtimeRoot, "node_modules", ".bin", name)
execFileSync(binary("tsc"), ["--project", "tsconfig.canvas.json"], {
  cwd: runtimeRoot,
  stdio: "inherit",
})
execFileSync(binary("vite"), ["build"], { cwd: runtimeRoot, stdio: "inherit" })

mkdirSync(dirname(output), { recursive: true })
copyFileSync(join(runtimeRoot, "dist/index.html"), output)
console.log(\`Wrote self-contained canvas: \${output}\`)
`,
)

write(
  "config.json",
  JSON.stringify(
    {
      schemaVersion: 18,
      framework: "vite-react-typescript",
      outputMode: modeArg,
    },
    null,
    2,
  ) + "\n",
)

console.log(`Canvas runtime initialized at ${runtimeRoot}`)
