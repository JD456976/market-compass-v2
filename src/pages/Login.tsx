import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { friendlyErrorMessage } from '@/lib/requestHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
// Note: "Remember me" checkbox removed — Supabase session persistence is automatic
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const prefillEmail = searchParams.get('email') || '';
  const claimSessionId = searchParams.get('claim') || '';
  const fromPath = (location.state as any)?.from || '';
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: friendlyErrorMessage(error.message),
        variant: 'destructive',
      });
    } else {
      // Check user role to redirect appropriately
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        // Claim shared reports if claim param exists
        if (claimSessionId) {
          try {
            await supabase.rpc('claim_shared_reports', {
              p_user_id: loggedInUser.id,
              p_email: loggedInUser.email || '',
              p_session_id: claimSessionId,
            });
          } catch (err) {
            console.error('Failed to claim report:', err);
          }
        }

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', loggedInUser.id)
          .maybeSingle();
        
        if (roleData?.role === 'client') {
          navigate('/my-reports', { replace: true });
        } else if (fromPath && fromPath !== '/login') {
          navigate(fromPath, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    }
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <AppLogo size="md" />
            <span className="text-2xl font-serif font-bold text-foreground">Market Compass</span>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-11"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link to={`/forgot-password${claimSessionId ? `?claim=${claimSessionId}` : ''}`} className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-6 space-y-2">
              <p>
                Are you an agent?{' '}
                <Link to={`/signup${claimSessionId ? `?claim=${claimSessionId}` : ''}`} className="text-primary font-medium hover:underline">Create an account</Link>
              </p>
              <p>
                Are you a client?{' '}
                <span className="text-foreground font-medium">Ask your agent for an invitation link.</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default Login;
