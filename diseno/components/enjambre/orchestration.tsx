'use client'

import {
  Brain,
  Server,
  Code2,
  Bug,
  BookText,
  Hexagon,
  Database,
  MessageSquare,
  Network,
  FileText,
  Search,
  Boxes,
} from 'lucide-react'
import { STATUS_COLOR, STATUS_LABEL, type AgentStatus } from './data'

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

type Agent = {
  name: string
  model: string
  status: AgentStatus
  icon: typeof Brain
  pos: string // absolute positioning classes
}

const agents: Agent[] = [
  {
    name: 'Arquitecto',
    model: 'Claude 3.5',
    status: 'pensando',
    icon: Brain,
    pos: 'left-1/2 top-0 -translate-x-1/2',
  },
  {
    name: 'Backend Dev',
    model: 'Grok 3',
    status: 'ejecutando',
    icon: Server,
    pos: 'left-0 top-1/2 -translate-y-1/2',
  },
  {
    name: 'Frontend Dev',
    model: 'Gemini 1.5 Pro',
    status: 'en-curso',
    icon: Code2,
    pos: 'right-0 top-1/2 -translate-y-1/2',
  },
  {
    name: 'QA & Debug',
    model: 'Codex GPT-4o',
    status: 'ejecutando',
    icon: Bug,
    pos: 'bottom-0 left-[8%]',
  },
  {
    name: 'Doc Writer',
    model: 'Jules',
    status: 'en-espera',
    icon: BookText,
    pos: 'bottom-0 right-[8%]',
  },
]

// small inner-ring hex nodes
const innerNodes = [Code2, Database, MessageSquare, FileText, Network, Search]

function AgentCard({ agent }: { agent: Agent }) {
  const Icon = agent.icon
  const color = STATUS_COLOR[agent.status]
  return (
    <div className={`absolute ${agent.pos} z-20 w-[164px]`}>
      <div className="rounded-xl glass-strong p-3 glow-purple">
        <div className="flex items-center gap-2">
          <span
            className="grid size-8 shrink-0 place-items-center text-primary"
            style={{ clipPath: HEX_CLIP, background: 'rgba(139,92,246,0.18)' }}
          >
            <Icon className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold text-foreground">
              {agent.name}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {agent.model}
            </span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="font-mono text-[11px]" style={{ color }}>
            {STATUS_LABEL[agent.status]}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Orchestration() {
  return (
    <div className="flex flex-col rounded-xl glass">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Orquestación del enjambre
        </p>
        <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[10px] text-success">
          <span className="size-1.5 rounded-full bg-success" /> En tiempo real
        </span>
      </div>

      {/* stage */}
      <div className="relative mx-auto w-full max-w-[640px] flex-1 p-6">
        <div className="relative aspect-square w-full">
          {/* orbit rings */}
          <svg
            viewBox="0 0 400 400"
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
            <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(139,92,246,0.12)" strokeDasharray="3 6" />
            <circle cx="200" cy="200" r="100" fill="none" stroke="rgba(139,92,246,0.18)" strokeDasharray="2 7" />
            <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(255,176,32,0.2)" strokeDasharray="2 5" />
            {/* spokes to agents */}
            {[
              [200, 50],
              [50, 200],
              [350, 200],
              [110, 350],
              [290, 350],
            ].map(([x, y], i) => (
              <line
                key={i}
                x1="200"
                y1="200"
                x2={x}
                y2={y}
                stroke="rgba(139,92,246,0.25)"
                strokeDasharray="2 5"
              />
            ))}
          </svg>

          {/* inner ring hex nodes */}
          {innerNodes.map((Icon, i) => {
            const angle = (i / innerNodes.length) * Math.PI * 2 - Math.PI / 2
            const radius = 26 // % of half
            const x = 50 + Math.cos(angle) * radius
            const y = 50 + Math.sin(angle) * radius
            return (
              <span
                key={i}
                className="absolute z-10 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center text-primary"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  clipPath: HEX_CLIP,
                  background: 'rgba(139,92,246,0.14)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                <Icon className="size-4" />
              </span>
            )
          })}

          {/* glowing core */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div
              className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,176,32,0.35), rgba(139,92,246,0.12) 55%, transparent 72%)',
              }}
            />
            <div
              className="relative grid size-20 place-items-center"
              style={{
                clipPath: HEX_CLIP,
                background:
                  'linear-gradient(150deg, #ffb020, #c77a10)',
                boxShadow: '0 0 40px rgba(255,176,32,0.6)',
              }}
            >
              <Hexagon className="size-9 text-accent-foreground" />
            </div>
          </div>

          {/* agent cards */}
          {agents.map((a) => (
            <AgentCard key={a.name} agent={a} />
          ))}
        </div>
      </div>

      {/* objetivo actual */}
      <div className="border-t border-border px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Objetivo actual
          </p>
          <span className="text-[12px] text-muted-foreground">
            Tiempo estimado
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Implementar módulo de carrito persistente
            </span>
            <span className="rounded-md bg-destructive/15 px-2 py-0.5 font-mono text-[10px] text-destructive">
              Alta prioridad
            </span>
          </div>
          <span className="font-mono text-sm text-foreground">12m restante</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-primary to-accent" />
          </div>
          <span className="font-mono text-sm font-semibold text-foreground">67%</span>
        </div>
      </div>
    </div>
  )
}
