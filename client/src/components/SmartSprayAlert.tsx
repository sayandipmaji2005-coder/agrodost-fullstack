import React from 'react';
import { CloudRain, Wind, AlertOctagon, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { SprayWindowAdvice } from '@shared/index';

interface SmartSprayAlertProps {
  advice?: SprayWindowAdvice | null;
  isLoading?: boolean;
}

export const SmartSprayAlert: React.FC<SmartSprayAlertProps> = ({ advice, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (!advice) return null;

  const statusConfig = {
    safe: {
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-300',
      textColor: 'text-emerald-900',
      badgeBg: 'bg-emerald-600',
      badgeText: 'OPTIMAL SPRAY WINDOW',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    caution: {
      bgColor: 'bg-amber-50/80',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-900',
      badgeBg: 'bg-amber-600',
      badgeText: 'SPRAY WITH CAUTION',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    unsafe: {
      bgColor: 'bg-rose-50/80',
      borderColor: 'border-rose-300',
      textColor: 'text-rose-900',
      badgeBg: 'bg-rose-600',
      badgeText: 'DO NOT SPRAY NOW (WEATHER RISK)',
      icon: AlertOctagon,
      iconColor: 'text-rose-600',
    },
  }[advice.status];

  const IconComponent = statusConfig.icon;

  return (
    <div className={`p-5 rounded-2xl border ${statusConfig.borderColor} ${statusConfig.bgColor} shadow-sm transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <IconComponent className={`w-6 h-6 ${statusConfig.iconColor} shrink-0`} />
          <h3 className="font-bold text-base text-slate-900">
            Smart Spray Window (Live Weather Advisory)
          </h3>
        </div>
        <span className={`self-start sm:self-auto text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full ${statusConfig.badgeBg}`}>
          {statusConfig.badgeText}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-800 mb-4 leading-relaxed">
        {advice.alertMessage}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-white/75 p-3.5 rounded-xl border border-black/5">
        <div>
          <span className="text-slate-500 block">Next 12h Rain</span>
          <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
            {advice.precipitationNext12HoursMm} mm
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Wind Velocity</span>
          <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
            <Wind className="w-3.5 h-3.5 text-teal-600" />
            {advice.windSpeedKmh} km/h
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Temperature &amp; RH</span>
          <span className="font-bold text-slate-900 block mt-0.5">
            {advice.currentTempCelsius}°C ({advice.currentHumidity}%)
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Best Spray Timing</span>
          <span className="font-bold text-agri-800 flex items-center gap-1 mt-0.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-agri-700 shrink-0" />
            {advice.bestNextSprayWindow}
          </span>
        </div>
      </div>
    </div>
  );
};
