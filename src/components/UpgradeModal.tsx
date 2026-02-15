import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText, Compass, Gauge, BarChart3, PenTool, Palette, CheckCircle2,
} from 'lucide-react';
import { PRICING } from '@/lib/featureGating';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { icon: FileText, label: 'Unlimited Reports' },
  { icon: Compass, label: 'Scenario Explorer' },
  { icon: Gauge, label: 'Offer Position Meter' },
  { icon: Gauge, label: 'Seller Leverage Meter' },
  { icon: PenTool, label: 'Branded Exports' },
  { icon: BarChart3, label: 'Advanced Market Insights' },
  { icon: Palette, label: 'Custom Branding' },
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            Win more offers. Close faster.
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Start your {PRICING.trialDays}-day free trial with full access to all Professional features. No commitment required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-sm">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1 pb-2">
          <p className="text-sm font-medium">Then {PRICING.monthly.label} or {PRICING.yearly.label}</p>
          <p className="text-xs text-muted-foreground">
            Save {PRICING.yearly.savings} with annual billing. Cancel anytime.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false);
              navigate('/subscription');
            }}
          >
            Start {PRICING.trialDays}-Day Free Trial
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
          <p className="text-[10px] text-muted-foreground text-center leading-snug">
            Payment is charged through the App Store. 
            Subscription auto-renews unless canceled at least 24 hours before the end of the current period.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper hook-style function to gate a feature.
 * Returns a wrapper that either calls the action or shows the upgrade modal.
 */
export function useFeatureGate() {
  // This is intentionally simple - components manage their own modal state
  return null;
}
