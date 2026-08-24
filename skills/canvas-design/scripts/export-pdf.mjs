#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const PLAYWRIGHT_SPEC = "playwright@1.55.0"
const VIEWPORT = { width: 1280, height: 800 }

const [inputArg, outputArg, themeArg] = process.argv.slice(2)
if (!inputArg || !outputArg) {
  console.error("Usage: export-pdf.mjs <input.html> <output.pdf> [light|dark]")
  process.exit(1)
}

const theme = themeArg || "light"
if (theme !== "light" && theme !== "dark") {
  console.error("Theme must be light or dark")
  process.exit(1)
}

const runtimeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = resolve(runtimeRoot, "..")
const inputHtml = isAbsolute(inputArg) ? inputArg : resolve(workspaceRoot, inputArg)
const outputPdf = isAbsolute(outputArg) ? outputArg : resolve(workspaceRoot, outputArg)
const require = createRequire(join(runtimeRoot, "package.json"))

if (!existsSync(inputHtml)) {
  console.error(`Canvas HTML does not exist: ${inputHtml}`)
  process.exit(1)
}

function resolveFromRuntime(specifier) {
  try {
    return require.resolve(specifier)
  } catch {
    return null
  }
}

function ensurePlaywright() {
  if (resolveFromRuntime("playwright")) {
    return
  }

  console.log(`Installing ${PLAYWRIGHT_SPEC} for Canvas PDF export`)
  execFileSync(
    "npm",
    ["install", "--legacy-peer-deps", "--no-audit", "--no-fund", "--save-dev", PLAYWRIGHT_SPEC],
    {
      cwd: runtimeRoot,
      stdio: "inherit",
      env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
    },
  )
}

function installChromium() {
  if (process.env.CANVAS_SKIP_PDF_BROWSER === "1") {
    throw new Error("Playwright Chromium is missing and CANVAS_SKIP_PDF_BROWSER=1")
  }

  execFileSync("npx", ["playwright", "install", "chromium"], {
    cwd: runtimeRoot,
    stdio: "inherit",
  })
}

async function bundlePrintLayout() {
  const esbuildPath = resolveFromRuntime("esbuild")
  if (!esbuildPath) {
    throw new Error("esbuild is missing from the Canvas runtime")
  }

  const { build } = await import(pathToFileURL(esbuildPath).href)
  const outdir = join(runtimeRoot, ".export")
  mkdirSync(outdir, { recursive: true })
  const outfile = join(outdir, "print-layout.js")

  await build({
    absWorkingDir: runtimeRoot,
    bundle: true,
    entryPoints: [join(runtimeRoot, "src/print-layout.ts")],
    format: "iife",
    globalName: "CanvasPrintLayout",
    outfile,
    platform: "browser",
    target: "es2022",
  })

  return outfile
}

async function launchChromium(chromium) {
  const options = {
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  }

  try {
    return await chromium.launch(options)
  } catch {
    installChromium()
    return await chromium.launch(options)
  }
}

async function exportPdf() {
  ensurePlaywright()
  const playwrightPath = resolveFromRuntime("playwright")
  if (!playwrightPath) {
    throw new Error("Playwright failed to install in the Canvas runtime")
  }

  const playwrightModule = await import(pathToFileURL(playwrightPath).href)
  const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium
  if (!chromium) {
    throw new Error("Playwright chromium launcher is unavailable")
  }

  const bundlePath = await bundlePrintLayout()
  const browser = await launchChromium(chromium)

  try {
    const page = await browser.newPage({
      colorScheme: theme,
      viewport: VIEWPORT,
    })
    await page.goto(pathToFileURL(inputHtml).href, { waitUntil: "load" })
    await page.waitForSelector(".canvas-root")
    await page.emulateMedia({ colorScheme: theme, media: "print" })
    await page.evaluate((isDark) => {
      document.documentElement.classList.toggle("dark", isDark)
      document.documentElement.style.colorScheme = isDark ? "dark" : "light"
    }, theme === "dark")
    await page.addScriptTag({ path: bundlePath })
    await page.evaluate(async () => {
      await globalThis.CanvasPrintLayout.prepareCanvasForPdf()
    })
    await page.evaluate(() => document.fonts.ready)

    const metrics = await page.evaluate(() => globalThis.CanvasPrintLayout.measureCanvasPage())

    mkdirSync(dirname(outputPdf), { recursive: true })
    await page.pdf({
      displayHeaderFooter: false,
      width: `${metrics.widthPx}px`,
      height: `${metrics.heightPx}px`,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      path: outputPdf,
    })
  } finally {
    await browser.close()
  }

  console.log(`Wrote canvas PDF: ${outputPdf}`)
}

exportPdf().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
