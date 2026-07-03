'use client'

import {
  Plus,
  FileText,
  FileImage,
  FileCode,
  Download,
} from 'lucide-react'
import { useState } from 'react'
import {
  realtimeLogs,
  taskStats,
  taskProgress,
  attachedFiles,
} from '../data'

function PanelTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        {children}
      </h3>
      {action}
    </div>
  )
}

const agentDot: Record<string, string> = {
  Grok: 'var(--primary)',
  Claude: 'var(--accent)',
  Codex: 'var(--success)',
  Gemini: 'var(--chart-3)',
  Jules: 'var(--chart-5)',
}

function Donut({ pct }: { pct: number }) {
  const r = 32
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-[88px] place-items-center">
      <svg viewBox="0 0 80 80" className="size-[88px] -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--secondary)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="block font-mono text-lg font-bold text-foreground">
          {pct}%
        </span>
        <span className="block text-[9px] text-muted-foreground">Completado</span>
      </div>
    </div>
  )
}

const fileIcon = { pdf: FileText, image: FileImage, code: FileCode }

export function LaunchBottom() {
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Real-time logs */}
      <section className="flex flex-col rounded-xl glass p-4">
        <PanelTitle
          action={
            <button className="font-mono text-[11px] text-primary hover:underline">
              Ver todo
            </button>
          }
        >
          4. Logs en tiempo real
        </PanelTitle>
        <div className="mt-3 flex-1 space-y-0.5 font-mono text-[12px]">
          {realtimeLogs.map((l, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-secondary/40"
            >
              <span className="text-muted-foreground">{l.time}</span>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: agentDot[l.agent] }}
              />
              <span className="shrink-0 font-semibold text-foreground">
                {l.agent}
              </span>
              <span className="flex-1 truncate text-secondary-foreground">
                {l.text}
              </span>
              <span className="shrink-0 rounded bg-secondary/60 px-1.5 text-[10px] text-muted-foreground">
                {l.file}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
          <span className="text-[12px] text-muted-foreground">Auto-scroll</span>
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              autoScroll ? 'bg-primary' : 'bg-secondary'
            }`}
            aria-label="Auto-scroll"
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                autoScroll ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Task progress */}
      <section className="rounded-xl glass p-4">
        <PanelTitle>5. Progreso de la tarea</PanelTitle>
        <div className="mt-3 flex items-center gap-4">
          <Donut pct={67} />
          <div className="flex-1 space-y-1.5">
            {taskStats.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-mono text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {taskProgress.map((p) => (
            <div key={p.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-secondary-foreground">{p.label}</span>
                <span className="font-mono text-foreground">{p.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${p.pct}%`,
                    background:
                      p.pct === 100 ? 'var(--success)' : 'var(--primary)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Attached files */}
      <section className="rounded-xl glass p-4">
        <PanelTitle
          action={
            <button className="flex items-center gap-1 font-mono text-[11px] text-accent hover:underline">
              <Plus className="size-3" /> Agregar archivo
            </button>
          }
        >
          6. Archivos adjuntos
        </PanelTitle>
        <div className="mt-3 space-y-2">
          {attachedFiles.map((f) => {
            const Icon = fileIcon[f.kind]
            return (
              <div
                key={f.name}
                className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 transition-colors hover:border-primary/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {f.name}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {f.size}
                  </span>
                </span>
                <Download className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
