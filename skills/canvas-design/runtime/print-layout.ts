export type PrintOrientation = "portrait" | "landscape"

export const PAGE_WIDTHS = {
  portrait: 1080,
  landscape: 1920,
} as const

const INSET_PX = 48
const PAGE_STYLE_ID = "canvas-print-page-size"

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

function closestSlot(el: Element, name: string) {
  return el.closest(`[data-slot="${name}"]`)
}

function isPrintHidden(el: Element) {
  return Boolean(el.closest(".canvas-print-hidden"))
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

function applyPrintWidth(orientation: PrintOrientation, restorer: Restorer) {
  const root = document.querySelector(".canvas-root")
  const main = root?.querySelector(":scope > main")
  if (!(root instanceof HTMLElement)) {
    return
  }

  const innerWidth = PAGE_WIDTHS[orientation] - INSET_PX * 2

  restorer.setStyle(document.documentElement, "height", "auto")
  restorer.setStyle(document.body, "height", "auto")
  restorer.setStyle(document.documentElement, "overflow", "visible")
  restorer.setStyle(document.body, "overflow", "visible")

  restorer.setStyle(root, "width", `${innerWidth}px`)
  restorer.setStyle(root, "max-width", `${innerWidth}px`)
  restorer.setStyle(root, "min-height", "auto")
  restorer.setStyle(root, "box-sizing", "border-box")
  restorer.setStyle(root, "padding", "0px")
  restorer.setStyle(root, "margin-left", "auto")
  restorer.setStyle(root, "margin-right", "auto")
  restorer.setStyle(root, "overflow", "visible")

  if (main instanceof HTMLElement) {
    restorer.setStyle(main, "width", "100%")
    restorer.setStyle(main, "max-width", "none")
    restorer.setStyle(main, "padding-left", "0px")
    restorer.setStyle(main, "padding-right", "0px")
    restorer.setStyle(main, "overflow", "visible")
  }
}

function applyWholePageSize(
  orientation: PrintOrientation,
  root: HTMLElement,
  restorer: Restorer,
) {
  const pageWidth = PAGE_WIDTHS[orientation]
  const contentHeight = Math.ceil(
    Math.max(root.scrollHeight, root.getBoundingClientRect().height),
  )
  const pageHeight = contentHeight + INSET_PX * 2 + 2

  restorer.setAttr(document.documentElement, "data-canvas-print-orient", orientation)

  const existing = document.getElementById(PAGE_STYLE_ID)
  const style = existing instanceof HTMLStyleElement ? existing : document.createElement("style")
  style.id = PAGE_STYLE_ID
  style.textContent = `@page { size: ${pageWidth}px ${pageHeight}px; margin: ${INSET_PX}px; background: var(--background); }`
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

export async function printCanvas(orientation: PrintOrientation) {
  if (printing) {
    return
  }
  printing = true
  const restorer = createRestorer()

  try {
    restorer.addClass(document.documentElement, "canvas-print-preparing")
    await expandDisclosures(restorer)
    await expandAriaDisclosures(restorer)
    expandDetails(restorer)
    await expandTabs(restorer)
    applyPrintWidth(orientation, restorer)
    await settleLayout()

    const root = document.querySelector(".canvas-root")
    if (root instanceof HTMLElement) {
      applyWholePageSize(orientation, root, restorer)
    }

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) {
          return
        }
        settled = true
        window.clearTimeout(timeout)
        window.removeEventListener("afterprint", finish)
        resolve()
      }
      const timeout = window.setTimeout(finish, 60_000)
      window.addEventListener("afterprint", finish)
      window.print()
    })
  } finally {
    restorer.restore()
    printing = false
  }
}
