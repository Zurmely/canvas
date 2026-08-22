export type PrintOrientation = "portrait" | "landscape"

export const PAGE_SIZES = {
  portrait: { width: 1080, height: 1920, cssSize: "11.25in 20in" },
  landscape: { width: 1920, height: 1080, cssSize: "20in 11.25in" },
} as const

const INSET_PX = 48
const COMPACT_MAX_PX = 280
const MIN_CHART_PX = 240
const MIN_BAND_PX = 120
const PAGE_STYLE_ID = "canvas-print-page-size"

type BandKind = "card-band" | "chart-band" | "keep" | "table" | "heading" | "block"

type Band = {
  kind: BandKind
  elements: HTMLElement[]
  parent: HTMLElement | null
}

type Restorer = {
  add: (fn: () => void) => void
  addClass: (el: Element, className: string) => void
  setAttr: (el: Element, name: string, value: string) => void
  setStyle: (el: HTMLElement, prop: string, value: string) => void
  restore: () => void
}

let printing = false

function createRestorer(): Restorer {
  const fns: Array<() => void> = []

  return {
    add(fn) {
      fns.push(fn)
    },
    addClass(el, className) {
      if (el.classList.contains(className)) {
        return
      }
      el.classList.add(className)
      fns.push(() => el.classList.remove(className))
    },
    setAttr(el, name, value) {
      const previous = el.getAttribute(name)
      el.setAttribute(name, value)
      fns.push(() => {
        if (previous === null) {
          el.removeAttribute(name)
        } else {
          el.setAttribute(name, previous)
        }
      })
    },
    setStyle(el, prop, value) {
      const previous = el.style.getPropertyValue(prop)
      el.style.setProperty(prop, value)
      fns.push(() => {
        if (previous) {
          el.style.setProperty(prop, previous)
        } else {
          el.style.removeProperty(prop)
        }
      })
    },
    restore() {
      fns.reverse().forEach((fn) => fn())
    },
  }
}

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function settleLayout() {
  await waitForPaint()
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 150)
  })
  await waitForPaint()
}

function slot(el: Element, name: string) {
  return el.getAttribute("data-slot") === name
}

function heightOf(el: HTMLElement) {
  return el.getBoundingClientRect().height
}

function isHidden(el: Element) {
  if (!(el instanceof HTMLElement)) {
    return true
  }
  if (el.classList.contains("canvas-print-hidden") || el.closest(".canvas-print-hidden")) {
    return true
  }
  const style = window.getComputedStyle(el)
  if (style.display === "none" || style.visibility === "hidden") {
    return true
  }
  const rect = el.getBoundingClientRect()
  return rect.width < 1 && rect.height < 1
}

function visibleChildren(el: HTMLElement) {
  return Array.from(el.children).filter((child): child is HTMLElement => {
    return child instanceof HTMLElement && !isHidden(child)
  })
}

function hasChart(el: HTMLElement) {
  return slot(el, "chart") || Boolean(el.querySelector('[data-slot="chart"]'))
}

function isHeading(el: HTMLElement) {
  return /^H[1-4]$/.test(el.tagName)
}

function isKeep(el: HTMLElement) {
  return el.classList.contains("canvas-print-keep")
}

function isCard(el: HTMLElement) {
  return slot(el, "card")
}

function isAlert(el: HTMLElement) {
  return slot(el, "alert")
}

function isTableHost(el: HTMLElement) {
  if (el.tagName === "TABLE") {
    return true
  }
  const table = el.querySelector("table")
  if (!table) {
    return false
  }
  return (
    el.classList.contains("canvas-print-only") ||
    el.querySelector(":scope > table") !== null ||
    heightOf(table) > heightOf(el) * 0.6
  )
}

function isChartUnit(el: HTMLElement) {
  if (slot(el, "chart")) {
    return true
  }
  if (!hasChart(el)) {
    return false
  }
  if (isKeep(el)) {
    return true
  }
  if (el.querySelector("table")) {
    return false
  }
  return visibleChildren(el).length <= 5 && heightOf(el) < 960
}

