import React from 'react';
import { Sprout, PhoneCall, ShieldCheck, ExternalLink, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-xl bg-agri-600 flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-lg font-black tracking-tight">AgriCare</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md">
              A production-grade, full-stack AI crop health monitoring and advisory platform. Combining all-weather satellite remote sensing (optical NDVI + cloud-penetrating SAR radar) with close-up leaf disease diagnosis, weather-aware spray guidance, and recovery tracking.
            </p>
            <div className="flex items-center gap-2 text-agri-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-agri-400" />
              <span>Multi-Tenant &bull; Data Isolation &bull; Science-Backed Decision Support</span>
            </div>
          </div>

          {/* Quick Access */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Features</h4>
            <ul className="space-y-1.5">
              <li><Link to="/farms" className="hover:text-agri-400 transition-colors">Interactive Satellite Map</Link></li>
              <li><Link to="/satellite" className="hover:text-agri-400 transition-colors">All-Weather SAR Radar</Link></li>
              <li><Link to="/camera" className="hover:text-agri-400 transition-colors">Crop Camera Scanner</Link></li>
              <li><Link to="/diagnosis" className="hover:text-agri-400 transition-colors">Smart Spray Window</Link></li>
              <li><Link to="/recovery" className="hover:text-agri-400 transition-colors">Recovery Tracking Loop</Link></li>
            </ul>
          </div>

          {/* Kisan Support & Government Helplines */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Kisan Safety Net</h4>
            <p className="text-slate-400 leading-relaxed">
              If crop symptoms are uncertain or severe, contact national agricultural extension officers:
            </p>
            <a
              href="tel:18001801551"
              className="inline-flex items-center gap-2 px-3 py-2 bg-agri-950/80 hover:bg-agri-900 border border-agri-800 text-agri-300 rounded-xl font-bold transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Kisan Call Centre: 1800-180-1551</span>
            </a>
            <div className="text-[11px] text-slate-500 pt-1">
              Toll-free 6:00 AM – 10:00 PM across all 22 scheduled Indian languages.
            </div>
          </div>

        </div>

        {/* Scientific Guardrail Disclaimer */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p className="max-w-2xl leading-relaxed text-center md:text-left">
            <strong className="text-slate-400">Scientific Boundary Notice:</strong> Satellite remote sensing measures macro-scale canopy vegetative vigor (NDVI) and radar dielectric soil moisture (SAR); it does not identify microscopic fungal or viral leaf pathogens. Close-up photo diagnostics and local agronomist validation are required for conclusive chemical application.
          </p>
          <p className="shrink-0 text-slate-400">
            &copy; {new Date().getFullYear()} AgriCare Platform. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};
