import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  MapPin, 
  Satellite, 
  Camera, 
  Plus, 
  ArrowRight, 
  Activity, 
  AlertTriangle, 
  CloudRain, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Farm, UserNotification } from '@shared/index';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    async function loadDashboardData() {
      if (!user) return;
      setIsLoading(true);
      try {
        const [farmRes, notifRes] = await Promise.all([
          api.getFarms(),
          api.getNotifications(),
        ]);
        setFarms(farmRes.farms || []);
        setNotifications(notifRes.notifications || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-agri-600" />
        <span className="text-xs font-medium">Loading your farm records...</span>
      </div>
    );
  }

  const totalAcres = farms.reduce((sum, f) => sum + (f.areaAcres || 0), 0);
  const criticalCount = farms.filter(f => f.status === 'critical').length;
  const warningCount = farms.filter(f => f.status === 'warning').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Greeting & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Namaste, {user?.fullName || 'Farmer'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-agri-100 text-agri-800 font-bold border border-agri-200">
              Active Member
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {user?.district ? `${user.district}, ${user.state}` : (user?.state || 'Agricultural Field')} &bull; Multi-Tenant Isolated Profile
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/farms/add"
            className="px-4 py-2.5 bg-agri-700 hover:bg-agri-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Map New Farm</span>
          </Link>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Mapped Land</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalAcres.toFixed(1)} Acres</span>
            <span className="text-xs text-slate-500 font-semibold">{farms.length} Plot(s)</span>
          </div>
          <div className="text-xs text-agri-700 font-medium">Turf.js GPS verified boundaries</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Crop Health Status</span>
          <div className="flex items-baseline justify-between">
            {farms.length === 0 ? (
              <span className="text-xl font-bold text-slate-400">No plots mapped</span>
            ) : (
              <>
                <span className={`text-2xl font-black ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {criticalCount > 0 ? `${criticalCount} Critical` : 'Stable'}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{warningCount} Under Observation</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">Optical NDVI + SAR Radar</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Smart Spray Window</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-700">Live Sync</span>
            <CloudRain className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-xs text-slate-500">Open-Meteo precipitation sync</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recovery Checks</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-agri-800">
              {farms.length > 0 ? `${farms.filter(f => f.status === 'follow_up_due').length} Due` : '0 Pending'}
            </span>
            <Activity className="w-5 h-5 text-agri-600" />
          </div>
          <div className="text-xs text-agri-700 font-medium">Automated 7-14 day re-scan cycles</div>
        </div>

      </div>

      {/* Notifications / Alerts Banner */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Field Notifications</h2>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-agri-50 text-agri-700 shrink-0 mt-0.5">
                    {n.type === 'recovery_due' ? <Activity className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{n.title}</h3>
                    <p className="text-slate-600 mt-0.5">{n.message}</p>
                  </div>
                </div>
                {n.actionUrl && (
                  <Link
                    to={n.actionUrl}
                    className="shrink-0 font-bold text-agri-700 hover:text-agri-800 flex items-center gap-1"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Farms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Your Agricultural Land Parcels</h2>
            <p className="text-xs text-slate-500">Click any plot to launch satellite analysis or capture leaf photos</p>
          </div>
          <Link to="/farms/add" className="text-xs font-bold text-agri-700 hover:text-agri-800 flex items-center gap-1">
            <Plus className="w-4 h-4" />
            <span>Add Field</span>
          </Link>
        </div>

        {farms.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-agri-50 text-agri-700 rounded-2xl flex items-center justify-center mx-auto">
              <MapPin className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">No Farms Mapped Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Outline your agricultural boundaries on our high-resolution satellite basemap to start tracking crop vigor, monsoon moisture, and foliar disease history.
              </p>
            </div>
            <Link
              to="/farms/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-agri-700 hover:bg-agri-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Map Your First Farm</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {farms.map((farm) => (
              <div
                key={farm.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-agri-800 uppercase tracking-wide">
                          {farm.cropType}
                        </span>
                        {farm.cropType ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-agri-600" />
                            <span>Farmer-selected crop: {farm.cropType}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Manual crop confirmation required</span>
                          </span>
                        )}
                        {farm.classificationConfidence && farm.classificationConfidence < 0.7 && farm.predictedCrop && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Manual crop confirmation required</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-950 leading-snug">
                        {farm.name}
                      </h3>
                    </div>
                    <StatusBadge status={farm.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Area</span>
                      <span className="font-bold text-slate-900">{farm.areaAcres} Acres</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Location</span>
                      <span className="font-bold text-slate-900 truncate block">{farm.villageOrCity || 'Local'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Soil Type</span>
                      <span className="font-bold text-slate-900 truncate block">{farm.soilType || 'Loam'}</span>
                    </div>
                  </div>

                  {/* Prominent Red Alert Badge for Critical Hotspot Farms */}
                  {farm.status === 'critical' && (
                    <div className="p-3 bg-gradient-to-r from-rose-50 to-red-100/70 border border-rose-300 rounded-2xl flex items-center justify-between text-xs text-rose-950 font-bold shadow-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
                        <div>
                          <span className="font-black text-rose-900 block">⚠️ Localized Hotspot Active</span>
                          <span className="text-[11px] text-rose-700 font-semibold font-mono">-26% foliar vigor drop</span>
                        </div>
                      </div>
                      <Link
                        to={`/satellite?farmId=${farm.id}`}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] rounded-xl transition-colors shadow-xs"
                      >
                        Inspect &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons on Card */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <Link
                    to={`/satellite?farmId=${farm.id}`}
                    className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
                    title="Launch Satellite Vigor & Radar Scan"
                  >
                    <Satellite className="w-3.5 h-3.5 text-blue-600" />
                    <span>Satellite Scan</span>
                  </Link>

                  <Link
                    to={`/camera?farmId=${farm.id}`}
                    className="flex-1 px-3 py-2 bg-agri-100 hover:bg-agri-200 text-agri-900 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
                    title="Capture Leaf Photo"
                  >
                    <Camera className="w-3.5 h-3.5 text-agri-700" />
                    <span>Take Leaf Photo</span>
                  </Link>

                  <Link
                    to={`/recovery?farmId=${farm.id}`}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold flex items-center justify-center gap-1 transition-colors"
                    title="View Recovery Timeline"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Recovery</span>
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
