import { DiseaseResult, ActiveChemical, DiagnosisStatus } from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config/index.js';

export interface ImageAnalysisPayload {
  isFoliage: boolean;
  status: DiagnosisStatus;
  message?: string;
  cropName?: string;
  cropFamily?: string;
  growthStage?: 'Seedling' | 'Vegetative' | 'Flowering' | 'Maturity / Harvest-Ready';
  isSenescence?: boolean;
  probableDisease?: string;
  confidenceScore?: number;
  isLowConfidence?: boolean;
  severityLevel?: 'Mild' | 'Moderate' | 'Severe';
  visibleSymptoms?: string[];
  probableCauses?: string[];
  secondaryPossibilities?: string[];
  culturalTreatments?: string[];
  biologicalTreatments?: string[];
  activeChemicals?: ActiveChemical[];
}

export class DiagnosisService {
  /**
   * Extract image buffer and mime-type from Data URL, Local upload path, or remote URL.
   */
  private async getImageBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          return {
            buffer: Buffer.from(matches[2], 'base64'),
            mimeType: matches[1]
          };
        }
      }

      // Check uploads directory
      if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
        const filename = path.basename(imageUrl);
        const uploadPath = path.resolve(config.storage.uploadDir, filename);
        if (fs.existsSync(uploadPath)) {
          const buffer = await fs.promises.readFile(uploadPath);
          const ext = path.extname(filename).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return { buffer, mimeType };
        }
      }

      // Check sample-scans or public images
      if (imageUrl.startsWith('/sample-scans/') || imageUrl.startsWith('sample-scans/')) {
        const filename = path.basename(imageUrl);
        const samplePath = path.resolve(process.cwd(), '../client/public/sample-scans', filename);
        if (fs.existsSync(samplePath)) {
          const buffer = await fs.promises.readFile(samplePath);
          return { buffer, mimeType: 'image/jpeg' };
        }
        const serverSamplePath = path.resolve(process.cwd(), 'client/public/sample-scans', filename);
        if (fs.existsSync(serverSamplePath)) {
          const buffer = await fs.promises.readFile(serverSamplePath);
          return { buffer, mimeType: 'image/jpeg' };
        }
      }

      // Remote URL fetch
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
        const mimeType = String(response.headers['content-type'] || 'image/jpeg');
        return { buffer: Buffer.from(response.data), mimeType };
      }
    } catch (err: any) {
      console.warn('[DiagnosisService] Could not extract image buffer:', err.message);
    }
    return null;
  }

  /**
   * Gemini Vision API Integration (Active Multi-Model Cascade)
   */
  private async analyzeWithGeminiVision(buffer: Buffer, mimeType: string): Promise<ImageAnalysisPayload | null> {
    const apiKey = process.env.GEMINI_API_KEY || config.cropDiagnostics.apiKey;
    if (!apiKey) {
      console.error('[DiagnosisService] GEMINI_API_KEY is not configured in environment.');
      return null;
    }

    const base64Data = buffer.toString('base64');
    const systemPrompt = `You are the AgriCare Agronomic Intelligence Engine, an expert plant pathologist and computer vision model.
Analyze the provided photograph strictly according to Indian agricultural extension protocols.

RULES:
1. NON-CROP / BARE SOIL GUARDRAIL (OOD Rejection):
   Inspect the image. If the image contains bare soil, dry dirt, human hands, tractor, machinery, indoor room, footwear, or non-plant objects without active plant leaves/canopy:
   Return JSON ONLY:
   {
     "isFoliage": false,
     "status": "invalid_scan",
     "message": "No active foliage detected. Image appears to be bare soil or non-crop background. Please capture a clear leaf photo."
   }

2. CROP FAMILY & PHENOLOGY DETECTION:
   Identify crop name and crop family accurately (e.g. "Rice (Dhan)", "Potato (Aloo)", "Wheat", "Mustard (Sarson)", "Maize", "Tomato").
   Identify Growth Stage: "Seedling", "Vegetative", "Flowering", or "Maturity / Harvest-Ready".

3. SENESCENCE VS DISEASE RULE:
   Golden or yellowing canopy on mature crops (Maturity / Harvest-Ready phase) must be classified as "Normal Crop Ripening (Maturity Phase)" with status "normal_ripening" and isSenescence true, NOT as fungal blight. Do NOT prescribe chemical fungicides for normal ripening.

4. LOW CONFIDENCE GUARDRAIL:
   If image is blurry, out of focus, or pathogen confidence is below 75%, mark status as "uncertain_advisory", confidenceScore < 75.

5. ACTIVE PATHOGEN:
   If a disease is confirmed with >= 75% confidence, provide probableDisease, severityLevel ("Mild" | "Moderate" | "Severe"), visibleSymptoms, probableCauses, culturalTreatments, biologicalTreatments, and activeChemicals (generic formulations with application notes).

Output valid JSON ONLY matching the schema.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json'
      }
    };

    const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await axios.post(url, requestBody, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        const candidateText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          const parsed = JSON.parse(candidateText);
          return {
            isFoliage: parsed.isFoliage ?? parsed.is_plant ?? true,
            status: parsed.status || (parsed.is_plant === false ? 'invalid_scan' : 'confirmed'),
            message: parsed.message || parsed.rejection_reason,
            cropName: parsed.cropName || parsed.crop_name,
            cropFamily: parsed.cropFamily || parsed.crop_family,
            growthStage: parsed.growthStage || parsed.growth_stage,
            isSenescence: parsed.isSenescence ?? parsed.is_natural_maturity,
            probableDisease: parsed.probableDisease || parsed.pathogen_name || parsed.disease_name,
            confidenceScore: parsed.confidenceScore ?? parsed.confidence_score ?? 92.0,
            isLowConfidence: parsed.isLowConfidence ?? ((parsed.confidenceScore ?? parsed.confidence_score ?? 92) < 75),
            severityLevel: parsed.severityLevel || parsed.severity_level || 'Moderate',
            visibleSymptoms: parsed.visibleSymptoms || parsed.visible_symptoms || [],
            probableCauses: parsed.probableCauses || parsed.probable_causes || [],
            secondaryPossibilities: parsed.secondaryPossibilities || [],
            culturalTreatments: parsed.culturalTreatments || parsed.cultural_treatments || [],
            biologicalTreatments: parsed.biologicalTreatments || parsed.biological_treatments || [],
            activeChemicals: parsed.activeChemicals || parsed.active_chemicals || []
          };
        }
      } catch (err: any) {
        console.warn(`[DiagnosisService] Gemini Vision model ${model} failed (${err.message}). Trying next candidate...`);
      }
    }
    return null;
  }

  /**
   * Main Diagnostic Evaluation Pipeline
   * Strictly invokes live Gemini Vision and throws an explicit error if analysis fails.
   */
  async analyzeImage(
    imageUrl: string,
    farmId: string | undefined,
    userId: string,
    hintCrop?: string
  ): Promise<DiseaseResult> {
    const imgData = await this.getImageBuffer(imageUrl);
    if (!imgData) {
      throw new Error("Unable to read image payload for crop analysis. Please upload a valid image file.");
    }

    const analysis = await this.analyzeWithGeminiVision(imgData.buffer, imgData.mimeType);

    // Strict Error Propagation: Never substitute a dummy crop
    if (!analysis) {
      throw new Error("AI analysis failed to identify crop. Please try again.");
    }

    // Check OOD rejection Guardrail
    if (analysis.status === 'invalid_scan' || analysis.isFoliage === false) {
      return {
        id: uuidv4(),
        scanId: uuidv4(),
        farmId: farmId || '',
        userId,
        status: 'invalid_scan',
        cropName: 'Non-Crop Subject',
        cropFamily: 'Out of Domain',
        probableDisease: 'No Plant Foliage Detected',
        message: analysis.message || 'No active foliage detected. Image appears to be bare soil or non-crop background. Please capture a clear leaf photo.',
        confidenceScore: 0,
        isLowConfidence: true,
        severityLevel: 'Mild',
        visibleSymptoms: ['Bare soil, dry dirt, human hands, or mechanical background detected instead of leaf canopy.'],
        probableCauses: ['Target object is not a living agricultural crop or leaf.'],
        culturalTreatments: ['Capture a close-up photo centering directly on the affected crop leaf blade.'],
        biologicalTreatments: [],
        activeChemicals: [],
        kisanCallCenterNumber: '1800-180-1551',
        kvkAdvisoryNotice: 'Please aim your camera directly at an active crop leaf to run foliar health analysis.',
        imageUrl,
        scannedAt: new Date().toISOString()
      };
    }

    if (!analysis.cropName) {
      throw new Error("AI analysis failed to identify crop. Please try again.");
    }

    const confidence = analysis.confidenceScore ?? 88.0;
    const isLowConfidence = confidence < 75;
    const status: DiagnosisStatus = analysis.status || (isLowConfidence ? 'uncertain_advisory' : 'confirmed');

    return {
      id: uuidv4(),
      scanId: uuidv4(),
      farmId: farmId || '',
      userId,
      cropName: analysis.cropName,
      cropFamily: analysis.cropFamily || 'Agricultural Angiosperm',
      growthStage: analysis.growthStage || 'Vegetative',
      isSenescence: Boolean(analysis.isSenescence),
      status,
      message: analysis.message,
      probableDisease: analysis.probableDisease || 'Unspecified Foliar Condition',
      confidenceScore: confidence,
      isLowConfidence,
      severityLevel: analysis.severityLevel || 'Moderate',
      visibleSymptoms: analysis.visibleSymptoms || [],
      probableCauses: analysis.probableCauses || [],
      secondaryPossibilities: analysis.secondaryPossibilities || [],
      culturalTreatments: analysis.culturalTreatments || [],
      biologicalTreatments: analysis.biologicalTreatments || [],
      activeChemicals: analysis.activeChemicals || [],
      kisanCallCenterNumber: '1800-180-1551',
      kvkAdvisoryNotice: status === 'normal_ripening'
        ? 'Physiological maturity verified: No chemical fungicides needed. Prepare for timely harvesting.'
        : 'All chemical recommendations are generic active compounds. Wear protective PPE and follow label dosage instructions.',
      imageUrl,
      scannedAt: new Date().toISOString()
    };
  }
}

export const diagnosisService = new DiagnosisService();
