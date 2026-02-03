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

const definitions = [
  {
    label: 'Low',
    shortDesc: 'Outside typical market response',
    description: 'Current inputs and market conditions suggest the desired outcome is less likely within this timeframe.',
    color: 'bg-slate-400/20 border-slate-400/40',
  },
  {
    label: 'Moderate',
    shortDesc: 'Within typical market response range',
    description: 'Mixed signals are present; the outcome is plausible but depends on execution and market response.',
    color: 'bg-amber-500/20 border-amber-500/40',
  },
  {
    label: 'High',
    shortDesc: 'Aligned with typical market response',
    description: 'Strong alignment between inputs and typical market behavior suggests a favorable outcome within this timeframe.',
    color: 'bg-emerald-600/20 border-emerald-600/40',
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

// Export helper text for inline use
export const likelihoodHelperText = {
  Low: 'Outside typical market response',
  Moderate: 'Within typical market response range', 
  High: 'Aligned with typical market response',
};

// Export full explanations for tooltips
export const likelihoodExplanations = {
  Low: 'Low means this offer is less competitive for this market and timeline. It does not mean impossible.',
  Moderate: 'Moderate indicates mixed signals—the outcome is plausible but depends on execution and market response.',
  High: 'High indicates strong alignment between your offer terms and typical market expectations.',
};

// Inline helper text component
export function LikelihoodHelperText({ band }: { band: 'Low' | 'Moderate' | 'High' }) {
  return (
    <p className="text-xs text-muted-foreground mt-1 text-center">
      {likelihoodHelperText[band]}
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
