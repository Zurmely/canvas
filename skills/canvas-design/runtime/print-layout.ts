/// <reference types="vite/client" />

const PX_TO_MM = 25.4 / 96
const MAX_PAGE_MM = 14400
const OVERFLOW_EPSILON = 1
const SCROLL_OVERFLOW = new Set(["auto", "scroll"])
const CLIP_OVERFLOW = new Set(["auto", "scroll", "hidden"])

type StyledElement = HTMLElement | SVGElement

type Restorer = {
  add: (fn: () => void) => void
  addClass: (el: Element, className: string) => void
  setAttr: (el: Element, name: string, value: string) => void
  removeAttr: (el: Element, name: string) => void
  setStyle: (el: StyledElement, prop: string, value: string) => void
  restore: () => void
}

const INTERACTIVE_TRIGGER_SLOTS = new Set([
  "alert-dialog-trigger",
  "combobox-trigger",
  "context-menu-trigger",
  "dialog-trigger",
  "dropdown-menu-trigger",
  "hover-card-trigger",
  "menubar-trigger",
  "navigation-menu-trigger",
  "popover-trigger",
  "select-trigger",
  "sheet-trigger",
  "tabs-trigger",
  "tooltip-trigger",
])

function createRestorer(): Restorer {
  const fns: Array<() => void> = []
  let restored = false

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
    removeAttr(el, name) {
      if (!el.hasAttribute(name)) {
        return
      }
      const previous = el.getAttribute(name)
      el.removeAttribute(name)
      fns.push(() => {
        if (previous === null) {
          el.setAttribute(name, "")
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
      if (restored) {
        return
      }
      restored = true
      fns.reverse().forEach((fn) => fn())
    },
  }
}

async function waitForPaint(scope: Window = window) {
  await new Promise<void>((resolve) => {
    scope.requestAnimationFrame(() => scope.requestAnimationFrame(() => resolve()))
  })
}

async function settleLayout(scope: Window = window) {
  await waitForPaint(scope)
  await new Promise<void>((resolve) => {
    scope.setTimeout(resolve, 150)
  })
  await waitForPaint(scope)
}

function slot(el: Element, name: string) {
  return el.getAttribute("data-slot") === name
}

function closestSlot(el: Element, name: string) {
  return el.closest(`[data-slot="${name}"]`)
}

function isPrintHidden(el: Element) {
  return Boolean(el.closest(".canvas-print-hidden"))
}

function isChartInternal(el: Element) {
  return Boolean(
    el.closest(".recharts-wrapper, .recharts-surface, .recharts-responsive-container"),
  )
}

function parsePx(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function boxExtras(el: HTMLElement) {
  const style = getComputedStyle(el)
  return {
    paddingX: parsePx(style.paddingLeft) + parsePx(style.paddingRight),
    paddingY: parsePx(style.paddingTop) + parsePx(style.paddingBottom),
    borderX: parsePx(style.borderLeftWidth) + parsePx(style.borderRightWidth),
    borderY: parsePx(style.borderTopWidth) + parsePx(style.borderBottomWidth),
  }
}

function shouldWrapCode(el: HTMLElement, scrollsX: boolean) {
  if (!scrollsX) {
    return false
  }
  if (el.tagName === "PRE" || el.tagName === "CODE") {
    return true
  }
  if (el.closest("pre")) {
    return true
  }
  if (el.querySelector("table")) {
    return false
  }
  return Boolean(el.querySelector("pre, code"))
}

function nestingDepth(el: HTMLElement, slotName: string) {
  let depth = 0
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    if (slot(parent, slotName)) {
      depth += 1
    }
  }
  return depth
}

async function expandDisclosures(restorer: Restorer) {
  const clicked: HTMLElement[] = []

  for (let pass = 0; pass < 12; pass += 1) {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="collapsible-trigger"], [data-slot="accordion-trigger"]',
      ),
    ).filter((trigger) => {
      if (isPrintHidden(trigger)) {
        return false
      }
      const root =
        closestSlot(trigger, "collapsible") ?? closestSlot(trigger, "accordion-item")
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

async function expandAriaDisclosures(restorer: Restorer) {
  const clicked: HTMLElement[] = []

  for (let pass = 0; pass < 8; pass += 1) {
    const triggers = Array.from(
      document.querySelectorAll<HTMLElement>('[aria-expanded="false"]'),
    ).filter((trigger) => {
      if (isPrintHidden(trigger)) {
        return false
      }
      const triggerSlot = trigger.getAttribute("data-slot") ?? ""
      return !INTERACTIVE_TRIGGER_SLOTS.has(triggerSlot)
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

function expandDetails(restorer: Restorer) {
  document.querySelectorAll("details").forEach((el) => {
    if (!(el instanceof HTMLDetailsElement) || el.open || isPrintHidden(el)) {
      return
    }
    el.open = true
    restorer.add(() => {
      el.open = false
    })
  })
}

function tabKey(el: HTMLElement) {
  return el.getAttribute("data-value") ?? el.getAttribute("value") ?? el.getAttribute("id")
}

function triggerLabel(el: HTMLElement) {
  return (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()
}

function isActiveTrigger(el: HTMLElement) {
  const state = el.getAttribute("data-state")
  if (state === "active" || state === "open") {
    return true
  }
  if (el.getAttribute("aria-selected") === "true") {
    return true
  }
  const selected = el.getAttribute("data-selected")
  return selected !== null && selected !== "false"
}

function tabTriggers(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')).filter(
    (trigger) => closestSlot(trigger, "tabs") === root,
  )
}

function tabPanels(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-slot="tabs-content"]')).filter(
    (panel) => closestSlot(panel, "tabs") === root,
  )
}

function revealPanel(panel: HTMLElement, restorer: Restorer) {
  if (panel.hidden) {
    panel.hidden = false
    restorer.add(() => {
      panel.hidden = true
    })
  }
  restorer.removeAttr(panel, "hidden")
  restorer.removeAttr(panel, "inert")
  const state = panel.getAttribute("data-state")
  if (state && state !== "active" && state !== "open") {
    restorer.setAttr(panel, "data-state", "active")
  }
  restorer.setStyle(panel, "display", "block")
  restorer.setStyle(panel, "height", "auto")
  restorer.setStyle(panel, "max-height", "none")
  restorer.setStyle(panel, "overflow", "visible")
  restorer.setStyle(panel, "opacity", "1")
  restorer.setStyle(panel, "visibility", "visible")
  restorer.setStyle(panel, "position", "static")
}

function insertTabHeading(panel: HTMLElement, label: string, restorer: Restorer) {
  if (!label) {
    return
  }

  const firstHeading = panel.querySelector("h1, h2, h3, h4")
  if (firstHeading && (firstHeading.textContent ?? "").trim() === label) {
    return
  }

  const heading = document.createElement("h2")
  heading.className = "canvas-print-tab-heading"
  heading.textContent = label
  panel.insertBefore(heading, panel.firstChild)
  restorer.add(() => heading.remove())
}

async function mountTabPanels(triggers: HTMLElement[]) {
  const original = triggers.find(isActiveTrigger) ?? triggers[0]

  for (const trigger of triggers) {
    if (isActiveTrigger(trigger)) {
      continue
    }
    trigger.click()
    await waitForPaint()
  }

  if (original && !isActiveTrigger(original)) {
    original.click()
    await waitForPaint()
  }
}

async function expandTabs(restorer: Restorer) {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="tabs"]'))
    .filter((root) => !isPrintHidden(root))
    .sort((left, right) => nestingDepth(right, "tabs") - nestingDepth(left, "tabs"))

  for (const root of roots) {
    const triggers = tabTriggers(root)
    if (triggers.length === 0) {
      continue
    }

    await mountTabPanels(triggers)

    const list = root.querySelector('[data-slot="tabs-list"]')
    if (list instanceof HTMLElement) {
      restorer.addClass(list, "canvas-print-hidden")
    }

    const panels = tabPanels(root)
    const panelsByKey = new Map(
      panels
        .map((panel) => [tabKey(panel), panel] as const)
        .filter((entry): entry is readonly [string, HTMLElement] => Boolean(entry[0])),
    )

    triggers.forEach((trigger, index) => {
      const key = tabKey(trigger)
      const panel = (key ? panelsByKey.get(key) : undefined) ?? panels[index]
      if (!panel) {
        return
      }
      revealPanel(panel, restorer)
      insertTabHeading(panel, triggerLabel(trigger), restorer)
    })

    for (const panel of panels) {
      revealPanel(panel, restorer)
    }
  }
}

function unclipElement(el: HTMLElement, restorer: Restorer) {
  restorer.setStyle(el, "overflow", "visible")
  restorer.setStyle(el, "overflow-x", "visible")
  restorer.setStyle(el, "overflow-y", "visible")
  restorer.setStyle(el, "max-width", "none")
  restorer.setStyle(el, "max-height", "none")
}

function unclipAncestors(el: HTMLElement, root: HTMLElement, restorer: Restorer, seen: Set<HTMLElement>) {
  for (let parent = el.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
    if (seen.has(parent) || isChartInternal(parent) || isPrintHidden(parent)) {
      continue
    }

    const style = getComputedStyle(parent)
    const clips =
      CLIP_OVERFLOW.has(style.overflowX) ||
      CLIP_OVERFLOW.has(style.overflowY) ||
      style.maxWidth !== "none"

    if (!clips && parent !== root) {
      continue
    }

    seen.add(parent)
    unclipElement(parent, restorer)
    if (parent === root) {
      break
    }
  }
}

function growAncestors(el: HTMLElement, root: HTMLElement, restorer: Restorer) {
  let child = el
  for (let parent = el.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
    if (isChartInternal(parent) || isPrintHidden(parent)) {
      child = parent
      continue
    }

    const extras = boxExtras(parent)
    const childRect = child.getBoundingClientRect()
    const neededWidth = Math.ceil(childRect.width + extras.paddingX + extras.borderX)
    const neededHeight = Math.ceil(childRect.height + extras.paddingY + extras.borderY)

    if (parent.offsetWidth + OVERFLOW_EPSILON < neededWidth) {
      restorer.setStyle(parent, "min-width", `${neededWidth}px`)
      restorer.setStyle(parent, "width", `${neededWidth}px`)
    }
    if (parent.offsetHeight + OVERFLOW_EPSILON < neededHeight) {
      restorer.setStyle(parent, "min-height", `${neededHeight}px`)
      restorer.setStyle(parent, "height", `${neededHeight}px`)
    }

    if (parent === root) {
      break
    }
    child = parent
  }
}

function expandOverflow(root: HTMLElement, restorer: Restorer) {
  const measured: Array<{
    el: HTMLElement
    scrollX: boolean
    scrollY: boolean
    wrapCode: boolean
    scrollWidth: number
    scrollHeight: number
  }> = []

  for (const node of root.querySelectorAll("*")) {
    if (!(node instanceof HTMLElement) || isPrintHidden(node) || isChartInternal(node)) {
      continue
    }

    const style = getComputedStyle(node)
    if (style.display === "none") {
      continue
    }

    const scrollX =
      SCROLL_OVERFLOW.has(style.overflowX) && node.scrollWidth > node.clientWidth + OVERFLOW_EPSILON
    const scrollY =
      SCROLL_OVERFLOW.has(style.overflowY) && node.scrollHeight > node.clientHeight + OVERFLOW_EPSILON

    if (!scrollX && !scrollY) {
      continue
    }

    measured.push({
      el: node,
      scrollX,
      scrollY,
      wrapCode: shouldWrapCode(node, scrollX),
      scrollWidth: node.scrollWidth,
      scrollHeight: node.scrollHeight,
    })
  }

  const unclipped = new Set<HTMLElement>()

  for (const item of measured) {
    if (item.wrapCode) {
      restorer.setStyle(item.el, "white-space", "pre-wrap")
      restorer.setStyle(item.el, "overflow-wrap", "anywhere")
      restorer.setStyle(item.el, "word-break", "break-word")
      restorer.setStyle(item.el, "overflow-x", "visible")
      restorer.setStyle(item.el, "max-width", "100%")
      continue
    }

    unclipElement(item.el, restorer)
    const extras = boxExtras(item.el)
    if (item.scrollX) {
      const width = item.scrollWidth + extras.borderX
      restorer.setStyle(item.el, "min-width", `${width}px`)
      restorer.setStyle(item.el, "width", `${width}px`)
    }
    if (item.scrollY) {
      restorer.setStyle(item.el, "height", `${item.scrollHeight + extras.borderY}px`)
    }
    unclipAncestors(item.el, root, restorer, unclipped)
    growAncestors(item.el, root, restorer)
  }
}

function prepareCapture(restorer: Restorer, root: HTMLElement) {
  restorer.setStyle(document.documentElement, "height", "auto")
  restorer.setStyle(document.body, "height", "auto")
  restorer.setStyle(document.documentElement, "overflow", "visible")
  restorer.setStyle(document.body, "overflow", "visible")

  restorer.setStyle(root, "min-height", "auto")
  restorer.setStyle(root, "height", "auto")
  restorer.setStyle(root, "overflow", "visible")

  const main = root.querySelector("main")
  if (main instanceof HTMLElement) {
    restorer.setStyle(main, "overflow", "visible")
  }
}

function paddedBorderBox(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return {
    width: Math.max(1, Math.ceil(Math.max(el.offsetWidth, el.scrollWidth, rect.width))),
    height: Math.max(1, Math.ceil(Math.max(el.offsetHeight, el.scrollHeight, rect.height))),
  }
}

function pageSizeMm(widthPx: number, heightPx: number) {
  let widthMm = widthPx * PX_TO_MM
  let heightMm = heightPx * PX_TO_MM + 2
  if (widthMm > MAX_PAGE_MM || heightMm > MAX_PAGE_MM) {
    const scale = Math.min(MAX_PAGE_MM / widthMm, MAX_PAGE_MM / heightMm)
    widthMm *= scale
    heightMm *= scale
  }
  return { widthMm, heightMm }
}

function pdfFilename() {
  const heading = document.querySelector(".canvas-root h1")
  const raw = (heading?.textContent || document.title || "canvas").trim()
  const slug = raw
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return `${slug || "canvas"}.pdf`
}

export async function prepareCanvasForPdf() {
  const restorer = createRestorer()
  restorer.addClass(document.documentElement, "canvas-print-preparing")
  await expandDisclosures(restorer)
  await expandAriaDisclosures(restorer)
  expandDetails(restorer)
  await expandTabs(restorer)

  const root = document.querySelector(".canvas-root")
  if (!(root instanceof HTMLElement)) {
    throw new Error("Canvas root missing")
  }

  expandOverflow(root, restorer)
  prepareCapture(restorer, root)
  await settleLayout()
}

export function measureCanvasPage() {
  const root = document.querySelector(".canvas-root")
  if (!(root instanceof HTMLElement)) {
    throw new Error("Canvas root missing")
  }

  const { width, height } = paddedBorderBox(root)
  const { widthMm, heightMm } = pageSizeMm(width, height)
  return {
    widthPx: widthMm / PX_TO_MM,
    heightPx: heightMm / PX_TO_MM,
    widthMm,
    heightMm,
    filename: pdfFilename(),
  }
}
