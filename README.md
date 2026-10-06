# GalloTrack-Web

**Gamefowl Management System** - Optimizing Gamefowl Management through In-Depth Analytics

## Overview

GalloTrack is a web-based gamefowl management system for tracking gamefowl profiles, parent-offspring relationships, match results, and performance analytics.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Charts | Chart.js, react-chartjs-2 |
| Auth | Supabase Auth (email/password, OTP) |
| Hosting | Vercel |

## Features

- **Gamefowl Registry** - Full profiles with physical specs, lineage tracking, image uploads
- **Lineage Tracking** - Parent-offspring relationships, bloodline purity calculation
- **Match Logging** - Record fight results with post-fight conditions and video evidence
- **Performance Analytics** - Win rates, breed performance trends, pairing statistics
- **Admin Panel** - User management, system settings, data oversight
- **Dark/Light Theme** - Theme toggle with next-themes

## Project Structure

```
GalloTrack-Web/
├── gallotrack-next/          # Active Next.js frontend
│   ├── app/                  # Pages and routes
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities (supabase, admin, registry)
│   └── public/               # Static assets
│
├── supabase/                 # Database migrations
│   └── migrations/           # SQL migration files
│
├── utils/                    # Legacy utilities
│   └── lineage.py            # Bloodline calculation algorithms
│
├── tests/                    # pytest tests (Flask backend)
└── FLASK_DEPRECATED.md       # Deprecated Flask backend docs
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/GalloTrack-Web.git
cd GalloTrack-Web/gallotrack-next
npm install
```

### 2. Configure Environment

Copy `gallotrack-next/.env.example` to `gallotrack-next/.env.local` and fill in the values from your Supabase project (**Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=http://localhost:3000         # public origin of this deployment
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Run Tests & Quality Gates

```bash
npm run gate     # standard gates + tsc --noEmit + eslint + vitest
npm test         # vitest only
```

The legacy Flask/pytest suite is deprecated - see [FLASK_DEPRECATED.md](FLASK_DEPRECATED.md).

## Database Schema

Migrations live in `supabase/migrations/` and are applied with the Supabase CLI:

```bash
supabase db push          # or: supabase migration up
```

Without the CLI, run each migration file's SQL in the Supabase SQL editor in filename order.

Tables: `profiles`, `fowl`, `match`, `farms`, `strains`, `system_settings`, `admin_audit_logs`, `marketplace_listings`

Row Level Security (RLS) enforces strict user isolation - each user can only access their own data.

## Deployment

The app runs anywhere Node.js runs; Vercel is the primary host (push to `main` to deploy).

### Vercel

1. Import the repository and set the **Root Directory** to `gallotrack-next/` (that is where `next.config.ts` and `vercel.json` live).
2. Add the four environment variables above to *Project → Settings → Environment Variables* (`SUPABASE_SERVICE_ROLE_KEY` as a sensitive variable).
3. Deploy. `next build` is used automatically.

### Any other Node host (VPS, Docker, self-managed)

```bash
cd gallotrack-next
npm ci
npm run gate        # static gates, typecheck, lint, tests
npm run build
npm start           # next start, defaults to port 3000
```

Set the same environment variables in the process environment (`.env.local` also works). Reverse-proxy HTTPS in front of `next start` and point `NEXT_PUBLIC_SITE_URL` at that public origin.

### Reconfiguring for a new environment

Only the four variables in `.env.example` change between hosts - no code edits are needed. After moving environments:

1. Update the env vars, redeploy.
2. Apply any new migrations (`supabase db push`).
3. Run `npm run gate` to confirm the build is healthy.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run gate`
4. Submit a pull request

## License

Private - Team GalloTrack at ISUFST

---

**Created by**: Team GalloTrack at ISUFST
**Version**: 1.0.0 (Sprint 4)
