'use client'

import {
  Sparkles,
  Hexagon,
  Gem,
  Code2,
  Boxes,
  ExternalLink,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import { useState } from 'react'
import {
  tokenUsage,
  activity,
  recentTasks,
  deployments,
} from './data'

function PanelHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {action}
    </div>
  )
}

const tokenIcons = [Sparkles, Hexagon, Gem, Code2, Boxes]

export function BottomRow() {
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <div className="grid grid-cols-1 gap-3 px-6 pb-6 lg:grid-cols-2 xl:grid-cols-4">
      {/* Token usage */}
      <div className="flex flex-col rounded-xl glass">
        <PanelHeader title="Uso de tokens por IA (hoy)" />
        <div className="flex-1 space-y-3 px-4 py-4">
          {tokenUsage.map((t, i) => {
            const Icon = tokenIcons[i]
            return (
              <div key={t.name} className="flex items-center gap-2.5">
                <Icon className="size-3.5 shrink-0 text-primary" />
                <span className="w-24 shrink-0 truncate text-[12px] text-foreground">
                  {t.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${t.pct}%`, background: t.color }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] text-foreground">
                  {t.value}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                  {t.pct}%
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[12px] text-muted-foreground">Total</span>
          <span className="font-mono text-[13px] font-semibold text-foreground">
            2.45M tokens
          </span>
        </div>
      </div>

      {/* Activity */}
      <div className="flex flex-col rounded-xl glass">
        <PanelHeader title="Actividad en tiempo real" />
        <div className="flex-1 space-y-2.5 px-4 py-4">
          {activity.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              <span className="font-mono text-[11px] text-muted-foreground">
                {a.time}
              </span>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="flex-1 text-foreground/85">{a.text}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {a.tag}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button className="flex items-center gap-1 text-[12px] text-primary hover:underline">
            Ver log completo <ExternalLink className="size-3" />
          </button>
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className="flex items-center gap-2 text-[12px] text-muted-foreground"
          >
            Auto-scroll
            <span
              className={`relative h-4 w-8 rounded-full transition-colors ${
                autoScroll ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span
                className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${
                  autoScroll ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="flex flex-col rounded-xl glass">
        <PanelHeader title="Tareas recientes" />
        <div className="flex-1 space-y-2.5 px-4 py-4">
          {recentTasks.map((t) => {
            const tone =
              t.tone === 'success'
                ? 'bg-success/15 text-success'
                : t.tone === 'muted'
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-primary/15 text-primary'
            return (
              <div key={t.name} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 truncate text-foreground/85">
                  {t.name}
                </span>
                <span className={`rounded px-2 py-0.5 text-[10px] ${tone}`}>
                  {t.status}
                </span>
                <span className="w-9 text-right font-mono text-[11px] text-foreground">
                  {t.pct}
                </span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-border px-4 py-3">
          <button className="flex items-center gap-1 text-[12px] text-primary hover:underline">
            Ver todas las tareas <ExternalLink className="size-3" />
          </button>
        </div>
      </div>

      {/* Deployments */}
      <div className="flex flex-col rounded-xl glass">
        <PanelHeader title="Historial de despliegues" />
        <div className="flex-1 space-y-2 px-4 py-4">
          {deployments.map((d) => (
            <div
              key={d.version}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2"
            >
              <span className="grid size-7 place-items-center rounded-md bg-primary/12 text-primary">
                <Plus className="size-3.5" />
              </span>
              <span className="flex-1 leading-tight">
                <span className="block font-mono text-[12px] font-semibold text-foreground">
                  {d.version}{' '}
                  <span className="text-accent">{d.env}</span>
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {d.by}
                </span>
              </span>
              <CheckCircle2 className="size-4 text-success" />
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <button className="flex items-center gap-1 text-[12px] text-primary hover:underline">
            Ver historial completo <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
