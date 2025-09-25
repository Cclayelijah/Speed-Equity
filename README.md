# Sweat Equity

A productivity and equity tracking app for founders and collaborators.

## Features

- **Project creation:** Only authenticated users can create projects. Each project is linked to its owner.
- **Daily check-in:** Log hours worked, achievements, hours wasted, and your plan for today. After submitting, you'll see a breakdown of money made and lost.
- **Dashboard:** View KPIs, sweat equity earned, money lost, and progress charts.
- **Project members:** Owners can invite collaborators by email and assign equity shares.
- **Equity calculation:** Each member's earnings are based on their equity share.
- **Project projections:** Only project owners can edit projections such as valuation and weeks-to-goal.
- **Row Level Security (RLS):** All sensitive tables are protected so only authorized users can read or edit their own data.

## Daily Check-In

- Go to the **Check-In** page (`/checkin`).
- Answer:
  1. How many hours did you work yesterday?
  2. What did you achieve during that time?
  3. How many hours did you waste yesterday?
  4. What are you going to do today?
- After submitting, a modal shows your money made and lost for the day.

## Security & Access

- **.env** and **node_modules** are excluded from git for security.
- Only project owners can edit project projections (valuation, goal).
- Only owners and accepted members can submit daily entries for a project.
- All data access is protected by Supabase RLS policies.

## Getting Started

1. Clone the repo.
2. Add your Supabase credentials to `.env`.
3. Run `npm install`.
4. Start the app with `npm run dev`.

## Database Schema Highlights

- `projects`: Stores project info, owner, and goals.
- `project_members`: Tracks invitations, join dates, and equity shares.
- `project_projections`: Editable only by project owners.
- `daily_entries`: Stores daily check-ins, linked to projects and users.

## Contributing

PRs welcome! Please open an issue for feature requests or bugs.