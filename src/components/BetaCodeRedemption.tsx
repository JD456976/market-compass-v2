/**
 * BetaCodeRedemption — post-login screen shown to authenticated users
 * who have no active entitlement (no beta, no stripe).
 * They can proceed to Stripe checkout.
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import { Sparkles, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BetaCodeRedemptionProps {
  onSuccess: () => void;
  betaExpired?: boolean;
  expiresAt?: string | null;
}

export function BetaCodeRedemption({ onSuccess, betaExpired, expiresAt }: BetaCodeRedemptionProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <AppLogo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-sans font-bold text-foreground">Market Compass</h1>
        </div>

        {betaExpired && expiresAt && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-destructive">
                <CalendarClock className="h-4 w-4 shrink-0" />
                <p className="text-sm">
                  Your beta access expired on{' '}
                  <strong>{format(parseISO(expiresAt), 'MMMM d, yyyy')}</strong>.
                  Subscribe to continue.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-sans">Get Access</CardTitle>
            <CardDescription>
              Subscribe to get started, or contact your administrator for beta access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-12"
              onClick={() => navigate('/pricing')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Subscribe — $39/month
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Start with a 14-day free trial. No commitment required.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
