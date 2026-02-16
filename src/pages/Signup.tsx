import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { friendlyErrorMessage } from '@/lib/requestHelpers';

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Weak', color: 'bg-destructive' },
    { label: 'Weak', color: 'bg-destructive' },
    { label: 'Medium', color: 'bg-amber-500' },
    { label: 'Good', color: 'bg-emerald-500' },
    { label: 'Strong', color: 'bg-emerald-700' },
  ];
  return { ...levels[score], score };
}

const Signup = () => {
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('email') || '';
  const inviteToken = searchParams.get('invite') || '';
  const inviteFirstName = searchParams.get('fn') || '';
  const inviteLastName = searchParams.get('ln') || '';
  const isClientInvite = !!inviteToken;

  const defaultName = [inviteFirstName, inviteLastName].filter(Boolean).join(' ');
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  // Pre-fill email from invite link
  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || fullName.length < 2) {
      toast({ title: 'Name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    if (!email) {
      toast({ title: 'Please enter your email', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast({ title: 'Password must contain at least 1 uppercase letter', variant: 'destructive' });
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast({ title: 'Password must contain at least 1 number', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: 'You must agree to the Terms of Service', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName, brokerage);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Sign up failed', description: friendlyErrorMessage(error.message), variant: 'destructive' });
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-serif font-bold">Verify Your Email</h2>
            <p className="text-muted-foreground text-sm">
              We sent a verification link to <strong>{email}</strong>.
              Please check your inbox and click the link to verify your account.
            </p>
            <p className="text-xs text-muted-foreground">The link is valid for 24 hours.</p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="inline-flex items-center gap-2 mb-2">
            <AppLogo size="md" />
          </div>
          <h1 className="text-2xl font-serif font-bold">
            {isClientInvite ? 'Create Your Client Account' : 'Create Your Account'}
          </h1>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-2" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="pl-9 h-11" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9 h-11" autoComplete="email" required readOnly={isClientInvite} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 pr-10 h-11" autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Toggle password">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-muted'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strength.label}</p>
                  </div>
                )}
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  <li className={password.length >= 8 ? 'text-emerald-600' : ''}>
                    {password.length >= 8 ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : '○ '}At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-emerald-600' : ''}>
                    {/[A-Z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : '○ '}At least 1 uppercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-emerald-600' : ''}>
                    {/[0-9]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : '○ '}At least 1 number
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-9 h-11" autoComplete="new-password" required />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              {!isClientInvite && (
                <div className="space-y-2">
                  <Label htmlFor="brokerage">Brokerage <span className="text-muted-foreground">(Optional)</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="brokerage" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} placeholder="ABC Realty" className="pl-9 h-11" />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c === true)} className="mt-0.5" />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug">
                  I agree to the <Link to="/terms" className="text-primary underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
                </Label>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading || !agreedToTerms}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