function isCompactUnit(el: HTMLElement): boolean {
  if (isHeading(el) || isAlert(el) || isTableHost(el) || isKeep(el) || isChartUnit(el)) {
    return false
  }

  const kids = visibleChildren(el)
  if (kids.length >= 2 && kids.every((child) => isCard(child) || isStatCell(child))) {
    return false
  }

  const h = heightOf(el)
  if (h < 8 || h > COMPACT_MAX_PX) {
    return false
  }

  if (isCard(el) || isStatCell(el)) {
    return true
  }

  if (kids.length === 1 && isCompactUnit(kids[0]) && h <= COMPACT_MAX_PX + 24) {
    return true
  }

  if (
    h <= 160 &&
    !el.querySelector("section, [data-slot='card'], [data-slot='chart'], table, h1, h2, h3, h4")
  ) {
    const text = el.innerText?.trim() ?? ""
    return text.length > 0 && text.length < 96
  }

  return false
}

function isStatCell(el: HTMLElement) {
  return Boolean(el.querySelector(":scope dt") && el.querySelector(":scope dd"))
}

function isCardUnit(el: HTMLElement): boolean {
  if (isHeading(el) || isAlert(el) || isTableHost(el) || isChartUnit(el) || isKeep(el)) {
    return false
  }
  if (isCard(el) || isCompactUnit(el)) {
    return true
  }
  const kids = visibleChildren(el)
  return kids.length === 1 && isCardUnit(kids[0])
}

function shouldRecurse(el: HTMLElement) {
  if (
    isCard(el) ||
    isKeep(el) ||
    isAlert(el) ||
    isHeading(el) ||
    isTableHost(el) ||
    slot(el, "chart") ||
    isChartUnit(el)
  ) {
    return false
  }

  if (["P", "FIGURE", "BLOCKQUOTE", "PRE", "UL", "OL", "LI", "SPAN", "A", "BUTTON"].includes(el.tagName)) {
    return false
  }

  return visibleChildren(el).length > 0
}

function collectFrom(parent: HTMLElement, into: Band[]) {
  const kids = visibleChildren(parent)
  let index = 0

  while (index < kids.length) {
    const el = kids[index]

    if (isHeading(el)) {
      into.push({ kind: "heading", elements: [el], parent })
      index += 1
      continue
    }

    if (isCardUnit(el)) {
      const group = [el]
      while (index + group.length < kids.length && isCardUnit(kids[index + group.length])) {
        group.push(kids[index + group.length])
      }
      into.push({ kind: "card-band", elements: group, parent })
      index += group.length
      continue
    }

    if (isChartUnit(el)) {
      const group = [el]
      while (index + group.length < kids.length && isChartUnit(kids[index + group.length])) {
        group.push(kids[index + group.length])
      }
      into.push({ kind: "chart-band", elements: group, parent })
      index += group.length
      continue
    }

    if (isTableHost(el)) {
      into.push({ kind: "table", elements: [el], parent })
      index += 1
      continue
    }

    if (isKeep(el)) {
      into.push({ kind: "keep", elements: [el], parent })
      index += 1
      continue
    }

    if (shouldRecurse(el)) {
      collectFrom(el, into)
      index += 1
      continue
    }

    into.push({ kind: "block", elements: [el], parent })
    index += 1
  }
}

function mergeSiblingBands(bands: Band[]) {
  const merged: Band[] = []

  for (const band of bands) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      prev.kind === band.kind &&
      (band.kind === "card-band" || band.kind === "chart-band") &&
      prev.parent &&
      prev.parent === band.parent
    ) {
      prev.elements.push(...band.elements)
      continue
    }
    merged.push({ ...band, elements: [...band.elements] })
  }

  return merged
}

function collectBands(main: HTMLElement) {
  const bands: Band[] = []
  collectFrom(main, bands)
  return mergeSiblingBands(bands)
}

function bandHeight(band: Band) {
  if (band.elements.length === 0) {
    return 0
  }
  const rects = band.elements.map((el) => el.getBoundingClientRect())
  return Math.max(...rects.map((rect) => rect.bottom)) - Math.min(...rects.map((rect) => rect.top))
}

