import { motion } from 'framer-motion';
import { Shield, TrendingUp, BarChart3, Zap, Target, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntitlement } from '@/contexts/EntitlementContext';
import { PRICE_DISPLAY, TRIAL_DURATION_DAYS } from '@/lib/stripe/stripeConfig';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';

const APP_HIGHLIGHTS = [
  { icon: TrendingUp, label: 'Market intelligence & pricing analysis' },
  { icon: Target, label: 'Competitive dynamics tracking' },
  { icon: BarChart3, label: 'Pricing trend analysis' },
  { icon: FileText, label: 'Market condition reports' },
  { icon: Zap, label: 'Strategic positioning tools' },
  { icon: Shield, label: 'Unlimited reports & exports' },
];

export default function Pricing() {
  const { startCheckout, entitlementState, loading } = useEntitlement();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setError(null);
    setPurchasing(true);
    try {
      await startCheckout();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // If entitled, show success
  if (entitlementState.isPro || entitlementState.isTrial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">You're all set!</h1>
          <p className="text-muted-foreground">Market Compass Pro is active.</p>
          <Link to="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16">
            <AppLogo size="lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-sans">Market Compass Pro</h1>
          <p className="text-muted-foreground text-lg">Win more offers. Close faster.</p>
        </div>

        {/* What's included */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Everything included
          </p>
          {APP_HIGHLIGHTS.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{f.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Pricing */}
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold">{PRICE_DISPLAY}</p>
          <p className="text-sm text-muted-foreground">
            Start with a {TRIAL_DURATION_DAYS}-day free trial · Cancel anytime
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Full access during trial — no features locked
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-14 text-base rounded-xl gap-2"
            onClick={handlePurchase}
            disabled={purchasing || loading}
          >
            {purchasing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>
            ) : (
              'Start Free Trial'
            )}
          </Button>

          <Link to="/" className="block">
            <Button variant="ghost" className="w-full text-muted-foreground">
              Not now
            </Button>
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            You'll be redirected to Stripe to complete your subscription.
            Subscription automatically renews at {PRICE_DISPLAY} unless canceled.
            Cancel anytime from your account settings.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px]">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground underline">
              Terms of Use
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
