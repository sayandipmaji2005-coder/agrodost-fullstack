import { Router, Response } from 'express';
import * as turf from '@turf/turf';
import { dbService } from '../services/db.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const farmsRouter = Router();

// Apply auth middleware to all farm routes
farmsRouter.use(requireAuth);

// GET all farms for the current user
farmsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const farms = await dbService.getFarms(userId);
    return res.json({ farms });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve farms' });
  }
});

// GET single farm by ID
farmsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const farm = await dbService.getFarmById(req.params.id, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
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
      status: 'healthy',
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
