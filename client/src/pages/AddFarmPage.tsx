import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SatelliteMap, LocationInfo } from '../components/SatelliteMap';
import { api } from '../api';
import { 
  GeoPolygon, 
  LandCoverInferenceResult, 
  LandCoverClass 
} from '@shared/index';
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  Leaf, 
  Layers, 
  Database, 
  Search, 
  Trees, 
  Droplets, 
  Building, 
  HelpCircle,
  MapPin,
  CheckCircle2
} from 'lucide-react';

const LAND_COVER_CONFIG: Record<LandCoverClass, { label: string; color: string; icon: any }> = {
  crop: { label: 'Crop Vegetation', color: '#22c55e', icon: Leaf },
  tree: { label: 'Tree Canopy', color: '#15803d', icon: Trees },
  bare_soil: { label: 'Bare Soil / Fallow', color: '#92400e', icon: Layers },
  water: { label: 'Water Body', color: '#0284c7', icon: Droplets },
  built_up: { label: 'Built-up / Structure', color: '#64748b', icon: Building },
  unknown: { label: 'Unclassified', color: '#eab308', icon: HelpCircle },
};

// Top National Quick Chips (Pan-India)
const NATIONAL_QUICK_CHIPS = [
  { label: '🌾 Paddy / Rice', val: 'Paddy / Rice (Dhaan)' },
  { label: '🌾 Wheat / Gehun', val: 'Wheat (Gehun)' },
  { label: '🥔 Potato / Aloo', val: 'Potato (Aloo)' },
  { label: '🌿 Cotton / Narma', val: 'Cotton (Kapas/Narma)' },
  { label: '🌱 Soybean', val: 'Soybean' },
  { label: '🌽 Maize / Makka', val: 'Maize (Makka)' },
  { label: '🌼 Mustard / Sarson', val: 'Mustard (Sarson)' },
  { label: '🎋 Sugarcane / Ganna', val: 'Sugarcane (Ganna)' },
  { label: '🌱 Groundnut / Mungfali', val: 'Groundnut (Mungfali)' },
  { label: '🌱 Pulses / Dal', val: 'Pulses / Dal (Gram/Lentil)' },
  { label: '🥦 Vegetables / Sabzi', val: 'Vegetables / Sabzi' },
  { label: '🌱 Jute / Pat', val: 'Jute (Pat/Mesta)' },
];

// Comprehensive Pan-India Searchable Taxonomy
const PAN_INDIA_CROPS = [
  'Paddy / Rice (Dhaan)',
  'Wheat (Gehun)',
  'Potato (Aloo)',
  'Cotton (Kapas/Narma)',
  'Soybean',
  'Maize (Makka)',
  'Mustard (Sarson)',
  'Sugarcane (Ganna)',
  'Groundnut (Mungfali)',
  'Pulses / Dal (Gram/Lentil)',
  'Vegetables / Sabzi',
  'Jute (Pat/Mesta)',
  'Onion (Pyaz)',
  'Garlic (Lahsun)',
  'Turmeric (Haldi)',
  'Chilli (Mirch)',
  'Ginger (Adrak)',
  'Tomato (Tamatar)',
  'Brinjal / Eggplant (Baingan)',
  'Okra / Lady Finger (Bhindi)',
  'Cabbage (Patta Gobhi)',
  'Cauliflower (Phool Gobhi)',
  'Tea (Chai)',
  'Coffee',
  'Apple (Seb)',
  'Banana (Kela)',
  'Mango (Aam)',
  'Guava (Amrood)',
  'Pomegranate (Anaar)',
  'Papaya (Papita)',
  'Citrus / Orange (Santra)',
  'Grapes (Angoor)',
  'Watermelon (Tarbooj)',
  'Tobacco (Tambaku)',
  'Bajra / Pearl Millet',
  'Jowar / Sorghum',
  'Ragi / Finger Millet',
  'Barley (Jau)',
  'Coriander (Dhania)',
  'Cumin (Jeera)',
  'Fenugreek (Methi)',
  'Cardamom (Elaichi)',
  'Black Pepper (Kali Mirch)',
  'Rubber',
  'Coconut (Nariyal)',
  'Arecanut (Supari)',
  'Cashew (Kaju)',
  'Sunflower (Surajmukhi)',
  'Sesame (Til)',
  'Tree Canopy / Orchard (Bagicha)',
  'Bare Soil / Fallow Land (Khali Khet)'
];

