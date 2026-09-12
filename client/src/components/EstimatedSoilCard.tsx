import React from 'react';
import { SoilInformation } from '@shared/index';
import { Info, Layers, AlertCircle, Droplets, TestTube2, Sprout } from 'lucide-react';

interface EstimatedSoilCardProps {
  soilData?: SoilInformation;
  isLoading?: boolean;
}

export const EstimatedSoilCard: React.FC<EstimatedSoilCardProps> = ({ soilData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-stone-200 rounded w-40"></div>
          <div className="h-4 bg-stone-200 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="h-16 bg-stone-100 rounded-lg"></div>
          <div className="h-16 bg-stone-100 rounded-lg"></div>
          <div className="h-16 bg-stone-100 rounded-lg"></div>
          <div className="h-16 bg-stone-100 rounded-lg"></div>
        </div>
        <div className="h-10 bg-amber-50 rounded-lg"></div>
      </div>
    );
  }

  if (!soilData || !soilData.isAvailable) {
    return (
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="flex items-center gap-3 text-stone-600">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-stone-800">ISRIC SoilGrids Layer:</span> Data unavailable for this geographic coordinate.
          </div>
        </div>
        <div className="mt-3 text-xs text-stone-500 flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-stone-200">
          <Info className="w-4 h-4 text-stone-400 shrink-0" />
          <span>Map-based estimate — field soil test required for exact values.</span>
        </div>
      </div>
    );
  }

  // Evaluate pH range
  const ph = soilData.phH2o;
  let phCategory = 'Neutral';
  let phColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (ph !== undefined) {
    if (ph < 5.5) {
      phCategory = 'Strongly Acidic';
      phColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (ph < 6.5) {
      phCategory = 'Slightly Acidic';
      phColor = 'text-lime-700 bg-lime-50 border-lime-200';
    } else if (ph <= 7.5) {
      phCategory = 'Neutral / Ideal';
      phColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (ph <= 8.5) {
      phCategory = 'Moderately Alkaline';
      phColor = 'text-sky-700 bg-sky-50 border-sky-200';
    } else {
      phCategory = 'Strongly Alkaline';
      phColor = 'text-purple-700 bg-purple-50 border-purple-200';
    }
  }

  // Organic Carbon evaluation
  const soc = soilData.organicCarbonPercentage;
  let socRating = 'Moderate';
  if (soc !== undefined) {
    if (soc < 0.5) socRating = 'Low (< 0.5%)';
    else if (soc <= 0.75) socRating = 'Medium (0.5 - 0.75%)';
    else socRating = 'High (> 0.75%)';
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-stone-50/80 px-5 py-3.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800 text-sm">Topsoil Characteristics (0–5 cm)</h3>
            <p className="text-xs text-stone-500">Source: ISRIC SoilGrids v2.0 Global Standard</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600 border border-stone-200">
          <span>Lat: {soilData.coordinates[0].toFixed(3)}°</span>
          <span>•</span>
          <span>Lng: {soilData.coordinates[1].toFixed(3)}°</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Soil Texture */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-1">
            <Sprout className="w-3.5 h-3.5 text-stone-600" />
            <span>USDA Soil Texture</span>
          </div>
          <div className="text-base font-bold text-stone-800 truncate">
            {soilData.soilTexture || 'Determining...'}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex gap-2">
            <span>Clay: <strong className="text-stone-700">{soilData.clayPercentage ?? '--'}%</strong></span>
            <span>Sand: <strong className="text-stone-700">{soilData.sandPercentage ?? '--'}%</strong></span>
            <span>Silt: <strong className="text-stone-700">{soilData.siltPercentage ?? '--'}%</strong></span>
          </div>
        </div>

        {/* Soil pH */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-1">
            <TestTube2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Soil pH (H₂O)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-stone-800">
              {soilData.phH2o !== undefined ? soilData.phH2o.toFixed(1) : '--'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${phColor}`}>
              {phCategory}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            Optimum range for most crops: 6.0 – 7.5
          </div>
        </div>

        {/* Soil Organic Carbon (SOC) */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Organic Carbon (SOC)</span>
          </div>
          <div className="text-base font-bold text-stone-800">
            {soilData.organicCarbonPercentage !== undefined ? `${soilData.organicCarbonPercentage.toFixed(2)}%` : '--'}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {soilData.organicCarbonGPerKg !== undefined ? `${soilData.organicCarbonGPerKg} g/kg (${socRating})` : '--'}
          </div>
        </div>

        {/* Total Nitrogen Estimate */}
        <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>Total Nitrogen (Est.)</span>
          </div>
          <div className="text-base font-bold text-stone-800">
            {soilData.nitrogenGPerKg !== undefined ? `${soilData.nitrogenGPerKg.toFixed(2)} g/kg` : '--'}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            Topsoil reserve estimate
          </div>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div className="mx-5 mb-5 p-3.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-semibold block mb-0.5">Mandatory Soil Disclaimer:</strong>
          {soilData.disclaimer || 'Map-based estimate — field soil test required for exact values.'}
          <span className="block mt-1 text-[11px] text-amber-800/80">
            Satellite imagery and regional digital soil mapping provide reference estimates only. They cannot replace physical laboratory N-P-K chemical soil tests.
          </span>
        </div>
      </div>
    </div>
  );
};
