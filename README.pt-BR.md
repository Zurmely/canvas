# Canvas Design

[English](README.md) · [Português (Brasil)](README.pt-BR.md) · [Website](https://canvas.zurmely.com)

Uma skill do Cursor para criar páginas visuais independentes com React, TypeScript, Tailwind CSS e [shadcn/ui](https://ui.shadcn.com). Invocada com `/canvas-design`.

Ela **não** usa o runtime de canvas embutido do Cursor. As páginas são arquivos reais no projeto: um fonte React ao vivo que você continua editando, ou um único arquivo HTML que abre no navegador.

A página é pensada para a **tela**. O PDF é um recorte opcional para compartilhar essa página — não um layout de impressão, relatório em papel ou deck de slides.

## Instalar

```bash
npx skills add Zurmely/canvas -g -a cursor
```

Isso instala a skill para todo workspace do Cursor (`~/.cursor/skills/canvas-design/`).

Só neste projeto (commitada com o time):

```bash
npx skills add Zurmely/canvas -a cursor
```

Outros agentes que seguem o padrão [Agent Skills](https://agentskills.io):

```bash
npx skills add Zurmely/canvas
```

## Usar

No chat do Cursor Agent:

```text
/canvas-design
```

Em seguida descreva a página. Na primeira vez no workspace, a skill pergunta:

- **React + TypeScript (Recomendado)** — uma página ao vivo que você continua editando neste projeto
- **HTML autônomo** — uma página que você abre no navegador

e:

- **shadcn padrão** — manter as cores padrão do shadcn
- **Combinar com o assunto (Recomendado)** — colorir a página de acordo com o tema

Essas escolhas ficam salvas no workspace. Depois, use `/canvas-design` de novo para adicionar ou revisar páginas. A skill cria um runtime descartável em `.canvas/` (ignorado pelo git) e grava uma **pasta com nome** ao lado do arquivo ou da pasta que você referenciou:

```text
marie-curie/
  marie-curie.canvas.tsx   # fonte React editável
  marie-curie.html         # só no modo HTML
  marie-curie.pdf          # se você exportar um PDF
  curie.canvas.jpg         # still opcional; ignorado pelo git
```

## Depois de criar

A skill pergunta o que fazer com a página pronta:

- **Abrir no navegador** — o arquivo HTML, ou um preview local do React
- **Apresentar** — deixar os arquivos no projeto sem abrir nada
- **Exportar como PDF** — uma página vetorial do canvas inteiro (texto selecionável e gráficos em SVG)

Se você exportar um PDF, ela pergunta **claro** ou **escuro**, só desta vez ou como padrão para as próximas exportações naquele workspace. Acordeões abrem, abas viram seções com título, filtros saem do PDF em favor do conjunto completo, e regiões com rolagem se expandem para nada ficar recortado. A página ao vivo não tem botão de salvar PDF; a exportação roda no terminal depois que a página é gerada.

## Atualizar

```bash
npx skills add Zurmely/canvas -g -a cursor
```

Rodar o mesmo comando de novo substitui a skill instalada pela versão mais recente deste repositório.

## O que ela produz

- Layout semântico, componentes shadcn importados do fonte, e gráficos via Recharts
- Stills opcionais em domínio público do Wikimedia Commons (e hosts semelhantes sem copyright), gravados como `*.canvas.jpg` ignorados pelo git na pasta do canvas e embutidos nas exportações HTML/PDF. As imagens entram só quando ajudam a identificar o assunto — não como decoração.
- Cores padrão do shadcn ou uma paleta combinada com o assunto da página (escolhida uma vez por workspace; sem seletor de tema na página)
- Temas claro e escuro que acompanham o sistema até você alternar
- PDF vetorial opcional de uma página com o layout da tela (claro ou escuro), gravado ao lado do fonte
- Exportação HTML opcional em um único arquivo, sem assets irmãos

## Layout

```text
.
├── README.md             # Instalação e uso (inglês)
├── README.pt-BR.md       # O mesmo guia em português brasileiro
├── .gitignore            # Regras de ignore do repositório; não faz parte da skill
├── docs/                 # Site público em canvas.zurmely.com; não faz parte da skill
│   ├── CNAME
│   ├── index.canvas.tsx  # Fonte React editável
│   └── index.html        # Página gerada servida pelo GitHub Pages
└── skills/
    └── canvas-design/
        ├── SKILL.md              # Instruções para o agente
        ├── SCAFFOLD.md           # Setup do runtime no primeiro uso
        ├── SHADCN-MAPPING.md     # Escolha de componentes
        ├── CHARTS.md             # Orientação de gráficos
        ├── IMAGES.md             # Stills em domínio público do Wikimedia Commons
        ├── runtime/              # CanvasShell, CSS de impressão, layout de impressão, config Vite, package.json pinado
        │   ├── dropdown-menu.tsx
        │   ├── canvas-shell.tsx
        │   ├── print-layout.ts
        │   ├── print.css
        │   ├── vite-env.d.ts
        │   ├── vite.config.ts
        │   ├── package.json
        │   └── package-lock.json
        └── scripts/
            ├── scaffold.mjs              # Cria o runtime gitignored em .canvas/
            ├── sync-runtime.mjs          # Copia shell/impressão/Vite/build para .canvas/
            ├── build.mjs                 # Copiado para .canvas/ para typecheck e bundle
            ├── export-pdf.mjs            # Copiado para .canvas/ para converter a página em PDF
            ├── fetch-commons-image.mjs   # Stills em domínio público do Wikimedia Commons na autoria
            └── reset-runtime.mjs         # Apaga o runtime para o primeiro uso rodar de novo
```

`npx skills add Zurmely/canvas` encontra `skills/canvas-design/` e copia só essa pasta para `.cursor/skills/canvas-design/` (ou `~/.cursor/skills/canvas-design/` com `-g`). Não copia este README, o `README.md` em inglês, o `.gitignore`, nem `docs/`.
