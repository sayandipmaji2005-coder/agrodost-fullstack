# Satellite Provider Integration Guide

AgriCare is architected around a dual-mode satellite pipeline:
1. **Optical Mode**: Sentinel-2 (Bands 4 and 8) for NDVI, canopy coverage, and cloud detection.
2. **All-Weather Radar Mode (SAR)**: Sentinel-1 C-band Synthetic Aperture Radar (VV and VH backscatter) for penetrating heavy monsoon clouds, assessing soil moisture, and identifying waterlogging.

---

## Provider Abstraction: `SatelliteProvider`

The backend interface `ISatelliteProvider` is implemented in `server/src/services/satellite.service.ts`.

### Default Engine
When no external credentials are provided, AgriCare's high-precision agronomic engine computes realistic radiometric indices, simulated backscatter, and spatial stress polygons based on geographic coordinates, seasonality, and soil profile.

### Connecting Copernicus Data Space / Sentinel Hub
To hook into live Sentinel Hub APIs:
1. Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu/) or [sentinel-hub.com](https://www.sentinel-hub.com/).
2. Create an OAuth client and copy your credentials to `.env`:
   ```env
   SENTINEL_HUB_CLIENT_ID=your-client-id
   SENTINEL_HUB_CLIENT_SECRET=your-client-secret
   SENTINEL_HUB_INSTANCE_ID=your-instance-id
   ```
3. The server's `SentinelHubProvider` class automatically activates when these keys are present.
