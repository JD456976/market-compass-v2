import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/deviceId';

type BetaStatus = 'loading' | 'authorized' | 'not_authorized' | 'revoked';

interface BetaAccessState {
  status: BetaStatus;
  label: string | null;
  deviceId: string;
}

export function useBetaAccess() {
  const [state, setState] = useState<BetaAccessState>({
    status: 'loading',
    label: null,
    deviceId: '',
  });
  const [isRedeeming, setIsRedeeming] = useState(false);

  const checkAuthorization = useCallback(async () => {
    const deviceId = getDeviceId();
    setState(prev => ({ ...prev, deviceId }));

    try {
      const { data, error } = await supabase.rpc('check_device_authorization', {
        p_device_id: deviceId,
      });

      if (error) {
        console.error('Error checking authorization:', error);
        setState(prev => ({ ...prev, status: 'not_authorized' }));
        return;
      }

      const result = data as { authorized: boolean; reason?: string; label?: string };
      
      if (result.authorized) {
        setState(prev => ({
          ...prev,
          status: 'authorized',
          label: result.label || null,
        }));
      } else if (result.reason === 'revoked') {
        setState(prev => ({ ...prev, status: 'revoked' }));
      } else {
        setState(prev => ({ ...prev, status: 'not_authorized' }));
      }
    } catch (err) {
      console.error('Authorization check failed:', err);
      setState(prev => ({ ...prev, status: 'not_authorized' }));
    }
  }, []);

  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization]);

  const redeemCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsRedeeming(true);
    const deviceId = getDeviceId();

    try {
      const { data, error } = await supabase.rpc('redeem_beta_code', {
        p_code: code.trim().toUpperCase(),
        p_device_id: deviceId,
      });

      if (error) {
        console.error('Redeem error:', error);
        return { success: false, error: 'Failed to redeem code. Please try again.' };
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        await checkAuthorization();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Invalid code' };
      }
    } catch (err) {
      console.error('Redeem failed:', err);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsRedeeming(false);
    }
  }, [checkAuthorization]);

  return {
    ...state,
    isRedeeming,
    redeemCode,
    refreshStatus: checkAuthorization,
  };
}
