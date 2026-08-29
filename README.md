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

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Run Tests (Flask Backend)

```bash
cd ..
python -m pytest tests/ -v
```

## Database Schema

Tables: `profiles`, `fowl`, `match`, `farms`, `strains`, `system_settings`

Row Level Security (RLS) enforces strict user isolation - each user can only access their own data.

## Deployment

The app is deployed on Vercel. Push to `main` branch to trigger automatic deployment.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `python -m pytest tests/ -v`
4. Submit a pull request

## License

Private - Team GalloTrack at ISUFST

---

**Created by**: Team GalloTrack at ISUFST
**Version**: 1.0.0 (Sprint 4)
