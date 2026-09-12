import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { RecoveryCheck, Farm } from '@shared/index';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Sprout, 
  Plus, 
  Loader2,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

interface SafeImageProps {
  src?: string;
  fallbackSrc: string;
  alt: string;
  badgeText: string;
  badgeClass?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc,
  alt,
  badgeText,
  badgeClass = 'bg-black/70 text-white',
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  return (
    <div className="h-64 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 relative group">
      {!hasError ? (
        <img
          src={currentSrc}
          alt={alt}
          onError={() => {
            if (currentSrc !== fallbackSrc) {
              // Try the verified local SVG fallback first
              setCurrentSrc(fallbackSrc);
            } else {
              // If even fallback fails, render UI placeholder
              setHasError(true);
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 mb-2 shadow-inner">
            <Sprout className="w-6 h-6 opacity-90" />
          </div>
          <span className="text-xs font-bold text-slate-200">{alt}</span>
          <span className="text-[11px] text-slate-400 mt-1">Diagnostic foliage record</span>
        </div>
      )}

      {/* Caption Badge */}
      <div className={`absolute bottom-2 left-2 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-medium ${badgeClass}`}>
        {badgeText}
      </div>
    </div>
  );
};

export const RecoveryTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const farmId = searchParams.get('farmId') || '';

  const [checks, setChecks] = useState<RecoveryCheck[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState(farmId);
  const [currentSeverity, setCurrentSeverity] = useState<'Resolved' | 'Mild' | 'Moderate' | 'Severe'>('Mild');
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [checksRes, farmsRes] = await Promise.all([
          api.getRecoveryChecks(farmId || undefined),
          api.getFarms(),
        ]);
        setChecks(checksRes.checks || []);
        setFarms(farmsRes.farms || []);
        if (!selectedFarmId && farmsRes.farms.length > 0) {
          setSelectedFarmId(farmsRes.farms[0].id);
        }
      } catch (err) {
        console.error('Failed to load recovery data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [farmId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (selectedFarmId) {
        formData.append('farmId', selectedFarmId);
      }
      const res = await api.uploadCropPhoto(formData);
      if (res?.scan?.imageUrl) {
        setAfterImageUrl(res.scan.imageUrl);
      }
    } catch (err) {
      console.error('Failed to upload recovery scan:', err);
      alert('Failed to upload image file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordReScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) return;
    if (!afterImageUrl) {
      alert('Please upload a follow-up leaf photo before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createRecoveryCheck({
        farmId: selectedFarmId,
        beforeImageUrl: '/images/crop-diseased.svg',
        afterImageUrl: afterImageUrl || '/images/crop-recovered.svg',
        initialSeverity: 'Moderate',
        currentSeverity,
        scheduledFollowUpDays: 7,
      });

      setChecks([res.recoveryCheck, ...checks]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to submit recovery re-scan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Crop Recovery Tracking
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Before &amp; After Loop
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare post-treatment foliar healing with baseline diagnosis to ensure complete recovery.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-agri-700 hover:bg-agri-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Follow-up Re-Scan</span>
        </button>
      </div>

      {/* Recovery Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-agri-600" />
          <span className="text-xs font-medium">Loading recovery timelines...</span>
        </div>
      ) : checks.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
          <Activity className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900">No Recovery Checks Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you conduct a disease scan and apply treatment, record follow-up scans at 7 and 14 days to track recovery progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-agri-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Record Sample Re-Scan
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {checks.map((check) => {
            const farm = farms.find(f => f.id === check.farmId);
            const isImproved = check.recoveryProgression === 'Improved';
            const hasFollowUpPhoto = Boolean(check.afterImageUrl && check.afterImageUrl.trim() !== '');

            return (
              <div
                key={check.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6"
              >
                {/* Header of Check */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-agri-800">
                      {farm?.name || 'Registered Farm'} &bull; {farm?.cropType || 'Crop'}
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-950 mt-0.5">
                      {check.scheduledFollowUpDays}-Day Follow-Up Recovery Assessment
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${
                      isImproved
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {check.recoveryProgression} (+{check.recoveryScorePercentage}% Recovery Index)
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Photo Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Before Photo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Baseline Scan (Day 0)
                      </span>
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {check.initialSeverity} Severity
                      </span>
                    </div>

                    <SafeImage
                      src={check.beforeImageUrl}
                      fallbackSrc="/images/crop-diseased.svg"
                      alt="Baseline Crop Diagnosis"
                      badgeText="Active Spores &amp; Lesions"
                      badgeClass="bg-black/70 text-white"
                    />
                  </div>

                  {/* After Photo or Clean Empty State Card */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Post-Treatment (Day {check.scheduledFollowUpDays})
                      </span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {check.currentSeverity} Severity
                      </span>
                    </div>

                    {hasFollowUpPhoto ? (
                      <SafeImage
                        src={check.afterImageUrl}
                        fallbackSrc="/images/crop-recovered.svg"
                        alt="Post-Treatment Recovery Scan"
                        badgeText="Desiccated Callus Borders"
                        badgeClass="bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold"
                      />
                    ) : (
                      /* Empty State Card if no follow-up photo uploaded yet */
                      <div className="h-64 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-dashed border-emerald-500/40 p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">Day {check.scheduledFollowUpDays} Photo Pending</h4>
                          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                            Capture a close-up photo of the treated foliage to verify spore eradication and callus healing.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFarmId(check.farmId);
                            setIsModalOpen(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Capture Day {check.scheduledFollowUpDays} Photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Field Observations & Next Agronomic Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wide">
                      Healing Observations
                    </h3>
                    <ul className="space-y-1.5 text-slate-700">
                      {check.observations.map((obs, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wide">
                      Recommended Next Actions
                    </h3>
                    <ul className="space-y-1.5 text-slate-700">
                      {check.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <ArrowRight className="w-3.5 h-3.5 text-agri-700 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal to record a new follow-up re-scan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 text-xs">
            
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Record Follow-up Re-Scan</h2>
              <p className="text-slate-500">Document post-treatment progress for your farm plot.</p>
            </div>

            <form onSubmit={handleRecordReScan} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Farm</label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold outline-none focus:border-agri-600"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.cropType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Post-Treatment Severity Status</label>
                <select
                  value={currentSeverity}
                  onChange={(e) => setCurrentSeverity(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold outline-none focus:border-agri-600"
                >
                  <option value="Resolved">Resolved (No Active Disease Remaining)</option>
                  <option value="Mild">Mild (Lesions Dried Out, Under Control)</option>
                  <option value="Moderate">Moderate (Active Margins Persist)</option>
                  <option value="Severe">Severe (Infection Spreading to New Growth)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Follow-up Leaf Photograph <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-agri-600 rounded-2xl cursor-pointer bg-slate-50 transition-all hover:bg-agri-50/20 group">
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-agri-600 mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-agri-800">
                      {isUploading ? 'Uploading & Processing Foliar Image...' : 'Click to Upload or Snap Day-7 Leaf Photo'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Preview */}
              {afterImageUrl && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-300">
                    <img
                      src={afterImageUrl}
                      alt="Preview"
                      onError={(e) => { e.currentTarget.src = '/images/crop-placeholder.svg'; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-bold text-slate-900 block">Image Preview</span>
                    <span className="truncate block max-w-xs text-slate-400">{afterImageUrl}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-agri-700 hover:bg-agri-800 text-white rounded-xl font-bold shadow-md transition-colors"
                >
                  {isSubmitting ? 'Saving Re-Scan...' : 'Save Recovery Log'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
