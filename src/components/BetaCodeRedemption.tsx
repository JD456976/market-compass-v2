/**
 * BetaCodeRedemption — post-login screen shown to authenticated users
 * who have no active entitlement (no beta, no stripe).
 * They can enter a beta code OR proceed to Stripe checkout.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLogo } from '@/components/AppLogo';
import { Loader2, KeyRound, Sparkles, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEntitlement } from '@/contexts/EntitlementContext';
import { differenceInDays, parseISO, format } from 'date-fns';

interface BetaCodeRedemptionProps {
  onSuccess: () => void;
  betaExpired?: boolean;
  expiresAt?: string | null;
}

export function BetaCodeRedemption({ onSuccess, betaExpired, expiresAt }: BetaCodeRedemptionProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'choose' | 'code'>('choose');
  const { toast } = useToast();
  const { startCheckout } = useEntitlement();
  const navigate = useNavigate();

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('redeem_beta_code', {
        p_code: code.trim().toUpperCase(),
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        toast({ title: 'Redemption failed', description: error.message, variant: 'destructive' });
        return;
      }

      const result = data as { ok: boolean; error?: string; beta_expires_at?: string; message?: string };

      if (result.ok) {
        const expiryText = result.beta_expires_at
          ? `Your access expires on ${format(parseISO(result.beta_expires_at), 'MMMM d, yyyy')}.`
          : 'Your beta access has no expiration.';
        toast({
          title: 'Beta access activated! 🎉',
          description: expiryText,
        });
        onSuccess();
      } else {
        toast({
          title: 'Invalid code',
          description: result.error ?? 'The code is invalid, expired, or already used.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <AppLogo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-serif font-bold text-foreground">Market Compass</h1>
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

        {mode === 'choose' ? (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-serif">Get Access</CardTitle>
              <CardDescription>
                Enter a beta access code or subscribe to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full h-12" onClick={() => setMode('code')}>
                <KeyRound className="h-4 w-4 mr-2" />
                I have a beta access code
              </Button>
              <Button
                variant="outline"
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
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Enter Beta Code
              </CardTitle>
              <CardDescription>
                Enter the code you received from your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRedeem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="beta-code">Access Code</Label>
                  <Input
                    id="beta-code"
                    type="text"
                    placeholder="MC-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest font-mono h-12"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading || !code.trim()}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</>
                  ) : (
                    'Activate Access'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setMode('choose')}
                >
                  ← Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
