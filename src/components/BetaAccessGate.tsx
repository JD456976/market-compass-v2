import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getBetaAccessSession } from '@/lib/betaAccess';

interface BetaAccessGateProps {
  children: React.ReactNode;
}

export function BetaAccessGate({ children }: BetaAccessGateProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAccess = () => {
      const session = getBetaAccessSession();
      
      if (session) {
        setHasAccess(true);
      } else {
        // Redirect to beta access page
        navigate('/beta', { replace: true, state: { from: location.pathname } });
      }
      
      setIsChecking(false);
    };

    checkAccess();
  }, [navigate, location.pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
