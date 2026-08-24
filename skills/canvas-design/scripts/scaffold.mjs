#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { CURRENT_SCHEMA, ensureGitignore, ensurePdfDeps, syncCanvasRuntime } from "./sync-runtime.mjs"

const [rootArg, modeArg, themeArg] = process.argv.slice(2)

if (
  !rootArg ||
  !["react", "html"].includes(modeArg) ||
  !["neutral", "content"].includes(themeArg)
) {
  console.error("Usage: scaffold.mjs <workspace-root> <react|html> <neutral|content>")
  process.exit(1)
}

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
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

function copyFromSkill(relativeFromSkill, relativeToRuntime = relativeFromSkill) {
  copyFileSync(join(skillRoot, relativeFromSkill), join(runtimeRoot, relativeToRuntime))
}

function run(command, args, cwd = workspaceRoot, extraEnv = {}) {
  console.log(`Running ${command} ${args.join(" ")}`)
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  })
}

mkdirSync(runtimeRoot, { recursive: true })
mkdirSync(join(runtimeRoot, "scripts"), { recursive: true })

ensureGitignore(workspaceRoot)

copyFromSkill("runtime/package.json", "package.json")
write(".npmrc", "legacy-peer-deps=true\n")

const lockfile = join(skillRoot, "runtime/package-lock.json")
if (existsSync(lockfile)) {
  copyFileSync(lockfile, join(runtimeRoot, "package-lock.json"))
}

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

copyFromSkill("runtime/vite.config.ts", "vite.config.ts")
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

const installArgs = existsSync(join(runtimeRoot, "package-lock.json"))
  ? ["ci", "--legacy-peer-deps", "--no-audit", "--no-fund"]
  : ["install", "--legacy-peer-deps", "--no-audit", "--no-fund"]
run("npm", installArgs, runtimeRoot, { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" })
ensurePdfDeps(runtimeRoot)

run(
  "npx",
  ["shadcn", "init", "--defaults", "--template", "vite", "--base", "base", "--yes"],
  runtimeRoot,
)
run("npx", ["shadcn", "add", "button", "--yes"], runtimeRoot)

copyFromSkill("runtime/vite.config.ts", "vite.config.ts")
write("src/canvas-source.css", "")
syncCanvasRuntime(workspaceRoot, { upgradeConfigSchema: false })
copyFromSkill("scripts/build.mjs", "scripts/build.mjs")
copyFromSkill("scripts/export-pdf.mjs", "scripts/export-pdf.mjs")

write(
  "config.json",
  JSON.stringify(
    {
      schemaVersion: CURRENT_SCHEMA,
      framework: "vite-react-typescript",
      outputMode: modeArg,
      themeMode: themeArg,
    },
    null,
    2,
  ) + "\n",
)

console.log(`Canvas runtime initialized at ${runtimeRoot}`)
