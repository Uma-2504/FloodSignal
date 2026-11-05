import type { ReactNode } from 'react';
import GlassCard from './GlassCard';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

export default function StatCard({ icon, label, value, trend, accentColor = 'text-cyan-400' }: StatCardProps) {
  return (
    <GlassCard hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/5 ${accentColor}`}>
          {icon}
        </div>
      </div>
    </GlassCard>
  );
}
