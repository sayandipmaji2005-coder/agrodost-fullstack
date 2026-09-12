import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { SoilInformation } from '../shared/types/satellite';

// Disk-backed cache to respect ISRIC SoilGrids REST limits and guarantee reliability
const soilCache = new Map<string, { data: SoilInformation; timestamp: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_FILE = path.resolve(process.cwd(), 'data/soil_cache.json');

// Initialize cache from disk on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      soilCache.set(k, v as any);
    }
  }
} catch (e) {
  // Ignore
}

function persistCacheToDisk() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, any> = {};
    for (const [k, v] of soilCache.entries()) {
      if (v.data?.isAvailable) {
        obj[k] = v;
      }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Ignore
  }
}

/**
 * Standard USDA Soil Texture Classification based on clay, silt, and sand percentages.
 * Normalizes inputs to 100% before classification.
 */
export function calculateUsdaSoilTexture(clayPct: number, sandPct: number, siltPct: number): string {
  const sum = clayPct + sandPct + siltPct;
  if (sum <= 0) return 'Undetermined';

  // Normalize to 100%
  const clay = (clayPct / sum) * 100;
  const sand = (sandPct / sum) * 100;
  const silt = (siltPct / sum) * 100;

  if (silt + 1.5 * clay < 15) {
    return 'Sand';
  } else if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) {
    return 'Loamy Sand';
  } else if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) {
    return 'Sandy Loam';
  } else if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) {
    return 'Loam';
  } else if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) {
    return 'Silt Loam';
  } else if (silt >= 80 && clay < 12) {
    return 'Silt';
  } else if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) {
    return 'Sandy Clay Loam';
  } else if (clay >= 27 && clay < 40 && sand <= 20) {
    return 'Silty Clay Loam';
  } else if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) {
    return 'Clay Loam';
  } else if (clay >= 35 && sand >= 45) {
    return 'Sandy Clay';
  } else if (clay >= 40 && silt >= 40) {
    return 'Silty Clay';
  } else if (clay >= 40 && sand <= 45 && silt < 40) {
    return 'Clay';
  }

  // Fallback broad classification
  if (clay > 35) return 'Clayey Soil';
  if (sand > 60) return 'Sandy Soil';
  if (silt > 60) return 'Silty Soil';
  return 'Loamy Soil';
}

/**
 * Fetch real soil properties from ISRIC SoilGrids v2.0 REST API
 * Querying depth 0-5cm (topsoil layer)
 * 
 * Strict Requirement: Never claim live soil sensors or exact NPK/pH from satellite.
 * Must include mandatory disclaimer: "Map-based estimate — field soil test required for exact values."
 */
export async function getSoilGridsData(lat: number, lng: number): Promise<SoilInformation> {
  const DISCLAIMER = 'Map-based estimate — field soil test required for exact values.';
  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

  // 1. Check exact cache key
  const cached = soilCache.get(cacheKey);
  if (cached && cached.data?.isAvailable && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Query live ISRIC SoilGrids v2.0 REST API
  try {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=phh2o&property=soc&property=nitrogen&property=clay&property=sand&property=silt&depth=0-5cm&value=mean`;
    const response = await axios.get(url, {
      timeout: 7000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgriCare-Precision-Ag/1.0'
      }
    });

    const layers = response.data?.properties?.layers;
    if (!layers || !Array.isArray(layers)) {
      throw new Error('Invalid SoilGrids response structure');
    }

    const layerMap: Record<string, number> = {};
    for (const layer of layers) {
      const propName = layer.name;
      const depthObj = layer.depths?.find((d: any) => d.label === '0-5cm') || layer.depths?.[0];
      const meanVal = depthObj?.values?.mean;
      if (typeof meanVal === 'number') {
        layerMap[propName] = meanVal;
      }
    }

    // Conversions:
    // Clay, Sand, Silt are in g/kg (factor 10 -> 100 g/kg = 10%)
    const clayPct = layerMap['clay'] !== undefined ? Math.round((layerMap['clay'] / 10) * 10) / 10 : undefined;
    const sandPct = layerMap['sand'] !== undefined ? Math.round((layerMap['sand'] / 10) * 10) / 10 : undefined;
    const siltPct = layerMap['silt'] !== undefined ? Math.round((layerMap['silt'] / 10) * 10) / 10 : undefined;

    let soilTexture: string | undefined = undefined;
    if (clayPct !== undefined && sandPct !== undefined && siltPct !== undefined) {
      soilTexture = calculateUsdaSoilTexture(clayPct, sandPct, siltPct);
    }

    // pH in H2O is multiplied by 10 (e.g. 68 -> 6.8)
    const phH2o = layerMap['phh2o'] !== undefined ? Math.round((layerMap['phh2o'] / 10) * 10) / 10 : undefined;

    // SOC is in dg/kg (factor 10 -> 100 dg/kg = 10 g/kg = 1%)
    const socGPerKg = layerMap['soc'] !== undefined ? Math.round((layerMap['soc'] / 10) * 10) / 10 : undefined;
    const socPct = socGPerKg !== undefined ? Math.round((socGPerKg / 10) * 100) / 100 : undefined;

    // Nitrogen is in cg/kg (factor 100 -> 100 cg/kg = 1 g/kg)
    const nitrogenGPerKg = layerMap['nitrogen'] !== undefined ? Math.round((layerMap['nitrogen'] / 100) * 100) / 100 : undefined;

    const result: SoilInformation = {
      source: 'ISRIC SoilGrids v2.0',
      coordinates: [lat, lng],
      clayPercentage: clayPct,
      sandPercentage: sandPct,
      siltPercentage: siltPct,
      soilTexture,
      organicCarbonGPerKg: socGPerKg,
      organicCarbonPercentage: socPct,
      phH2o,
      nitrogenGPerKg,
      disclaimer: DISCLAIMER,
      isAvailable: true,
      resolution: '250m grid resolution',
      depth: '0–5 cm (topsoil)',
      isEstimate: true,
      rawLayerDepths: layerMap
    };

    soilCache.set(cacheKey, { data: result, timestamp: Date.now() });
    persistCacheToDisk();
    return result;
  } catch (err: any) {
    console.warn(`[SoilGrids] Failed to retrieve data for [${lat}, ${lng}]:`, err?.message || err);

    // 3. Fallback: Check for regional cache match within 0.05 degrees (~5 km)
    for (const [k, cachedEntry] of soilCache.entries()) {
      if (cachedEntry.data?.isAvailable) {
        const [cLatStr, cLngStr] = k.split('_');
        const cLat = parseFloat(cLatStr);
        const cLng = parseFloat(cLngStr);
        if (Math.abs(cLat - lat) <= 0.05 && Math.abs(cLng - lng) <= 0.05) {
          const regionalMatch: SoilInformation = {
            ...cachedEntry.data,
            coordinates: [lat, lng],
            resolution: '250m grid resolution',
            depth: '0–5 cm (topsoil)',
            isEstimate: true
          };
          return regionalMatch;
        }
      }
    }
    
    // Return unavailable with disclaimer intact — strictly no fabricated defaults
    const fallback: SoilInformation = {
      source: 'ISRIC SoilGrids v2.0',
      coordinates: [lat, lng],
      disclaimer: DISCLAIMER,
      resolution: '250m grid resolution',
      depth: '0–5 cm (topsoil)',
      isEstimate: true,
      isAvailable: false
    };
    return fallback;
  }
}
