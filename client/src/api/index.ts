import axios from 'axios';
import { 
  Farm, 
  SatelliteScan, 
  DiseaseResult, 
  AnalyzeCropResponse, 
  KisanParchiData, 
  SprayWindowAdvice, 
  RecoveryCheck, 
  UserProfile, 
  UserNotification,
  CropClassificationResult,
  PhenologyDataPoint,
  LandCoverInferenceResult,
  SoilInformation
} from '@shared/index';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authorization token if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agricare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  async signup(data: any): Promise<{ user: UserProfile; token: string }> {
    const res = await apiClient.post('/auth/signup', data);
    return res.data;
  },
  async login(data: any): Promise<{ user: UserProfile; token: string }> {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },
  async getMe(): Promise<{ user: UserProfile }> {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Farms
  async getFarms(): Promise<{ farms: Farm[] }> {
    const res = await apiClient.get('/farms');
    return res.data;
  },
  async getFarm(id: string): Promise<{ farm: Farm }> {
    const res = await apiClient.get(`/farms/${id}`);
    return res.data;
  },
  async createFarm(data: any): Promise<{ farm: Farm }> {
    const res = await apiClient.post('/farms', data);
    return res.data;
  },
  async updateFarm(id: string, updates: any): Promise<{ farm: Farm }> {
    const res = await apiClient.put(`/farms/${id}`, updates);
    return res.data;
  },
  async deleteFarm(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/farms/${id}`);
    return res.data;
  },

  // Satellite Scans
  async analyzeSatellite(farmId: string, mode: 'optical' | 'sar_radar' = 'optical', scenario?: string): Promise<{ scan: SatelliteScan }> {
    const res = await apiClient.post(`/satellite/analyze/${farmId}`, { mode, scenario });
    return res.data;
  },
  async getSatelliteScans(farmId: string): Promise<{ scans: SatelliteScan[] }> {
    const res = await apiClient.get(`/satellite/scans/${farmId}`);
    return res.data;
  },
  async inspectField(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    centerCoordinates?: { lat: number; lng: number };
    areaAcres?: number;
    zoom?: number;
    scenario?: 'bare_soil' | 'green_canopy';
  }): Promise<{
    gli?: number;
    vvi?: number;
    sbi?: number;
    ndvi: number;
    soilReflectance: number;
    vegetationCategory: 'bare_soil' | 'green_canopy' | 'waterbody';
    status?: string;
    dominantCropPrediction?: string;
    cropType?: string;
    suggestedCropType: string;
    suggestedHealthStatus: string;
    suggestedSoilType?: string;
    candidateCrops?: string[];
    confidence: number;
    activeGreenFoliagePercentage?: number;
    summary: string;
  }> {
    const res = await apiClient.post('/satellite/inspect-field-pixels', data);
    return res.data;
  },
  async inspectFieldPixels(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    centerCoordinates?: { lat: number; lng: number };
    areaAcres?: number;
    zoom?: number;
    scenario?: 'bare_soil' | 'green_canopy';
  }): Promise<{
    gli?: number;
    vvi?: number;
    sbi?: number;
    ndvi: number;
    soilReflectance: number;
    canopyState?: 'active_vegetation' | 'bare_soil';
    badge?: string;
    vegetationCategory: 'bare_soil' | 'green_canopy' | 'waterbody';
    status?: string;
    dominantCropPrediction?: string;
    cropType?: string;
    suggestedCropType: string;
    suggestedHealthStatus: string;
    suggestedSoilType?: string;
    candidateCrops?: string[];
    confidence: number;
    activeGreenFoliagePercentage?: number;
    summary: string;
  }> {
    const res = await apiClient.post('/satellite/inspect-field-pixels', data);
    return res.data;
  },

  // Sentinel-2 Multi-Temporal Crop Classification Engine (60-90 Days Phenology Curve)
  async classifyCropTimeSeries(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    centerCoordinates?: { lat: number; lng: number };
    areaAcres?: number;
    scenario?: string;
  }): Promise<CropClassificationResult> {
    const res = await apiClient.post('/satellite/classify-crop-timeseries', data);
    return res.data;
  },

  async classifyCropTimeseries(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    centerCoordinates?: { lat: number; lng: number };
    areaAcres?: number;
    scenario?: string;
  }): Promise<CropClassificationResult> {
    return this.classifyCropTimeSeries(data);
  },

  // Real Land Cover & Crop Detection ML Inference
  async inferLandCover(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    centerCoordinates?: { lat: number; lng: number };
    farmId?: string;
    areaAcres?: number;
    simulatedFeatures?: any;
  }): Promise<LandCoverInferenceResult> {
    const res = await apiClient.post('/satellite/land-cover-inference', data);
    return res.data;
  },

  // Live ISRIC SoilGrids REST Query
  async getSoilData(lat: number, lng: number): Promise<SoilInformation> {
    const res = await apiClient.get('/satellite/soil-data', { params: { lat, lng } });
    return res.data;
  },

  // Land Cover Scan History
  async getLandCoverScans(farmId: string): Promise<{ scans: LandCoverInferenceResult[] }> {
    const res = await apiClient.get(`/satellite/land-cover-scans/${farmId}`);
    return res.data;
  },

  // Sentinel-1 SAR Dual-Polarization All-Weather Radar Analysis
  async getSarRadarAnalysis(data: {
    polygonGeoJSON?: any;
    boundary?: any;
    centroid?: [number, number];
    areaAcres?: number;
  }): Promise<{ sar: any }> {
    const res = await apiClient.post('/satellite/sar-analysis', data);
    return res.data;
  },

  // Camera Upload
  async uploadCropPhoto(formData: FormData): Promise<{ scan: any }> {
    const res = await apiClient.post('/scans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Disease Diagnosis & Treatment
  async analyzeCropImage(imageUrl: string, farmId?: string, hintCrop?: string): Promise<AnalyzeCropResponse> {
    const res = await apiClient.post('/analyze-crop', { imageUrl, farmId, hintCrop });
    return res.data;
  },
  async getDiagnosis(id: string): Promise<{ diagnosis: DiseaseResult }> {
    const res = await apiClient.get(`/diagnosis/${id}`);
    return res.data;
  },
  async getAllDiagnoses(farmId?: string): Promise<{ results: DiseaseResult[] }> {
    const res = await apiClient.get('/diagnosis', { params: { farmId } });
    return res.data;
  },
  async getKisanParchi(diagnosisId: string): Promise<{ parchi: KisanParchiData }> {
    const res = await apiClient.get(`/diagnosis/parchi/${diagnosisId}`);
    return res.data;
  },

  // Weather Spray Window
  async getSprayWindow(lat: number, lng: number): Promise<{ advice: SprayWindowAdvice }> {
    const res = await apiClient.get('/weather/spray-window', { params: { lat, lng } });
    return res.data;
  },

  // Recovery
  async getRecoveryChecks(farmId?: string): Promise<{ checks: RecoveryCheck[] }> {
    const res = await apiClient.get('/recovery', { params: { farmId } });
    return res.data;
  },
  async createRecoveryCheck(data: any): Promise<{ recoveryCheck: RecoveryCheck }> {
    const res = await apiClient.post('/recovery', data);
    return res.data;
  },
  async getNotifications(): Promise<{ notifications: UserNotification[] }> {
    const res = await apiClient.get('/recovery/notifications');
    return res.data;
  },
  async markNotificationRead(id: string): Promise<{ notification: UserNotification }> {
    const res = await apiClient.post(`/recovery/notifications/${id}/read`);
    return res.data;
  },
};
