import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { Stats } from '../api/types';

// Gráficas de consumo (recharts) para el Overview/Estadisticas.
// Tema oscuro morado/ambar; sin ejes ruidosos.

const PURPLE = '#8b5cf6';
const AMBER = '#ffb020';
const PIE_COLORS = [PURPLE, AMBER, '#a684f8', '#ffc54d', '#6d3df0'];

const tooltipStyle = {
  background: '#1a1530',
  border: '1px solid #2a2342',
  borderRadius: 10,
  color: '#f3f0fa',
  fontSize: 12,
};

export function ProviderCostBars({ stats }: { stats?: Stats }) {
  const data = Object.entries(stats?.by_provider ?? {}).map(([name, t]) => ({
    name,
    costo: Number(t.cost_usd.toFixed(6)),
  }));
  if (data.length === 0) return <Empty label="Sin datos de costo" />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: '#a99fc7', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
        <Bar dataKey="costo" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 ? AMBER : PURPLE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProviderTokenDonut({ stats }: { stats?: Stats }) {
  const data = Object.entries(stats?.by_provider ?? {})
    .map(([name, t]) => ({ name, value: t.input_tokens + t.output_tokens }))
    .filter((d) => d.value > 0);
  if (data.length === 0) return <Empty label="Sin tokens aun" />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 180, color: 'var(--fg-faint)', fontSize: 13 }}>
      {label}
    </div>
  );
}
