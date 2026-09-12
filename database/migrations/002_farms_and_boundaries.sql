-- 002_farms_and_boundaries.sql: Farms and GeoJSON boundary storage
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  sowing_date DATE,
  area_acres NUMERIC(10, 4) NOT NULL DEFAULT 0,
  area_hectares NUMERIC(10, 4) NOT NULL DEFAULT 0,
  center_lat NUMERIC(10, 7) NOT NULL,
  center_lng NUMERIC(10, 7) NOT NULL,
  boundary JSONB NOT NULL, -- GeoJSON Polygon
  village_or_city TEXT,
  state TEXT,
  pincode TEXT,
  soil_type TEXT,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'follow_up_due')),
  last_scan_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_status ON public.farms(status);
