export type SatelliteMode = 'optical' | 'sar_radar';

export interface StressZone {
  id: string;
  severity: 'low' | 'moderate' | 'severe';
  areaAcres: number;
  coordinates: [number, number]; // [lat, lng]
  description: string;
  recommendedAction: string;
}

export interface ZonalGridCell {
  id: string;
  sector: string; // e.g. "North-East Sector"
  subQuadrant: string; // e.g. "NE-Parcel-3"
  coordinates: number[][][]; // GeoJSON polygon ring coordinates: [[[lng, lat], ...]]
  center: [number, number]; // [lat, lng]
  ndvi: number; // 0.20 - 0.85
  sarBackscatterDb: number;
  vhVvRatio: number;
  soilMoisturePercentage: number;
  status: 'healthy' | 'moderate_stress' | 'critical_hotspot' | 'unassessed';
  color: string; // '#22c55e' | '#f59e0b' | '#ef4444' | '#94a3b8'
  recommendedSprayCoords: { lat: number; lng: number };
  recommendedAction: string;
}

export interface AnomalyHotspot {
  id: string;
  cellId: string;
  sector: string; // e.g. "North-East Sector"
  title: string; // e.g. "North-East Sector: 18% moisture deficit detected by SAR Radar"
  severity: 'critical' | 'moderate';
  ndvi: number;
  radarAnomaly: string;
  temperatureElevation?: number;
  chlorophyllDeficitPercent?: number;
  scientificNote?: string;
  coordinates: [number, number]; // [lat, lng]
  recommendedSprayCoords: { lat: number; lng: number };
  localizedPrescription: string;
}

export interface OpticalMetrics {
  meanNdvi: number; // -1.0 to 1.0 (typically 0.1 to 0.85 for crops)
  cloudCoverPercentage: number;
  healthyCanopyPercentage: number;
  moderateStressPercentage: number;
  severeStressPercentage: number;
  opticalImageTimestamp: string;
}

export interface SarRadarMetrics {
  vvBackscatterDb: number; // typically -18 dB to -6 dB
  vhBackscatterDb: number; // typically -25 dB to -12 dB
  polarizationRatio: number; // VV/VH ratio
  soilMoistureIndex: number; // 0 to 100%
  waterloggingRisk: 'minimal' | 'moderate' | 'high' | 'critical';
  canopyStructuralLossPercentage: number;
  radarPenetrationDepthCm: number;
  sarImageTimestamp: string;
}

export interface SatelliteScan {
  id: string;
  farmId: string;
  userId: string;
  scanDate: string;
  mode: SatelliteMode;
  cloudCoverPercentage: number;
  isMonsoonRadarActive: boolean; // True if cloud cover > 35% or manually requested SAR
  overallStatus: 'healthy' | 'warning' | 'critical';
  opticalMetrics?: OpticalMetrics;
  sarMetrics?: SarRadarMetrics;
  stressZones: StressZone[];
  zonalGrid?: ZonalGridCell[];
  anomalyHotspots?: AnomalyHotspot[];
  gridResolution?: string;
  macroObservations: string[];
  scientificLimitationNotice: string; // Explaining macro stress vs microscopic leaf pathogen
  promptCameraInspection: boolean;
  assessedCropAreaAcres?: number;
  affectedAreaAcres?: number;
  unassessedAreaAcres?: number;
  observationDates?: string[];
  qualityLimitations?: string;
}

export interface PhenologyDataPoint {
  date: string;
  daysAgo: number;
  ndvi: number;
  ndre: number;
  evi: number;
  cloudFree?: boolean;
  scl?: number; // Scene Classification Layer (4: veg, 5: bare, 3: cloud shadow, 9: cloud)
  cloudCoverPercentage?: number;
  sarVvBackscatterDb?: number;
  sarVhVvRatio?: number;
  stage: string;
}

export interface TemporalSlopeMetrics {
  sowingBaseline: number;
  greeningSlopePerDay: number;
  peakNdvi: number;
  peakNdre: number;
  senescenceDrop: number;
  cyclicVariance: number;
}

