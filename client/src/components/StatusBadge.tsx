import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Clock, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical' | 'follow_up_due' | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  switch (status.toLowerCase()) {
    case 'healthy':
    case 'resolved':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses[size]}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Healthy / Normal
        </span>
      );
    case 'normal_ripening':
    case 'harvest_ready':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-900 border border-amber-300 shadow-sm ${sizeClasses[size]}`}>
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Normal Ripening (Harvest-Ready)
        </span>
      );
    case 'warning':
    case 'moderate':
    case 'moderate_stress':
    case 'monitor':
      return (
        <span className={`inline-flex items-center rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs ${sizeClasses[size]}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Moderate Stress / Monitor
        </span>
      );
    case 'critical':
    case 'severe':
    case 'critical_hotspot':
      return (
        <span className={`inline-flex items-center rounded-full font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-xs ${sizeClasses[size]}`}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Critical Alert / Hotspot Active
        </span>
      );
    case 'follow_up_due':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses[size]}`}>
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Follow-up Due
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-800 border border-slate-200 ${sizeClasses[size]}`}>
          {status}
        </span>
      );
  }
};
