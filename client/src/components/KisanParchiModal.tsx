import React from 'react';

interface KisanParchiModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: any;
  farm: any;
  cropImageUrl?: string;
  parchi?: any;
}

export const KisanParchiModal: React.FC<KisanParchiModalProps> = ({
  isOpen,
  onClose,
  diagnosis,
  farm,
  cropImageUrl,
  parchi
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const cropName = parchi?.cropName || diagnosis?.cropName || diagnosis?.crop || farm?.cropType || "Crop Foliage";
  const diseaseName = parchi?.diagnosis || diagnosis?.probableDisease || diagnosis?.diseaseName || "Agronomic Condition";
  const severity = parchi?.severity || diagnosis?.severityLevel || diagnosis?.severity || "Moderate";
  const rawConfidence = parchi?.confidence ?? diagnosis?.confidenceScore ?? diagnosis?.confidence ?? 90;
  const confidencePercent = Math.round(rawConfidence > 1 ? rawConfidence : rawConfidence * 100);
  const chemicalName = parchi?.prescribedActiveChemicals?.[0]?.name || diagnosis?.activeChemicals?.[0]?.name || diagnosis?.chemical || "Recommended Bio/Chemical Treatment";
  const chemicalDosage = parchi?.prescribedActiveChemicals?.[0]?.applicationNotes || diagnosis?.activeChemicals?.[0]?.applicationNotes || diagnosis?.dosage || "Follow package label safety instructions";
  const organicOption = parchi?.culturalSteps?.[0] || diagnosis?.biologicalTreatments?.[0] || diagnosis?.culturalTreatments?.[0] || diagnosis?.organicAlternative || "Maintain good sanitation and canopy aeration";
  const farmName = parchi?.farmName || farm?.name || "Registered Farm";
  const refId = parchi?.parchiId || (diagnosis?.id ? `RX-${diagnosis.id.slice(0, 8).toUpperCase()}` : "AGRI-PARCHI");
  const sprayStatus = parchi?.weatherSprayStatus || diagnosis?.sprayWindow || "Safe within next 6 hrs";

  const whatsappText = encodeURIComponent(
    `*AgriCare Kisan Chikitsa Parchi*\n` +
    `Khet: ${farmName} (${farm?.acres || "Field"} Acres)\n` +
    `Fasal: ${cropName}\n` +
    `Bimari: ${diseaseName} (Severity: ${severity})\n` +
    `Dawai: ${chemicalName}\n` +
    `Dosage: ${chemicalDosage}\n` +
    `Organic Option: ${organicOption}\n` +
    `Spray Window: ${sprayStatus}\n` +
    `Helpline: 1800-180-1551`
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      {/* Inline Print Isolation Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-parchi, #printable-parchi * {
            visibility: visible !important;
          }
          #printable-parchi {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Card */}
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-sm font-bold text-emerald-400 tracking-wide uppercase">
            AgriCare - Kisan Chikitsa Parchi (Prescription Report)
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Printable Area Target */}
        <div className="overflow-y-auto p-6 bg-slate-900">
          <div
            id="printable-parchi"
            className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
          >
            {/* Prescription Header */}
            <div className="border-b pb-3 flex justify-between items-start border-slate-300">
              <div>
                <h1 className="text-xl font-black text-emerald-800 tracking-tight">AgriCare Kisan Parchi</h1>
                <p className="text-xs text-slate-500 font-medium">Verified AI Agronomic & Pathogen Report</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <span className="font-bold block">Ref ID: {refId}</span>
                <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            {/* Farm & Crop Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">PARCEL & CROP:</span>
                <span className="font-bold text-slate-800">
                  {farmName} | {cropName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">SEVERITY / CONFIDENCE:</span>
                <span className="font-bold text-rose-600">
                  {severity} ({confidencePercent}% Verified)
                </span>
              </div>
            </div>

            {/* Pathogen & Symptoms */}
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-700 uppercase">Diagnosed Pathogen:</span>
              <p className="font-semibold text-rose-700 text-sm">
                {diseaseName}
                {diagnosis?.cropFamily && (
                  <span className="text-xs font-normal text-slate-500 italic block">
                    ({diagnosis.cropFamily})
                  </span>
                )}
              </p>
            </div>

            {/* Chemical Prescription */}
            <div className="border border-emerald-200 bg-emerald-50/70 p-3 rounded-lg text-xs space-y-1">
              <span className="font-bold text-emerald-900 uppercase">Recommended Treatment:</span>
              <p className="font-bold text-emerald-950">
                {chemicalName}
              </p>
              <p className="text-slate-600">
                Application / Notes: <span className="font-semibold">{chemicalDosage}</span>
              </p>
            </div>

            {/* Organic Option */}
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
              <span className="font-semibold text-slate-800">Cultural / Organic Practice: </span>
              {organicOption}
            </div>

            {/* Advisory */}
            <div className="text-[11px] text-slate-500 border-t pt-2 border-slate-200 flex justify-between items-center">
              <span>Spray Window: {sprayStatus}</span>
              <span className="font-mono text-[10px]">AgriCare Digital Validation</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700"
          >
            🖨️ Print Prescription
          </button>
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40"
          >
            📲 Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default KisanParchiModal;