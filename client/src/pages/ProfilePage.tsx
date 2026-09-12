import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Languages, Shield, LogOut, CheckCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout, language, setLanguage } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Farmer Profile &amp; Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your account preferences, preferred language for audio guidance, and farm location.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* User Card */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-agri-100 text-agri-800 flex items-center justify-center font-black text-2xl border border-agri-200">
            {user?.fullName ? user.fullName[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-950">{user?.fullName || 'Registered Farmer'}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified Farmer
              </span>
            </div>
            <p className="text-xs text-slate-500">{user?.email || 'No email registered'}</p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 block font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              State &amp; District
            </span>
            <span className="text-sm font-bold text-slate-900 block">
              {user?.district ? `${user.district}, ${user.state || ''}` : (user?.state || 'Not specified')}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-slate-400 block font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              Registered Phone
            </span>
            <span className="text-sm font-bold text-slate-900 block">
              {user?.phone || 'Not provided'}
            </span>
          </div>
        </div>

        {/* Language Preferences */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-agri-700" />
            Audio Readout &amp; Language Preference
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                language === 'en'
                  ? 'bg-agri-700 text-white border-agri-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              English (Indian Standard)
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                language === 'hi'
                  ? 'bg-agri-700 text-white border-agri-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>

        {/* Multi-Tenant Security Note */}
        <div className="p-4 bg-agri-50/70 border border-agri-200 rounded-2xl flex items-start gap-3 text-xs text-agri-950">
          <Shield className="w-4 h-4 text-agri-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your mapped agricultural polygons and foliar images are protected by PostgreSQL Row Level Security (RLS). No other registered user can view or modify your data.
          </p>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={logout}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

    </div>
  );
};
