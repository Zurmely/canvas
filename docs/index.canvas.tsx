import { useState } from "react"
import {
  Check,
  Copy,
  FileCode,
  FolderGit2,
  Globe,
  Monitor,
  Terminal,
} from "lucide-react"

import { CanvasShell } from "@/canvas-shell"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const GLOBAL_INSTALL = "npx skills add Zurmely/canvas -g -a cursor"
const PROJECT_INSTALL = "npx skills add Zurmely/canvas -a cursor"
const ANY_AGENT_INSTALL = "npx skills add Zurmely/canvas"

const installRows = [
  {
    id: "global",
    scopeEn: "Every Cursor workspace",
    scopePt: "Todo workspace do Cursor",
    noteEn: "Installs to ~/.cursor/skills/canvas-design/",
    notePt: "Instala em ~/.cursor/skills/canvas-design/",
    command: GLOBAL_INSTALL,
  },
  {
    id: "project",
    scopeEn: "This project only",
    scopePt: "Só neste projeto",
    noteEn: "Committed with the team",
    notePt: "Commitada com o time",
    command: PROJECT_INSTALL,
  },
  {
    id: "any",
    scopeEn: "Other agents",
    scopePt: "Outros agentes",
    noteEn: "Any client that speaks Agent Skills",
    notePt: "Qualquer cliente que siga Agent Skills",
    command: ANY_AGENT_INSTALL,
  },
] as const

const firstUseChoices = [
  {
    id: "react",
    titleEn: "React + TypeScript",
    titlePt: "React + TypeScript",
    badgeEn: "Recommended",
    badgePt: "Recomendado",
    bodyEn: "A live page you can keep working on in this project.",
    bodyPt: "Uma página ao vivo que você continua editando neste projeto.",
  },
  {
    id: "html",
    titleEn: "Self-contained HTML",
    titlePt: "HTML autônomo",
    badgeEn: "Open in a browser",
    badgePt: "Abrir no navegador",
    bodyEn: "A page you can open in a browser as a single file.",
    bodyPt: "Uma página que você abre no navegador em um único arquivo.",
  },
  {
    id: "neutral",
    titleEn: "Default shadcn",
    titlePt: "shadcn padrão",
    badgeEn: "Stock colors",
    badgePt: "Cores padrão",
    bodyEn: "Keep the standard shadcn colors.",
    bodyPt: "Manter as cores padrão do shadcn.",
  },
  {
    id: "content",
    titleEn: "Match the topic",
    titlePt: "Combinar com o assunto",
    badgeEn: "Recommended",
    badgePt: "Recomendado",
    bodyEn: "Color the page to fit the subject.",
    bodyPt: "Colorir a página de acordo com o tema.",
  },
] as const

const afterCreation = [
  {
    id: "open",
    titleEn: "Open in browser",
    titlePt: "Abrir no navegador",
    bodyEn: "The HTML file, or a local React preview.",
    bodyPt: "O arquivo HTML, ou um preview local do React.",
  },
  {
    id: "present",
    titleEn: "Present",
    titlePt: "Apresentar",
    bodyEn: "Leave the files in the project without opening anything.",
    bodyPt: "Deixar os arquivos no projeto sem abrir nada.",
  },
  {
    id: "pdf",
    titleEn: "Export as PDF",
    titlePt: "Exportar como PDF",
    bodyEn:
      "One vector page of the full canvas, with selectable text and SVG charts. Then choose light or dark, once or as the default for later exports.",
    bodyPt:
      "Uma página vetorial do canvas inteiro, com texto selecionável e gráficos em SVG. Depois escolha claro ou escuro, só desta vez ou como padrão.",
  },
] as const

const outputs = [
  {
    titleEn: "Semantic layout",
    titlePt: "Layout semântico",
    bodyEn: "shadcn components imported from source, charts via Recharts.",
    bodyPt: "Componentes shadcn importados do fonte, gráficos via Recharts.",
  },
  {
    titleEn: "Optional stills",
    titlePt: "Stills opcionais",
    bodyEn:
      "Public-domain images from Wikimedia Commons when they help identify the subject — not as decoration.",
    bodyPt:
      "Imagens em domínio público do Wikimedia Commons quando ajudam a identificar o assunto — não como decoração.",
  },
  {
    titleEn: "Light and dark",
    titlePt: "Claro e escuro",
    bodyEn: "Follows the system until you toggle. No theme picker on the page.",
    bodyPt: "Acompanham o sistema até você alternar. Sem seletor de tema na página.",
  },
  {
    titleEn: "Optional PDF",
    titlePt: "PDF opcional",
    bodyEn: "One-page vector snapshot of the whole screen layout, written beside the source.",
    bodyPt: "Recorte vetorial de uma página com o layout da tela, gravado ao lado do fonte.",
  },
] as const

