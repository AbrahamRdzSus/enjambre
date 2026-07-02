'use client'

import {
  Paperclip,
  Code2,
  Boxes,
  FileText,
  Sparkles,
  Maximize2,
  Target,
  Settings,
  Network,
  ChevronDown,
  Hexagon,
  Gem,
} from 'lucide-react'
import { useState } from 'react'
import { selectableAgents } from '../data'

const agentIcons: Record<string, typeof Boxes> = {
  Grok: Sparkles,
  Claude: Hexagon,
  Codex: Code2,
  Gemini: Gem,
  Jules: Boxes,
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
      {children}
    </h3>
  )
}

export function TaskComposer() {
  const [agents, setAgents] = useState(selectableAgents.map((a) => a.on))

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="leading-tight">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Lanzar tarea / Chats
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Trabaja con múltiples agentes de IA en paralelo sobre el mismo
            objetivo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2.5 rounded-lg glass px-4 py-2 text-left transition-colors hover:border-primary/40">
            <Network className="size-4 text-primary" />
            <span className="leading-tight">
              <span className="block text-[13px] font-medium text-foreground">
                Modo paralelo
              </span>
              <span className="block font-mono text-[10px] text-muted-foreground">
                5 agentes
              </span>
            </span>
          </button>
          <button className="flex items-center gap-2 rounded-lg glass px-4 py-2.5 text-[13px] font-medium text-secondary-foreground transition-colors hover:border-primary/40">
            <Settings className="size-4 text-muted-foreground" /> Configuración
          </button>
        </div>
      </div>

      {/* Prompt panel */}
      <div className="rounded-xl glass p-5">
        <SectionTitle>1. Escribe tu prompt / tarea</SectionTitle>
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-start justify-between gap-2">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Prompt / Instrucciones
            </label>
            <Sparkles className="size-4 text-accent" />
          </div>
          <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-foreground">
            Implementar módulo de carrito de compras persistente con Zustand,
            sincronización con backend y cálculo de totales en tiempo real.
            Incluir tests unitarios y validaciones.
          </p>
          <div className="mt-6 flex justify-end">
            <Maximize2 className="size-4 text-muted-foreground" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { icon: Paperclip, label: 'Adjuntar archivo' },
            { icon: Code2, label: 'Variables' },
            { icon: Boxes, label: 'Contexto del proyecto' },
            { icon: FileText, label: 'Plantillas' },
          ].map((b) => (
            <button
              key={b.label}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[13px] text-secondary-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <b.icon className="size-3.5 text-primary" /> {b.label}
            </button>
          ))}
          <button className="ml-auto grid size-9 place-items-center rounded-lg border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground">
            <Maximize2 className="size-4" />
          </button>
        </div>

        {/* Objetivo */}
        <p className="mt-5 text-[13px] text-muted-foreground">Objetivo de la tarea</p>
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/[0.06] p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent glow-amber">
            <Target className="size-4" />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[14px] font-semibold text-foreground">
              Implementar módulo de carrito de compras persistente
            </span>
            <span className="block text-[12px] text-muted-foreground">
              Persistencia local + sincronización con backend + cálculos en
              tiempo real
            </span>
          </span>
          <span className="shrink-0 rounded-md bg-accent/15 px-2.5 py-1 font-mono text-[11px] font-medium text-accent">
            Alta prioridad
          </span>
        </div>
      </div>

      {/* Select agents */}
      <div className="rounded-xl glass p-5">
        <SectionTitle>2. Selecciona agentes de IA</SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {selectableAgents.map((a, i) => {
            const Icon = agentIcons[a.name] ?? Boxes
            return (
              <div
                key={a.name}
                className={`rounded-lg border p-3 transition-colors ${
                  agents[i]
                    ? 'border-primary/40 bg-primary/[0.07]'
                    : 'border-border bg-secondary/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <button
                    onClick={() =>
                      setAgents((t) =>
                        t.map((v, idx) => (idx === i ? !v : v)),
                      )
                    }
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      agents[i]
                        ? 'bg-success shadow-[0_0_8px] shadow-success/50'
                        : 'bg-secondary'
                    }`}
                    aria-label={`Activar ${a.name}`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                        agents[i] ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-3 text-[14px] font-semibold text-foreground">
                  {a.name}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {a.provider}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-success">
                  <span className="size-1.5 rounded-full bg-success" /> Contexto
                  cargado
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advanced options */}
      <button className="flex items-center justify-between rounded-xl glass px-5 py-3.5 text-left transition-colors hover:border-primary/40">
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-secondary-foreground">
          Opciones avanzadas
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
    </div>
  )
}
