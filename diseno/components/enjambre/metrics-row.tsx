import {
  Users,
  ClipboardList,
  FolderKanban,
  Coins,
  BarChart3,
  Wallet,
} from 'lucide-react'
import { metrics } from './data'

const icons = [Users, ClipboardList, FolderKanban, Coins, Wallet, BarChart3]

export function MetricsRow() {
  return (
    <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m, i) => {
        const Icon = icons[i]
        const extraColor =
          m.kind === 'up'
            ? 'text-success'
            : m.kind === 'down'
              ? 'text-success'
              : m.kind === 'ring'
                ? 'text-success'
                : 'text-muted-foreground'
        return (
          <div key={m.label} className="rounded-xl glass p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">
                  {m.value}
                </p>
                <p className={`mt-1 font-mono text-[11px] ${extraColor}`}>
                  {m.extra}
                </p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-4" />
              </span>
            </div>
            {m.kind === 'progress' && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