function CopyCommand({ command, compact = false }: { command: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={
        compact
          ? "flex min-w-0 items-center gap-2"
          : "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
      }
    >
      <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground">
        {command}
      </code>
      <Button
        type="button"
        variant={copied ? "secondary" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => void copyCommand()}
        aria-label={copied ? "Copied install command" : "Copy install command"}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

function Guide({ locale }: { locale: "en" | "pt" }) {
  const isEn = locale === "en"

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{isEn ? "Install" : "Instalar"}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {isEn
            ? "That global command installs the skill for every Cursor workspace. Re-run it to overwrite the installed skill with the latest from this repo."
            : "Esse comando global instala a skill para todo workspace do Cursor. Rode de novo para substituir a skill instalada pela versão mais recente deste repositório."}
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "Scope" : "Escopo"}</TableHead>
                <TableHead className="min-w-[20rem]">{isEn ? "Command" : "Comando"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{isEn ? row.scopeEn : row.scopePt}</div>
                    <div className="text-xs text-muted-foreground">
                      {isEn ? row.noteEn : row.notePt}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CopyCommand command={row.command} compact />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{isEn ? "Use" : "Usar"}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {isEn
            ? "In Cursor Agent chat, type /canvas-design and describe the page. On first use in a workspace, the skill asks for format and look. Those choices are stored for later."
            : "No chat do Cursor Agent, digite /canvas-design e descreva a página. Na primeira vez no workspace, a skill pergunta formato e visual. Essas escolhas ficam salvas."}
        </p>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">
          /canvas-design
        </pre>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "Choice" : "Escolha"}</TableHead>
                <TableHead>{isEn ? "What it means" : "O que significa"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firstUseChoices.map((choice) => (
                <TableRow key={choice.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{isEn ? choice.titleEn : choice.titlePt}</span>
                      <Badge variant="outline">{isEn ? choice.badgeEn : choice.badgePt}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isEn ? choice.bodyEn : choice.bodyPt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "The skill writes a named folder next to the file or folder you referenced: React source, optional HTML, optional PDF, and optional stills (gitignored)."
            : "A skill grava uma pasta com nome ao lado do arquivo ou da pasta que você referenciou: fonte React, HTML opcional, PDF opcional e stills opcionais (ignorados pelo git)."}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          {isEn ? "After creation" : "Depois de criar"}
        </h2>
        <Accordion keepMounted>
          {afterCreation.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{isEn ? item.titleEn : item.titlePt}</AccordionTrigger>
              <AccordionContent>{isEn ? item.bodyEn : item.bodyPt}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "The live page has no Save as PDF button. Export runs from the terminal after the page is built. Accordions open, tabs become labeled sections, filters drop out in favor of the full dataset, and scrollable regions expand so nothing is clipped."
            : "A página ao vivo não tem botão de salvar PDF. A exportação roda no terminal depois que a página é gerada. Acordeões abrem, abas viram seções com título, filtros saem do PDF em favor do conjunto completo, e regiões com rolagem se expandem para nada ficar recortado."}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          {isEn ? "What it produces" : "O que ela produz"}
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {outputs.map((item) => (
            <li key={item.titleEn}>
              <span className="font-medium text-foreground">
                {isEn ? item.titleEn : item.titlePt}.
              </span>{" "}
              {isEn ? item.bodyEn : item.bodyPt}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{isEn ? "In this repository" : "Neste repositório"}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {isEn
            ? "npx skills add Zurmely/canvas discovers skills/canvas-design/ and copies only that folder. It does not copy this website, the READMEs, or .gitignore."
            : "npx skills add Zurmely/canvas encontra skills/canvas-design/ e copia só essa pasta. Não copia este site, os READMEs nem o .gitignore."}
        </p>
      </section>
    </div>
  )
}

export default function CanvasDesignLanding() {
  return (
    <CanvasShell title="Canvas Design">
      <div className="space-y-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Cursor skill</Badge>
              <Badge variant="secondary">React</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Tailwind</Badge>
              <Badge variant="outline">shadcn/ui</Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              A Cursor skill for building standalone visual pages. Invoke it with{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                /canvas-design
              </code>
              . Pages are real files in your project — not Cursor’s built-in canvas runtime.
              Designed for the screen; PDF is an optional share snapshot.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                className={buttonVariants()}
                href="https://github.com/Zurmely/canvas"
              >
                <FolderGit2 data-icon="inline-start" aria-hidden="true" />
                GitHub
              </a>
              <a
                className={buttonVariants({ variant: "outline" })}
                href="https://ui.shadcn.com"
              >
                <FileCode data-icon="inline-start" aria-hidden="true" />
                shadcn/ui
              </a>
              <a
                className={buttonVariants({ variant: "outline" })}
                href="https://agentskills.io"
              >
                <Globe data-icon="inline-start" aria-hidden="true" />
                Agent Skills
              </a>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="size-4" />
                Install for Cursor
              </CardTitle>
              <CardDescription>Global install, every workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <CopyCommand command={GLOBAL_INSTALL} />
            </CardContent>
          </Card>
        </header>

        <Alert>
          <Monitor className="size-4" />
          <AlertTitle>Screen first</AlertTitle>
          <AlertDescription>
            The page is designed for the screen. PDF is an optional share snapshot of that
            page — not a print layout, paper report, or slide deck.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="en">
          <TabsList aria-label="Language">
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="pt">Português (Brasil)</TabsTrigger>
          </TabsList>
          <TabsContent value="en" keepMounted className="mt-6">
            <Guide locale="en" />
          </TabsContent>
          <TabsContent value="pt" keepMounted className="mt-6">
            <Guide locale="pt" />
          </TabsContent>
        </Tabs>
      </div>
    </CanvasShell>
  )
}
