import { useEffect, useState, type ReactNode } from "react"
import { ArrowUp, Moon, Printer, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { printCanvas } from "@/print-layout"

type CanvasShellProps = {
  title: string
  children: ReactNode
}

export function CanvasShell({ title, children }: CanvasShellProps) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(null)
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  const isDark = themeOverride ? themeOverride === "dark" : systemDark

  const runPrint = async () => {
    if (savingPdf) {
      return
    }
    setPdfError(false)
    setSavingPdf(true)
    try {
      await printCanvas()
    } catch {
      setPdfError(true)
    } finally {
      setSavingPdf(false)
    }
  }

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
      void runPrint()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [savingPdf])

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

  useEffect(() => {
    if (!pdfError) {
      return
    }
    const timeout = window.setTimeout(() => setPdfError(false), 4000)
    return () => window.clearTimeout(timeout)
  }, [pdfError])

  const snackbarMessage = savingPdf ? "Exporting PDF…" : pdfError ? "Couldn’t export PDF" : null

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
            <Button disabled={savingPdf} variant="outline" onClick={() => void runPrint()}>
              <Printer aria-hidden="true" />
              {savingPdf ? "Saving PDF" : "Save as PDF"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      {showBackToTop && !snackbarMessage ? (
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

      {snackbarMessage ? (
        <div
          aria-live="polite"
          className="canvas-print-hidden fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-foreground px-4 py-2 text-sm text-background"
          role="status"
        >
          {snackbarMessage}
        </div>
      ) : null}
    </div>
  )
}
