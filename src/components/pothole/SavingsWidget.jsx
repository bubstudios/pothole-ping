import React from 'react';
import { Shield, TrendingUp } from 'lucide-react';

const SEVERITY_COSTS = {
  minor: 50,
  moderate: 150,
  severe: 350,
  dangerous: 600,
};

export default function SavingsWidget({ totalSavings, avoidanceCount }) {
  if (!avoidanceCount || avoidanceCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-50 border-green-300 text-green-700 transition-colors">
      <Shield className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Damage Avoided:</span>
      <span className="font-mono font-bold">${totalSavings.toLocaleString()}</span>
      <span className="hidden sm:inline text-green-500">
        · {avoidanceCount} pothole{avoidanceCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

export { SEVERITY_COSTS };