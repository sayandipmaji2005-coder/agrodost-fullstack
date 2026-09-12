import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-agri-100 text-agri-800 flex items-center justify-center mx-auto shadow-inner">
          <Sprout className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-950">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Field Coordinates Not Found</h2>
          <p className="text-xs text-slate-500">
            The agricultural page or record you are looking for has been moved or does not exist.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-agri-700 hover:bg-agri-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
