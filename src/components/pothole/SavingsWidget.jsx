import React from 'react';
import { Shield } from 'lucide-react';

const SEVERITY_COSTS = {
  minor: 50,
  moderate: 150,
  severe: 350,
  dangerous: 600,
};

export default function SavingsWidget({ totalSavings, avoidanceCount }) {
  return (
    <div className="absolute bottom-4 left-4 z-[1001] group" title="Estimated repair costs avoided by steering clear of potholes">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-green-600 text-white shadow-lg border border-green-500 pointer-events-auto">
        <Shield className="w-3.5 h-3.5" />
        <span className="font-mono font-bold">${totalSavings.toLocaleString()}</span>
        <span className="opacity-75">saved</span>
      </div>
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-0 mb-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] leading-tight shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[1001]">
        Estimated repair costs avoided by<br />dodging {avoidanceCount} pothole{avoidanceCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export { SEVERITY_COSTS };