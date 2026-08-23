import path from "node:path"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const runtimeRoot = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(runtimeRoot, "..")
const entryImporter = path.join(runtimeRoot, "src/generated-entry.tsx")

function externalCanvasResolver(): Plugin {
  return {
    name: "canvas-external-resolver",
    enforce: "pre",
    async resolveId(id, importer, options) {
      if (!importer) {
        return null
      }
      if (
        id.startsWith("\0") ||
        id.startsWith(".") ||
        id.startsWith("/") ||
        id.startsWith("@/") ||
        path.isAbsolute(id)
      ) {
        return null
      }

      const importerPath = path.resolve((importer.split("\0").pop() ?? importer).split("?")[0])
      const runtimePrefix = runtimeRoot.endsWith(path.sep) ? runtimeRoot : `${runtimeRoot}${path.sep}`
      if (importerPath === runtimeRoot || importerPath.startsWith(runtimePrefix)) {
        return null
      }

      return this.resolve(id, entryImporter, { ...options, skipSelf: true })
    },
  }
}

export default defineConfig({
  plugins: [externalCanvasResolver(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(runtimeRoot, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-is",
    ],
  },
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
