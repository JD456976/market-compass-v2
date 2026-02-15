import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBatchReportViewStats, ReportViewStats, getReportViewStats } from '@/lib/viewTracking';
import { useToast } from '@/hooks/use-toast';

interface ViewStatsSummary {
  totalViews: number;
  lastViewedAt: string | null;
}

/**
 * Hook to get view stats for multiple reports at once
 */
export function useBatchViewStats(reportIds: string[]): {
  stats: Map<string, ViewStatsSummary>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [stats, setStats] = useState<Map<string, ViewStatsSummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (reportIds.length === 0) {
      setStats(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getBatchReportViewStats(reportIds);
      setStats(result);
    } catch (err) {
      console.error('Failed to load batch view stats:', err);
    } finally {
      setLoading(false);
    }
  }, [reportIds.join(',')]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, refresh: load };
}

/**
 * Hook to get detailed view stats for a single report
 */
export function useReportViewStats(reportId: string | undefined): {
  stats: ReportViewStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [stats, setStats] = useState<ReportViewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!reportId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getReportViewStats(reportId);
      setStats(result);
    } catch (err) {
      console.error('Failed to load view stats:', err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, refresh: load };
}

/**
 * Hook for real-time notifications when shared reports are viewed
 * Only active for session owners
 */
export function useReportViewNotifications(reportIds: string[]) {
  const { toast } = useToast();
  const [recentViewCount, setRecentViewCount] = useState(0);
  const lastToastRef = useRef<number>(0);

  // Cooldown: suppress repeat view toasts within 60 seconds
  const VIEW_TOAST_COOLDOWN_MS = 60_000;

  useEffect(() => {
    if (reportIds.length === 0) return;

    const channel = supabase
      .channel('report-views')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_report_views',
        },
        (payload) => {
          const viewedReportId = payload.new?.report_id;
          const deviceType = payload.new?.device_type || 'device';
          
          if (viewedReportId && reportIds.includes(viewedReportId)) {
            setRecentViewCount(prev => prev + 1);

            const now = Date.now();
            if (now - lastToastRef.current > VIEW_TOAST_COOLDOWN_MS) {
              lastToastRef.current = now;
              toast({
                title: "Report viewed",
                description: `A shared report was opened on a ${deviceType}.`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportIds.join(','), toast]);

  return { recentViewCount };
}
