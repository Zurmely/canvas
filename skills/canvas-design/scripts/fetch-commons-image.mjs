#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"

const COMMONS_API = "https://commons.wikimedia.org/w/api.php"
const USER_AGENT =
  "canvas-design/1.0 (https://github.com/Zurmely/canvas; public-domain canvas images)"
const DEFAULT_WIDTH = 1280
const MAX_BYTES = 500_000
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const ALLOWED_FROM_URL_HOSTS = [
  ".wikimedia.org",
  ".wikipedia.org",
  ".nasa.gov",
  ".si.edu",
  ".metmuseum.org",
  ".loc.gov",
]

const args = parseArgs(process.argv.slice(2))

if (args.help || (!args.query && !args.file && !args.fromUrl)) {
  console.error(`Usage:
  fetch-commons-image.mjs --query "Marie Curie portrait" --write ./curie.image.ts
  fetch-commons-image.mjs --query "Marie Curie portrait" --candidates
  fetch-commons-image.mjs --file "File:Marie_Curie_c1920.jpg" --write ./curie.image.ts
  fetch-commons-image.mjs --from-url <https-url> --license "Public domain" --credit "NASA" --alt "..." --write ./saturn.image.ts

Fetches a public-domain or CC0 still image at authoring time and writes a TypeScript
module with an embedded data URL. Never hotlink. Never use copyrighted or CC BY files.`)
  process.exit(args.help ? 0 : 1)
}

