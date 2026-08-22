import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowUp, ChevronDown, Moon, Printer, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { printCanvas, type PrintOrientation } from "@/print-layout"

type CanvasShellProps = {
  title: string
  children: ReactNode
}

export function CanvasShell({ title, children }: CanvasShellProps) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(null)
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  const lastOrientation = useRef<PrintOrientation>("landscape")
  const isDark = themeOverride ? themeOverride === "dark" : systemDark

  const runPrint = (orientation: PrintOrientation) => {
    lastOrientation.current = orientation
    void printCanvas(orientation)
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
      void printCanvas(lastOrientation.current)
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    <Printer aria-hidden="true" />
                    Save as PDF
                    <ChevronDown aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => runPrint("portrait")}>
                  Portrait 1080×1920
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runPrint("landscape")}>
                  Landscape 1920×1080
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
