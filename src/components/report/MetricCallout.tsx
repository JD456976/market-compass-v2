/**
 * Premium Metric Callout Cards — executive-grade visual indicators
 * for key report metrics (acceptance, risk levels).
 */

import { cn } from '@/lib/utils';
import { ExtendedLikelihoodBand, LikelihoodBand } from '@/types';
import { CheckCircle2, AlertTriangle, ShieldAlert, TrendingUp } from 'lucide-react';

type CalloutType = 'acceptance' | 'risk-losing' | 'risk-overpay';

interface MetricCalloutProps {
  type: CalloutType;
  band: ExtendedLikelihoodBand | LikelihoodBand;
  label: string;
  description?: string;
  className?: string;
}

const typeConfig: Record<CalloutType, { icon: typeof CheckCircle2; colorClass: string }> = {
  acceptance: {
    icon: CheckCircle2,
    colorClass: 'from-emerald-500/8 to-emerald-500/2 border-emerald-500/20',
  },
  'risk-losing': {
    icon: ShieldAlert,
    colorClass: 'from-rose-500/8 to-rose-500/2 border-rose-500/20',
  },
  'risk-overpay': {
    icon: TrendingUp,
    colorClass: 'from-amber-500/8 to-amber-500/2 border-amber-500/20',
  },
};

function getBandColor(band: string, isRisk: boolean) {
  if (isRisk) {
    if (band === 'Very High' || band === 'High') return 'bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/20';
    if (band === 'Moderate') return 'bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  }
  if (band === 'Very High' || band === 'High') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (band === 'Moderate') return 'bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/20';
  return 'bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/20';
}

export function MetricCallout({ type, band, label, description, className }: MetricCalloutProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const isRisk = type !== 'acceptance';
  const bandColor = getBandColor(band, isRisk);

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-gradient-to-br p-5 transition-all duration-300',
        config.colorClass,
        'pdf-section pdf-avoid-break',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-2.5 rounded-lg shrink-0', isRisk ? 'bg-rose-500/10' : 'bg-emerald-500/10')}>
          <Icon className={cn('h-5 w-5', isRisk ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1.5">{label}</p>
          <div className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', bandColor)}>
            {band}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Grid layout for multiple metric callouts
 */
export function MetricCalloutGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {children}
    </div>
  );
}
