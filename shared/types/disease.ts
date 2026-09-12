export type DiagnosisStatus = 'confirmed' | 'uncertain_advisory' | 'normal_ripening' | 'invalid_scan';

export interface ActiveChemical {
  name: string; // e.g. "Mancozeb 75% WP", "Copper Oxychloride 50% WP"
  category: 'Fungicide' | 'Insecticide' | 'Bactericide' | 'Micronutrient';
  targetOrganism: string;
  applicationNotes: string; // General advice on safety, spray volume, PPE
  procurementQuery: string; // Query string for external agro portal search
}

export interface DiseaseResult {
  id: string;
  scanId: string;
  farmId: string;
  userId: string;
  is_valid_plant?: boolean;
  rejection_reason?: string;
  cropName: string;
  cropFamily?: string;
  growthStage?: 'Seedling' | 'Vegetative' | 'Flowering' | 'Maturity / Harvest-Ready' | 'Maturity / Senescence';
  isSenescence?: boolean;
  status?: DiagnosisStatus;
  message?: string;
  probableDisease: string;
  confidenceScore: number; // 0 - 100
  isLowConfidence: boolean; // true if confidence < 75%
  severityLevel: 'Mild' | 'Moderate' | 'Severe';
  visibleSymptoms: string[];
  probableCauses: string[];
  secondaryPossibilities?: string[];
  culturalTreatments: string[]; // non-chemical sanitation, rogueing, spacing
  biologicalTreatments: string[]; // Trichoderma, Pseudomonas, Neem oil
  activeChemicals: ActiveChemical[];
  kisanCallCenterNumber: string; // "1800-180-1551"
  kvkAdvisoryNotice: string;
  imageUrl: string;
  scannedAt: string;
  soilData?: any;
  regionalPriors?: Record<string, number>;
  confidenceBreakdown?: Record<string, number>;
}

export interface AnalyzeCropResponse {
  is_plant?: boolean;
  is_valid_plant: boolean;
  rejection_reason?: string;
  status: DiagnosisStatus;
  message?: string;
  diagnosis?: DiseaseResult;
}

export interface KisanParchiData {
  parchiId: string;
  farmName: string;
  farmerName: string;
  date: string;
  cropName: string;
  cropFamily?: string;
  growthStage?: string;
  diagnosis: string;
  severity: string;
  confidence: number;
  prescribedActiveChemicals: ActiveChemical[];
  culturalSteps: string[];
  weatherSprayStatus: string;
  sprayWindowRecommendation: string;
  safetyPrecautions: string[];
  kisanHelpline: string;
  qrVerificationCode?: string;
}
