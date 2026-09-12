-- 001_demo_data.sql: Pre-seeded data for demonstration and stage pitch
-- (Automatically loaded by backend local demo engine or Supabase seed)

INSERT INTO public.profiles (id, email, full_name, phone, preferred_language, state, district, role)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'demo.farmer@agricare.org', 'Ramesh Kumar Patel', '+91-9876543210', 'hi', 'West Bengal', 'Hooghly', 'farmer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.farms (id, user_id, name, crop_type, sowing_date, area_acres, area_hectares, center_lat, center_lng, boundary, village_or_city, state, pincode, soil_type, status)
VALUES
  (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Shanti Krishi Farm - Plot A (Potato)',
    'Potato (Kufri Jyoti)',
    '2026-10-15',
    3.85,
    1.56,
    22.8962,
    88.2461,
    '{"type": "Polygon", "coordinates": [[[88.2440, 22.8950], [88.2480, 22.8950], [88.2475, 22.8975], [88.2435, 22.8970], [88.2440, 22.8950]]]}'::jsonb,
    'Tarakeswar',
    'West Bengal',
    '712410',
    'Alluvial Loam',
    'warning'
  ),
  (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Karnal Green Fields - Plot B (Rice Paddy)',
    'Basmati Rice (PB 1121)',
    '2026-06-20',
    5.40,
    2.18,
    29.6857,
    76.9905,
    '{"type": "Polygon", "coordinates": [[[76.9880, 29.6840], [76.9930, 29.6840], [76.9925, 29.6875], [76.9875, 29.6870], [76.9880, 29.6840]]]}'::jsonb,
    'Taraori',
    'Haryana',
    '132116',
    'Clayey Loam',
    'critical'
  )
ON CONFLICT (id) DO NOTHING;
