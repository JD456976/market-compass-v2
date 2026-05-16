import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

type Step = 'email' | 'sent';

export default function BetaAccess() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast({ title: 'Enter a valid email address', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      setStep('sent');
    } catch (err: any) {
      toast({
        title: 'Could not send link',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setStep('email');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AppLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-sans">Market Compass</CardTitle>
          <CardDescription className="text-base">
            {step === 'email'
              ? 'Enter your email to receive a sign-in link'
              : 'Check your email'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="text-base"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" />Send Sign-In Link</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We'll send a magic link to your email. No password needed.
              </p>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Link sent to</p>
                <p className="text-primary font-mono text-sm">{email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the link in your email to sign in. It expires in 1 hour.
                Check your spam folder if you don't see it.
              </p>
              <Button variant="outline" className="w-full" onClick={handleResend}>
                Use a different email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
