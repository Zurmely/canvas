#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"

const [rootArg, confirmation] = process.argv.slice(2)

if (!rootArg || confirmation !== "--yes") {
  console.error("Usage: reset-runtime.mjs <workspace-root> --yes")
  process.exit(1)
}

const workspaceRoot = resolve(rootArg)
const runtimeRoot = join(workspaceRoot, ".canvas")

if (!existsSync(runtimeRoot)) {
  console.log(`No Canvas runtime found at ${runtimeRoot}`)
  process.exit(0)
}

rmSync(runtimeRoot, { recursive: true, force: true })
console.log(`Removed generated Canvas runtime at ${runtimeRoot}`)
console.log("The next /canvas-design invocation will run first-use setup again.")
