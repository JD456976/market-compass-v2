/**
 * Offer Strategy Presets — one-tap preset buttons for Scenario Explorer.
 * Conservative / Balanced / Aggressive / Win-at-All-Costs
 */

import { Shield, Scale, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuyerInputs, FinancingType, DownPaymentPercent, Contingency, ClosingTimeline, BuyerPreference } from '@/types';

export type PresetKey = 'conservative' | 'balanced' | 'aggressive' | 'win';

interface Preset {
  key: PresetKey;
  label: string;
  icon: typeof Shield;
  description: string;
  className: string;
  apply: (current: BuyerInputs) => BuyerInputs;
}

export const OFFER_PRESETS: Preset[] = [
  {
    key: 'conservative',
    label: 'Conservative',
    icon: Shield,
    description: 'Maximum protections, measured pricing',
    className: 'border-emerald-500/30 hover:bg-emerald-500/10 data-[active=true]:bg-emerald-500/15 data-[active=true]:border-emerald-500/50',
    apply: (current) => ({
      ...current,
      contingencies: ['Inspection', 'Financing', 'Appraisal'] as Contingency[],
      closing_timeline: '31-45' as ClosingTimeline,
      buyer_preference: 'Price-protective' as BuyerPreference,
      down_payment_percent: '20+' as DownPaymentPercent,
    }),
  },
  {
    key: 'balanced',
    label: 'Balanced',
    icon: Scale,
    description: 'Standard terms, reasonable position',
    className: 'border-primary/30 hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:border-primary/50',
    apply: (current) => ({
      ...current,
      contingencies: ['Inspection', 'Financing'] as Contingency[],
      closing_timeline: '21-30' as ClosingTimeline,
      buyer_preference: 'Balanced' as BuyerPreference,
      down_payment_percent: '20+' as DownPaymentPercent,
    }),
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    icon: Flame,
    description: 'Fewer protections, stronger positioning',
    className: 'border-amber-500/30 hover:bg-amber-500/10 data-[active=true]:bg-amber-500/15 data-[active=true]:border-amber-500/50',
    apply: (current) => ({
      ...current,
      contingencies: ['Inspection'] as Contingency[],
      closing_timeline: '<21' as ClosingTimeline,
      buyer_preference: 'Must win' as BuyerPreference,
      down_payment_percent: '20+' as DownPaymentPercent,
    }),
  },
  {
    key: 'win',
    label: 'Win at All Costs',
    icon: Zap,
    description: 'Maximum competitiveness, minimal protections',
    className: 'border-destructive/30 hover:bg-destructive/10 data-[active=true]:bg-destructive/15 data-[active=true]:border-destructive/50',
    apply: (current) => ({
      ...current,
      contingencies: ['None'] as Contingency[],
      closing_timeline: '<21' as ClosingTimeline,
      buyer_preference: 'Must win' as BuyerPreference,
      financing_type: current.financing_type === 'Cash' ? 'Cash' as FinancingType : current.financing_type,
      down_payment_percent: '20+' as DownPaymentPercent,
    }),
  },
];

interface OfferStrategyPresetsProps {
  currentInputs: BuyerInputs;
  onApplyPreset: (inputs: BuyerInputs) => void;
  className?: string;
}

function detectActivePreset(inputs: BuyerInputs): PresetKey | null {
  for (const preset of OFFER_PRESETS) {
    const applied = preset.apply(inputs);
    const match =
      JSON.stringify(applied.contingencies.sort()) === JSON.stringify(inputs.contingencies.sort()) &&
      applied.closing_timeline === inputs.closing_timeline &&
      applied.buyer_preference === inputs.buyer_preference &&
      applied.down_payment_percent === inputs.down_payment_percent;
    if (match) return preset.key;
  }
  return null;
}

export function OfferStrategyPresets({ currentInputs, onApplyPreset, className }: OfferStrategyPresetsProps) {
  const activePreset = detectActivePreset(currentInputs);

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Presets</p>
      <div className="grid grid-cols-2 gap-2">
        {OFFER_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.key;
          return (
            <button
              key={preset.key}
              data-active={isActive}
              onClick={() => onApplyPreset(preset.apply(currentInputs))}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all',
                preset.className,
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{preset.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{preset.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