try {
  const result = await main(args)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (!result.ok) process.exit(1)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`)
  process.exit(1)
}

async function main(options) {
  if (options.fromUrl) {
    if (!options.write) {
      return { ok: false, error: "--write is required with --from-url" }
    }
    if (!options.license || !isUncopyrightedLicense(options.license)) {
      return {
        ok: false,
        error: "--from-url requires --license of Public domain, CC0, or PDM",
      }
    }
    if (!options.credit || !options.alt) {
      return { ok: false, error: "--from-url requires --credit and --alt" }
    }
    const downloaded = await downloadToDataUrl(options.fromUrl, options.width)
    const written = writeModule(options.write, options.exportName, {
      src: downloaded.dataUrl,
      alt: options.alt,
      credit: options.credit,
      sourceUrl: options.fromUrl,
      license: options.license,
    })
    return {
      ok: true,
      written: written.path,
      exportName: written.exportName,
      alt: options.alt,
      credit: options.credit,
      license: options.license,
      sourceUrl: options.fromUrl,
      bytes: downloaded.bytes,
      mime: downloaded.mime,
    }
  }

  const records = options.file
    ? await lookupFile(options.file, options.width)
    : await searchCommons(options.query, options.width)

  const allowed = records
    .filter(isUsableImage)
    .sort((left, right) => scoreImage(right, options.query) - scoreImage(left, options.query))

  if (options.candidates) {
    return {
      ok: true,
      candidates: allowed.slice(0, 8).map(summarizeCandidate),
    }
  }

  if (!allowed.length) {
    return {
      ok: false,
      error:
        "No public-domain or CC0 still image matched. Omit the picture rather than using a copyrighted stand-in.",
    }
  }

  if (!options.write) {
    return { ok: false, error: "--write is required unless --candidates is set" }
  }

  const chosen = allowed[0]
  const imageUrl = chosen.thumbUrl || chosen.url
  const downloaded = await downloadToDataUrl(imageUrl, options.width)
  const written = writeModule(options.write, options.exportName, {
    src: downloaded.dataUrl,
    alt: chosen.alt,
    credit: chosen.credit,
    sourceUrl: chosen.pageUrl,
    license: chosen.license,
  })

  return {
    ok: true,
    written: written.path,
    exportName: written.exportName,
    title: chosen.title,
    alt: chosen.alt,
    credit: chosen.credit,
    license: chosen.license,
    sourceUrl: chosen.pageUrl,
    bytes: downloaded.bytes,
    mime: downloaded.mime,
  }
}

function parseArgs(argv) {
  const options = {
    query: "",
    file: "",
    fromUrl: "",
    write: "",
    exportName: "",
    license: "",
    credit: "",
    alt: "",
    width: DEFAULT_WIDTH,
    candidates: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]
    if (token === "--help" || token === "-h") options.help = true
    else if (token === "--candidates") options.candidates = true
    else if (token === "--query" && next) {
      options.query = next
      index += 1
    } else if (token === "--file" && next) {
      options.file = next
      index += 1
    } else if (token === "--from-url" && next) {
      options.fromUrl = next
      index += 1
    } else if (token === "--write" && next) {
      options.write = next
      index += 1
    } else if (token === "--export-name" && next) {
      options.exportName = next
      index += 1
    } else if (token === "--license" && next) {
      options.license = next
      index += 1
    } else if (token === "--credit" && next) {
      options.credit = next
      index += 1
    } else if (token === "--alt" && next) {
      options.alt = next
      index += 1
    } else if (token === "--width" && next) {
      options.width = Number.parseInt(next, 10) || DEFAULT_WIDTH
      index += 1
    }
  }

  return options
}

async function searchCommons(query, width) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(width),
    iiextmetadatafilter:
      "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Restrictions|Copyrighted|ObjectName",
    iiextmetadatalanguage: "en",
  })
  const payload = await commonsJson(params)
  return (payload.query?.pages ?? []).map((page) => normalizePage(page, width))
}

async function lookupFile(fileTitle, width) {
  const title = fileTitle.startsWith("File:") ? fileTitle : `File:${fileTitle}`
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(width),
    iiextmetadatafilter:
      "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Restrictions|Copyrighted|ObjectName",
    iiextmetadatalanguage: "en",
  })
  const payload = await commonsJson(params)
  return (payload.query?.pages ?? [])
    .filter((page) => !page.missing)
    .map((page) => normalizePage(page, width))
}

async function commonsJson(params) {
  const response = await fetch(`${COMMONS_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Wikimedia Commons API returned ${response.status}`)
  }
  return response.json()
}

function normalizePage(page) {
  const info = page.imageinfo?.[0] ?? {}
  const meta = info.extmetadata ?? {}
  const license = metaValue(meta.LicenseShortName)
  const description = metaValue(meta.ImageDescription)
  const objectName = metaValue(meta.ObjectName)
  const artist = metaValue(meta.Artist)
  const restrictions = metaValue(meta.Restrictions)
  const title = page.title ?? ""
  const alt = firstSentence(description) || objectName || altFromTitle(title)
  const credit = buildCredit(license, artist)

  return {
    title,
    pageUrl: title ? `https://commons.wikimedia.org/wiki/${encodeURI(title)}` : "",
    url: info.url ?? "",
    thumbUrl: info.thumburl ?? "",
    mime: info.mime ?? "",
    width: info.thumbwidth || info.width || 0,
    license,
    copyrighted: metaValue(meta.Copyrighted),
    restrictions,
    alt,
    credit,
    artist,
  }
}

function isUsableImage(record) {
  if (!ALLOWED_MIME.has(record.mime)) return false
  if (!record.thumbUrl && !record.url) return false
  if (!isUncopyrightedLicense(record.license)) return false
  if (/^true$/i.test(record.copyrighted) && !isUncopyrightedLicense(record.license)) return false
  if (record.restrictions && !/no known restrictions/i.test(record.restrictions)) return false
  if (record.width && record.width < 400) return false
  return true
}

function isUncopyrightedLicense(license) {
  const name = String(license ?? "")
    .trim()
    .toLowerCase()
  if (!name) return false
  if (/by-nc|by-nd|by-sa|fair use|gfdl|all rights reserved/.test(name)) return false
  if (/\bcc0\b/.test(name) || /creative commons cc0/.test(name)) return true
  if (/public domain/.test(name) || /\bpdm\b/.test(name)) return true
  if (/^pd\b/.test(name) || /^pd[- _]/.test(name)) return true
  return false
}

