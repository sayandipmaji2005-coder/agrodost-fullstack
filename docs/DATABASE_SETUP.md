# Supabase Database & PostgreSQL Setup Guide

AgriCare features a decoupled data abstraction layer:
1. **Out-of-the-Box Mode**: If Supabase variables are empty in `.env`, the server automatically activates a thread-safe, transactional local JSON-backed storage engine with pre-seeded demo farms and profiles.
2. **Production Supabase Mode**: Easily connected to any hosted Supabase PostgreSQL instance.

---

## Connecting Supabase

### 1. Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Note your **Project URL**, **anon key**, and **service_role key** under **Project Settings > API**.

### 2. Configure Environment Variables
Update `server/.env` (or root `.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Apply Migrations
Execute the SQL migration files in sequence in the Supabase SQL Editor:
1. `database/migrations/001_profiles.sql`
2. `database/migrations/002_farms_and_boundaries.sql`
3. `database/migrations/003_satellite_scans.sql`
4. `database/migrations/004_disease_and_treatment.sql`
5. `database/migrations/005_recovery_and_prescriptions.sql`
6. `database/migrations/006_rls_policies.sql`

### 4. (Optional) Insert Demo Data
Run `database/seeds/001_demo_data.sql` to populate sample farm parcels in West Bengal and Haryana.

---

## Row Level Security (RLS)
Every table is locked down with strict RLS policies. Queries automatically scope to `auth.uid() = user_id`, guaranteeing multi-tenant isolation.
