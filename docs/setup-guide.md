# Setup Guide — Super Customizable CFD

End-to-end setup for the Super Customizable CFD widget — auth, dev harness, auto-deploy.

## Prerequisites

- Node 18+ and npm
- A Rally workspace and project you can access
- A Rally API key (instructions below)

## 1. Generate a Rally API key

1. Sign in to Rally.
2. Open the API key page: **<https://rally1.rallydev.com/#/api_key>** (or click your avatar → API Keys).
3. Click **Create**, give the key a name (e.g. `widget-dev`), pick the workspaces it can access, and copy the full key. It starts with `_` and is ~43 chars long.
4. Treat it like a password — don't paste it into anything that gets committed.

## 2. Configure auth (pick one)

The Vite dev server proxies both `/slm/*` (WSAPI) and `/analytics/*` (Lookback API) to Rally.

### Option A — `auth.json` (per-widget, gitignored)

Create `auth.json` in the widget folder:

```json
{
  "server": "https://rally1.rallydev.com",
  "apiKey": "_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Option B — environment variables / `.env.local`

```dotenv
RALLY_SERVER=https://rally1.rallydev.com
RALLY_API_KEY=_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Restart `npm run dev` after adding credentials.

## 3. Run the dev server

```bash
npm install
npm run dev
```

The dev server starts at **http://localhost:5175** with mock data by default.
Add `?live=true` to the URL to switch to live Rally data (requires auth configured above).

## 4. Configure the widget

Click the gear icon in the dev harness to open Edit Mode and configure:

| Setting | Description |
|---|---|
| Artifact Type | User Story, Defect, Task, Feature, etc. |
| Group By Field | Any constrained field on the artifact (ScheduleState, State, Priority, …) |
| Measure | Count, Plan Estimate, or a numeric field |
| Start Date | First day of the date range |
| End Date | Last day — "Today" keeps the chart current |
| Additional Filter | WSAPI query to narrow the artifact scope |

## 5. Deploy to Rally

```bash
npx widget-ai deploy
```

This builds `dist/app.js` and deploys it to Rally as a Custom HTML Widget. The deployed view ID is saved to `rally.config.json` so subsequent deploys update the same widget.

`auth.json` is required for deploy (env vars are not read by the deploy CLI).

## 6. Iterate

| Task | Command |
|---|---|
| Edit chart / settings | `src/App.tsx` — Vite HMR on save |
| Switch to live data | Add `?live=true` to dev server URL |
| Open settings UI | Dev harness → Gear button |
| Production build | `npm run build` |
| Mock build (no auth) | `npm run build:mock` |
| Deploy to Rally | `npx widget-ai deploy` |
| TypeScript check | `npm run typecheck` |

---

## Reference

- [README](../README.md) — Widget overview and settings reference
- [Setup Guide for all widgets](../../wsjf-grid/docs/setup-guide.md) — Detailed auth and deploy instructions
