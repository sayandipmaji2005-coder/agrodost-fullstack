import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DiseaseResult, Farm } from '@shared/index';
import { StatusBadge } from '../components/StatusBadge';
import { Stethoscope, Calendar, ArrowRight, FileText, Search, Loader2 } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<DiseaseResult[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const [diagRes, farmsRes] = await Promise.all([
          api.getAllDiagnoses(),
          api.getFarms(),
        ]);
        setDiagnoses(diagRes.results || []);
        setFarms(farmsRes.farms || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filtered = diagnoses.filter(d => 
    d.cropName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    d.probableDisease.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Complete Diagnostic History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Chronological archive of all foliar disease confirmations and generated prescriptions.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search crop or disease..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-agri-600 shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-agri-600" />
          <span className="text-xs font-medium">Loading historical records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Stethoscope className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900">No Diagnostic Scans Found</h3>
          <p className="text-xs text-slate-500">Conduct a camera scan to diagnose your crop and record history.</p>
          <Link
            to="/camera"
            className="inline-flex px-5 py-2.5 bg-agri-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Launch Camera Scanner
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((diag) => {
            const farm = farms.find(f => f.id === diag.farmId);

            return (
              <div
                key={diag.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-agri-800">
                      {diag.cropName}
                    </span>
                    <StatusBadge status={diag.severityLevel} size="sm" />
                  </div>

                  <div className="h-40 rounded-2xl bg-slate-900 overflow-hidden border border-slate-100">
                    <img
                      src={diag.imageUrl}
                      alt={diag.probableDisease}
                      onError={(e) => { e.currentTarget.src = '/images/crop-placeholder.svg'; }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-slate-950 leading-snug">
                      {diag.probableDisease}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(diag.scannedAt).toLocaleDateString()}</span>
                      {farm && <span>&bull; {farm.name}</span>}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">{diag.confidenceScore}% Confidence</span>
                  <Link
                    to={`/diagnosis/${diag.id}`}
                    className="font-bold text-agri-700 hover:text-agri-800 flex items-center gap-1"
                  >
                    <span>View Advisory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