function scoreImage(record, query) {
  let score = 0
  const title = record.title.toLowerCase()
  const tokens = String(query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2 && token !== "file")
  for (const token of tokens) {
    if (title.includes(token)) score += 2
  }
  if (record.mime === "image/jpeg") score += 1
  if (record.width >= 800) score += 1
  if (/public domain|cc0|pdm/.test(record.license.toLowerCase())) score += 1
  return score
}

function summarizeCandidate(record) {
  return {
    file: record.title,
    license: record.license,
    alt: record.alt,
    credit: record.credit,
    sourceUrl: record.pageUrl,
    mime: record.mime,
    width: record.width,
  }
}

async function downloadToDataUrl(url, width) {
  assertAllowedUrl(url)
  const first = await fetchImage(url)
  if (first.bytes <= MAX_BYTES) {
    return first
  }

  const smallerWidth = Math.min(800, width)
  if (url.includes("/thumb/") && smallerWidth < width) {
    const resized = url.replace(/\/\d+px-/, `/${smallerWidth}px-`)
    if (resized !== url) {
      const second = await fetchImage(resized)
      if (second.bytes <= MAX_BYTES) return second
    }
  }

  throw new Error(`Image is ${first.bytes} bytes; keep stills under ${MAX_BYTES} bytes`)
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    redirect: "follow",
  })
  if (!response.ok) {
    throw new Error(`Image download returned ${response.status}`)
  }
  const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim()
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported image type: ${mime || "unknown"}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  return {
    mime,
    bytes: buffer.byteLength,
    dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
  }
}

function assertAllowedUrl(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error("Image URL is invalid")
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Image URL must be https")
  }
  const host = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_FROM_URL_HOSTS.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  )
  if (!allowed) {
    throw new Error(
      "URL host is not a known public-domain source (Wikimedia, NASA, Smithsonian, Met, Library of Congress)",
    )
  }
}

function writeModule(writePath, exportName, image) {
  const resolved = resolveWritePath(writePath)
  mkdirSync(dirname(resolved), { recursive: true })
  const name = toExportName(resolved, exportName)
  const source = `export const ${name} = ${JSON.stringify(image, null, 2)} as const\n`
  writeFileSync(resolved, source)
  return { path: resolved, exportName: name }
}

function resolveWritePath(writePath) {
  const absolute = isAbsolute(writePath) ? writePath : resolve(process.cwd(), writePath)
  return absolute.endsWith(".image.ts") ? absolute : `${absolute}.image.ts`
}

function toExportName(filePath, explicit) {
  if (explicit) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(explicit)) {
      throw new Error("--export-name must be a valid JavaScript identifier")
    }
    return explicit
  }
  const base = filePath.split("/").pop()?.replace(/\.image\.ts$/i, "") ?? "commonsImage"
  const camel = base
    .replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_, character) => character.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "")
  const identifier = camel || "commonsImage"
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `image${identifier}`
}

function metaValue(field) {
  return plainText(field?.value ?? "")
}

function plainText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\bUnknown author(?: Unknown author)+\b/gi, "Unknown author")
    .replace(/\s+/g, " ")
    .trim()
}

function firstSentence(value) {
  if (!value) return ""
  const match = value.match(/^[^.!?]+[.!?]?/)
  const sentence = (match ? match[0] : value).trim()
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}…` : sentence
}

function altFromTitle(title) {
  return title
    .replace(/^File:/, "")
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/_/g, " ")
    .trim()
}

function buildCredit(license, artist) {
  const parts = ["Wikimedia Commons", license || "Public domain"]
  if (artist) {
    const shortArtist = artist.length > 48 ? `${artist.slice(0, 45).trim()}…` : artist
    parts.push(shortArtist)
  }
  return parts.join(" · ")
}
