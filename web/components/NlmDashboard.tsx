"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BarChart3, Clock3, Filter, LayoutDashboard, ListChecks, LogOut, Moon, ShieldCheck, Sun, TriangleAlert, TrendingUp } from "lucide-react";
import { Dock, Metric, Panel, dashboardStyles, studioPhoto, type DockItem } from "@/components/ui/glassy-dashboard";
import { VolumeChart, DailyStacked, HBar, Donut } from "@/components/Charts";
import TicketTable from "@/components/TicketTable";
import { logout } from "@/app/login/actions";
import type { getDashboard } from "@/lib/data";

type Data = Awaited<ReturnType<typeof getDashboard>>;
type View = "overview" | "breakdown" | "tickets";

// The real New Line Media logo — same source the proposal-email workflow already pulls from,
// so both places stay in sync if the file is ever replaced.
const NLM_LOGO = "https://drive.google.com/uc?export=download&id=18hZ1EkWIYL__lEJtiuRwK94de9yXLuFu";

const ITEMS: (DockItem & { description: string })[] = [
  { id: "overview", label: "Overview", short: "Overview", icon: LayoutDashboard, description: "Open work, what is closing, and what needs attention." },
  { id: "breakdown", label: "Breakdown", short: "Breakdown", icon: BarChart3, description: "Where tickets come from: type, market and team." },
  { id: "tickets", label: "Tickets", short: "Tickets", icon: ListChecks, description: "Every open ticket, unassigned first, grouped by station." },
];