function cardColumns(orientation: PrintOrientation, count: number, maxItemHeight: number, pageInnerH: number) {
  if (count <= 1) {
    return 1
  }
  if (maxItemHeight > pageInnerH * 0.45) {
    return 1
  }
  if (orientation === "portrait") {
    return Math.min(2, count)
  }
  return Math.min(count >= 4 ? 4 : 3, count)
}

function chartColumns(orientation: PrintOrientation, count: number) {
  if (orientation === "landscape" && count >= 2) {
    return 2
  }
  return 1
}

function applyBandGrid(band: Band, cols: number, className: string, restorer: Restorer) {
  const parent = band.parent
  if (!parent || cols < 1) {
    return
  }

  restorer.addClass(parent, className)
  restorer.setStyle(parent, "--canvas-print-cols", String(cols))

  visibleChildren(parent).forEach((child) => {
    if (!band.elements.includes(child)) {
      restorer.addClass(child, "canvas-print-span-all")
    }
  })
}

function markUnits(band: Band, pageInnerH: number, restorer: Restorer) {
  band.elements.forEach((el) => {
    if (heightOf(el) <= pageInnerH) {
      restorer.addClass(el, "canvas-print-unit")
    }
  })
}

function applyBandLayout(
  bands: Band[],
  orientation: PrintOrientation,
  pageInnerH: number,
  restorer: Restorer,
) {
  for (const band of bands) {
    if (band.kind === "card-band") {
      const maxItemHeight = Math.max(...band.elements.map((el) => heightOf(el)), 0)
      const cols = cardColumns(orientation, band.elements.length, maxItemHeight, pageInnerH)
      applyBandGrid(band, cols, "canvas-print-pack-cards", restorer)
    } else if (band.kind === "chart-band") {
      const cols = chartColumns(orientation, band.elements.length)
      applyBandGrid(band, cols, "canvas-print-pack-charts", restorer)
    }
  }
}

function markFittingUnits(bands: Band[], pageInnerH: number, restorer: Restorer) {
  for (const band of bands) {
    if (band.kind === "table") {
      continue
    }
    markUnits(band, pageInnerH, restorer)
  }
}

function capCharts(orientation: PrintOrientation, pageInnerH: number, restorer: Restorer) {
  const maxSingle =
    orientation === "portrait" ? Math.round(pageInnerH * 0.42) : Math.round(pageInnerH * 0.55)

  document.querySelectorAll<HTMLElement>('[data-slot="chart"]').forEach((el) => {
    if (isHidden(el)) {
      return
    }
    const keep = el.closest(".canvas-print-keep")
    const extras =
      keep instanceof HTMLElement ? Math.max(0, heightOf(keep) - heightOf(el)) : 0
    const twoUp = el.closest(".canvas-print-pack-charts")
    const cols = twoUp instanceof HTMLElement ? Number.parseInt(twoUp.style.getPropertyValue("--canvas-print-cols") || "1", 10) : 1
    const cap = Math.max(MIN_CHART_PX, (cols > 1 ? Math.round(maxSingle * 0.9) : maxSingle) - extras)
    if (heightOf(el) > cap) {
      restorer.setStyle(el, "height", `${cap}px`)
      restorer.setStyle(el, "max-height", `${cap}px`)
      restorer.setStyle(el, "aspect-ratio", "auto")
    }
  })
}

function applyPageStarts(bands: Band[], firstPageInnerH: number, pageInnerH: number, restorer: Restorer) {
  let capacity = firstPageInnerH
  let used = 0

  const startPage = (el: HTMLElement) => {
    restorer.addClass(el, "canvas-print-page-start")
    capacity = pageInnerH
    used = 0
  }

  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index]
    const next = bands[index + 1]
    let height = bandHeight(band)
    let startEl = band.elements[0]
    if (!startEl) {
      continue
    }

    if (band.kind === "heading" && next) {
      height += bandHeight(next)
    }

    const remaining = capacity - used
    const needsNewPage =
      used > 0 &&
      height > remaining &&
      (remaining < MIN_BAND_PX || band.kind !== "table")

    if (needsNewPage) {
      startPage(startEl)
    }

    if (band.kind === "table" && height > capacity - used) {
      const leftover = Math.max(0, height - (capacity - used))
      used = leftover % pageInnerH
      capacity = pageInnerH
      continue
    }

    if (band.kind === "heading") {
      used += bandHeight(band)
      continue
    }

    used += bandHeight(band)
  }
}

