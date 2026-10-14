# GalloTrack Staging Environment Setup & Disaster Recovery Guide

This guide provides step-by-step instructions for creating a second Supabase project (Staging), applying all database migrations, restoring backup snapshots, and maintaining offsite disaster recovery backups.

---

## 1. Creating the Supabase Staging Project

Supabase's Free Tier permits **two active projects** per organization.

1. Log in to the [Supabase Dashboard](https://app.supabase.com/).
2. Click **New Project** under your organization.
3. Configure project details:
   - **Name**: `gallotrack-staging`
   - **Database Password**: Generate and securely store a strong password.
   - **Region**: Choose the same region as your production project (e.g., Southeast Asia / Singapore).
4. Wait for database provisioning to complete (~1–2 minutes).
5. Navigate to **Project Settings -> API** and copy:
   - `URL` (e.g., `https://your-staging-id.supabase.co`)
   - `anon` `public` API key
   - `service_role` `secret` API key

---

## 2. Applying Schema Migrations to Staging

All database migrations are stored in `supabase/migrations/*.sql`.

### Option A: Using Supabase CLI (Recommended)
```bash
# Link your local CLI to the staging project
npx supabase link --project-ref <your-staging-project-ref>

# Push all unapplied migration files to staging database
npx supabase db push
```

### Option B: Using SQL Editor
If the CLI is not linked, copy and execute the contents of each migration file from `supabase/migrations/*.sql` in sequential filename order inside the Supabase SQL Editor.

---

## 3. Restoring Production Backup into Staging

1. **Perform a fresh production backup**:
   ```bash
   npm run db:backup
   ```
   *Output saved to `backups/backup-YYYY-MM-DD-HHmmss/`.*

2. **Dry-Run Restore Verification**:
   Verify expected row counts without modifying the staging database:
   ```bash
   npm run db:restore -- --target=staging
   ```

3. **Execute Live Restore into Staging**:
   ```bash
   # Set STAGING_SUPABASE_URL and STAGING_SUPABASE_KEY in .env.local or environment
   npm run db:restore -- --target=staging --execute
   ```

4. **Verify Row Count Match**:
   ```bash
   npm run db:compare -- --target=staging
   ```

---

## 4. Staging Environment Configuration & Banner

1. Copy `.env.staging.example` to `.env.local` when running against staging:
   ```ini
   NEXT_PUBLIC_APP_ENV=staging
   NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
   ```

2. Start the local server:
   ```bash
   npm run dev
   ```

3. Confirm that the top of the web interface displays the bright yellow **`STAGING ENVIRONMENT`** indicator banner.

---

## 5. Backup Schedule & Offsite Storage Policy

- **Frequency**:
  - Run database & storage backups **weekly at minimum**.
  - Always execute `npm run db:backup` **immediately before any migration, deployment, or bulk data operation**.
- **Local Storage**:
  - Backups are stored in `backups/backup-YYYY-MM-DD-HHmmss/` (automatically git-ignored).
- **Offsite Storage Policy**:
  - Do NOT keep backup files solely on your local workstation.
  - Compress and encrypt backup directories:
    ```bash
    tar -czf backup-latest.tar.gz backups/backup-latest/
    gpg -c backup-latest.tar.gz
    ```
  - Sync encrypted archives to offsite encrypted cloud storage (e.g. AWS S3 Bucket with KMS encryption, Google Cloud Storage, or an offline encrypted external drive).
