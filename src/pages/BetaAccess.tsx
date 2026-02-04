import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Compass, Shield } from 'lucide-react';
import { isAllowedAdmin, ADMIN_EMAILS } from '@/lib/adminConfig';
import { 
  getDeviceId, 
  setBetaAccessSession, 
  getBetaAccessSession,
  hashCode,
  isOwnerDevice 
} from '@/lib/betaAccess';

export default function BetaAccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [step, setStep] = useState<'email' | 'code'>('email');
  
  // Emergency override modal
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  // Check if already has access or is owner device
  useEffect(() => {
    const checkAccess = async () => {
      const session = getBetaAccessSession();
      if (session) {
        navigate('/', { replace: true });
        return;
      }

      // Check owner device bypass
      if (isOwnerDevice()) {
        const deviceId = getDeviceId();
        try {
          const { data, error } = await supabase.rpc('check_owner_device', {
            p_device_id: deviceId,
          });

          if (!error && data) {
            const result = data as { is_owner: boolean; admin_email?: string };
            if (result.is_owner && result.admin_email) {
              // Auto-auth from owner device
              setBetaAccessSession({
                email: result.admin_email,
                activatedAt: new Date().toISOString(),
                deviceId,
                role: 'admin',
              });
              toast({
                title: 'Owner Device Recognized',
                description: 'Auto-authenticated as admin.',
              });
              navigate('/', { replace: true });
              return;
            }
          }
        } catch (err) {
          console.error('Owner device check failed:', err);
        }
      }
      
      setIsCheckingOwner(false);
    };

    checkAccess();
  }, [navigate, toast]);

  const isAdminEmail = isAllowedAdmin(email.trim().toLowerCase());

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
    } catch (error) {
      console.error('Admin activation recording failed:', error);
      // Continue anyway - local session is sufficient
    }
    
    // Set local session as admin
    setBetaAccessSession({
      email: adminEmail,
      activatedAt: new Date().toISOString(),
      deviceId,
      role: 'admin',
    });
    
    toast({
      title: 'Welcome, Admin',
      description: 'Redirecting to admin dashboard...',
    });
    
    // Redirect directly to admin area
    navigate('/admin', { replace: true });
    setIsLoading(false);
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

  const handleQuickFill = (adminEmail: string) => {
    setEmail(adminEmail);
  };

  const handleEmergencyOverride = async () => {
    const normalizedEmail = overrideEmail.trim().toLowerCase();
    
    if (!isAllowedAdmin(normalizedEmail)) {
      toast({
        title: 'Not authorized',
        description: 'This email is not in the admin allowlist.',
        variant: 'destructive',
      });
      return;
    }

    if (!overrideConfirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Please confirm you are the owner.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const deviceId = getDeviceId();
    
    try {
      // Record emergency override activation
      await supabase.from('beta_activations').insert({
        email: normalizedEmail,
        device_id: deviceId,
        activation_source: 'admin_override',
      });
    } catch (err) {
      console.error('Override logging failed:', err);
    }

    // Set local session
    setBetaAccessSession({
      email: normalizedEmail,
      activatedAt: new Date().toISOString(),
      deviceId,
      role: 'admin',
    });
    
    toast({
      title: 'Emergency Override',
      description: 'Admin access granted.',
    });
    
    setShowOverride(false);
    navigate('/', { replace: true });
    setIsLoading(false);
  };

  if (isCheckingOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

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
                
                {/* Admin detection badge */}
                {isAdminEmail && (
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin recognized
                    </Badge>
                    <span className="text-xs text-muted-foreground">— continue to admin</span>
                  </div>
                )}
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

          {/* Emergency override link - tiny and non-obvious */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setOverrideEmail(email || '');
                setShowOverride(true);
              }}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Owner override
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Override Modal */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Emergency Owner Override
            </DialogTitle>
            <DialogDescription>
              This bypasses the normal access flow. Only works for admin emails.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="override-email">Admin Email</Label>
              <Input
                id="override-email"
                type="email"
                placeholder="admin@email.com"
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
                autoComplete="email"
              />
              {overrideEmail && !isAllowedAdmin(overrideEmail.trim().toLowerCase()) && (
                <p className="text-xs text-destructive">This email is not in the admin allowlist.</p>
              )}
              {overrideEmail && isAllowedAdmin(overrideEmail.trim().toLowerCase()) && (
                <p className="text-xs text-emerald-600">Admin email recognized.</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="override-confirm"
                checked={overrideConfirmed}
                onCheckedChange={(checked) => setOverrideConfirmed(checked === true)}
              />
              <Label htmlFor="override-confirm" className="text-sm font-normal">
                I am the owner of this app
              </Label>
            </div>

            <Button
              onClick={handleEmergencyOverride}
              disabled={isLoading || !overrideConfirmed || !isAllowedAdmin(overrideEmail.trim().toLowerCase())}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue as Admin'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
