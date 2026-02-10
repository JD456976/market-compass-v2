import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExtendedLikelihoodBand, LikelihoodBand } from '@/types';

const definitions = [
  {
    label: 'Very Low',
    shortDesc: 'Well outside typical market response range.',
    description: 'Current inputs are far from what the market typically responds to. Significant adjustments would be needed.',
    color: 'bg-red-500/20 border-red-500/40',
  },
  {
    label: 'Low',
    shortDesc: 'Outside typical market response range.',
    description: 'Current inputs suggest the desired outcome is less likely within this timeframe. This does not mean impossible—market conditions vary.',
    color: 'bg-slate-400/20 border-slate-400/40',
  },
  {
    label: 'Moderate',
    shortDesc: 'Within typical market response range.',
    description: 'Mixed signals are present; the outcome is plausible but depends on execution and market dynamics.',
    color: 'bg-amber-500/20 border-amber-500/40',
  },
  {
    label: 'High',
    shortDesc: 'Strong alignment with typical market response.',
    description: 'Strong alignment between inputs and typical market behavior suggests favorable positioning for this timeframe.',
    color: 'bg-emerald-600/20 border-emerald-600/40',
  },
  {
    label: 'Very High',
    shortDesc: 'Exceptionally strong alignment.',
    description: 'Inputs are very strongly aligned with market expectations. The desired outcome is highly likely barring unusual circumstances.',
    color: 'bg-emerald-700/20 border-emerald-700/40',
  },
];

const disclaimer = 'These ratings are informational decision-support signals, not a prediction or guarantee.';

function DefinitionsContent() {
  return (
    <div className="space-y-4">
      {definitions.map((def) => (
        <div
          key={def.label}
          className={`p-3 rounded-lg border ${def.color}`}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="font-medium text-sm">{def.label}</p>
            <p className="text-xs text-muted-foreground italic">{def.shortDesc}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {def.description}
          </p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        {disclaimer}
      </p>
    </div>
  );
}

// Export helper text for inline use (extended 5-tier)
export const extendedLikelihoodHelperText: Record<ExtendedLikelihoodBand, string> = {
  'Very Low': 'Well outside typical market response range.',
  Low: 'Outside typical market response range.',
  Moderate: 'Within typical market response range.', 
  High: 'Strong alignment with typical market response.',
  'Very High': 'Exceptionally strong alignment with market expectations.',
};

// Legacy 3-tier helper text
export const likelihoodHelperText: Record<LikelihoodBand, string> = {
  Low: 'Outside typical market response range.',
  Moderate: 'Within typical market response range.', 
  High: 'Strong alignment with typical market response.',
};

// Export full explanations for tooltips
export const likelihoodExplanations: Record<LikelihoodBand, string> = {
  Low: 'Outside typical market response range. This does not mean impossible—market conditions vary.',
  Moderate: 'Within typical market response range. Outcome depends on execution and market dynamics.',
  High: 'Strong alignment with typical market response. Favorable positioning for this market.',
};

// Inline helper text component
export function LikelihoodHelperText({ band }: { band: ExtendedLikelihoodBand | LikelihoodBand }) {
  const text = (extendedLikelihoodHelperText as Record<string, string>)[band] || likelihoodHelperText[band as LikelihoodBand];
  return (
    <p className="text-xs text-muted-foreground mt-1 text-center">
      {text}
    </p>
  );
}

export function LikelihoodDefinitions() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-muted/50 transition-colors"
      aria-label="What do these ratings mean?"
    >
      <Info className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center font-serif">What These Ratings Mean</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <DefinitionsContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">What These Ratings Mean</DialogTitle>
        </DialogHeader>
        <DefinitionsContent />
      </DialogContent>
    </Dialog>
  );
}
