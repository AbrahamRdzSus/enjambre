'use client'

import {
  Sparkles,
  Hexagon,
  Code2,
  Gem,
  Boxes,
  FileCode,
  GitCompare,
  Star,
  Check,
  X,
  Circle,
} from 'lucide-react'
import {
  parallelChats,
  compareCols,
  compareRows,
} from '../data'

const agentIcons: Record<string, typeof Boxes> = {
  Grok: Sparkles,
  Claude: Hexagon,
  Codex: Code2,
  Gemini: Gem,
  Jules: Boxes,
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center justify-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${
            i < n ? 'fill-primary text-primary' : 'text-secondary'
          }`}
        />
      ))}
    </span>
  )
}

function PrIcon({ v }: { v: string }) {
  if (v === 'ok')
    return <Check className="mx-auto size-4 text-success" />
  if (v === 'no') return <X className="mx-auto size-4 text-accent" />
  return <Circle className="mx-auto size-3.5 text-accent" />
}

export function ParallelChats() {
  return (
    <div className="flex flex-col gap-4">
      {/* Parallel outputs */}
      <section className="rounded-xl glass p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            3. Chats / Salidas en paralelo
          </h3>
          <button className="font-mono text-[11px] text-primary hover:underline">
            Ver todos
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {parallelChats.map((c) => {
            const Icon = agentIcons[c.agent] ?? Boxes
            return (
              <div
                key={c.agent}
                className="rounded-lg border border-border bg-secondary/25 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {c.agent}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {c.provider}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-success">
                    <span className="size-1.5 rounded-full bg-success shadow-[0_0_5px] shadow-success" />
                    Ejecutando
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c.time}
                  </span>
                  <GitCompare className="size-3.5 text-primary" />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-secondary-foreground">
                  {c.text}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-[11px] text-foreground">
                    <FileCode className="size-3 text-primary" />
                    {c.files[0].name}
                    <span className="rounded bg-primary/15 px-1 text-[9px] text-primary">
                      {c.files[0].badge}
                    </span>
                  </span>
                  {c.more ? (
                    <span className="rounded-md bg-secondary/50 px-1.5 py-1 font-mono text-[11px] text-muted-foreground">
                      +{c.more}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Compare responses */}
      <section className="rounded-xl glass p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            7. Comparar respuestas
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Ver modo diffs
            </span>
            <span className="relative h-5 w-9 rounded-full bg-primary">
              <span className="absolute left-[18px] top-0.5 size-4 rounded-full bg-white" />
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="pb-2" />
                {compareCols.map((c) => (
                  <th
                    key={c}
                    className="px-1 pb-2 text-center font-medium text-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="py-2 pr-2 text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-1 py-2 text-center">
                      {typeof v === 'number' ? (
                        <Stars n={v} />
                      ) : v === 'ok' || v === 'no' || v === 'maybe' ? (
                        <PrIcon v={v} />
                      ) : (
                        <span className="font-mono text-foreground">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-primary text-primary" />
            <Star className="size-3 fill-primary text-primary" />
            <Star className="size-3 fill-primary text-primary" /> Excelente
          </span>
          <span className="flex items-center gap-1">
            <Circle className="size-3 text-foreground" /> Bueno
          </span>
          <span className="flex items-center gap-1">
            <Circle className="size-3 fill-accent text-accent" /> Regular
          </span>
        </div>
      </section>
    </div>
  )
}
