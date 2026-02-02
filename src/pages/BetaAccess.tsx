import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Compass } from 'lucide-react';
import { isAllowedAdmin } from '@/lib/adminConfig';
import { 
  getDeviceId, 
  setBetaAccessSession, 
  getBetaAccessSession,
  hashCode 
} from '@/lib/betaAccess';

export default function BetaAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  // Check if already has access
  useEffect(() => {
    const session = getBetaAccessSession();
    if (session) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Check if admin - immediate access
    if (isAllowedAdmin(normalizedEmail)) {
      handleAdminBypass(normalizedEmail);
      return;
    }

    // Non-admin: proceed to code entry
    setStep('code');
  };

  const handleAdminBypass = async (adminEmail: string) => {
    setIsLoading(true);
    const deviceId = getDeviceId();
    
    try {
      // Record admin activation server-side
      await supabase.rpc('record_admin_activation', {
        p_email: adminEmail,
        p_device_id: deviceId,
      });
      
      // Set local session
      setBetaAccessSession({
        email: adminEmail,
        activatedAt: new Date().toISOString(),
        deviceId,
        role: 'admin',
      });
      
      toast({
        title: 'Welcome, Admin',
        description: 'You have full access to Market Compass.',
      });
      
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Admin bypass error:', error);
      // Still grant access locally even if server call fails
      setBetaAccessSession({
        email: adminEmail,
        activatedAt: new Date().toISOString(),
        deviceId,
        role: 'admin',
      });
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: 'Code required',
        description: 'Please enter your access code.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const deviceId = getDeviceId();
    
    try {
      // Hash the code before sending
      const codeHash = await hashCode(code);
      
      const { data, error } = await supabase.rpc('validate_beta_code', {
        p_email: normalizedEmail,
        p_code_hash: codeHash,
        p_device_id: deviceId,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Validation error:', error);
        toast({
          title: 'Validation failed',
          description: 'Unable to validate code. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string; already_active?: boolean };

      if (result.success) {
        // Set local session
        setBetaAccessSession({
          email: normalizedEmail,
          activatedAt: new Date().toISOString(),
          deviceId,
          role: 'beta',
        });
        
        toast({
          title: result.already_active ? 'Welcome back!' : 'Access granted',
          description: result.already_active 
            ? 'Your device is already activated.' 
            : 'You now have access to Market Compass.',
        });
        
        navigate('/', { replace: true });
      } else {
        toast({
          title: 'Invalid code',
          description: result.error || 'The code is invalid, expired, or already used.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Code validation failed:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Market Compass</CardTitle>
          <CardDescription className="text-base">
            {step === 'email' 
              ? 'Enter your email to continue'
              : 'Enter your access code'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-display">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                    className="text-base bg-muted"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                    Change
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  autoComplete="off"
                  className="text-center text-lg tracking-widest font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 8-character code you received.
                </p>
              </div>
              
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Activate Access
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Access codes are single-use and tied to your email address.
              Contact your administrator if you need a code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
