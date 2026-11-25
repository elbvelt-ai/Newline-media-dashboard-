"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

// Colors follow the glass theme tokens so charts switch with light/dark.
const COLORS = ["var(--gd-teal)", "var(--gd-coral)", "var(--gd-ochre)", "var(--gd-graph-ink)", "#7d6b9c", "#5b7fa6", "#6f8f5a", "#b88a6a"];
const AXIS = { fontSize: 10, fill: "var(--gd-muted)" };
const GRID = "var(--gd-grid)";
const TIP = {
  contentStyle: { background: "var(--gd-surface)", border: "1px solid var(--gd-rim)", borderRadius: 10, fontSize: 11, color: "var(--gd-ink)" },
  itemStyle: { color: "var(--gd-ink)" },
  labelStyle: { color: "var(--gd-muted)" },
  cursor: { fill: "var(--gd-inner)" },
} as const;
const LEG = { fontSize: 11, color: "var(--gd-muted)" } as const;

type NameN = { name: string; n: number };

export function VolumeChart({ data }: { data: { month: string; created: number; closed: number }[] }) {
  return (
    <div className="chart" style={{ width: "100%", height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...TIP} />
          <Legend wrapperStyle={LEG} />
          <Line type="monotone" dataKey="created" name="Opened" stroke={COLORS[3]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="closed" name="Closed" stroke={COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyStacked({ analysts, rows }: { analysts: string[]; rows: Record<string, number | string>[] }) {
  return (
    <div style={{ width: "100%", height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: -18, right: 8, top: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...TIP} />
          <Legend wrapperStyle={LEG} />
          {analysts.map((a, i) => (
            <Bar key={a} dataKey={a} stackId="d" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBar({ data, color = 0 }: { data: NameN[]; color?: number }) {
  const h = Math.max(160, data.length * 30 + 20);
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={120} />
          <Tooltip {...TIP} />
          <Bar dataKey="n" name="Tickets" fill={COLORS[color]} radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: "var(--gd-muted)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data }: { data: NameN[] }) {
  const total = data.reduce((a, d) => a + d.n, 0);
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="n" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={1.5} stroke="none" cornerRadius={4}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...TIP} />
          <Legend wrapperStyle={LEG} />
          <text x="50%" y="46%" textAnchor="middle" style={{ fontSize: 24, fontWeight: 800, fill: "var(--gd-ink)" }}>{total}</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
