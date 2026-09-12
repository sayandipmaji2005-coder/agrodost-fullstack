import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Farm, SatelliteScan } from '@shared/index';
import { SatelliteMap } from '../components/SatelliteMap';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Satellite, Camera, Calendar, MapPin, Layers, Loader2 } from 'lucide-react';

export const FarmDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [scans, setScans] = useState<SatelliteScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFarm() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [farmRes, scansRes] = await Promise.all([
          api.getFarm(id),
          api.getSatelliteScans(id),
        ]);
        setFarm(farmRes.farm);
        setScans(scansRes.scans || []);
      } catch (err) {
        console.error('Failed to load farm details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFarm();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-agri-600" />
        <span>Loading farm details...</span>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Farm Not Found</h2>
        <Link to="/dashboard" className="text-agri-700 font-bold text-sm">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/satellite?farmId=${farm.id}`}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Satellite className="w-4 h-4" />
            <span>Launch Satellite Scan</span>
          </Link>
          <Link
            to={`/camera?farmId=${farm.id}`}
            className="px-4 py-2 bg-agri-700 hover:bg-agri-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Capture Leaf Photo</span>
          </Link>
        </div>
      </div>

      {/* Main Overview Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-agri-800 uppercase tracking-wider">
              {farm.cropType}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950">{farm.name}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{farm.villageOrCity ? `${farm.villageOrCity}${farm.state ? `, ${farm.state}` : ''}` : (farm.state || 'Location not specified')}</span>
            </p>
          </div>
          <StatusBadge status={farm.status} size="lg" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium">Mapped Acreage</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {farm.areaAcres} Acres ({farm.areaHectares} Ha)
            </span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium">Sowing Timestamp</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{farm.sowingDate || 'N/A'}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium">Soil Class</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{farm.soilType || 'Loam'}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium">GPS Centroid</span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {farm.centerCoordinates?.lat}, {farm.centerCoordinates?.lng}
            </span>
          </div>
        </div>

        {/* Satellite Map with Boundary Rendered */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Mapped Field Boundary</h2>
          <SatelliteMap
            initialBoundary={farm.boundary}
            height="400px"
            readOnly={true}
          />
        </div>
      </div>

      {/* Historical Scans for This Farm */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Satellite Scan Records</h2>
        {scans.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
            No satellite scans performed yet for this farm parcel. Click "Launch Satellite Scan" above to run an optical or radar evaluation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scans.map((scan) => (
              <div key={scan.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    scan.mode === 'sar_radar' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {scan.mode === 'sar_radar' ? 'Sentinel-1 SAR Radar' : 'Sentinel-2 Optical NDVI'}
                  </span>
                  <span className="text-slate-400">
                    {new Date(scan.scanDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-900">
                    Cloud Cover: {scan.cloudCoverPercentage}% &bull; Status: {scan.overallStatus.toUpperCase()}
                  </p>
                  {scan.opticalMetrics && (
                    <p className="text-slate-600">Mean NDVI: {scan.opticalMetrics.meanNdvi}</p>
                  )}
                  {scan.sarMetrics && (
                    <p className="text-slate-600">Soil Moisture: {scan.sarMetrics.soilMoistureIndex}% (Waterlogging: {scan.sarMetrics.waterloggingRisk})</p>
                  )}
                </div>

                {scan.promptCameraInspection && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-amber-800 font-semibold">Stress Zone Flagged</span>
                    <Link
                      to={`/camera?farmId=${farm.id}`}
                      className="font-bold text-agri-700 hover:text-agri-800 flex items-center gap-1"
                    >
                      <span>Take Photo</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
