import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { 
  Camera, 
  Upload, 
  SwitchCamera, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  ShieldAlert,
  Loader2, 
  ArrowLeft 
} from 'lucide-react';

export const CameraScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const farmId = searchParams.get('farmId') || '';
  const hotspotId = searchParams.get('hotspotId') || '';
  const zone = searchParams.get('zone') || hotspotId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidScanNotice, setInvalidScanNotice] = useState<string | null>(null);
  const [sampleCropHint, setSampleCropHint] = useState<string | undefined>(undefined);

  // Module 7: Offline-First Khet Mode (PWA Camera Caching)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('agricare_offline_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [offlineBanner, setOfflineBanner] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);


  // Auto-sync pending scans when device reconnects
  const syncOfflineQueue = async () => {
    try {
      const raw = localStorage.getItem('agricare_offline_queue');
      const queue = raw ? JSON.parse(raw) : [];
      if (!queue || queue.length === 0) return;

      setIsSyncing(true);
      const item = queue[0];
      const diagRes = await api.analyzeCropImage(item.imageUrl, item.farmId, item.cropHint);

      const remaining = queue.slice(1);
      setOfflineQueue(remaining);
      localStorage.setItem('agricare_offline_queue', JSON.stringify(remaining));

      if (diagRes.diagnosis) {
        navigate(`/diagnosis/${diagRes.diagnosis.id}`);
      }
    } catch (err) {
      console.warn('[KhetMode] Auto-sync retry scheduled:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnlineEvent = () => {
      setIsOnline(true);
      setOfflineBanner(null);
      syncOfflineQueue();
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      setOfflineBanner('[📶 Khet Mode: Offline. Photo saved locally. Will auto-analyze when network connects.]');
    };

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    if (navigator.onLine && offlineQueue.length > 0) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, []);

  const saveToOfflineQueue = (imgUrl: string) => {
    const newItem = {
      id: 'offline-' + Date.now(),
      imageUrl: imgUrl,
      farmId: farmId || 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      coordinates: { lat: 22.8962, lng: 88.2461 },
      timestamp: new Date().toISOString(),
      cropHint: sampleCropHint,
    };
    const updated = [...offlineQueue, newItem];
    setOfflineQueue(updated);
    localStorage.setItem('agricare_offline_queue', JSON.stringify(updated));
    setOfflineBanner('[📶 Khet Mode: Offline. Photo saved locally. Will auto-analyze when network connects.]');
  };


  // Start native camera
  const startCamera = async () => {
    setError(null);
    setInvalidScanNotice(null);
    setPermissionDenied(false);

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setPermissionDenied(true);
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Toggle camera direction (rear vs front)
  const toggleCameraDirection = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    if (isCameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  // Capture frame from video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      setInvalidScanNotice(null);
      setSampleCropHint(undefined);

      canvas.toBlob((blob) => {
        if (blob) setCapturedBlob(blob);
      }, 'image/jpeg', 0.88);

      stopCamera();
    }
  };

  // Gallery File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds maximum allowed size of 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setCapturedBlob(file);
      setInvalidScanNotice(null);
      setSampleCropHint(undefined);
    };
    reader.readAsDataURL(file);
  };

  // Submit and analyze
  const handleProceedToDiagnosis = async () => {
    if (!capturedImage || isUploading) return;

    // Module 7: Zero-Network Offline Storage
    if (!navigator.onLine || !isOnline) {
      saveToOfflineQueue(capturedImage);
      return;
    }

    setIsUploading(true);
    setError(null);
    setInvalidScanNotice(null);

    try {
      let finalImageUrl = capturedImage;

      // If we have a file/blob, upload to server
      if (capturedBlob) {
        const formData = new FormData();
        formData.append('image', capturedBlob, 'leaf-scan.jpg');
        if (farmId) formData.append('farmId', farmId);

        const uploadRes = await api.uploadCropPhoto(formData);
        finalImageUrl = uploadRes.scan?.imageUrl || capturedImage;
      }

      // Run diagnosis with agronomic guardrails
      const diagRes = await api.analyzeCropImage(finalImageUrl, farmId, sampleCropHint);
      
      // Check for Gemini Vision / Agronomic Out-Of-Domain Rejection (Directive 3)
      if (diagRes.is_plant === false || diagRes.is_valid_plant === false || diagRes.status === 'invalid_scan') {
        const rejectionReason = diagRes.rejection_reason || diagRes.message || 'Non-crop object detected';
        const formattedNotice = `Scan Rejected: ${rejectionReason}. Please take a focused photo of crop leaves.`;
        setInvalidScanNotice(formattedNotice);
        setIsUploading(false);
        return;
      }

      if (diagRes.diagnosis && diagRes.diagnosis.id) {
        // Navigate strictly to the real Gemini-fetched diagnosis ID — no local fallback
        navigate(`/diagnosis/${diagRes.diagnosis.id}`);
      } else {
        // diagRes came back without a diagnosis ID — this is a server-side error, not a mock
        setError(
          'Diagnosis processing returned an incomplete response. ' +
          'Please retake the photo and try again, or check your network connection.'
        );
        setIsUploading(false);
      }
    } catch (err: any) {
      if (err.response?.status === 422 || err.response?.data?.message?.includes('Scan rejected') || err.response?.data?.error?.includes('Scan rejected')) {
        const msg = err.response?.data?.error || err.response?.data?.message || 'Scan rejected: Not a recognized agricultural crop leaf.';
        setInvalidScanNotice(msg);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Diagnostic processing failed');
      }
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header: Navigation + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
          {/* Module 7: Network status indicator */}
          <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-600'}`} />
            <span>{isOnline ? 'Online Sync Active' : 'Khet Mode (Offline)'}</span>
          </span>
        </div>
      </div>

      {/* Target Hotspot Telemetry Banner when navigated from map */}
      {zone && (
        <div className="p-3.5 bg-rose-950/85 border border-rose-500/80 rounded-2xl flex items-center justify-between gap-3 text-white shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">🎯</span>
            <div>
              <p className="font-extrabold text-xs text-rose-200">
                Ground-Truth Target: {zone.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </p>
              <p className="text-[11px] text-rose-300">
                Localized foliar stress cluster detected via satellite telemetry. Point camera at symptomatic leaves or lesions in this zone.
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-600/60 text-rose-100 font-bold border border-rose-400 shrink-0">
            HOTSPOT LINKED
          </span>
        </div>
      )}

      {/* Module 7: Amber Offline Banner */}
      {(!isOnline || offlineBanner || offlineQueue.length > 0) && (
        <div className="p-4 bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">📶</span>
            <div className="space-y-0.5">
              <p className="font-black text-amber-950">
                [📶 Khet Mode: Offline. Photo saved locally. Will auto-analyze when network connects.]
              </p>
              <p className="text-[11px] text-amber-800">
                {offlineQueue.length > 0 ? `${offlineQueue.length} photo(s) pending in browser storage.` : 'Zero-network caching is active.'}
              </p>
            </div>
          </div>
          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      )}

      {/* Directive 3: Active Hotspot Targeting Header */}
      <div className="bg-gradient-to-r from-rose-50 via-rose-100 to-rose-50 border-2 border-rose-400 p-4 rounded-3xl flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
            🎯
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
              Autonomous Satellite Ground-Truth Mode
            </span>
            <h2 className="text-sm sm:text-base font-black text-rose-950">
              Targeting Hotspot: North-East Sector (+3.2°C Anomaly)
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono font-black bg-white text-rose-900 border border-rose-300 px-3 py-1 rounded-xl shadow-xs">
            {hotspotId || 'spot_ne_01'}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Crop Foliar Camera Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Position the affected plant leaf inside the guide box for rapid pathogen confirmation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Non-Crop / Bare Soil Out-of-Domain Guardrail Alert */}
      {invalidScanNotice && (
        <div className="p-5 bg-gradient-to-r from-amber-950/90 to-rose-950/90 border-2 border-amber-500/80 rounded-3xl shadow-xl text-white space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-200 tracking-tight">
                Agronomic Guardrail: Non-Crop / Bare Soil Rejection
              </h3>
              <p className="text-xs text-amber-100/90 mt-0.5 font-medium leading-relaxed">
                {invalidScanNotice}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/30">
            <button
              type="button"
              onClick={() => {
                setInvalidScanNotice(null);
                setCapturedImage(null);
                setCapturedBlob(null);
                setSampleCropHint(undefined);
                startCamera();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Foliar Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Viewfinder / Canvas Area */}
      <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative min-h-[380px] sm:min-h-[460px] flex items-center justify-center">
        
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover max-h-[500px] ${isCameraActive && !capturedImage ? 'block' : 'hidden'}`}
        />

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="relative w-full h-full max-h-[500px] flex items-center justify-center bg-black">
            <img src={capturedImage} alt="Captured Crop Leaf" className="max-h-[500px] w-auto object-contain" />
            <div className="absolute top-4 left-4 bg-agri-950/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-agri-300 border border-agri-700">
              Leaf Photo Captured
            </div>
          </div>
        )}

        {/* Framing Guides Overlay (Shown when live camera is running) */}
        {isCameraActive && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-72 h-72 sm:w-80 sm:h-80 border-2 border-dashed border-emerald-400/80 rounded-3xl relative flex items-center justify-center">
              <div className="absolute top-2 text-[11px] font-bold text-emerald-300 bg-black/60 px-3 py-1 rounded-full">
                Center Leaf Lesions Here
              </div>
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Empty State / Camera Off State */}
        {!isCameraActive && !capturedImage && (
          <div className="text-center p-8 space-y-4 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-agri-400">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Camera Ready</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tap "Open Live Camera" to capture with device lens or choose a file from your photo gallery.
              </p>
            </div>
          </div>
        )}

        {/* Permission Denied Fallback Alert */}
        {permissionDenied && (
          <div className="absolute inset-x-6 top-6 bg-rose-950/90 border border-rose-700 text-rose-200 p-4 rounded-2xl text-xs space-y-2 text-center backdrop-blur-md">
            <p className="font-bold">Camera Access Restricted</p>
            <p className="text-slate-300">
              Browser permission was denied. Please allow camera access in your browser settings, or use the "Upload from Gallery" button below.
            </p>
          </div>
        )}

      </div>

      {/* Control Buttons Toolbar */}
      <div className="space-y-4">
        
        {/* Main Capture / Live Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!capturedImage ? (
            <>
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-6 py-3.5 bg-agri-600 hover:bg-agri-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                >
                  <Camera className="w-5 h-5" />
                  <span>Open Live Camera</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center gap-2 transition-all transform hover:scale-105"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCameraDirection}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-colors"
                    title="Switch Front/Rear Camera"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}

              {/* Upload from Gallery */}
              <label className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-agri-700" />
                <span>Upload from Gallery</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </>
          ) : (
            /* Action when Image is Captured */
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (isUploading || !capturedImage) return;
                  setIsUploading(true);
                  handleProceedToDiagnosis();
                }}
                disabled={isUploading}
                className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all font-black text-sm ${
                  isUploading
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed pointer-events-none opacity-80'
                    : 'bg-agri-700 hover:bg-agri-800 text-white transform hover:scale-105 active:scale-95'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Analyzing Leaf Pathogen...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Confirm &amp; Diagnose Disease</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  setCapturedBlob(null);
                  startCamera();
                }}
                disabled={isUploading}
                className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>
            </div>
          )}
        </div>



      </div>

    </div>
  );
};
