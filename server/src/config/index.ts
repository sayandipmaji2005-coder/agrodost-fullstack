import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5174',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    isConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
  satellite: {
    clientId: process.env.SENTINEL_HUB_CLIENT_ID || '',
    clientSecret: process.env.SENTINEL_HUB_CLIENT_SECRET || '',
    instanceId: process.env.SENTINEL_HUB_INSTANCE_ID || '',
    isConfigured: Boolean(process.env.SENTINEL_HUB_CLIENT_ID && process.env.SENTINEL_HUB_CLIENT_SECRET),
  },
  cropDiagnostics: {
    endpoint: process.env.CROP_DIAGNOSTICS_API_ENDPOINT || '',
    apiKey: process.env.GEMINI_API_KEY || process.env.CROP_DIAGNOSTICS_API_KEY || process.env.GOOGLE_API_KEY || '',
    isConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.CROP_DIAGNOSTICS_API_KEY || process.env.GOOGLE_API_KEY),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },
  jwtSecret: process.env.JWT_SECRET || 'agricare-persistent-static-dev-secret-key-2026-secure',
};
