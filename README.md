# NLM Client Dashboard

Zoho Desk → n8n sync (every 15 min) → Postgres → **Next.js app** (login + dashboard) behind Caddy.
Gus owns everything: no per-viewer licences, no third-party BI.

## Layout
| Path | What |
|---|---|
| `sql/01_schema.sql` | Ticket columns, time-entry table, `dashboard_users`, login-attempt log |
| `n8n/nlm-dashboard-sync.json` | Import into n8n: schedule, paginated Zoho fetch, field map, upsert |
| `web/` | Next.js 15 (App Router, TypeScript, Recharts). Server-side Postgres queries, bcrypt logins, signed session cookie |
| `deploy/` | Compose service + Caddy route to add to `~/n8n-stack/` |

## Design system
The UI uses the "glassy dashboard" component, kept at `web/components/ui/glassy-dashboard.tsx` (the standard shadcn location, so `@/components/ui/*` imports and the shadcn CLI both resolve there). Its styles are self-contained and scoped under `.gd-app`, so **Tailwind and shadcn are not required**; if you later want them: `npx shadcn@latest init` in `web/`.
- Our data components (`NlmDashboard`, `Charts`, `TicketTable`) are built from its exported pieces: `Panel`, `Metric`, `Badge`, `Dock`, `dashboardStyles`.
- Extra deps: `gsap`, `@gsap/react`, `lucide-react`, `@fontsource-variable/manrope`.
- Light/dark toggle is saved per browser. Charts read the glass colour tokens, so they follow the theme.
- The background photo is hot-linked from the component's default URL (`studioPhoto`). Before go-live, host Gus's own image under `web/public/` and pass it instead, so the page doesn't depend on a third-party CDN.
- `glassy-dashboard.tsx` still contains the original sample views (`GlassyDashboard`) with fake data; the NLM app doesn't render them.

## How it meets the brief
| Gus's brief | Where |
|---|---|
| KPI tiles: closed today, no update 2+ weeks, closed this month vs last, time worked this week | `web/app/page.tsx`, `web/lib/data.ts` |
| Per-analyst open load, closed per analyst this month | master view (`SHOW_ANALYSTS_TO_MARKETS` to also show to markets) |
| Yearly trend line, stacked bar of closed per day by analyst | `VolumeChart`, `DailyStacked` |
| Category donut + bar by type (End User Computer, Network, Broadcast…) | Zoho **Sub Category** = ticket type |
| Unassigned / assigned tables grouped by station | `TicketTable` (grouped by market on master view) |
| Per-market filtered access ("outages in Fresno this month") | login scoped to its markets; master has a market dropdown |

**Data model decision:** Zoho `category` = market/station (Fresno…); Zoho `subCategory` = ticket type (Network, Outage…). Both picklists must exist in the Zoho admin UI (Setup → Customization → Layouts). "Outages in Fresno" = Category Fresno + Sub Category Outage.

## Auth
Username + password per market contact. bcrypt (cost 12) hashes; HTTP-only, SameSite=Lax, Secure cookie, 12 h; the user row is re-checked every request so disabling a login cuts access immediately; 5 failed attempts per username per 15 min locks it; constant-time compare for unknown users. All queries are scoped server-side by the login's markets.

```bash
# inside the stack, after the dashboard container is up
docker compose exec -e PASSWORD='long-password-12+' dashboard node scripts/create-user.mjs gus "All Markets" --master
docker compose exec -e PASSWORD='...' dashboard node scripts/create-user.mjs fresno "Fresno" --markets "Fresno"
```
Re-running for a username resets its password. Disable: `UPDATE dashboard_users SET active=false WHERE username='fresno';`

## Deploy (VPS, `~/n8n-stack/`)
1. `docker compose exec -T postgres psql -U n8n -d n8n < sql/01_schema.sql`
2. n8n: import `nlm-dashboard-sync.json`, reselect credentials ("Zoho Desk OAuth2", "NLM Postgres"), run once, activate.
3. Copy `web/` to `~/n8n-stack/web/`; add the service from `deploy/docker-compose.snippet.yml`; put `DASHBOARD_AUTH_SECRET` (`openssl rand -base64 48`) in `.env`.
4. Add `deploy/Caddyfile.snippet` above the n8n catch-all; `docker compose up -d --build dashboard caddy`.
5. Create users (above). Site: `https://newlinemedia.duckdns.org/dashboard`.

## Local dev
`cd web && cp .env.example .env.local && npm install && npm run dev` (needs a Postgres with the schema applied).

## Still open
- **Time worked this week** reads `ticket_time_entries`, which no sync fills yet (Zoho time entries need a separate per-ticket API pass). Tile shows 0 h until built.
- Zoho field names in the sync map (`ticketNumber`, `dueDate`, `closedTime`, `modifiedTime`, `assignee.*`) are unverified against a live response.
- Historical tickets stay "Untagged/Untyped" until Category and Sub Category are filled in Zoho.
- Deleted Zoho tickets aren't removed from Postgres (upsert only).
- Gus's open questions: full market list, analyst charts on market views, link recipients, refresh cadence.