export const AddFarmPage: React.FC = () => {
  const navigate = useNavigate();

  // Parcel & Location State
  const [formData, setFormData] = useState({
    name: '',
    sowingDate: new Date().toISOString().split('T')[0],
    villageOrCity: '',
    state: '',
    pincode: '',
  });

  // Boundary & Geometry
  const [boundary, setBoundary] = useState<GeoPolygon | null>(null);
  const [areaAcres, setAreaAcres] = useState<number>(0);
  const [areaHectares, setAreaHectares] = useState<number>(0);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 22.8962, lng: 88.2461 });

  // Autonomous Land-Cover & Mapped Soil State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [landCoverResult, setLandCoverResult] = useState<LandCoverInferenceResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<string | null>(null);

  // Unified State Management
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [cropType, setCropType] = useState<string>(''); // Synchronized alias for strict selection policy
  const [landCoverState, setLandCoverState] = useState<'idle' | 'active_vegetation' | 'bare_soil'>('idle');
  const [canopyState, setCanopyState] = useState<'active_vegetation' | 'bare_soil' | null>(null);
  const [cropSearchQuery, setCropSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Synchronized crop selection helper
  const handleSelectCrop = (crop: string) => {
    setSelectedCrop(crop);
    setCropType(crop);
    setCropSearchQuery(crop);
    setIsDropdownOpen(false);
  };

  // Filtered Pan-India crops for autocomplete combobox
  const filteredCrops = useMemo(() => {
    if (!cropSearchQuery.trim()) return PAN_INDIA_CROPS.slice(0, 15);
    return PAN_INDIA_CROPS.filter(c =>
      c.toLowerCase().includes(cropSearchQuery.toLowerCase())
    );
  }, [cropSearchQuery]);

  // Handle polygon completion + Automatic Reverse Geocoding via Nominatim
  const handleBoundaryChange = async (
    newBoundary: GeoPolygon,
    acres: number,
    hectares: number,
    center: { lat: number; lng: number }
  ) => {
    setBoundary(newBoundary);
    setAreaAcres(acres);
    setAreaHectares(hectares);
    setCenterCoords(center);

    setLandCoverResult(null);
    setLandCoverState('active_vegetation');
    setCanopyState('active_vegetation');
    setError(null);
    setSelectedCrop('');
    setCropType('');
    setCropSearchQuery('');
    setGeocodingStatus('Detecting location...');

    // Automatic Reverse Geocoding via OpenStreetMap Nominatim REST API
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`,
        { headers: { 'User-Agent': 'AgriCare-Precision-App/2.0' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        const villageOrCity =
          addr.village || addr.town || addr.city || addr.suburb || addr.hamlet || addr.county || '';
        const state = addr.state || '';
        const district = addr.state_district || addr.county || '';
        const pincode = addr.postcode || '';

        const locationDisplay = villageOrCity
          ? (district && district !== villageOrCity ? `${villageOrCity}, ${district}` : villageOrCity)
          : (district || '');

        setFormData(prev => ({
          ...prev,
          villageOrCity: locationDisplay || prev.villageOrCity,
          state: state || prev.state,
          pincode: pincode || prev.pincode,
        }));
        setGeocodingStatus(locationDisplay ? `Detected: ${locationDisplay}, ${state}` : null);
      } else {
        setGeocodingStatus(null);
      }
    } catch (geoErr) {
      console.warn('Reverse geocoding notice:', geoErr);
      setGeocodingStatus(null);
    }

    // Auto-trigger multi-temporal crop classification: POST /api/satellite/classify-crop-timeseries
    setIsAnalyzing(true);
    try {
      const timeSeriesRes = await api.classifyCropTimeseries({
        polygonGeoJSON: newBoundary,
        boundary: newBoundary,
        centroid: [center.lat, center.lng],
        areaAcres: acres,
      });

      const ndvi = timeSeriesRes?.latestNdvi ?? 0.68;
      if (ndvi >= 0.30) {
        setCanopyState('active_vegetation');
        // cropType strictly initializes empty "" - zero guessing
      } else {
        setCanopyState('bare_soil');
        setCropType('Bare Soil / Fallow Land');
        setCropSearchQuery('Bare Soil / Fallow Land');
      }

      // Soil & multi-spectral segmentation
      api.getSoilData(center.lat, center.lng).then(soil => {
        setLandCoverResult((prev: any) => ({ ...prev, soilData: soil }));
      }).catch(() => {});

      api.inferLandCover({
        polygonGeoJSON: newBoundary,
        boundary: newBoundary,
        centroid: [center.lat, center.lng],
        centerCoordinates: center,
        areaAcres: acres,
      }).then(res => {
        setLandCoverResult(res);
      }).catch(() => {});

    } catch (classErr) {
      console.warn('Auto classification error:', classErr);
      setCanopyState('active_vegetation');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLocationSelect = (loc: LocationInfo) => {
    setCenterCoords({ lat: loc.lat, lng: loc.lng });
    setFormData((prev) => ({
      ...prev,
      villageOrCity: loc.villageOrCity || prev.villageOrCity,
      pincode: loc.pincode || prev.pincode,
      state: loc.state || prev.state,
    }));
  };

  // Analyze Land Cover & Mapped Soil (Single Source of Truth)
  const handleAnalyzeSelectedArea = async () => {
    if (isAnalyzing) return;
    if (!boundary || areaAcres <= 0) {
      setError('Please draw your parcel boundary on the satellite map first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. Inspect sampled polygon physical pixels
      const pixelRes = await api.inspectFieldPixels({
        polygonGeoJSON: boundary,
        boundary,
        centroid: [centerCoords.lat, centerCoords.lng],
        areaAcres,
      });

      // Unified Single Source of Truth
      if (pixelRes.canopyState === 'active_vegetation' || pixelRes.vegetationCategory === 'green_canopy') {
        setCanopyState('active_vegetation');
        // Do NOT auto-fill cropType. Keep quick-chips active and require farmer selection.
      } else if (pixelRes.canopyState === 'bare_soil' || pixelRes.vegetationCategory === 'bare_soil') {
        setCanopyState('bare_soil');
        setCropType('Bare Soil / Fallow Land');
        setCropSearchQuery('Bare Soil / Fallow Land');
      } else {
        setCanopyState('active_vegetation');
      }

      // 2. Query ISRIC SoilGrids REST
      let soilData: any = null;
      try {
        soilData = await api.getSoilData(centerCoords.lat, centerCoords.lng);
      } catch (soilErr) {
        console.warn('SoilGrids fetch notice:', soilErr);
      }

      // 3. Multi-spectral parcel segmentation
      const result = await api.inferLandCover({
        polygonGeoJSON: boundary,
        boundary,
        centroid: [centerCoords.lat, centerCoords.lng],
        centerCoordinates: centerCoords,
        areaAcres,
      });

      if (soilData) {
        result.soilData = soilData;
      }

      setLandCoverResult(result);
    } catch (err: any) {
      console.error('Autonomous Land-Cover Analysis error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to analyze selected parcel area');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save Farm Parcel: Strict Selection Policy Enforced
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Please provide a name for this farm parcel.');
      return;
    }

    if (!boundary || !boundary.coordinates || boundary.coordinates.length === 0 || areaAcres <= 0) {
      setError('Please draw a parcel boundary polygon on the satellite map.');
      return;
    }

    // Strict Selection Policy: Block submission if cropType / selectedCrop is empty
    if (!selectedCrop.trim() || !cropType || !cropType.trim()) {
      const msg = 'Please select or search your standing crop before saving the parcel.';
      setError(msg);
      alert(msg);
      return;
    }

    setIsSaving(true);

    try {
      const finalSoil = landCoverResult?.soilData?.soilTexture || 'Alluvial Soil / Loam';

      const res = await api.createFarm({
        name: formData.name.trim(),
        cropType: (selectedCrop || cropType).trim(),
        sowingDate: formData.sowingDate,
        villageOrCity: formData.villageOrCity,
        state: formData.state,
        pincode: formData.pincode,
        soilType: finalSoil,
        soilClassification: finalSoil,
        areaAcres,
        areaHectares,
        centerCoordinates: centerCoords,
        boundary,
        landCoverCategory: canopyState === 'bare_soil' ? 'bare_soil' : 'crop',
        landCoverBreakdown: landCoverResult?.classBreakdown,
        soilData: landCoverResult?.soilData,
      });

      if (res?.farm?.id) {
        navigate(`/satellite?farmId=${res.farm.id}`);
      } else {
        navigate('/satellite');
      }
    } catch (err: any) {
      console.error('Save Farm error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save farm boundary');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pan-India Agricultural Architecture</span>
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Add Farm Parcel &amp; Land Boundary
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Draw your field boundary on the satellite basemap. AgriCare will reverse-geocode the location, perform land-cover inspection, and query ISRIC SoilGrids.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Farm Identity, Land-Cover & Crop Selector */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 text-xs">
          
          {/* Section 1: Parcel Identity */}
          <div className="border-b border-slate-100 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-slate-900">Parcel Identification</h2>
              <span className="text-[10px] text-slate-400 font-medium">Step 1 of 2</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Farm / Parcel Name</label>
              <input
                type="text"
                required
                placeholder="e.g. North Field, Tarakeswar Plot, Krishna River Farm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Village / City / District</label>
                <input
                  type="text"
                  placeholder="Auto-detected on draw"
                  value={formData.villageOrCity}
                  onChange={(e) => setFormData({ ...formData, villageOrCity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  placeholder="Auto-detected on draw"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-slate-900 font-medium"
                />
              </div>
            </div>

            {geocodingStatus && (
              <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 animate-in fade-in">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{geocodingStatus}</span>
              </p>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sowing / Assessment Date</label>
              <input
                type="date"
                value={formData.sowingDate}
                onChange={(e) => setFormData({ ...formData, sowingDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Section 2: Parcel Dimensions & Analysis Trigger */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                Parcel Dimensions
              </span>
              {areaAcres > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Valid Boundary
                </span>
              )}
            </div>

            <div className="text-lg font-black text-slate-900">
              {areaAcres > 0 ? `${areaAcres} Acres (${areaHectares} Ha)` : 'Draw boundary on map to calculate'}
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <span>Centroid:</span>
              <span className="text-slate-700">{centerCoords.lat.toFixed(4)}° N, {centerCoords.lng.toFixed(4)}° E</span>
            </p>

            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (isAnalyzing || areaAcres <= 0) return;
                  setIsAnalyzing(true);
                  handleAnalyzeSelectedArea();
                }}
                disabled={areaAcres <= 0 || isAnalyzing}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isAnalyzing
                    ? 'bg-slate-400 text-white cursor-not-allowed pointer-events-none opacity-80'
                    : areaAcres > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white cursor-pointer active:scale-98 shadow-emerald-900/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Land-Cover &amp; Soil...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Analyze Selected Area</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 3: Unified Single Source of Truth Card: LAND-COVER & CROP SELECTION */}
          <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-700" />
                <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                  Land-Cover & Crop Selection
                </h3>
              </div>
              {(selectedCrop || cropType) && (
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selected</span>
                </span>
              )}
            </div>

            {/* IF AND ONLY IF landCoverState === 'bare_soil' AND selectedCrop === '' */}
            {landCoverState === 'bare_soil' && selectedCrop === '' ? (
              <div className="p-3 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-black text-xs">
                  <span>[🟤 Bare Soil / Prepared Seedbed Detected ({areaAcres > 0 ? `${areaAcres} Acres` : 'Parcel'})]</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  Flat low NDVI &amp; high soil reflectance detected. Field is currently fallow or ploughed for seedbed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCrop('Bare Soil / Fallow Land');
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold border bg-amber-600 text-white border-amber-700 shadow-sm hover:bg-amber-700 transition"
                >
                  Confirm Bare Soil / Fallow Land
                </button>
              </div>
            ) : (
              /* IF selectedCrop !== '' OR landCoverState === 'active_vegetation' */
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>[🟢 Active Crop Canopy Detected ({areaAcres > 0 ? `${areaAcres} Acres` : 'Parcel'})]</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Please select or search your standing crop to calibrate stress analysis:
                  </p>
                </div>

                {/* Top National Quick Chips (12 Major Pan-India Staples) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Top National Quick Chips:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {NATIONAL_QUICK_CHIPS.map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => handleSelectCrop(chip.val)}
                        className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-all border text-center shadow-2xs ${
                          (selectedCrop === chip.val || cropType === chip.val)
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400 scale-102'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-emerald-50 hover:border-emerald-400'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pan-India Searchable Autocomplete Combobox allowing any Indian crop (Onion, Garlic, Chilli, etc.) */}
                <div className="space-y-1.5 relative">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Search All Indian Crops:
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Type any crop (e.g. Onion, Garlic, Chilli, Turmeric, Cotton)..."
                      value={cropSearchQuery}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setCropSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isDropdownOpen && filteredCrops.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                      {filteredCrops.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectCrop(c)}
                          className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                            (selectedCrop === c || cropType === c) ? 'bg-emerald-100/70 text-emerald-900 font-bold' : 'text-slate-800'
                          }`}
                        >
                          <span>{c}</span>
                          {(selectedCrop === c || cropType === c) && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Crop Indicator */}
                {(selectedCrop || cropType) ? (
                  <div className="p-2.5 bg-emerald-100/80 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-emerald-950 font-bold">Selected Standing Crop:</span>
                    <strong className="text-emerald-950 font-black">{selectedCrop || cropType}</strong>
                  </div>
                ) : (
                  <p className="text-[10px] text-rose-600 font-bold">
                    * Standing crop selection is required before saving to calibrate foliar stress models.
                  </p>
                )}
              </div>
            )}

            {/* Area Breakdown Bar (when segmentation result is present) */}
            {landCoverResult?.classBreakdown && (
              <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Spectral Segmentation</span>
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  {Object.entries(landCoverResult.classBreakdown)
                    .filter(([_, data]) => data.percentage > 0)
                    .map(([cls, data]) => (
                      <div
                        key={cls}
                        style={{
                          width: `${data.percentage}%`,
                          backgroundColor: data.color || '#22c55e',
                        }}
                        title={`${data.label}: ${data.percentage}%`}
                        className="h-full"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Mapped Soil Properties (ISRIC SoilGrids v2.0) */}
          {landCoverResult?.soilData && (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 text-slate-900 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mapped Soil Properties (ISRIC SoilGrids)</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                  250m Resolution
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100 text-[10px]">
                <div>
                  <span className="text-slate-500 block">Soil Texture:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {landCoverResult.soilData.soilTexture || 'Alluvial Soil'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Soil Reaction:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {landCoverResult.soilData.phH2o ? `pH ${landCoverResult.soilData.phH2o}` : 'pH 6.8'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Organic Carbon:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {landCoverResult.soilData.organicCarbonPercentage ? `${landCoverResult.soilData.organicCarbonPercentage}%` : '0.85%'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sand / Clay Ratio:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {landCoverResult.soilData.sandPercentage ?? 35}% / {landCoverResult.soilData.clayPercentage ?? 28}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving || areaAcres <= 0}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
              areaAcres > 0 && cropType
                ? 'bg-gradient-to-r from-emerald-600 via-agri-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white cursor-pointer active:scale-98 shadow-emerald-900/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Farm Parcel...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Parcel &amp; Open Satellite Monitor</span>
              </>
            )}
          </button>

        </div>

        {/* Right Column: Satellite Map with Drawing Engine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Interactive Satellite Parcel Boundary
                </h3>
                <p className="text-[11px] text-slate-500">
                  Click the polygon icon to draw boundary. Reverse geocoding will automatically locate your village and state.
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                Turf.js GPS Engine
              </span>
            </div>

            <SatelliteMap
              onBoundaryChange={handleBoundaryChange}
              onLocationSelect={handleLocationSelect}
            />
          </div>
        </div>

      </form>
    </div>
  );
};
export default AddFarmPage;
