import { Router, Request, Response } from 'express';
import { weatherService } from '../services/weather.service.js';

export const weatherRouter = Router();

weatherRouter.get('/spray-window', async (req: Request, res: Response) => {
  try {
    const latStr = req.query.lat as string;
    const lngStr = req.query.lng as string;

    if (!latStr || !lngStr) {
      return res.status(400).json({ error: 'Latitude (lat) and Longitude (lng) query parameters are required' });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Latitude and Longitude must be valid decimal numbers' });
    }

    const advice = await weatherService.getSprayWindowAdvice(lat, lng);
    return res.json({ advice });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch weather spray window' });
  }
});
