"use client";

import { Fragment, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { Panel, Badge } from "@/components/ui/glassy-dashboard";
import type { TicketRow } from "@/lib/data";

type Key = "number" | "subject" | "status" | "priority" | "assignee" | "type" | "created" | "age";
const COLS: [Key, string][] = [
  ["number", "Ticket #"], ["subject", "Subject"], ["status", "Status"], ["priority", "Priority"],
  ["assignee", "Assignee"], ["type", "Type"], ["created", "Created"], ["age", "Age"],
];

type RangeKey = "7" | "14" | "30" | "60" | "90" | "all" | "custom";
const RANGES: [RangeKey, string][] = [
  ["7", "Last 7 days"], ["14", "Last 14 days"], ["30", "Last 30 days"],
  ["60", "Last 60 days"], ["90", "Last 90 days"], ["all", "All time"], ["custom", "Custom range"],
];

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
const ageMs = (t: TicketRow) => (t.closed ? new Date(t.closed).getTime() : Date.now()) - new Date(t.created ?? Date.now()).getTime();
const isClosed = (t: TicketRow) => t.status === "Closed";
// The date a ticket is "placed" on the timeline for range filtering: when it closed if closed, otherwise when it was created.
const refDate = (t: TicketRow) => (isClosed(t) ? t.closed : t.created);

function Row({ t }: { t: TicketRow }) {
  const od = !isClosed(t) && t.due && new Date(t.due) < new Date();
  return (
    <tr>
      <td>{t.number}</td>
      <td className="s">{t.subject}</td>
      <td><Badge status={isClosed(t) ? "Complete" : t.status} />{od && <span className="nlm-od">overdue</span>}</td>
      <td>{t.priority}</td>
      <td>{t.assignee}</td>
      <td>{t.type}</td>
      <td>{fmt(t.created)}</td>
      <td>{Math.floor(ageMs(t) / 864e5)}d</td>
    </tr>
  );
}

export default function TicketTable({ tickets, groupByMarket }: { tickets: TicketRow[]; groupByMarket: boolean }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("open");
  const [range, setRange] = useState<RangeKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [key, setKey] = useState<Key>("created");
  const [dir, setDir] = useState(-1);

  const inRange = (iso: string | null) => {
    if (range === "all") return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (range === "custom") {
      const lo = from ? new Date(from).getTime() : -Infinity;
      const hi = to ? new Date(to).getTime() + 864e5 - 1 : Infinity; // inclusive of the whole "to" day
      return t >= lo && t <= hi;
    }
    return t >= Date.now() - Number(range) * 864e5;
  };

  const sections = useMemo(() => {
    const ql = q.toLowerCase();
    const rows = tickets.filter((t) => {
      if (f === "open" && isClosed(t)) return false;
      if (f === "closed" && !isClosed(t)) return false;
      if (!inRange(refDate(t))) return false;
      return !ql || `${t.number} ${t.subject} ${t.assignee} ${t.type} ${t.category}`.toLowerCase().includes(ql);
    });
    const val = (t: TicketRow) => (key === "age" ? ageMs(t) : (t[key as keyof TicketRow] as string | null) ?? "");
    rows.sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * dir);

    // Brief: unassigned vs assigned, grouped by assignment group (market)
    const mk = (title: string, list: TicketRow[]) => {
      const g = new Map<string, TicketRow[]>();
      for (const t of list) {
        const k = groupByMarket ? t.category : "";
        g.set(k, [...(g.get(k) ?? []), t]);
      }
      return { title, count: list.length, groups: [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
    };
    return [
      mk("Unassigned tickets", rows.filter((t) => t.assignee === "Unassigned")),
      mk("Assigned tickets", rows.filter((t) => t.assignee !== "Unassigned")),
    ];
  }, [tickets, q, f, range, from, to, key, dir, groupByMarket]);

  return (
    <Panel title="Tickets" action={
      <div className="gd-table-tools">
        <label className="gd-search"><Search aria-hidden="true" />
          <input type="search" placeholder="Search tickets" aria-label="Search tickets" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="gd-filter"><Filter aria-hidden="true" />
          <select aria-label="Filter by status" value={f} onChange={(e) => setF(e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="gd-filter">
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
            {RANGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        {range === "custom" && (
          <>
            <label className="gd-filter"><input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="gd-filter"><input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </>
        )}
      </div>
    }>
      <div className="gd-table-scroll">
        <table>
          <thead>
            <tr>
              {COLS.map(([k, label]) => (
                <th key={k} scope="col" onClick={() => { setDir(key === k ? -dir : 1); setKey(k); }}>
                  {label}{key === k ? (dir > 0 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <Fragment key={s.title}>
                <tr className="sec"><td colSpan={8}>{s.title} ({s.count})</td></tr>
                {s.count === 0 && <tr><td colSpan={8} style={{ color: "var(--gd-muted)" }}>None</td></tr>}
                {s.groups.map(([g, list]) => (
                  <Fragment key={g}>
                    {groupByMarket && <tr className="grp"><td colSpan={8}>{g} ({list.length})</td></tr>}
                    {list.map((t) => <Row key={t.number} t={t} />)}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