function applyPageSize(orientation: PrintOrientation, restorer: Restorer) {
  const page = PAGE_SIZES[orientation]
  restorer.setAttr(document.documentElement, "data-canvas-print-orient", orientation)

  const existing = document.getElementById(PAGE_STYLE_ID)
  const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style")
  style.id = PAGE_STYLE_ID
  style.textContent = `@page { size: ${page.cssSize}; margin: 0; background: var(--background); }`
  if (!existing) {
    document.head.append(style)
    restorer.add(() => style.remove())
  } else {
    const previous = existing.textContent
    restorer.add(() => {
      if (previous) {
        existing.textContent = previous
      } else {
        existing.remove()
      }
    })
  }
}

function applyPrintWidth(orientation: PrintOrientation, restorer: Restorer) {
  const page = PAGE_SIZES[orientation]
  const root = document.querySelector(".canvas-root")
  const main = root?.querySelector(":scope > main")
  if (!(root instanceof HTMLElement)) {
    return
  }

  restorer.setStyle(root, "width", `${page.width}px`)
  restorer.setStyle(root, "max-width", `${page.width}px`)
  restorer.setStyle(root, "box-sizing", "border-box")
  restorer.setStyle(root, "padding", `${INSET_PX}px`)
  restorer.setStyle(root, "margin-left", "auto")
  restorer.setStyle(root, "margin-right", "auto")

  if (main instanceof HTMLElement) {
    restorer.setStyle(main, "width", "100%")
    restorer.setStyle(main, "max-width", "none")
    restorer.setStyle(main, "padding-left", "0px")
    restorer.setStyle(main, "padding-right", "0px")
  }
}

async function expandDisclosures(restorer: Restorer) {
  const clicked: HTMLElement[] = []

  for (let pass = 0; pass < 12; pass += 1) {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="collapsible-trigger"], [data-slot="accordion-trigger"]',
      ),
    ).filter((trigger) => {
      const root =
        trigger.closest("[data-slot='collapsible']") ??
        trigger.closest("[data-slot='accordion-item']")
      return root?.hasAttribute("data-closed") ?? false
    })

    if (triggers.length === 0) {
      break
    }

    for (const trigger of triggers) {
      trigger.click()
      clicked.push(trigger)
    }

    await waitForPaint()
  }

  restorer.add(() => {
    clicked.reverse().forEach((trigger) => trigger.click())
  })
}

function pageInnerHeight(orientation: PrintOrientation) {
  return PAGE_SIZES[orientation].height - INSET_PX * 2
}

export async function printCanvas(orientation: PrintOrientation) {
  if (printing) {
    return
  }
  printing = true
  const restorer = createRestorer()

  try {
    restorer.addClass(document.documentElement, "canvas-print-preparing")
    applyPageSize(orientation, restorer)
    await expandDisclosures(restorer)
    applyPrintWidth(orientation, restorer)
    await settleLayout()

    const main = document.querySelector(".canvas-root > main")
    const header = document.querySelector(".canvas-root > .canvas-shell-header")
    const innerH = pageInnerHeight(orientation)
    const headerH = header instanceof HTMLElement ? heightOf(header) : 0
    const firstPageH = Math.max(MIN_BAND_PX, innerH - headerH)

    if (main instanceof HTMLElement) {
      applyBandLayout(collectBands(main), orientation, innerH, restorer)
      await settleLayout()
      capCharts(orientation, innerH, restorer)
      await settleLayout()
      const packed = collectBands(main)
      markFittingUnits(packed, innerH, restorer)
      applyPageStarts(packed, firstPageH, innerH, restorer)
    } else {
      capCharts(orientation, innerH, restorer)
      await settleLayout()
    }

    await new Promise<void>((resolve) => {
      const onAfterPrint = () => {
        window.removeEventListener("afterprint", onAfterPrint)
        resolve()
      }
      window.addEventListener("afterprint", onAfterPrint)
      window.print()
    })
  } finally {
    restorer.restore()
    printing = false
  }
}
