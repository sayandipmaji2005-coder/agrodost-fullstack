import { Router, Response } from 'express';
import { dbService } from '../services/db.service.js';
import { analyzeCrop } from '../controllers/analysisController.js';
import { weatherService } from '../services/weather.service.js';
import { KisanParchiData } from '../shared/index.js';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const diagnosisRouter = Router();

export { analyzeCrop as handleAnalyzeCrop };

// POST /api/diagnosis/analyze
diagnosisRouter.post('/analyze', analyzeCrop);

// GET single diagnosis result (supports guest and authenticated users)
diagnosisRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || 'farmer-session';
    const diagnosis = await dbService.getDiseaseResultById(req.params.id, userId);
    if (!diagnosis) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }
    return res.json({ diagnosis });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve diagnosis' });
  }
});

// GET all user diagnoses
diagnosisRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const farmId = req.query.farmId as string | undefined;
    const results = await dbService.getDiseaseResults(userId, farmId);
    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve diagnoses' });
  }
});

// GET generate Kisan Parchi prescription card (supports guest and authenticated users)
diagnosisRouter.get('/parchi/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || 'farmer-session';
    const diagnosis = await dbService.getDiseaseResultById(req.params.id, userId);
    if (!diagnosis) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }

    const user = (await dbService.getUserById(userId)) || { fullName: 'Registered Farmer' };
    let farmName = 'General Plot';
    let lat: number | null = null;
    let lng: number | null = null;

    if (diagnosis.farmId) {
      const farm = await dbService.getFarmById(diagnosis.farmId, userId);
      if (farm) {
        farmName = farm.name;
        if (farm.centerCoordinates?.lat && farm.centerCoordinates?.lng) {
          lat = farm.centerCoordinates.lat;
          lng = farm.centerCoordinates.lng;
        }
      }
    }

    let weatherSprayStatus = 'LOCATION PENDING (Coordinates Unavailable)';
    let sprayWindowRecommendation = 'GPS coordinates unavailable for this plot. Verify local weather forecast before applying chemical spray.';

    if (lat !== null && lng !== null) {
      try {
        const weather = await weatherService.getSprayWindowAdvice(lat, lng);
        weatherSprayStatus = weather.status === 'unsafe' ? 'SPRAY UNSAFE (Rain Risk)' : 'SPRAY SAFE';
        sprayWindowRecommendation = weather.bestNextSprayWindow;
      } catch {
        weatherSprayStatus = 'WEATHER ADVISORY UNAVAILABLE';
        sprayWindowRecommendation = 'Hyperlocal meteorological service temporarily unavailable. Confirm rain forecast locally.';
      }
    }

    const parchi: KisanParchiData = {
      parchiId: `PARCHI-${diagnosis.id.slice(0, 8).toUpperCase()}`,
      farmName,
      farmerName: user.fullName || 'Registered Farmer',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      cropName: diagnosis.cropName,
      cropFamily: diagnosis.cropFamily,
      growthStage: diagnosis.growthStage,
      diagnosis: diagnosis.probableDisease,
      severity: diagnosis.severityLevel,
      confidence: diagnosis.confidenceScore,
      prescribedActiveChemicals: diagnosis.activeChemicals,
      culturalSteps: diagnosis.culturalTreatments,
      weatherSprayStatus,
      sprayWindowRecommendation,
      safetyPrecautions: [
        'Always wear gloves, face mask, and eye protection while preparing and spraying chemical mixtures.',
        'Never spray directly facing strong wind directions.',
        'Maintain a minimum 7-14 day pre-harvest interval (PHI) as specified on active ingredient container.'
      ],
      kisanHelpline: '1800-180-1551 (Toll Free Kisan Call Centre)',
      qrVerificationCode: `AGRI-PARCHI-${diagnosis.id}`
    };

    return res.json({ parchi });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate Kisan Parchi' });
  }
});
