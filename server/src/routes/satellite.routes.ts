import { Router, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { 
  analyzeSatellite, 
  inspectField, 
  inspectFieldPixels,
  classifyCropTimeSeries,
  inferLandCover,
  getSoilData,
  getLandCoverScans
} from '../controllers/satelliteController.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const satelliteRouter = Router();

// GET live ISRIC SoilGrids data (publicly accessible agronomic reference)
satelliteRouter.get('/soil-data', getSoilData);
satelliteRouter.get('/soil', getSoilData);

satelliteRouter.use(requireAuth);

// POST land-cover & crop detection ML inference
satelliteRouter.post('/land-cover-inference', inferLandCover);

// GET land cover scan history for a farm
satelliteRouter.get('/land-cover-scans/:farmId', getLandCoverScans);

// POST multi-temporal Sentinel-2 crop classification engine (60-90 days phenology trajectory)
satelliteRouter.post('/classify-crop-timeseries', classifyCropTimeSeries);

// POST pre-save satellite field inspection (vegetation index & bare soil / green canopy detection)
satelliteRouter.post('/inspect-field', inspectField);
satelliteRouter.post('/inspect-field-pixels', inspectFieldPixels);

import { radarSARService } from '../services/radarSAR.service.js';

// POST Sentinel-1 C-Band SAR dual-polarization all-weather radar analysis
satelliteRouter.post('/sar-analysis', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { polygonGeoJSON, boundary, centroid, areaAcres } = req.body;
    const geom = polygonGeoJSON || boundary;
    const lat = centroid?.[0] || 22.8935;
    const lng = centroid?.[1] || 88.2440;

    const sar = await radarSARService.analyzeSarRadar(geom, [lat, lng], Number(areaAcres) || 2.5);
    return res.json({ sar });
  } catch (err: any) {
    console.error('[SatelliteRoute SAR Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to execute Sentinel-1 SAR analysis' });
  }
});

// POST trigger satellite analysis for a farm (uses Turf.js micro-zoning controller)
satelliteRouter.post('/analyze/:farmId', analyzeSatellite);
satelliteRouter.post('/analyze', analyzeSatellite);

// GET all satellite scans for a farm
satelliteRouter.get('/scans/:farmId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const scans = await dbService.getSatelliteScans(req.params.farmId, userId);
    return res.json({ scans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch scans' });
  }
});
