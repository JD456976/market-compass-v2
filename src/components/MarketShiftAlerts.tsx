import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, TrendingUp, TrendingDown, X, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ShiftAlert {
  id: string;
  zip_code: string;
  city_state: string | null;
  previous_score: number;
  current_score: number;
  score_delta: number;
  lead_type: string;
  is_read: boolean;
  created_at: string;
}

export function useMarketShiftAlerts() {
  const { user } = useAuth();
  const { data: alerts = [] } = useQuery<ShiftAlert[]>({
    queryKey: ['market-shift-alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_shift_alerts' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as ShiftAlert[];
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Re-check every 5 min
  });

  const unread = alerts.filter(a => !a.is_read).length;
  return { alerts, unread };
}

export async function createMarketShiftAlert(
  userId: string,
  zip: string,
  cityState: string | null,
  previousScore: number,
  currentScore: number,
  leadType: string
) {
  const delta = currentScore - previousScore;
  if (Math.abs(delta) < 8) return; // Only alert on meaningful shifts

  await supabase.from('market_shift_alerts' as any).insert({
    user_id: userId,
    zip_code: zip,
    city_state: cityState,
    previous_score: previousScore,
    current_score: currentScore,
    score_delta: delta,
    lead_type: leadType,
    is_read: false,
  });
}

interface MarketShiftAlertsProps {
  onClose?: () => void;
}

export function MarketShiftAlertsPanel({ onClose }: MarketShiftAlertsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { alerts } = useMarketShiftAlerts();

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('market_shift_alerts' as any).update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market-shift-alerts'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from('market_shift_alerts' as any).update({ is_read: true }).eq('user_id', user!.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market-shift-alerts'] }),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('market_shift_alerts' as any).delete().eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market-shift-alerts'] }),
  });

  const unread = alerts.filter(a => !a.is_read);

  return (
    <Card className="w-80 shadow-xl border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Market Shift Alerts</CardTitle>
            {unread.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unread.length}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => markAllRead.mutate()}>
                Mark all read
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 max-h-80 overflow-y-auto space-y-2 pb-3">
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No alerts yet.</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Alerts appear when a saved market shifts 8+ points.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {alerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  'relative rounded-lg border p-3 pr-7 transition-all',
                  alert.is_read ? 'border-border/30 bg-background opacity-60' : 'border-border bg-card'
                )}
              >
                <button
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => dismiss.mutate(alert.id)}
                >
                  <X className="h-3 w-3" />
                </button>

                <div className="flex items-start gap-2">
                  <div className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                    alert.score_delta > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                  )}>
                    {alert.score_delta > 0
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : <TrendingDown className="h-3.5 w-3.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{alert.city_state ?? alert.zip_code}</span>
                      {!alert.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{alert.previous_score}</span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className={cn('text-[11px] font-semibold', alert.score_delta > 0 ? 'text-emerald-500' : 'text-destructive')}>
                        {alert.current_score}
                      </span>
                      <Badge
                        variant={alert.score_delta > 0 ? 'success' : 'destructive'}
                        className="text-[9px] px-1 py-0"
                      >
                        {alert.score_delta > 0 ? '+' : ''}{alert.score_delta}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {!alert.is_read && (
                  <button
                    className="mt-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => markRead.mutate(alert.id)}
                  >
                    <Check className="h-3 w-3" />
                    Mark read
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}

export function MarketShiftAlertBell() {
  const [open, setOpen] = useState(false);
  const { unread } = useMarketShiftAlerts();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative"
        onClick={() => setOpen(o => !o)}
        aria-label="Market shift alerts"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-10 z-50"
            >
              <MarketShiftAlertsPanel onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
