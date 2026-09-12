import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  Satellite, 
  Camera, 
  CloudRain, 
  FileText, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-agri-950 via-agri-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#52b788_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-agri-800/80 border border-agri-700/80 text-agri-300 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>Next-Generation Agronomic Health Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Protect Every Acre with <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-agri-300 via-emerald-300 to-amber-300">
              All-Weather Space &amp; Ground AI
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Map your agricultural land, monitor vegetative vigor through dense monsoon clouds with radar remote sensing, confirm leaf pathogens in seconds, and receive weather-aware spray guidance with a 1-click Kisan Parchi.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-3.5 bg-agri-500 hover:bg-agri-400 text-agri-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-agri-950/40 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>{user ? "Go to Your Dashboard" : "Get Started - Register Field"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-2xl border border-white/20 backdrop-blur-md flex items-center justify-center gap-2 transition-all"
            >
              <span>Sign In to Existing Account</span>
            </Link>
          </div>

          {/* Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t border-white/10 text-left">
            <div className="space-y-1">
              <span className="text-2xl font-extrabold text-agri-300">100%</span>
              <p className="text-xs text-slate-400 font-medium">All-Weather Monitoring (Monsoon SAR Radar)</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-extrabold text-agri-300">&lt; 10s</span>
              <p className="text-xs text-slate-400 font-medium">Rapid Foliar Disease Confirmation</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-extrabold text-agri-300">12-Hour</span>
              <p className="text-xs text-slate-400 font-medium">Rainfast Smart Spray Window</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-extrabold text-agri-300">1-Click</span>
              <p className="text-xs text-slate-400 font-medium">Printable &amp; WhatsApp Kisan Parchi</p>
            </div>
          </div>

        </div>
      </section>

      {/* Dual-Path Architecture Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
            Dual-Path Agronomic Diagnostics
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Satellites provide field-scale macro surveillance; cameras provide leaf-level micro validation. Together, they eliminate blind spots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Path 1: Satellite Monitoring */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Satellite className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Macro Layer</span>
              <h3 className="text-xl font-bold text-slate-900">
                All-Weather Satellite Monitoring (Optical + SAR Radar)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sentinel-2 optical sensors measure NDVI vegetative vigor when skies are clear. When monsoon cloud cover exceeds 35%, AgriCare automatically activates Sentinel-1 C-band synthetic aperture microwave radar to detect soil moisture saturation and canopy structural collapse right through clouds.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>NDVI vegetative health zone mapping (Healthy / Moderate / Severe)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Monsoon C-band radar soil moisture &amp; waterlogging risk detection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Automatic stress sector GPS coordinates for ground inspection</span>
              </li>
            </ul>

            <Link
              to="/satellite"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 pt-2"
            >
              <span>Explore Satellite Radar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Path 2: Close-up Leaf Confirmation */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-agri-50 border border-agri-200 flex items-center justify-center text-agri-700">
              <Camera className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-agri-600">Micro Layer</span>
              <h3 className="text-xl font-bold text-slate-900">
                Close-up Camera Diagnostics &amp; Treatment
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When satellite scans detect canopy stress, capture a photo of the affected plant leaf. AgriCare analyzes specific necrotic lesion shapes, halos, and mold down to identify pathogens, assess severity, and provide verified chemical active ingredient formulas.
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-agri-600 shrink-0" />
                <span>Identifies blight, blast, rust, and viral leaf curls</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-agri-600 shrink-0" />
                <span>Prescribes generic active chemical ingredients (e.g. Mancozeb 75% WP)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-agri-600 shrink-0" />
                <span>Low-confidence fallback (&lt;60%) with Kisan Call Centre safety net</span>
              </li>
            </ul>

            <Link
              to="/camera"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-agri-700 hover:text-agri-800 pt-2"
            >
              <span>Scan Plant Leaves</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* Scientific Limitation Guardrail Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-800 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-base">
                Responsible Agricultural Science Guardrail
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                Satellite data identifies macro canopy stress zones and drainage stagnation, but cannot detect microscopic fungal spores. When stress is flagged, farmers must perform a close-up camera scan before spraying chemicals. AgriCare adheres strictly to verified agronomist standards.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <a
              href="tel:18001801551"
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Kisan 1800-180-1551</span>
            </a>
          </div>
        </div>
      </section>

      {/* Recovery Loop & Kisan Parchi Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-agri-900 to-agri-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-6">
              <span className="text-xs font-extrabold uppercase tracking-wider text-agri-400">
                End-To-End Recovery Assurance
              </span>
              <h2 className="text-3xl font-extrabold leading-tight">
                From First Diagnosis to Documented Field Recovery
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Treatment doesn't stop at spraying. AgriCare schedules automatic 7-day and 14-day re-scans, compares before and after photos side by side, and generates an official 1-click printable "Kisan Parchi" (Prescription Card) ready to take to local fertilizer shops or share via WhatsApp.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to={user ? "/recovery" : "/signup"}
                  className="px-6 py-3 bg-white text-agri-950 font-bold text-xs rounded-xl shadow-md hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-agri-700" />
                  <span>View Recovery Tracker</span>
                </Link>
                <Link
                  to={user ? "/farms/add" : "/signup"}
                  className="px-6 py-3 bg-agri-800 text-agri-200 hover:bg-agri-700 font-bold text-xs rounded-xl border border-agri-600 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-agri-300" />
                  <span>Register Your Farm</span>
                </Link>
              </div>
            </div>

            {/* Visual Feature Preview Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm text-white">Agronomic Protocol Example</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  Verified Treatment Cycle
                </span>
              </div>
              <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
                <p>
                  <strong>Step 1:</strong> Satellite flags localized NDVI stress anomalies across your mapped boundary.
                </p>
                <p>
                  <strong>Step 2:</strong> Camera scanner analyzes foliar lesions with active ingredient chemical recommendations.
                </p>
                <p>
                  <strong>Step 3:</strong> Open-Meteo evaluates the 12-hour spray safety window before chemical application.
                </p>
                <p>
                  <strong>Step 4:</strong> Re-scan at Day 7 tracks lesion dry-out and canopy healing.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
