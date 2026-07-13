import { useState } from 'react';
import { Plus, Trash2, KeyRound, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import {
  useAddAgent,
  useAgents,
  useDeleteAgent,
  usePatchAgent,
  useProviders,
  useSetKey,
  useValidateKeys,
} from '../api/hooks';
import { Panel, PageHeader } from '../components/ui/Panel';
import ProviderIcon from '../components/ProviderIcon';
import MicroLoader from '../components/ui/MicroLoader';
import { errorMessage } from '../lib/errors';

const ROLES = ['builder', 'architect'];

/** Error de una mutacion. Sin esto, guardar una key invalida o borrar un agente
 *  fallaba en SILENCIO: el checkbox simplemente no cambiaba. */
function MutationError({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className={`text-xs ${className ?? ''}`} style={{ color: 'var(--alert)' }}>
      {errorMessage(error)}
    </p>
  );
}

export default function AgentsPage() {
  const agents = useAgents();
  const providers = useProviders();
  const add = useAddAgent();
  const patch = usePatchAgent();
  const del = useDeleteAgent();
  const setKey = useSetKey();
  const validate = useValidateKeys();
  const results = validate.data ?? {};

  const [form, setForm] = useState({
    name: '', provider: 'openai', model: '', role: 'builder', system_prompt: '',
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  const providerList = providers.data ?? [];
  // fallback si /providers aún no respondió: al menos deja elegir provider
  const providerNames = providerList.length
    ? providerList.map((p) => p.provider)
    : ['openai', 'anthropic', 'google', 'xai'];
  const modelsFor = (name: string) =>
    providerList.find((p) => p.provider === name)?.models ?? [];
  const pricingFor = (name: string) =>
    providerList.find((p) => p.provider === name)?.pricing ?? {};
  // etiqueta con costo estimado (input/output USD por 1M tok); nombre solo si no hay precio
  const modelLabel = (provider: string, model: string) => {
    const price = pricingFor(provider)[model];
    return price ? `${model} · $${price[0]}/$${price[1]} (1M)` : model;
  };

  const inputStyle = {
    background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)',
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Configuracion" title="Agentes y claves" />

      {/* API Keys (BYOK, en memoria) */}
      <Panel
        title="API keys (BYOK · en memoria, no se guardan)"
        action={
          <button
            type="button"
            onClick={() => validate.mutate()}
            disabled={validate.isPending}
            className="flex h-8 items-center gap-1.5 rounded bg-primary/15 px-2.5 text-xs text-primary disabled:opacity-50"
          >
            {validate.isPending ? <MicroLoader variant="dots" size={7} /> : <ShieldCheck size={14} />}
            {validate.isPending ? 'Validando…' : 'Validar claves'}
          </button>
        }
        bodyClassName="grid grid-cols-2 gap-3"
      >
        {(providers.data ?? []).map((p) => {
          const r = results[p.provider];
          return (
            <div
              key={p.provider}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2"
            >
              <ProviderIcon provider={p.provider} size={16} />
              <KeyRound size={13} style={{ color: p.key_present ? 'var(--ok)' : 'var(--fg-faint)' }} />
              <span className="w-16 font-mono text-xs text-foreground">{p.provider}</span>
              <input
                type="password"
                value={keyInputs[p.provider] ?? ''}
                onChange={(e) => setKeyInputs((s) => ({ ...s, [p.provider]: e.target.value }))}
                placeholder={p.key_present ? '•••• configurada' : 'pega tu key'}
                className="h-8 flex-1 rounded border px-2 text-xs"
                style={inputStyle}
              />
              {r && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: r.ok ? 'var(--ok)' : 'var(--alert)' }}
                  title={r.detail}
                >
                  {r.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                </span>
              )}
              <button
                type="button"
                onClick={() => setKey.mutate({ provider: p.provider, key: keyInputs[p.provider] ?? '' })}
                className="h-8 rounded bg-primary/15 px-2 text-xs text-primary"
              >
                Guardar
              </button>
            </div>
          );
        })}
        <MutationError error={validate.isError ? validate.error : null} className="col-span-2" />
        <MutationError error={setKey.isError ? setKey.error : null} className="col-span-2" />
        {setKey.isSuccess && (
          <p role="status" className="col-span-2 text-xs" style={{ color: 'var(--ok)' }}>
            Clave guardada en memoria (no se persiste en disco).
          </p>
        )}
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
              onClick={() => {
                // Borrar un agente es destructivo e irreversible: pasa por aprobacion humana.
                if (window.confirm(`Eliminar el agente "${a.name}"?`)) del.mutate(a.name);
              }}
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
        <MutationError error={patch.isError ? patch.error : null} />
        <MutationError error={del.isError ? del.error : null} />

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
            onChange={(e) => setForm({ ...form, provider: e.target.value, model: '' })}
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
          >
            {providerNames.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="h-9 rounded border px-2 text-xs" style={inputStyle}
            aria-label="Modelo" title="Precio estimado, no facturación real"
          >
            <option value="">default</option>
            {modelsFor(form.provider).map((m) => (
              <option key={m} value={m}>{modelLabel(form.provider, m)}</option>
            ))}
          </select>
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
        <MutationError error={add.isError ? add.error : null} />
      </Panel>
    </div>
  );
}
