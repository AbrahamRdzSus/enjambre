'use client'

import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
} from 'lucide-react'
import { useState } from 'react'

type Node = {
  name: string
  type: 'folder' | 'file'
  depth: number
  open?: boolean
  badge?: string
  active?: boolean
  icon?: 'code' | 'text' | 'file'
}

const tree: Node[] = [
  { name: 'ecommerce-nexus', type: 'folder', depth: 0, open: true },
  { name: '.github', type: 'folder', depth: 1 },
  { name: 'app', type: 'folder', depth: 1, open: true },
  { name: 'web', type: 'folder', depth: 2, open: true },
  { name: 'src', type: 'folder', depth: 3, open: true },
  { name: 'app', type: 'folder', depth: 4 },
  { name: 'components', type: 'folder', depth: 4, open: true },
  { name: 'ProductCard.tsx', type: 'file', depth: 5, badge: 'TSX', active: true, icon: 'code' },
  { name: 'hooks', type: 'folder', depth: 4 },
  { name: 'lib', type: 'folder', depth: 4 },
  { name: 'styles', type: 'folder', depth: 4 },
  { name: 'pages.tsx', type: 'file', depth: 3, badge: 'TSX', icon: 'code' },
  { name: 'layout.tsx', type: 'file', depth: 3, badge: 'TSX', icon: 'code' },
  { name: 'api', type: 'folder', depth: 2 },
  { name: 'packages', type: 'folder', depth: 1 },
  { name: 'tests', type: 'folder', depth: 1 },
  { name: '.env.example', type: 'file', depth: 1, icon: 'file' },
  { name: 'docker-compose.yml', type: 'file', depth: 1, icon: 'file' },
  { name: 'README.md', type: 'file', depth: 1, badge: 'M+', icon: 'text' },
  { name: 'tsconfig.json', type: 'file', depth: 1, icon: 'file' },
]

const tabs = ['Archivos', 'Recientes', 'Configuración']

export function FilePanel() {
  const [tab, setTab] = useState('Archivos')

  return (
    <div className="flex flex-col rounded-xl glass">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Proyecto en trabajo
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              tab === t
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 font-mono text-[12px]">
        {tree.map((n, i) => {
          const Icon =
            n.type === 'folder'
              ? n.open
                ? FolderOpen
                : Folder
              : n.icon === 'code'
                ? FileCode
                : n.icon === 'text'
                  ? FileText
                  : File
          return (
            <div
              key={`${n.name}-${i}`}
              className={`flex items-center gap-1.5 rounded-md py-1 pr-2 transition-colors ${
                n.active
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground/80 hover:bg-secondary/50'
              }`}
              style={{ paddingLeft: `${n.depth * 14 + 6}px` }}
            >
              {n.type === 'folder' ? (
                n.open ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}
              <Icon
                className={`size-3.5 shrink-0 ${
                  n.type === 'folder' ? 'text-accent' : 'text-primary/80'
                }`}
              />
              <span className="truncate">{n.name}</span>
              {n.badge && (
                <span
                  className={`ml-auto rounded px-1.5 py-px text-[9px] font-semibold ${
                    n.badge === 'M+'
                      ? 'bg-accent/20 text-accent'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {n.badge}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: git status */}
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 text-foreground">
          <GitBranch className="size-3.5 text-primary" /> main
          <ChevronDown className="size-3" />
        </span>
        <span className="flex items-center gap-1">
          <GitCommitHorizontal className="size-3.5" /> 23
        </span>
        <span className="flex items-center gap-1">
          <GitPullRequest className="size-3.5" /> 7
        </span>
      </div>
    </div>
  )
}
