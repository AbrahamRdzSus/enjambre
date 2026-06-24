import { useState } from 'react';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import {
  useAddAgent,
  useAgents,
  useDeleteAgent,
  usePatchAgent,
  useProviders,
  useSetKey,
} from '../api/hooks';
import { Panel, PageHeader } from '../components/ui/Panel';

const PROVIDERS = ['openai', 'anthropic', 'google', 'xai'];
const ROLES = ['builder', 'architect'];

export default function AgentsPage() {
  const agents = useAgents();
  const providers = useProviders();
  const add = useAddAgent();
  const patch = usePatchAgent();
  const del = useDeleteAgent();
  const setKey = useSetKey();

  const [form, setForm] = useState({
    name: '', provider: 'openai', model: '', role: 'builder', system_prompt: '',
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  const inputStyle = {
    background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)',
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Configuracion" title="Agentes y claves" />

      {/* API Keys (BYOK, en memoria) */}
      <Panel
        title="API keys (BYOK · en memoria, no se guardan)"
        bodyClassName="grid grid-cols-2 gap-3"
      >
        {(providers.data ?? []).map((p) => (
          <div
            key={p.provider}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2"
          >
            <KeyRound size={15} style={{ color: p.key_present ? 'var(--ok)' : 'var(--fg-faint)' }} />
            <span className="w-20 font-mono text-xs text-foreground">{p.provider}</span>
            <input
              type="password"
              value={keyInputs[p.provider] ?? ''}
              onChange={(e) => setKeyInputs((s) => ({ ...s, [p.provider]: e.target.value }))}
              placeholder={p.key_present ? '•••• configurada' : 'pega tu key'}
              className="h-8 flex-1 rounded border px-2 text-xs"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setKey.mutate({ provider: p.provider, key: keyInputs[p.provider] ?? '' })}
              className="h-8 rounded bg-primary/15 px-2 text-xs text-primary"
            >
              Guardar
            </button>
          </div>
        ))}
      </Panel>

      {/* Agentes */}
      <Panel title="Agentes registrados" bodyClassName="flex flex-col gap-2">
        {(agents.data ?? []).map((a) => (
          <div
            key={a.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"
          >
            <input
              type="checkbox"
              checked={a.enabled}
              onChange={() => patch.mutate({ name: a.name, patch: { enabled: !a.enabled } })}
              aria-label={`Habilitar ${a.name}`}
            />
            <span className="flex-1 text-sm font-semibold text-foreground">{a.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {a.role} · {a.provider}/{a.model || 'default'}
            </span>
            <button
              type="button"
              onClick={() => del.mutate(a.name)}
              className="rounded p-1.5 hover:bg-secondary"
              style={{ color: 'var(--alert)' }}
              aria-label={`Eliminar ${a.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {agents.data?.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin agentes. Agrega uno abajo.</p>
        )}

        {/* Alta de agente */}
        <div
          className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3"
          style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto' }}
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="nombre"
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
          />
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
          >
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="modelo (opcional)"
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { if (form.name.trim()) add.mutate(form); }}
            disabled={!form.name.trim() || add.isPending}
            className="flex h-9 items-center gap-1 rounded px-3 text-xs font-semibold disabled:opacity-50"
            style={{ background: 'var(--amber)', color: '#1a1006' }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
        {add.isError && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>{(add.error as Error).message}</p>
        )}
      </Panel>
    </div>
  );
}
