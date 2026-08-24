#!/usr/bin/env node

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
  console.error(`Canvas source does not exist: ${source}`)
  process.exit(1)
}

const sourceFromEntry = relative(join(runtimeRoot, "src"), source).split("\\").join("/")
const importPath = sourceFromEntry.startsWith(".") ? sourceFromEntry : `./${sourceFromEntry}`
const importSpecifier = importPath.replace(/\.tsx?$/, "")

writeFileSync(
  join(runtimeRoot, "src/canvas-source.css"),
  `@source ${JSON.stringify(importPath)};\n`,
)

writeFileSync(
  join(runtimeRoot, "src/generated-entry.tsx"),
  `import React from "react"
import ReactDOM from "react-dom/client"
import "@/index.css"
import Canvas from ${JSON.stringify(importSpecifier)}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Canvas />
  </React.StrictMode>,
)
`,
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
        typeRoots: ["./node_modules/@types"],
        paths: {
          "@/*": ["./src/*"],
          react: ["./node_modules/@types/react"],
          "react-dom": ["./node_modules/@types/react-dom"],
          "react/jsx-runtime": ["./node_modules/@types/react/jsx-runtime"],
          "react/jsx-dev-runtime": ["./node_modules/@types/react/jsx-dev-runtime"],
          "react-dom/client": ["./node_modules/@types/react-dom/client"],
          "*": ["./node_modules/*"],
        },
      },
      include: ["src", source],
    },
    null,
    2,
  ) + "\n",
)

const binary = (name) => join(runtimeRoot, "node_modules", ".bin", name)
execFileSync(binary("tsc"), ["--project", "tsconfig.canvas.json"], {
  cwd: runtimeRoot,
  stdio: "inherit",
})
execFileSync(binary("vite"), ["build"], { cwd: runtimeRoot, stdio: "inherit" })

mkdirSync(dirname(output), { recursive: true })
copyFileSync(join(runtimeRoot, "dist/index.html"), output)
console.log(`Wrote self-contained canvas: ${output}`)
