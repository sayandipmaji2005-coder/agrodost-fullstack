import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';

import { authRouter } from './routes/auth.routes.js';
import { farmsRouter } from './routes/farms.routes.js';
import { satelliteRouter } from './routes/satellite.routes.js';
import { scansRouter } from './routes/scans.routes.js';
import { diagnosisRouter, handleAnalyzeCrop } from './routes/diagnosis.routes.js';
import { weatherRouter } from './routes/weather.routes.js';
import { recoveryRouter } from './routes/recovery.routes.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Rate limiter for diagnostic and satellite endpoints (bypassed in dev, high threshold in prod)
const isDev = process.env.NODE_ENV !== 'production' || (config as any).server?.nodeEnv !== 'production';

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1-minute window
  max: isDev ? 100000 : 1000, // 1000 requests per minute in prod, effectively unlimited in dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Completely disable rate limiter during development
  message: { error: 'Analysis rate limit reached. Please wait a few moments before scanning again.' },
});

// Static assets for uploads and sample scan images
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}
app.use('/uploads', express.static(config.storage.uploadDir));

// Also serve leaf scan images and public images from client public directory if available
const sampleDir = path.resolve(process.cwd(), '../client/public/sample-scans');
if (fs.existsSync(sampleDir)) {
  app.use('/sample-scans', express.static(sampleDir));
}
const imagesDir = path.resolve(process.cwd(), '../client/public/images');
if (fs.existsSync(imagesDir)) {
  app.use('/images', express.static(imagesDir));
}

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'AgriCare API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: config.supabase.isConfigured ? 'Supabase PostgreSQL' : 'Local Storage Engine',
    satelliteProvider: config.satellite.isConfigured ? 'Copernicus Sentinel Hub' : 'Built-in High Precision Engine',
  });
});

// Register API routes
app.use('/api/auth', authRouter);
app.use('/api/farms', farmsRouter);
app.use('/api/satellite', analysisLimiter, satelliteRouter);
app.use('/api/scans', scansRouter);
app.use('/api/diagnosis', analysisLimiter, diagnosisRouter);
app.post('/api/analyze-crop', analysisLimiter, handleAnalyzeCrop);
app.use('/api/weather', weatherRouter);
app.use('/api/recovery', recoveryRouter);

// Global 404 handler for API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[AgriCare Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
  });
});

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`  AgriCare Production Backend running on port ${config.port}`);
  console.log(`  Health check: http://localhost:${config.port}/api/health`);
  console.log(`  Mode: ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});
