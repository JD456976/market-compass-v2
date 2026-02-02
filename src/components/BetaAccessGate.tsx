import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getBetaAccessSession, 
  setBetaAccessSession,
  isOwnerDevice, 
  getDeviceId 
} from '@/lib/betaAccess';

interface BetaAccessGateProps {
  children: React.ReactNode;
}

export function BetaAccessGate({ children }: BetaAccessGateProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async () => {
      // First check if there's an existing session
      const session = getBetaAccessSession();
      
      if (session) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Check if this is an owner device (even if session was cleared)
      if (isOwnerDevice()) {
        const deviceId = getDeviceId();
        
        try {
          const { data, error } = await supabase.rpc('check_owner_device', {
            p_device_id: deviceId,
          });

          if (!error && data) {
            const result = data as { is_owner: boolean; admin_email?: string };
            
            if (result.is_owner && result.admin_email) {
              // Auto-restore admin session from owner device
              setBetaAccessSession({
                email: result.admin_email,
                activatedAt: new Date().toISOString(),
                deviceId,
                role: 'admin',
              });
              setHasAccess(true);
              setIsChecking(false);
              return;
            }
          }
        } catch (err) {
          console.error('Owner device check failed:', err);
        }
      }

      // No valid access - redirect to beta
      navigate('/beta', { replace: true, state: { from: location.pathname } });
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
