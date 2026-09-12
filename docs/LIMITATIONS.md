# Scientific Limitations & Guardrails

AgriCare is designed to assist farmers and agronomists with data-backed decision support. To maintain scientific integrity and prevent crop mismanagement, the platform enforces strict operational boundaries.

---

## 1. Satellite Remote Sensing (Optical & SAR Radar)

### What Satellite Data Can Detect:
1. **Canopy Vigor & Chlorophyll Absorption (Optical NDVI)**:
   - Identifies macro-scale vegetative vigor, patches of stunted growth, and moisture stress across land parcels.
2. **Moisture Anomalies & Soil Saturation (SAR C-Band Radar)**:
   - Uses Sentinel-1 microwave radar (VV/VH polarization backscatter) to penetrate cloud cover during the monsoon season.
   - Accurately maps surface waterlogging, poor drainage basins, and dramatic structural canopy lodging (e.g., after cyclonic winds or heavy rain).

### What Satellite Data Cannot Detect:
1. **Microscopic Leaf Pathogens**:
   - Satellite pixels (10m x 10m in Sentinel-2) aggregate hundreds of plant leaves per pixel.
   - Satellites **cannot identify specific fungal spores, viral mosaics, bacterial blights, or insect egg clusters**.
2. **Definitive Cause of Stress**:
   - An NDVI drop indicates canopy distress; it does not differentiate between nitrogen deficiency, fungal blight, or localized root nematodes.

### Operational Guardrail:
- Whenever satellite analysis marks a farm sector as "Moderate Stress" or "Severe Stress", the platform displays a mandatory scientific notification:
  > *"Satellite data detects macro-scale canopy stress and drainage anomalies. It cannot identify microscopic leaf pathogens. Please conduct a close-up Camera Scan on the flagged sector for disease confirmation."*

---

## 2. Close-up Camera Diagnostics

### Operational Scope:
- Analyzes high-resolution photos of affected plant leaves, stems, or fruits.
- Identifies visual symptoms (e.g., concentric rings of early blight, necrotic leaf spots, powdery mildew, blast lesions).

### Quality Thresholds & Out-of-Domain Handling:
1. **Confidence Threshold**:
   - Any diagnosis with a confidence score below **60%** is marked as *"Unable to confirm diagnosis"*.
   - The platform never presents guesses as conclusive scientific facts.
2. **Kisan Safety Net**:
   - For all low-confidence results or severe crop blights, AgriCare directly connects the farmer to:
     * **Kisan Call Centre**: Toll-Free `1800-180-1551`
     * **Krishi Vigyan Kendra (KVK)**: Direct guidance to consult certified local district agronomists.

---

## 3. Chemical Treatment & Weather Spray Window

### Responsible Agro-Chemical Guidance:
- AgriCare only suggests **generic active ingredient categories** (e.g., *Mancozeb 75% WP*, *Copper Oxychloride 50% WP*, *Azoxystrobin*).
- We do not make unverified proprietary brand claims.
- Farmers are reminded that application rates, water volumes, and safety withholding periods must strictly conform to the manufacturer's label and local state agricultural university advisories.

### Smart Spray Window:
- Pesticides and fungicides applied immediately before rain wash off into water bodies, causing chemical runoff and wasting financial resources.
- Open-Meteo forecasts are evaluated in real time: spraying is strongly discouraged if rain (>0.5 mm) is predicted within 6–12 hours or if wind speeds exceed 20 km/h (risk of chemical drift).
