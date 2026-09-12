-- 005_recovery_and_prescriptions.sql: Recovery tracking and Kisan Parchi prescription records
CREATE TABLE IF NOT EXISTS public.recovery_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initial_disease_result_id UUID REFERENCES public.disease_results(id) ON DELETE SET NULL,
  baseline_date TIMESTAMPTZ NOT NULL,
  check_date TIMESTAMPTZ DEFAULT NOW(),
  scheduled_follow_up_days INT DEFAULT 7,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  initial_severity TEXT NOT NULL,
  current_severity TEXT NOT NULL,
  recovery_progression TEXT NOT NULL CHECK (recovery_progression IN ('Improved', 'No Significant Change', 'Worsened')),
  recovery_score_percentage NUMERIC(5, 2) DEFAULT 0,
  observations JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('recovery_due', 'weather_alert', 'scan_ready', 'disease_warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_checks_farm ON public.recovery_checks(farm_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
