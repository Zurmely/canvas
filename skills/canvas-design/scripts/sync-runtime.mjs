#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SRC_OWNED_FILES = ["canvas-shell.tsx", "print.css", "print-layout.ts"]
const CURRENT_SCHEMA = 27
const PINNED_RUNTIME_DEPS = {
  "react-is": "19.2.8",
}
const REMOVED_RUNTIME_DEPS = ["@imggion/html2realpdf"]
const PINNED_TYPESCRIPT = "5.7.3"

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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

function readConfig(runtimeRoot) {
  const configPath = join(runtimeRoot, "config.json")
  if (!existsSync(configPath)) {
    return null
  }
  return readJson(configPath)
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

function packageVersion(runtimeRoot, name) {
  const pkg = readJson(join(runtimeRoot, "node_modules", name, "package.json"))
  return typeof pkg?.version === "string" ? pkg.version : null
}

function hasDeclaredDep(pkg, name) {
  return Boolean(pkg?.dependencies?.[name] || pkg?.devDependencies?.[name])
}

function removeRetiredRuntimeDeps(runtimeRoot) {
  if (!existsSync(join(runtimeRoot, "package.json"))) {
    return
  }

  const pkg = readJson(join(runtimeRoot, "package.json")) ?? {}
  const retired = REMOVED_RUNTIME_DEPS.filter(
    (name) => hasDeclaredDep(pkg, name) || packageVersion(runtimeRoot, name),
  )
  if (!retired.length) {
    return
  }

  console.log(`Removing retired Canvas runtime deps: ${retired.join(" ")}`)
  execFileSync(
    "npm",
    ["uninstall", "--legacy-peer-deps", "--no-audit", "--no-fund", ...retired],
    { cwd: runtimeRoot, stdio: "inherit" },
  )
}

function ensureRuntimeDeps(runtimeRoot) {
  if (!existsSync(join(runtimeRoot, "package.json"))) {
    return
  }

  const pkg = readJson(join(runtimeRoot, "package.json")) ?? {}
  const missingRuntime = Object.entries(PINNED_RUNTIME_DEPS)
    .filter(([name]) => !hasDeclaredDep(pkg, name) && !packageVersion(runtimeRoot, name))
    .map(([name, version]) => `${name}@${version}`)

  if (missingRuntime.length) {
    console.log(`Installing missing Canvas runtime deps: ${missingRuntime.join(" ")}`)
    execFileSync(
      "npm",
      ["install", "--legacy-peer-deps", "--no-audit", "--no-fund", "--save", ...missingRuntime],
      { cwd: runtimeRoot, stdio: "inherit" },
    )
  }

  const typescriptVersion = packageVersion(runtimeRoot, "typescript")
  const typescriptMajor = typescriptVersion ? Number.parseInt(typescriptVersion.split(".")[0], 10) : 0
  if (typescriptMajor >= 6) {
    console.log(`Pinning TypeScript ${PINNED_TYPESCRIPT} (found ${typescriptVersion})`)
    execFileSync(
      "npm",
      [
        "install",
        "--legacy-peer-deps",
        "--no-audit",
        "--no-fund",
        "--save-dev",
        `typescript@${PINNED_TYPESCRIPT}`,
      ],
      { cwd: runtimeRoot, stdio: "inherit" },
    )
  }
}

export function syncCanvasRuntime(workspaceRoot, { upgradeConfigSchema = true } = {}) {
  const runtimeRoot = join(resolve(workspaceRoot), ".canvas")
  const skillRoot = skillRootFromThisFile()
  const templates = join(skillRoot, "runtime")
  const srcRoot = join(runtimeRoot, "src")

  mkdirSync(srcRoot, { recursive: true })
  mkdirSync(join(runtimeRoot, "scripts"), { recursive: true })

  for (const fileName of SRC_OWNED_FILES) {
    const source = join(templates, fileName)
    if (!existsSync(source)) {
      throw new Error(`Missing runtime template: ${source}`)
    }
    copyFileSync(source, join(srcRoot, fileName))
  }

  copyFileSync(join(templates, "vite.config.ts"), join(runtimeRoot, "vite.config.ts"))
  copyFileSync(join(skillRoot, "scripts/build.mjs"), join(runtimeRoot, "scripts/build.mjs"))
  copyFileSync(join(skillRoot, "scripts/export-pdf.mjs"), join(runtimeRoot, "scripts/export-pdf.mjs"))

  ensurePrintCssImport(runtimeRoot)
  ensureDropdownMenu(runtimeRoot, templates)
  removeRetiredRuntimeDeps(runtimeRoot)
  ensureRuntimeDeps(runtimeRoot)

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
