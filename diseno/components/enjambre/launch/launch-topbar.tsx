'use client'

import { Star, Lock, Play, ChevronDown, Bell, ExternalLink } from 'lucide-react'

function StatusBadge() {
  return (
    <div className="flex items-center gap-3 rounded-xl glass px-4 py-2.5">
      <span className="size-2.5 rounded-full bg-success shadow-[0_0_8px] shadow-success" />
      <span className="leading-tight">
        <span className="block text-sm font-medium text-foreground">En línea</span>
        <span className="block text-[11px] text-muted-foreground">
          Todos los sistemas
        </span>
      </span>
    </div>
  )
}

export function LaunchTopBar() {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4">
      {/* Project title */}
      <div className="min-w-[260px] flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Proyecto: <span className="text-accent">E-Commerce Nexus</span>
          </h2>
          <Star className="size-4 text-accent" />
          <span className="flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Privado
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          Repositorio:{' '}
          <span className="text-primary">
            github.com/ostadia-studio/ecommerce-nexus
          </span>
          <ExternalLink className="size-3 text-primary" />
        </p>
      </div>

      {/* Launch button */}
      <div className="flex items-stretch overflow-hidden rounded-xl glow-amber">
        <button className="flex items-center gap-2 bg-accent px-6 py-2.5 font-heading text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90">
          <Play className="size-4 fill-current" /> Lanzar Enjambre
        </button>
        <button className="grid place-items-center border-l border-black/20 bg-accent px-2 text-accent-foreground transition-opacity hover:opacity-90">
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* Tokens metric */}
      <div className="min-w-[230px] rounded-xl glass px-4 py-2.5">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Tokens usados hoy</span>
          <span className="font-mono text-primary">24%</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-semibold text-foreground">
            2.45M
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            / 10.00M
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/4 rounded-full bg-primary" />
        </div>
      </div>

      {/* Dual status */}
      <StatusBadge />
      <StatusBadge />

      <button className="relative grid size-10 place-items-center rounded-xl glass text-muted-foreground transition-colors hover:text-foreground">
        <Bell className="size-4" />
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary font-mono text-[10px] font-semibold text-white">
          3
        </span>
      </button>
    </header>
  )
}
