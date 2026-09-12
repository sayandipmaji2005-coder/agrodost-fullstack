import { Router, Response } from 'express';
import { uploadMiddleware } from '../services/storage.service.js';
import { dbService } from '../services/db.service.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const scansRouter = Router();

scansRouter.use(optionalAuth);

scansRouter.post('/upload', uploadMiddleware.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || 'farmer-session';
    const farmId = req.body.farmId || null;

    if (!req.file) {
      return res.status(400).json({ error: 'No crop image file provided' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const scanRecord = {
      id: uuidv4(),
      farmId,
      userId,
      imageUrl,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      createdAt: new Date().toISOString(),
    };

    await dbService.createCameraScan(scanRecord);

    return res.status(201).json({
      scan: scanRecord,
      message: 'Crop photo uploaded and processed successfully',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});
