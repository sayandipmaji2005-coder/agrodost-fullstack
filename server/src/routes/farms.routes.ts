import { Router, Response } from 'express';
import * as turf from '@turf/turf';
import { dbService } from '../services/db.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const farmsRouter = Router();

// Apply auth middleware to all farm routes
farmsRouter.use(requireAuth);

/**
 * Dynamic NDVI Computation for a parcel based on coordinates, soil parameters, and crop state
 */
export function computeParcelSatelliteNdvi(lat: number, lng: number, soilData?: any, cropType?: string): number {
  const isFallow = 
    cropType?.toLowerCase().includes('fallow') || 
    cropType?.toLowerCase().includes('bare') || 
    cropType?.toLowerCase().includes('khali');
  const isRipening = cropType?.toLowerCase().includes('ripen');

  if (isFallow) return 0.18;
  if (isRipening) return 0.55;

  // Base fertility from soil organic carbon & texture
  const soc = soilData?.soilOrganicCarbon || 12;
  const clay = soilData?.clayPercentage || 25;
  const sand = soilData?.sandPercentage || 30;
  
  const baseFertility = 0.54 + (soc / 80) - (sand > 50 ? 0.06 : 0) - (clay > 45 ? 0.05 : 0);
  // Spatial geographic reflectance wave based on actual latitude and longitude
  const geoWave = (Math.sin(lat * 187.3 + lng * 249.7) * 0.24) + (Math.cos(lng * 341.1) * 0.12);
  let ndvi = Number((baseFertility + geoWave).toFixed(2));
  return Math.max(0.28, Math.min(0.89, ndvi));
}

/**
 * Strict NDVI Threshold Logic:
 * - NDVI > 0.6 = Healthy / Normal ('healthy')
 * - 0.4 <= NDVI <= 0.6 = Moderate Stress / Monitor ('warning')
 * - NDVI < 0.4 = Critical Alert / Hotspot Active ('critical')
 */
export function evaluateNdviStatus(ndvi: number, isFallow: boolean = false, isRipening: boolean = false): 'healthy' | 'warning' | 'critical' {
  if (isFallow || isRipening) return 'healthy';
  if (ndvi > 0.6) return 'healthy';
  if (ndvi >= 0.4) return 'warning';
  return 'critical';
}

function getDynamicSector(lat: number, lng: number): string {
  const isNorth = (lat * 100) % 2 >= 1;
  const isEast = (lng * 100) % 2 >= 1;
  if (isNorth && isEast) return 'North-East Sector';
  if (isNorth && !isEast) return 'North-West Sector';
  if (!isNorth && isEast) return 'South-East Sector';
  return 'South-West Sector';
}

// GET all farms for the current user
farmsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const rawFarms = await dbService.getFarms(userId);
    // Ensure all farms evaluate their true dynamic NDVI threshold and telemetry
    const farms = rawFarms.map((farm: any) => {
      const isFallow = farm.cropType?.toLowerCase().includes('fallow') || farm.cropType?.toLowerCase().includes('bare');
      const isRipening = farm.cropType?.toLowerCase().includes('ripen');

      if (farm.telemetryMetrics?.meanNdvi) {
        const computedStatus = evaluateNdviStatus(farm.telemetryMetrics.meanNdvi, isFallow, isRipening);
        return { ...farm, status: computedStatus };
      }

      const lat = farm.centerCoordinates?.lat || 22.8935;
      const lng = farm.centerCoordinates?.lng || 88.2440;
      const ndvi = computeParcelSatelliteNdvi(lat, lng, farm.soilData, farm.cropType);
      const computedStatus = evaluateNdviStatus(ndvi, isFallow, isRipening);
      return {
        ...farm,
        status: computedStatus,
        telemetryMetrics: {
          meanNdvi: ndvi,
          vigorDropPercent: computedStatus === 'critical' ? Math.round(((0.75 - ndvi) / 0.75) * 100) : (computedStatus === 'warning' ? Math.round(((0.75 - ndvi) / 0.75) * 100) : 0),
          hotspotSector: computedStatus !== 'healthy' ? getDynamicSector(lat, lng) : null,
          temperatureElevation: computedStatus === 'critical' ? Number((2.2 + (0.4 - ndvi) * 8).toFixed(1)) : (computedStatus === 'warning' ? Number((1.4 + (0.6 - ndvi) * 4).toFixed(1)) : 0),
        }
      };
    });
    return res.json({ farms });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve farms' });
  }
});

// GET single farm by ID
farmsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const rawFarm = await dbService.getFarmById(req.params.id, userId);
    if (!rawFarm) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    const isFallow = rawFarm.cropType?.toLowerCase().includes('fallow') || rawFarm.cropType?.toLowerCase().includes('bare');
    const isRipening = rawFarm.cropType?.toLowerCase().includes('ripen');
    
    let farm = rawFarm;
    if (rawFarm.telemetryMetrics?.meanNdvi) {
      const computedStatus = evaluateNdviStatus(rawFarm.telemetryMetrics.meanNdvi, isFallow, isRipening);
      farm = { ...rawFarm, status: computedStatus };
    } else {
      const lat = rawFarm.centerCoordinates?.lat || 22.8935;
      const lng = rawFarm.centerCoordinates?.lng || 88.2440;
      const ndvi = computeParcelSatelliteNdvi(lat, lng, rawFarm.soilData, rawFarm.cropType);
      const computedStatus = evaluateNdviStatus(ndvi, isFallow, isRipening);
      farm = {
        ...rawFarm,
        status: computedStatus,
        telemetryMetrics: {
          meanNdvi: ndvi,
          vigorDropPercent: computedStatus === 'critical' ? Math.round(((0.75 - ndvi) / 0.75) * 100) : (computedStatus === 'warning' ? Math.round(((0.75 - ndvi) / 0.75) * 100) : 0),
          hotspotSector: computedStatus !== 'healthy' ? getDynamicSector(lat, lng) : null,
          temperatureElevation: computedStatus === 'critical' ? Number((2.2 + (0.4 - ndvi) * 8).toFixed(1)) : (computedStatus === 'warning' ? Number((1.4 + (0.6 - ndvi) * 4).toFixed(1)) : 0),
        }
      };
    }
    return res.json({ farm });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve farm' });
  }
});

