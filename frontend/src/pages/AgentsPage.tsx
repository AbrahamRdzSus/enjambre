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
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Configuracion</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
          Agentes y claves
        </h1>
      </header>

      {/* API Keys (BYOK, en memoria) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-mute)' }}>
          API KEYS (BYOK · en memoria, no se guardan)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(providers.data ?? []).map((p) => (
            <div
              key={p.provider}
              className="flex items-center gap-2 rounded-lg border p-2"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <KeyRound size={15} style={{ color: p.key_present ? 'var(--ok)' : 'var(--fg-faint)' }} />
              <span className="text-xs w-20" style={{ fontFamily: 'var(--font-mono)' }}>{p.provider}</span>
              <input
                type="password"
                value={keyInputs[p.provider] ?? ''}
                onChange={(e) => setKeyInputs((s) => ({ ...s, [p.provider]: e.target.value }))}
                placeholder={p.key_present ? '•••• configurada' : 'pega tu key'}
                className="flex-1 rounded px-2 h-8 text-xs border"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setKey.mutate({ provider: p.provider, key: keyInputs[p.provider] ?? '' })}
                className="text-xs px-2 h-8 rounded"
                style={{ background: 'rgba(139,92,246,0.16)', color: 'var(--purple-soft)' }}
              >
                Guardar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Agentes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-mute)' }}>AGENTES</h2>
        <div className="flex flex-col gap-2">
          {(agents.data ?? []).map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-mute)' }}>
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={() => patch.mutate({ name: a.name, patch: { enabled: !a.enabled } })}
                />
              </label>
              <span className="font-semibold text-sm flex-1" style={{ color: 'var(--fg)' }}>{a.name}</span>
              <span className="text-xs" style={{ color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)' }}>
                {a.role} · {a.provider}/{a.model || 'default'}
              </span>
              <button
                type="button"
                onClick={() => del.mutate(a.name)}
                className="p-1.5 rounded hover:bg-[var(--bg-raised)]"
                style={{ color: 'var(--alert)' }}
                aria-label={`Eliminar ${a.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {agents.data?.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--fg-faint)' }}>Sin agentes. Agrega uno abajo.</p>
          )}
        </div>

        {/* Alta de agente */}
        <div
          className="grid gap-2 rounded-lg border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto' }}
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="nombre"
            className="rounded px-2 h-9 text-xs border" style={inputStyle}
          />
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="rounded px-2 h-9 text-xs border" style={inputStyle}
          >
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="modelo (opcional)"
            className="rounded px-2 h-9 text-xs border" style={inputStyle}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded px-2 h-9 text-xs border" style={inputStyle}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { if (form.name.trim()) add.mutate(form); }}
            disabled={!form.name.trim() || add.isPending}
            className="flex items-center gap-1 px-3 h-9 rounded text-xs font-semibold disabled:opacity-50"
            style={{ background: 'var(--amber)', color: '#1a1006' }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
        {add.isError && (
          <p className="text-xs" style={{ color: 'var(--alert)' }}>{(add.error as Error).message}</p>
        )}
      </section>
    </div>
  );
}
