-- 006_rls_policies.sql: Strict multi-tenant Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Farms: Users can only manage their own farms
CREATE POLICY "Users can view own farms"
  ON public.farms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own farms"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own farms"
  ON public.farms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own farms"
  ON public.farms FOR DELETE
  USING (auth.uid() = user_id);

-- Satellite Scans: Isolated per user
CREATE POLICY "Users can view own satellite scans"
  ON public.satellite_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own satellite scans"
  ON public.satellite_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Camera Scans: Isolated per user
CREATE POLICY "Users can view own camera scans"
  ON public.camera_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own camera scans"
  ON public.camera_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Disease Results: Isolated per user
CREATE POLICY "Users can view own disease results"
  ON public.disease_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disease results"
  ON public.disease_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Recovery Checks: Isolated per user
CREATE POLICY "Users can view own recovery checks"
  ON public.recovery_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recovery checks"
  ON public.recovery_checks FOR ALL
  USING (auth.uid() = user_id);

-- Notifications: Isolated per user
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);