export interface CropClassificationResult {
  crop?: string;
  predictedCrop: string;
  confidence: number;
  confidenceBreakdown: Record<string, number>;
  phenologyCurve: PhenologyDataPoint[];
  temporalSlope: TemporalSlopeMetrics;
  isUncertain: boolean;
  suggestedCropType: string;
  suggestedSoilType?: string;
  message: string;
  summary?: string;
  uncertaintyReason?: string;
  latestNdvi?: number;
  latestNdre?: number;
  currentStage?: string;
  slope30d?: number;
  slope60d?: number;
  sarVvVhRatio?: number;
  areaHectares?: number;
  cropInference?: CropInferenceStatus;
  soilData?: SoilInformation;
  regionalPriors?: Record<string, number>;
}

export type LandCoverClass = 'crop' | 'tree' | 'bare_soil' | 'water' | 'built_up' | 'unknown';
export type CropTypeClass = 'paddy' | 'potato' | 'mustard' | 'vegetables' | 'other_crop';

export interface LandCoverSubZone {
  id: string;
  coordinates: number[][][]; // GeoJSON polygon ring coordinates
  center: [number, number]; // [lat, lng]
  areaAcres: number;
  areaHectares: number;
  landCoverClass: LandCoverClass;
  landCoverLabel: string;
  color: string;
  confidence: number;
  // Stage 2 crop-type classification (only populated when landCoverClass is 'crop')
  cropType?: CropTypeClass;
  cropTypeLabel?: string;
  cropTypeConfidence?: number;
  isCropConfirmed: boolean;
  spectralIndices: {
    ndvi: number;
    ndwi: number;
    ndbi: number;
    ndre?: number;
  };
  source: string;
  date: string;
}

export interface SoilInformation {
  source: 'ISRIC SoilGrids v2.0' | string;
  coordinates: [number, number]; // [lat, lng]
  clayPercentage?: number;
  sandPercentage?: number;
  siltPercentage?: number;
  soilTexture?: string; // e.g. "Clay Loam", "Sandy Clay Loam", "Silt Loam", "Clay", "Loam"
  organicCarbonGPerKg?: number;
  organicCarbonPercentage?: number;
  phH2o?: number;
  nitrogenGPerKg?: number;
  disclaimer: string;
  isAvailable: boolean;
  resolution?: string; // e.g. "250m grid resolution"
  depth?: string;      // e.g. "0–5 cm (topsoil)"
  isEstimate?: boolean;
  rawLayerDepths?: any;
}

export interface DataQualityEvidence {
  purePixelCount: number;
  totalPixelCount: number;
  purePixelRatio: number;
  spatialResolutionMeters: number;
  temporalConfidenceScore: number;
  cloudOcclusionPct: number;
  validationNotes: string;
}

export interface LandCoverInferenceResult {
  id: string;
  farmId?: string;
  scanDate: string;
  satelliteSource: string;
  isModelConnected: boolean;
  connectionStatusMessage?: string;
  areaHectares: number;
  areaAcres: number;
  isSmallPlot: boolean;
  smallPlotNotice?: string;
  dominantLandCover?: LandCoverClass;
  dominantLandCoverLabel?: string;
  summaryHeadline?: string;
  estimatedCropType?: string;
  suggestedSoilType?: string;
  dataQualityEvidence?: DataQualityEvidence;
  subZones: LandCoverSubZone[];
  classBreakdown: {
    [key in LandCoverClass]: {
      areaAcres: number;
      areaHectares: number;
      percentage: number;
      label: string;
      color: string;
    };
  };
  soilData?: SoilInformation;
  rasterMetadata?: {
    tileId?: string;
    passTimestamp?: string;
    cloudCoverPercentage?: number;
    bandsUsed?: string[];
  };
  cropInference?: CropInferenceStatus;
}

export interface SatelliteSceneInfo {
  sceneId: string;
  acquisitionDate: string;
  cloudCoverPercentage: number;
  platform: string;
  bandsAvailable: string[];
}

export interface CropInferenceStatus {
  status: 'model_predicted' | 'model_not_loaded' | 'training_required' | 'data_unavailable' | 'not_applicable_non_crop';
  isModelLoaded: boolean;
  predictedCrop?: string | null;
  confidence?: number;
  confidenceBreakdown?: Record<string, number>;
  modelVersion?: string;
  supportingDates?: string[];
  scenesFound?: SatelliteSceneInfo[];
  sarScenesFound?: any[];
  featuresUsed?: any;
  regionalLimitationNotice?: string;
  blockerReason?: string;
  requiredDatasetAndModel?: string;
  message: string;
}

