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

import { syncCanvasRuntime } from "./sync-runtime.mjs"

const [rootArg, modeArg, themeArg] = process.argv.slice(2)

if (
  !rootArg ||
  !["react", "html"].includes(modeArg) ||
  !["neutral", "content"].includes(themeArg)
) {
  console.error("Usage: scaffold.mjs <workspace-root> <react|html> <neutral|content>")
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

write("src/canvas-source.css", "")
syncCanvasRuntime(workspaceRoot, { upgradeConfigSchema: false })

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
      schemaVersion: 20,
      framework: "vite-react-typescript",
      outputMode: modeArg,
      themeMode: themeArg,
    },
    null,
    2,
  ) + "\n",
)

console.log(`Canvas runtime initialized at ${runtimeRoot}`)
