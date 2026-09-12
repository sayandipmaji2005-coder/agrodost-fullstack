# AgriCare | Production-Grade AI Crop Health Monitoring & Advisory Platform

AgriCare is a full-stack agronomic platform designed to safeguard agricultural productivity. It integrates all-weather satellite remote sensing (optical Sentinel-2 NDVI + cloud-penetrating Sentinel-1 SAR microwave radar for monsoons) with ground-level camera diagnosis, weather-aware spray guidance, a 1-click printable/WhatsApp "Kisan Parchi" (prescription card), regional voice readouts in Hindi and English, and long-term crop recovery tracking.

---

## 🌟 Key Features

1. **Interactive Satellite Land Map (Leaflet & Esri World Imagery)**:
   - Default high-resolution satellite imagery with mobile responsiveness.
   - Device GPS geolocation and geocoding search for villages, cities, and PIN codes (via Nominatim).
   - Draw, edit, clear, and redraw multi-point farm boundary polygons.
   - Real-time land area calculation in acres and hectares using Turf.js with centroid coordinate readouts.

2. **Dual-Mode Satellite Crop Monitoring (Optical NDVI + SAR Radar)**:
   - **Optical Mode (Sentinel-2)**: Mean NDVI calculation, canopy vigor categorization, and cloud-cover assessment.
   - **All-Weather Monsoon Radar Mode (Sentinel-1 SAR)**: Automatically activates when cloud cover exceeds 35% or during monsoon periods. Utilizes microwave backscatter (VV/VH polarizations) to penetrate thick clouds, measuring soil moisture index, waterlogging risk, and structural canopy loss.
   - **Scientific Guardrails**: Clearly alerts farmers that satellite remote sensing detects macro-level stress zones and drainage stagnation, prompting close-up camera inspection rather than claiming to detect microscopic leaf spores.

3. **Close-up Foliar Camera Scanner**:
   - Native camera stream (`getUserMedia`) with front/rear camera switching and framing guidelines.
   - Gallery file upload with client-side validation (JPEG, PNG, WebP up to 10MB).
   - Secure storage linking scans to user, farm ID, and timestamp.

4. **Scientific Disease Diagnosis**:
   - Covers primary staple crops (Potato Late Blight, Rice Blast, Tomato Early Blight, Wheat Yellow Rust, Maize, Cotton).
   - Metrics: Identified Pathogen, Confidence Score, Severity Level, Symptoms, Causes, and IPM treatments.
   - **Low-Confidence (<60%) Safety Net**: Flags unconfirmed diagnoses and directly connects farmers to the **Kisan Call Centre (1800-180-1551)** and Krishi Vigyan Kendra (KVK) advisory.
   - Strictly zero third-party AI provider branding.

5. **Weather-Aware "Smart Spray Window" (Open-Meteo)**:
   - Real-time 12-hour precipitation and wind speed analysis for farm coordinates.
   - Proactively warns farmers if rain is forecast within 6–12 hours to prevent chemical runoff and wasted inputs.
   - Suggests optimal calm, dry spray windows.
   - External search links for active chemical ingredients opening in a new tab.

6. **1-Click "Kisan Parchi" (Prescription Slip)**:
   - Printable 1-page summary card and WhatsApp share link containing diagnosis, prescribed active chemical ingredients, cultural precautions, and weather advisory.

7. **Kisan Voice Readout**:
   - Integrated Web Speech Synthesis API reading aloud diagnosis and spray guidelines in Hindi or English.

8. **Crop Recovery Tracking Loop**:
   - Logs treatment execution date, sets 7–14 day follow-up re-scan, and displays side-by-side before/after photo comparisons with healing index progression.

9. **Stage Pitch Demo Mode**:
   - 1-click toggle loading pre-configured field cases (Potato Late Blight with rain alert, Rice Blast in SAR Monsoon Radar mode) for zero-latency stage evaluations.

---

## 🏗️ Monorepo Structure

```
agricare_iem/
├── client/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/                # Typed Axios API client
│   │   ├── components/         # Map, Kisan Parchi, Spray Alert, Voice Readout
│   │   ├── context/            # Auth and session context
│   │   └── pages/              # Landing, Dashboard, Map, Scanner, Diagnosis, Recovery
│   └── public/sample-scans/    # Pre-packaged test images for demo mode
├── server/                     # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/             # Environment loader and service flags
│   │   ├── db/                 # Thread-safe JSON local store with demo seed data
│   │   ├── routes/             # Auth, Farms, Satellite, Scans, Diagnosis, Weather, Recovery, Demo
│   │   └── services/           # DB abstraction, Satellite engine, Diagnosis catalog, Open-Meteo
│   └── uploads/                # Local storage for captured foliar photos
├── shared/                     # Shared TypeScript interfaces & types across client & server
├── database/                   # Supabase PostgreSQL schema migrations and seeds
│   ├── migrations/             # 001 to 006 (Profiles, Farms, Scans, Treatments, Recovery, RLS)
│   └── seeds/                  # 001_demo_data.sql
├── docs/                       # Architectural documentation
│   ├── SETUP.md
│   ├── DATABASE_SETUP.md
│   ├── SATELLITE_SETUP.md
│   ├── MODEL_SETUP.md
│   └── LIMITATIONS.md
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Getting Started (Windows PowerShell)

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x+

### 1. Install Dependencies
```powershell
# From root directory:
npm run install:all
```

### 2. Environment Setup (Optional)
AgriCare includes built-in agronomic models and local persistence out of the box. No external API keys are required for local testing or stage demonstrations.
```powershell
Copy-Item .env.example .env
```

### 3. Launch the Platform
```powershell
npm run dev
```

- **Client Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing & Verification

```powershell
# Build both server and client for production verification
npm run build
```

---

## 🛡️ Responsible Agriculture & Scientific Limits
Satellite remote sensing measures macro-scale vegetative indices (NDVI) and microwave dielectric moisture (SAR). It cannot identify microscopic leaf pathogens. AgriCare enforces mandatory close-up foliar camera scans whenever a stress sector is identified before chemical treatments are prescribed.
