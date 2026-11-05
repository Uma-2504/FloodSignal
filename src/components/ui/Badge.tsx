import type { Severity, IncidentStatus } from '../../types';

export type BadgeVariant = Severity | IncidentStatus | 'reported' | 'verified';

interface BadgeProps {
  variant: BadgeVariant | string;
  label?: string;
}

const variantStyles: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  acknowledged: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  responding: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  reported: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  verified: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

export default function Badge({ variant, label }: BadgeProps) {
  const style = variantStyles[variant] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${style}`}>
      {label || variant}
    </span>
  );
}
