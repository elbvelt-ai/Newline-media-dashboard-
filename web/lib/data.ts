import { pool } from "./db";
import type { User } from "./auth";

export type TicketRow = {
  number: string;
  subject: string;
  status: string;
  priority: string;
  assignee: string;
  category: string;
  type: string;
  created: string | null;
  due: string | null;
  closed: string | null;
  modified: string | null;
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Every query is scoped here: a non-master user can only ever see their own categories,
 * and `market` (the master's filter) is ignored for them.
 */
export async function getDashboard(user: User, market: string | null) {
  const m = user.isMaster ? market : null;
  const p = [user.isMaster, user.categories, m];
  const scope = `FROM tickets t WHERE ($1::boolean OR t.category = ANY($2::text[])) AND ($3::text IS NULL OR t.category = $3)`;
  const asg = `COALESCE(NULLIF(t.assignee,''),'Unassigned')`;
  const OPEN = `t.status <> 'Closed'`;
  const CLOSED = `t.status = 'Closed'`;

  const [kpi, hours, created, closed, daily, aOpen, aMonth, types, markets, tickets, synced, allMarkets] = await Promise.all([
    pool.query(
      `SELECT
        count(*) FILTER (WHERE ${OPEN})::int AS open,
        count(*) FILTER (WHERE ${CLOSED} AND t.closed_time::date = current_date)::int AS closed_today,
        count(*) FILTER (WHERE ${CLOSED} AND t.closed_time >= date_trunc('month', now()))::int AS closed_month,
        count(*) FILTER (WHERE ${CLOSED} AND t.closed_time >= date_trunc('month', now()) - interval '1 month' AND t.closed_time < date_trunc('month', now()))::int AS closed_last_month,
        count(*) FILTER (WHERE ${OPEN} AND t.due_date < now())::int AS overdue,
        count(*) FILTER (WHERE ${OPEN} AND COALESCE(t.modified_time, t.created_time) < now() - interval '14 days')::int AS stale,
        round((avg(extract(epoch FROM t.closed_time - t.created_time) / 3600) FILTER (WHERE ${CLOSED} AND t.closed_time IS NOT NULL))::numeric, 1)::float8 AS avg_hours
       ${scope}`, p),
    pool.query(
      `SELECT COALESCE(sum(e.hours), 0)::float8 AS h
       FROM ticket_time_entries e JOIN tickets t ON t.ticket_id = e.ticket_id
       WHERE ($1::boolean OR t.category = ANY($2::text[])) AND ($3::text IS NULL OR t.category = $3)
         AND e.entry_date >= date_trunc('week', now())`, p),
    pool.query(`SELECT to_char(date_trunc('month', t.created_time), 'YYYY-MM') AS k, count(*)::int AS n ${scope}
                AND t.created_time >= date_trunc('month', now()) - interval '11 months' GROUP BY 1`, p),
    pool.query(`SELECT to_char(date_trunc('month', t.closed_time), 'YYYY-MM') AS k, count(*)::int AS n ${scope}
                AND ${CLOSED} AND t.closed_time >= date_trunc('month', now()) - interval '11 months' GROUP BY 1`, p),
    pool.query(`SELECT t.closed_time::date::text AS d, ${asg} AS a, count(*)::int AS n ${scope}
                AND ${CLOSED} AND t.closed_time >= now() - interval '30 days' GROUP BY 1, 2`, p),
    pool.query(`SELECT ${asg} AS name, count(*)::int AS n ${scope} AND ${OPEN} GROUP BY 1 ORDER BY 2 DESC`, p),
    pool.query(`SELECT ${asg} AS name, count(*)::int AS n ${scope}
                AND ${CLOSED} AND t.closed_time >= date_trunc('month', now()) GROUP BY 1 ORDER BY 2 DESC`, p),
    pool.query(`SELECT COALESCE(NULLIF(t.sub_category,''),'Untyped') AS name, count(*)::int AS n ${scope} GROUP BY 1 ORDER BY 2 DESC`, p),
    pool.query(`SELECT COALESCE(NULLIF(t.category,''),'Untagged') AS name, count(*)::int AS n ${scope} GROUP BY 1 ORDER BY 2 DESC`, p),
    pool.query(
      `SELECT COALESCE(t.ticket_number, t.ticket_id) AS number, t.subject, t.status, t.priority, ${asg} AS assignee,
              COALESCE(NULLIF(t.category,''),'Untagged') AS category, COALESCE(NULLIF(t.sub_category,''),'Untyped') AS type,
              t.created_time, t.due_date, t.closed_time, t.modified_time
       ${scope} AND (${OPEN} OR t.closed_time >= now() - interval '30 days')
       ORDER BY t.created_time DESC LIMIT 1500`, p),
    pool.query(`SELECT max(updated_at) AS s FROM tickets`),
    user.isMaster
      ? pool.query(`SELECT DISTINCT category AS name FROM tickets WHERE category IS NOT NULL AND category <> '' ORDER BY 1`)
      : Promise.resolve({ rows: [] as { name: string }[] }),
  ]);

  // 12-month volume, filled so empty months show as 0
  const months: string[] = [];
  const d0 = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const cm = new Map<string, number>(created.rows.map((r) => [r.k, r.n]));
  const xm = new Map<string, number>(closed.rows.map((r) => [r.k, r.n]));
  const volume = months.map((k) => ({
    month: new Date(k + "-01T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    created: cm.get(k) ?? 0,
    closed: xm.get(k) ?? 0,
  }));

  // Closed by day, stacked per analyst (last 30 days)
  const analysts = [...new Set<string>(daily.rows.map((r) => r.a))];
  const byDay = new Map<string, Record<string, number | string>>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    byDay.set(d, { day: d.slice(5) });
  }
  for (const r of daily.rows) {
    const row = byDay.get(r.d);
    if (row) row[r.a] = r.n;
  }

  return {
    kpi: { ...kpi.rows[0], hours_week: hours.rows[0].h },
    volume,
    daily: { analysts, rows: [...byDay.values()] },
    analystOpen: aOpen.rows as { name: string; n: number }[],
    analystMonth: aMonth.rows as { name: string; n: number }[],
    types: types.rows as { name: string; n: number }[],
    markets: markets.rows as { name: string; n: number }[],
    marketList: allMarkets.rows.map((r) => r.name as string),
    syncedAt: iso(synced.rows[0].s),
    tickets: tickets.rows.map(
      (r): TicketRow => ({
        number: r.number, subject: r.subject ?? "", status: r.status ?? "", priority: r.priority ?? "",
        assignee: r.assignee, category: r.category, type: r.type,
        created: iso(r.created_time), due: iso(r.due_date), closed: iso(r.closed_time), modified: iso(r.modified_time),
      })
    ),
  };
}
