# Flask Backend - DEPRECATED

> **Status**: This Flask backend is deprecated and no longer actively used.
> The active frontend is the **Next.js application** in `gallotrack-next/`.

## Migration Notice

The Flask backend was the original Sprint 1 implementation. The system has been
migrated to:

- **Frontend**: Next.js 16 with React 19 (`gallotrack-next/`)
- **Backend**: Supabase (cloud PostgreSQL + Auth + Storage)
- **Auth**: Supabase Auth with email/password + OTP

## To run the active Next.js frontend:

```bash
cd gallotrack-next
npm install
npm run dev
```

## This Flask directory is kept for:

- Historical reference
- Database schema comparison
- Utility functions (lineage calculations)

## Files preserved for reference (moved to `deprecated/`):

- `deprecated/app.py` - Original Flask application factory
- `deprecated/models.py` - SQLAlchemy models (reference for Supabase schema)
- `deprecated/routes/` - Flask blueprints
- `deprecated/templates/` - Jinja2 HTML templates
- `deprecated/forms.py` - WTForms definitions
- `deprecated/database.py` - SQLAlchemy setup
- `deprecated/config.py` - Flask configuration
- `deprecated/seed.py` - Test data seeding logic
- `utils/lineage.py` - Bloodline calculation algorithms
