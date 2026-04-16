import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

const ClientInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'already_accepted'>('loading');
  const [agentName, setAgentName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const clientFirstName = searchParams.get('fn') || '';
  const clientLastName = searchParams.get('ln') || '';

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const checkInvite = async () => {
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { p_token: token });

      if (error || !data || data.length === 0) {
        setStatus('invalid');
        return;
      }

      const invite = data[0];

      if (invite.status === 'accepted') {
        setStatus('already_accepted');
        return;
      }

      if (invite.status === 'revoked') {
        setStatus('invalid');
        return;
      }

      setClientEmail(invite.client_email);
      setStatus('valid');

      if (invite.agent_name) {
        setAgentName(invite.agent_name);
      }
    };

    checkInvite();
  }, [token]);

  // If user is already logged in as client with this email, auto-accept
  useEffect(() => {
    if (user && status === 'valid' && user.email?.toLowerCase() === clientEmail.toLowerCase()) {
      // Already signed up, just redirect
      navigate('/my-reports', { replace: true });
    }
  }, [user, status, clientEmail, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-sans font-bold">Invalid Invitation</h2>
            <p className="text-muted-foreground text-sm">
              This invitation link is invalid or has been revoked.
            </p>
            <Link to="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'already_accepted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-sans font-bold">Already Accepted</h2>
            <p className="text-muted-foreground text-sm">
              This invitation has already been accepted. Sign in to access your reports.
            </p>
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardContent className="py-10 text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <AppLogo size="md" />
            <span className="text-2xl font-sans font-bold">Market Compass</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">You have been invited</h2>
            {agentName && (
              <p className="text-muted-foreground">
                <strong>{agentName}</strong> has invited you to collaborate on property analysis.
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Create an account with <strong>{clientEmail}</strong> to get started.
          </p>

          <div className="space-y-3">
            <Link to={`/signup?email=${encodeURIComponent(clientEmail)}&invite=${encodeURIComponent(token || '')}${clientFirstName ? `&fn=${encodeURIComponent(clientFirstName)}` : ''}${clientLastName ? `&ln=${encodeURIComponent(clientLastName)}` : ''}`}>
              <Button className="w-full" size="lg">Create Client Account</Button>
            </Link>
            <Link to={`/login?email=${encodeURIComponent(clientEmail)}`}>
              <Button variant="outline" className="w-full">Already have an account? Sign In</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientInvite;
