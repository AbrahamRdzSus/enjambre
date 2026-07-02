'use client'

import {
  Brain,
  Server,
  Code2,
  FileText,
  Eye,
  Send,
} from 'lucide-react'
import { useState } from 'react'
import { conversations } from './data'

const tabs = [
  { name: 'Arquitectura', count: 3 },
  { name: 'Backend', count: 4 },
  { name: 'Frontend', count: 3 },
  { name: 'Debug', count: 2 },
  { name: 'Docs', count: 2 },
]

const agentIcon: Record<string, typeof Brain> = {
  Arquitecto: Brain,
  'Backend Dev': Server,
  'Frontend Dev': Code2,
}

export function Conversations() {
  const [active, setActive] = useState('Arquitectura')

  return (
    <div className="flex h-full flex-col rounded-xl glass">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Conversaciones de agentes
        </p>
        <button className="flex items-center gap-1 text-[12px] text-primary hover:underline">
          Ver todas
        </button>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
        {tabs.map((t) => (
          <button
            key={t.name}
            onClick={() => setActive(t.name)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              active === t.name
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.name}
            <span
              className={`rounded px-1.5 text-[10px] ${
                active === t.name
                  ? 'bg-primary/25 text-primary'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* messages */}
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin px-4 py-3">
        {conversations.map((c, i) => {
          const Icon = agentIcon[c.agent] ?? Brain
          return (
            <div key={i} className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {c.agent}
                </span>
                <span className="rounded bg-primary/15 px-1.5 py-px font-mono text-[10px] text-primary">
                  {c.model}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {c.time}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-foreground/85">
                {c.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {c.files.map((f) => (
                  <span
                    key={f.name}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px] text-foreground/80"
                  >
                    <FileText className="size-3 text-primary" />
                    {f.name}
                    {'size' in f && f.size && (
                      <span className="text-muted-foreground">{f.size}</span>
                    )}
                    {'badge' in f && f.badge && (
                      <span className="rounded bg-primary/20 px-1 text-primary">
                        {f.badge}
                      </span>
                    )}
                    <Eye className="size-3 text-muted-foreground" />
                  </span>
                ))}
                {'more' in c && c.more && (
                  <span className="rounded-md bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
                    +{c.more}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <input
            placeholder="Enviar mensaje a Arquitecto..."
            className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button className="grid size-7 place-items-center rounded-md bg-primary text-white transition-opacity hover:opacity-90">
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
