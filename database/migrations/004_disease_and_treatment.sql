-- 004_disease_and_treatment.sql: Camera scans and diagnostic results
CREATE TABLE IF NOT EXISTS public.camera_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disease_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.camera_scans(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  probable_disease TEXT NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL,
  is_low_confidence BOOLEAN DEFAULT FALSE,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('Mild', 'Moderate', 'Severe')),
  visible_symptoms JSONB DEFAULT '[]'::jsonb,
  probable_causes JSONB DEFAULT '[]'::jsonb,
  secondary_possibilities JSONB DEFAULT '[]'::jsonb,
  cultural_treatments JSONB DEFAULT '[]'::jsonb,
  biological_treatments JSONB DEFAULT '[]'::jsonb,
  active_chemicals JSONB DEFAULT '[]'::jsonb,
  kisan_call_center_number TEXT DEFAULT '1800-180-1551',
  kvk_advisory_notice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disease_results_user_id ON public.disease_results(user_id);
CREATE INDEX IF NOT EXISTS idx_disease_results_farm_id ON public.disease_results(farm_id);
