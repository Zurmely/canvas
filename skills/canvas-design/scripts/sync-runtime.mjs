#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const OWNED_FILES = ["canvas-shell.tsx", "print.css", "print-layout.ts"]
const CURRENT_SCHEMA = 22

function skillRootFromThisFile() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..")
}

function ensurePrintCssImport(runtimeRoot) {
  const indexCssPath = join(runtimeRoot, "src/index.css")
  if (!existsSync(indexCssPath)) {
    writeFileSync(indexCssPath, '@import "./print.css";\n@import "./canvas-source.css";\n@import "tailwindcss";\n')
    return
  }

  const indexCss = readFileSync(indexCssPath, "utf8")
  const sharedImports = ['@import "./print.css";', '@import "./canvas-source.css";']
  const missingImports = sharedImports.filter((entry) => !indexCss.includes(entry))
  if (missingImports.length) {
    writeFileSync(indexCssPath, `${missingImports.join("\n")}\n${indexCss}`)
  }
}

function ensureDropdownMenu(runtimeRoot, templates) {
  const dropdownPath = join(runtimeRoot, "src/components/ui/dropdown-menu.tsx")
  if (existsSync(dropdownPath)) {
    return
  }

  mkdirSync(join(runtimeRoot, "src/components/ui"), { recursive: true })
  copyFileSync(join(templates, "dropdown-menu.tsx"), dropdownPath)
}

function readConfig(runtimeRoot) {
  const configPath = join(runtimeRoot, "config.json")
  if (!existsSync(configPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf8"))
  } catch {
    return null
  }
}

function upgradeConfig(runtimeRoot) {
  const configPath = join(runtimeRoot, "config.json")
  const config = readConfig(runtimeRoot)
  if (!config || typeof config !== "object") {
    return
  }

  if (config.schemaVersion === CURRENT_SCHEMA) {
    return
  }

  config.schemaVersion = CURRENT_SCHEMA
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
}

export function syncCanvasRuntime(workspaceRoot, { upgradeConfigSchema = true } = {}) {
  const runtimeRoot = join(resolve(workspaceRoot), ".canvas")
  const templates = join(skillRootFromThisFile(), "runtime")
  const srcRoot = join(runtimeRoot, "src")

  mkdirSync(srcRoot, { recursive: true })

  for (const fileName of OWNED_FILES) {
    const source = join(templates, fileName)
    if (!existsSync(source)) {
      throw new Error(`Missing runtime template: ${source}`)
    }
    copyFileSync(source, join(srcRoot, fileName))
  }

  ensurePrintCssImport(runtimeRoot)
  ensureDropdownMenu(runtimeRoot, templates)

  if (upgradeConfigSchema) {
    upgradeConfig(runtimeRoot)
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const rootArg = process.argv[2]
  if (!rootArg) {
    console.error("Usage: sync-runtime.mjs <workspace-root>")
    process.exit(1)
  }

  const workspaceRoot = resolve(rootArg)
  const runtimeRoot = join(workspaceRoot, ".canvas")
  if (!existsSync(runtimeRoot)) {
    console.error(`No Canvas runtime found at ${runtimeRoot}`)
    process.exit(1)
  }

  syncCanvasRuntime(workspaceRoot)
  console.log(`Synced Canvas print runtime at ${runtimeRoot}`)
}
