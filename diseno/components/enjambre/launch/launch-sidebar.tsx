'use client'

import {
  Boxes,
  Plus,
  GitBranch,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Code2,
  Sparkles,
  Gem,
  Hexagon,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  GitCommitHorizontal,
  MessageSquare,
  GitPullRequest,
} from 'lucide-react'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-2 pt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  )
}

const activeAgents = [
  { name: 'Grok', icon: Sparkles },
  { name: 'Claude', icon: Hexagon },
  { name: 'Codex', icon: Code2 },
  { name: 'Gemini', icon: Gem },
  { name: 'Jules', icon: Boxes },
]

type Node = {
  name: string
  type: 'folder' | 'file'
  open?: boolean
  badge?: string
  depth: number
}

const tree: Node[] = [
  { name: 'ecommerce-nexus', type: 'folder', open: true, depth: 0 },
  { name: '.github', type: 'folder', depth: 1 },
  { name: 'app', type: 'folder', depth: 1 },
  { name: 'web', type: 'folder', open: true, depth: 1 },
  { name: 'src', type: 'folder', depth: 2 },
  { name: 'utils', type: 'folder', depth: 2 },
  { name: 'components', type: 'folder', depth: 2 },
  { name: 'services', type: 'folder', open: true, depth: 2 },
  { name: 'api', type: 'folder', depth: 3 },
  { name: 'graphql', type: 'folder', depth: 3 },
  { name: 'auth.ts', type: 'file', depth: 3 },
  { name: 'cart.service.ts', type: 'file', badge: 'TSX', depth: 3 },
  { name: 'types', type: 'folder', depth: 1 },
  { name: 'pages', type: 'folder', depth: 1 },
  { name: 'styles', type: 'folder', depth: 1 },
  { name: 'layout.tsx', type: 'file', badge: 'TSX', depth: 1 },
  { name: 'packages', type: 'folder', depth: 0 },
  { name: 'tests', type: 'folder', depth: 0 },
  { name: '.env.example', type: 'file', depth: 0 },
  { name: 'docker-compose.yml', type: 'file', depth: 0 },
  { name: 'README.md', type: 'file', badge: 'M+4', depth: 0 },
  { name: 'tsconfig.json', type: 'file', depth: 0 },
]

export function LaunchSidebar() {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col gap-5 overflow-y-auto scrollbar-thin border-r border-sidebar-border bg-sidebar px-4 py-5">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-primary/15 glow-purple">
          <Hexagon className="size-6 fill-accent/20 text-accent" />
        </div>
        <div className="leading-tight">
          <h1 className="font-heading text-lg font-bold tracking-[0.22em] text-foreground">
            ENJAMBRE
          </h1>
          <p className="font-mono text-[11px] text-primary">IA Coder</p>
          <p className="text-[10px] text-muted-foreground">by Ostadia Studio</p>
        </div>
      </div>

      {/* Project context */}
      <div>
        <SectionLabel>Contexto del proyecto</SectionLabel>
        <button className="flex w-full items-center gap-3 rounded-lg glass px-3 py-2.5 text-left transition-colors hover:border-primary/40">
          <span className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary">
            <Boxes className="size-4" />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-sm font-semibold text-foreground">
              E-Commerce Nexus
            </span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              ecommerce-nexus
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>

        <div className="mt-3 flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/10 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20">
            <Plus className="size-4" /> Nuevo proyecto
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary">
            <GitBranch className="size-4" /> Conectar GitHub
          </button>
        </div>
      </div>

      {/* Project files */}
      <div>
        <SectionLabel>Archivos del proyecto</SectionLabel>
        <div className="rounded-lg border border-border bg-secondary/25 p-1.5">
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin font-mono text-[12px]">
            {tree.map((n, i) => {
              const Icon =
                n.type === 'folder'
                  ? n.open
                    ? FolderOpen
                    : Folder
                  : n.name.endsWith('.tsx') || n.name.endsWith('.ts')
                    ? FileCode
                    : FileText
              const active = n.name === 'cart.service.ts'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-md py-1 pr-1.5 transition-colors hover:bg-secondary/60 ${
                    active ? 'bg-primary/15' : ''
                  }`}
                  style={{ paddingLeft: `${n.depth * 12 + 4}px` }}
                >
                  {n.type === 'folder' ? (
                    <ChevronRight
                      className={`size-3 shrink-0 text-muted-foreground transition-transform ${n.open ? 'rotate-90' : ''}`}
                    />
                  ) : (
                    <span className="w-3 shrink-0" />
                  )}
                  <Icon
                    className={`size-3.5 shrink-0 ${n.type === 'folder' ? 'text-accent' : 'text-primary'}`}
                  />
                  <span
                    className={`flex-1 truncate ${active ? 'text-foreground' : 'text-secondary-foreground'}`}
                  >
                    {n.name}
                  </span>
                  {n.badge && (
                    <span className="shrink-0 rounded bg-primary/15 px-1 text-[9px] text-primary">
                      {n.badge}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex items-center gap-3 border-t border-border px-1.5 pt-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-primary">
              <GitCommitHorizontal className="size-3" /> main
            </span>
            <span className="flex items-center gap-1">
              <GitPullRequest className="size-3" /> 23
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" /> 2
            </span>
            <span className="ml-auto flex items-center gap-1">7</span>
          </div>
        </div>
      </div>

      {/* Active agents */}
      <div>
        <SectionLabel>Agentes activos</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {activeAgents.map((a) => {
            const Icon = a.icon
            return (
              <div
                key={a.name}
                className="flex items-center gap-2.5 rounded-lg glass px-3 py-2"
              >
                <Icon className="size-4 text-primary" />
                <span className="flex-1 text-sm text-foreground">{a.name}</span>
                <span className="font-mono text-[11px] text-success">Activo</span>
                <span className="size-2 rounded-full bg-success shadow-[0_0_6px] shadow-success" />
              </div>
            )
          })}
        </div>
        <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20">
          <Plus className="size-4" /> Registrar nuevo agente
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-3 rounded-lg glass px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
          <Boxes className="size-4" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-semibold text-foreground">
            Ostadia Team
          </span>
          <span className="block font-mono text-[11px] text-accent">Pro Plan</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>
    </aside>
  )
}
