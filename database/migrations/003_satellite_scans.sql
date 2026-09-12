-- 003_satellite_scans.sql: Dual-mode satellite analysis records
CREATE TABLE IF NOT EXISTS public.satellite_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scan_date TIMESTAMPTZ DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('optical', 'sar_radar')),
  cloud_cover_percentage NUMERIC(5, 2) DEFAULT 0,
  is_monsoon_radar_active BOOLEAN DEFAULT FALSE,
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'warning', 'critical')),
  
  -- Optical metrics
  mean_ndvi NUMERIC(5, 4),
  healthy_canopy_percentage NUMERIC(5, 2),
  moderate_stress_percentage NUMERIC(5, 2),
  severe_stress_percentage NUMERIC(5, 2),
  
  -- SAR Radar metrics
  vv_backscatter_db NUMERIC(6, 2),
  vh_backscatter_db NUMERIC(6, 2),
  polarization_ratio NUMERIC(6, 2),
  soil_moisture_index NUMERIC(5, 2),
  waterlogging_risk TEXT CHECK (waterlogging_risk IN ('minimal', 'moderate', 'high', 'critical')),
  canopy_structural_loss_percentage NUMERIC(5, 2),
  
  -- Stress zones & annotations
  stress_zones JSONB DEFAULT '[]'::jsonb,
  macro_observations JSONB DEFAULT '[]'::jsonb,
  prompt_camera_inspection BOOLEAN DEFAULT FALSE,
  scientific_limitation_notice TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_scans_farm_id ON public.satellite_scans(farm_id);
CREATE INDEX IF NOT EXISTS idx_satellite_scans_user_id ON public.satellite_scans(user_id);
