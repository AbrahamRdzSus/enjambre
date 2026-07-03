'use client'

import {
  Boxes,
  Plus,
  GitBranch,
  ChevronDown,
  ChevronsUpDown,
  Brain,
  Server,
  Code2,
  Bug,
  BookText,
  Sparkles,
  Gem,
  Hexagon,
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { apiKeys, registeredAgents } from './data'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-2 pt-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  )
}

const apiIcons: Record<string, typeof Brain> = {
  Grok: Sparkles,
  Claude: Hexagon,
  Codex: Code2,
  Gemini: Gem,
  Jules: Boxes,
}

const agentIcons: Record<string, typeof Brain> = {
  Arquitecto: Brain,
  'Backend Dev': Server,
  'Frontend Dev': Code2,
  'QA & Debug': Bug,
  'Doc Writer': BookText,
}

export function Sidebar() {
  const [toggles, setToggles] = useState(registeredAgents.map((a) => a.on))

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

      {/* Active project */}
      <div>
        <SectionLabel>Proyecto activo</SectionLabel>
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

      {/* API Keys */}
      <div>
        <SectionLabel>API Keys</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {apiKeys.map((k) => {
            const Icon = apiIcons[k.name] ?? Brain
            const tone = k.tone === 'success' ? 'text-success' : 'text-accent'
            const dot = k.tone === 'success' ? 'bg-success' : 'bg-accent'
            return (
              <div
                key={k.name}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
              >
                <Icon className="size-4 text-primary" />
                <span className="flex-1 text-sm text-foreground">{k.name}</span>
                <span className={`font-mono text-[11px] ${tone}`}>{k.status}</span>
                <span className={`size-2 rounded-full ${dot} shadow-[0_0_6px] ${k.tone === 'success' ? 'shadow-success' : 'shadow-accent'}`} />
              </div>
            )
          })}
        </div>
        <button className="mt-2 px-1 text-[12px] font-medium text-primary hover:underline">
          Ver configuración de API
        </button>
      </div>

      {/* Registered agents */}
      <div>
        <SectionLabel>Agentes registrados</SectionLabel>
        <div className="flex flex-col gap-1">
          {registeredAgents.map((a, i) => {
            const Icon = agentIcons[a.name] ?? Brain
            return (
              <div
                key={a.name}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
              >
                <span className="grid size-7 place-items-center rounded-md bg-primary/12 text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1 leading-tight">
                  <span className="block text-[13px] font-medium text-foreground">
                    {a.name}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {a.model}
                  </span>
                </span>
                <button
                  onClick={() =>
                    setToggles((t) => t.map((v, idx) => (idx === i ? !v : v)))
                  }
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    toggles[i]
                      ? 'bg-success shadow-[0_0_8px] shadow-success/50'
                      : 'bg-secondary'
                  }`}
                  aria-label={`Activar ${a.name}`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                      toggles[i] ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
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