// Small additions on top of the component's stylesheet
const extraStyles = `
.nlm-kpis{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
.gd-metric[data-tone="coral"] .gd-metric-value{color:var(--gd-coral)}
.nlm-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
.nlm-select{border:0;background:transparent;font-weight:750;font-size:12px;min-inline-size:0;max-inline-size:100%}
.nlm-select option{color:var(--gd-ink);background:var(--gd-surface)}
.nlm-label{font-size:12px;font-weight:750;padding-inline:6px}
.gd-table-scroll tr.sec td{font-size:11px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;border-top:0;padding-top:18px;color:var(--gd-teal)}
.gd-table-scroll tr.grp td{background:var(--gd-inner);font-size:10px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:var(--gd-muted)}
.gd-table-scroll td.s{white-space:normal;min-inline-size:200px}
.gd-table-scroll th{cursor:pointer;user-select:none}
.nlm-od{color:var(--gd-coral);font-weight:850;font-size:10px;margin-inline-start:4px}
.nlm-out{margin:0;display:contents}
@media (max-width:760px){.nlm-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

function usePersistedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("nlm-theme"); } catch {}
    setTheme(saved === "dark" || saved === "light" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const toggle = () => setTheme(t => {
    const n = t === "light" ? "dark" : "light";
    try { localStorage.setItem("nlm-theme", n); } catch {}
    return n;
  });
  return [theme, toggle] as const;
}

export default function NlmDashboard({ data, label, isMaster, market, showAnalysts }: {
  data: Data;
  label: string;
  isMaster: boolean;
  market: string | null;
  showAnalysts: boolean;
}) {
  const [view, setView] = useState<View>("overview");
  const [theme, toggleTheme] = usePersistedTheme();

  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1) as View;
      setView(ITEMS.some(i => i.id === h) ? h : "overview");
    };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  const select = (next: View) => {
    if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
    setView(next);
  };

  const k = data.kpi;
  const delta = k.closed_month - k.closed_last_month;
  const current = ITEMS.find(i => i.id === view)!;
  const scoped = isMaster && !market;
  const synced = data.syncedAt
    ? new Date(data.syncedAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC"
    : "never";

  return (
    <div className="gd-app" data-theme={theme} style={{ "--gd-panel-frost": "12px" } as CSSProperties}>
      <style>{dashboardStyles + extraStyles}</style>
      <img className="gd-background" src={studioPhoto} alt="" aria-hidden="true" fetchPriority="high" />
      <div className="gd-surround">
        <header className="gd-top">
          <div className="gd-brand">
            <span className="gd-logo" aria-hidden="true">
              <img src={NLM_LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </span>
            <div><strong>NEW LINE MEDIA</strong><small>Support dashboard</small></div>
          </div>

          {isMaster && data.marketList.length > 0 ? (
            <form method="get" className="gd-ask" style={{ cursor: "default" }}>
              <span className="gd-orb" aria-hidden="true" />
              <Filter aria-hidden="true" style={{ width: 14, height: 14 }} />
              <select name="market" className="nlm-select" aria-label="Market" defaultValue={market ?? ""} onChange={e => e.currentTarget.form?.requestSubmit()}>
                <option value="">{label}: all markets</option>
                {data.marketList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </form>
          ) : (
            <div className="gd-ask" style={{ cursor: "default" }}>
              <span className="gd-orb" aria-hidden="true" />
              <span className="gd-prompt">{label}</span>
            </div>
          )}

          <div className="gd-top-actions">
            <button type="button" className="gd-icon-button" onClick={toggleTheme} title="Toggle theme"
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}>
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <form action={logout} className="nlm-out">
              <button className="gd-icon-button" aria-label="Sign out" title="Sign out"><LogOut aria-hidden="true" /></button>
            </form>
          </div>
        </header>

        <div className="gd-stage-wrap">
          <Dock active={view} side select={select} items={ITEMS} />
          <main className="gd-stage">
            <div className="gd-stage-scroll">
              <header className="gd-view-head">
                <div>
                  <h1>{current.label}</h1>
                  <p>{market && isMaster ? `${market} · ` : ""}{current.description}</p>
                </div>
              </header>

              <div className="gd-content" key={view}>
                {view === "overview" && (
                  <div className="gd-analytics">
                    <div className="nlm-kpis">
                      <Metric title="Open tickets" icon={<ListChecks />} value={k.open} detail="not yet closed" tone="teal" />
                      <Metric title="Closed today" icon={<ShieldCheck />} value={k.closed_today} detail="resolved so far today" />
                      <Metric title="Closed this month" icon={<TrendingUp />} value={k.closed_month}
                        change={`${delta >= 0 ? "+" : "−"}${Math.abs(delta)}`} detail={`vs ${k.closed_last_month} last month`} />
                      <Metric title="No update in 2+ weeks" icon={<Clock3 />} value={k.stale} detail="open and quiet" tone={k.stale > 0 ? "coral" : undefined} />
                      <Metric title="Overdue" icon={<TriangleAlert />} value={k.overdue} detail="past their due date" tone={k.overdue > 0 ? "coral" : undefined} />
                      <Metric title="Time worked this week" icon={<Clock3 />} value={k.hours_week} format="hours" detail="logged on tickets" />
                    </div>
                    <div className="gd-analytics-grid">
                      <Panel title="Ticket volume" subtitle="Opened and closed, last 12 months"><VolumeChart data={data.volume} /></Panel>
                      <Panel title="Tickets by type" subtitle="All tickets in scope"><Donut data={data.types} /></Panel>
                    </div>
                    <Panel title="Closed per day" subtitle={showAnalysts ? "Last 30 days, by analyst" : "Last 30 days"}>
                      <DailyStacked analysts={data.daily.analysts} rows={data.daily.rows} />
                    </Panel>
                  </div>
                )}

                {view === "breakdown" && (
                  <div className="nlm-grid">
                    <Panel title="By type" subtitle="End User Computer, Network, Broadcast…"><HBar data={data.types} color={1} /></Panel>
                    {scoped && <Panel title="By market" subtitle="Station / category"><Donut data={data.markets} /></Panel>}
                    {showAnalysts && <Panel title="Open by analyst" subtitle="Current ticket load"><HBar data={data.analystOpen} color={2} /></Panel>}
                    {showAnalysts && <Panel title="Closed this month by analyst"><HBar data={data.analystMonth} color={0} /></Panel>}
                  </div>
                )}

                {view === "tickets" && <TicketTable tickets={data.tickets} groupByMarket={scoped} />}
              </div>
            </div>
          </main>
          <Dock active={view} select={select} items={ITEMS} />
        </div>

        <footer className="gd-footer">
          <span>Synced {synced}</span>
        </footer>
      </div>
    </div>
  );
}
