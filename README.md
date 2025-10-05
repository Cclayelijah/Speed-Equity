# Sweat Equity

A productivity, transparency, and equity tracking app for founders and collaborators powered by Supabase (Auth, Postgres, Storage, RLS) and React + MUI.

## What It Does

Sweat Equity lets a team:
- Create projects, upload a project logo, and invite members.
- Log daily check‑ins (hours worked, achievements, hours wasted, today’s plan).
- Track active project valuation and remaining work hours via projections.
- View personal (My Impact) vs team (Team Progress) KPIs with a quick icon toggle.
- See hourly productivity valuation (implied dollar value per hour).
- Maintain equitable distribution using member equity percentages.
- Rapidly review the most recent activity (last 5 entries) and drill into full history.
- Manage membership, ownership transfer, and real‑time name/logo edits.

## Core Features

### Projects
- Create project (owner automatically added as a member).
- Upload / change project logo (public or signed URL fallback).
- Inline project name editing with debounce and validation.
- Transfer ownership flow.
- Projections: set active valuation and work_hours_until_completion (historical versions stored in `project_projections` and activated via the `set_active_projection` RPC).

### Members & Equity
- Members stored in `project_members`.
- Equity percentage (`equity`) used for proportional reward / value attribution.
- Invitations (pending vs joined) managed through Supabase tables.

### Daily Check‑Ins
- Table: `daily_entries`.
- Fields include: hours_worked, hours_wasted, completed (yesterday summary), plan_to_complete (today plan), entry_date.
- Last 5 most recent entries shown in Dashboard “Checkin History” (with New Check‑In + View More buttons).
- Full history accessible via the dedicated check‑ins page.
- Hours aggregated for My vs Team charts.

### Projections & Valuation
- Table: `project_projections` holds historical snapshot rows (valuation + work_hours_until_completion + effective_from).
- Active projection set through `set_active_projection` Postgres function.
- Dashboard derives:
  - active_valuation
  - active_work_hours_until_completion
  - implied_hour_value (valuation / (total historical + remaining projected hours) or similar derived logic)
  - recent 7‑day hour aggregates (my_hours_7, team_hours_7)

### Dashboard
- Project selector with logo.
- Icon toggle (single person / group) switches My Impact vs Team view.
- KPIs: valuation, remaining hours, implied hour value, equity percentage, recent hours.
- Charts (Line / Bar) for personal vs team contributions.
- Compact, mobile‑aware layout; buttons sized for touch.

### File & Logo Handling
- Storage bucket: `project-logos`.
- Public URL normalization to avoid duplicate path segments.
- Signed URL fallback if bucket private.
- Cache busting via `?v=timestamp`.
- Safe overwrite (upsert) on logo change.

### Security
- Supabase Row Level Security ensures:
  - Only authenticated users access their membership data.
  - Only project owners can update name, logo, or projections.
  - Members can only read/write check‑ins for projects they belong to.
- Bucket can be public (with select policy) or private (signed URLs auto‑generated).

## Tech Stack

| Layer        | Tool / Service |
|--------------|----------------|
| Frontend     | React + TypeScript + MUI |
| State / Hooks| React hooks (useEffect/useCallback/useMemo) |
| Backend      | Supabase (Postgres, Auth, Storage) |
| Auth         | Supabase Auth (email/user id) |
| DB Access    | Supabase JS client + typed `Database` definition |
| Charts       | @mui/x-charts |
| Notifications| react-hot-toast |

## Key Tables (Simplified)

- `projects`: id, owner_id, name, logo_url
- `project_members`: project_id, user_id, equity, email
- `project_invitations`: project_id, user_id (pending invites)
- `project_projections`: id, project_id, valuation, work_hours_until_completion, effective_from, superseded_at
- `daily_entries`: id, project_id, created_by, entry_date, hours_worked, hours_wasted, completed, plan_to_complete, inserted_at

## Typical Flow

1. Owner creates project (optional initial projection + logo).
2. Owner invites collaborators (rows appear in pending invites).
3. Members join; equity may be assigned/adjusted.
4. Team submits daily entries.
5. Owner updates projection when valuation or remaining hours change.
6. Dashboard displays current valuation, implied hour value, recent contribution charts, and last 5 check‑ins.
7. Users drill into full check‑in history if needed.

## Development Setup

1. Clone repo.
2. Copy `.env.example` → `.env` and fill Supabase URL & anon key.
3. `npm install`
4. `npm run dev`
5. Ensure storage bucket (`project-logos`) exists; optionally make it public:
   ```sql
   select storage.set_bucket_public('project-logos', true);
   create policy "project-logos select" on storage.objects
     for select to public using ( bucket_id = 'project-logos' );
   ```
6. Confirm RPC `set_active_projection` is deployed.

## Extending

- Add analytics: create materialized views for weekly/hour aggregates.
- Add notifications or reminders for missing check‑ins.
- Implement role-based equity locks or approval workflow.

## Contributing

Issues & PRs welcome. Please:
- Keep changes typed.
- Respect RLS constraints.
- Include migration SQL (if schema changes).

## License

MIT (or project-specific license