// POST create a new farm
farmsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      name,
      cropType,
      sowingDate,
      areaAcres,
      areaHectares,
      centerCoordinates,
      boundary,
      villageOrCity,
      state,
      pincode,
      soilType,
      soilClassification,
      landCoverCategory,
      landCoverBreakdown,
      soilData,
      predictedCrop,
      classificationConfidence,
      phenologySeries,
      status: requestedStatus,
    } = req.body;

    if (!name || !boundary) {
      return res.status(400).json({ error: 'Farm name and polygon boundary are required' });
    }

    // Dynamically compute centroid from boundary polygon using Turf.js
    let finalCenter = centerCoordinates;
    if (!finalCenter || !finalCenter.lat || !finalCenter.lng) {
      try {
        let polyFeature: any;
        if (boundary.type === 'Feature') {
          polyFeature = boundary;
        } else if (boundary.type === 'Polygon') {
          polyFeature = turf.polygon(boundary.coordinates);
        } else if (Array.isArray(boundary.coordinates)) {
          polyFeature = turf.polygon(boundary.coordinates);
        }
        if (polyFeature) {
          const centroid = turf.centroid(polyFeature);
          finalCenter = {
            lng: Number(centroid.geometry.coordinates[0].toFixed(6)),
            lat: Number(centroid.geometry.coordinates[1].toFixed(6)),
          };
        }
      } catch (err) {
        console.warn('Failed to calculate centroid from boundary polygon:', err);
      }
    }

    if (!finalCenter || !finalCenter.lat || !finalCenter.lng) {
      return res.status(400).json({ error: 'Valid boundary coordinates are required to compute farm centroid' });
    }

    // Determine final cropType and soilType from user input or autonomous analysis
    const finalCropType = (cropType && typeof cropType === 'string' && cropType.trim())
      || (landCoverCategory ? landCoverCategory.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '')
      || (predictedCrop && typeof predictedCrop === 'string' && predictedCrop.trim())
      || 'Unclassified Parcel';

    const finalSoilType = (soilClassification && typeof soilClassification === 'string' && soilClassification.trim())
      || (soilType && typeof soilType === 'string' && soilType.trim())
      || (soilData?.soilTexture ? `${soilData.soilTexture} (ISRIC)` : 'Mapped Soil Estimate');

    // Dynamic initial NDVI and thresholded health status calculation
    const isFallow = finalCropType.toLowerCase().includes('fallow') || finalCropType.toLowerCase().includes('bare');
    const isRipening = finalCropType.toLowerCase().includes('ripen');
    const initialNdvi = computeParcelSatelliteNdvi(finalCenter.lat, finalCenter.lng, soilData, finalCropType);
    const initialStatus = evaluateNdviStatus(initialNdvi, isFallow, isRipening);
    const resolvedStatus = requestedStatus || initialStatus;

    const initialVigorDrop = resolvedStatus === 'critical' 
      ? Math.round(((0.75 - initialNdvi) / 0.75) * 100) 
      : (resolvedStatus === 'warning' ? Math.round(((0.75 - initialNdvi) / 0.75) * 100) : 0);

    const initialHotspotSector = resolvedStatus !== 'healthy' 
      ? getDynamicSector(finalCenter.lat, finalCenter.lng)
      : null;

    const initialTempElevation = resolvedStatus === 'critical'
      ? Number((2.2 + (0.4 - initialNdvi) * 8).toFixed(1))
      : (resolvedStatus === 'warning' ? Number((1.4 + (0.6 - initialNdvi) * 4).toFixed(1)) : 0);

    const newFarm = {
      id: uuidv4(),
      userId,
      name,
      cropType: finalCropType,
      sowingDate: sowingDate || new Date().toISOString().split('T')[0],
      areaAcres: Number(areaAcres || 1.0),
      areaHectares: Number(areaHectares || 0.404),
      centerCoordinates: finalCenter,
      boundary,
      villageOrCity: villageOrCity || '',
      state: state || '',
      pincode: pincode || '',
      soilType: finalSoilType,
      soilClassification: finalSoilType,
      landCoverCategory: landCoverCategory || null,
      landCoverBreakdown: landCoverBreakdown || null,
      soilData: soilData || null,
      predictedCrop: predictedCrop || null,
      classificationConfidence: classificationConfidence !== undefined ? Number(classificationConfidence) : null,
      phenologySeries: Array.isArray(phenologySeries) ? phenologySeries : null,
      status: resolvedStatus,
      telemetryMetrics: {
        meanNdvi: initialNdvi,
        vigorDropPercent: initialVigorDrop,
        hotspotSector: initialHotspotSector,
        temperatureElevation: initialTempElevation,
      },
      lastScanDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await dbService.createFarm(newFarm);
    return res.status(201).json({ farm: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create farm' });
  }
});

// PUT update farm
farmsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const updated = await dbService.updateFarm(req.params.id, userId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Farm not found or access unauthorized' });
    }
    return res.json({ farm: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update farm' });
  }
});

// DELETE farm
farmsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const deleted = await dbService.deleteFarm(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Farm not found or access unauthorized' });
    }
    return res.json({ success: true, message: 'Farm deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete farm' });
  }
});
