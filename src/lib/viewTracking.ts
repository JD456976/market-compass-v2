
const VIEWER_ID_KEY = 'mc_viewer_id';
const VIEW_COOLDOWN_KEY = 'mc_view_cooldowns';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// Generate or retrieve a pseudonymous viewer ID
export function getOrCreateViewerId(): string {
  let viewerId = localStorage.getItem(VIEWER_ID_KEY);
  if (!viewerId) {
    viewerId = crypto.randomUUID();
    localStorage.setItem(VIEWER_ID_KEY, viewerId);
  }
  return viewerId;
}

// Check if we're within cooldown period for a specific report
function isWithinCooldown(reportId: string): boolean {
  try {
    const cooldowns = JSON.parse(localStorage.getItem(VIEW_COOLDOWN_KEY) || '{}');
    const lastView = cooldowns[reportId];
    if (lastView && Date.now() - lastView < COOLDOWN_MS) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Record the cooldown for a report
function recordCooldown(reportId: string): void {
  try {
    const cooldowns = JSON.parse(localStorage.getItem(VIEW_COOLDOWN_KEY) || '{}');
    cooldowns[reportId] = Date.now();
    // Clean up old cooldowns (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(cooldowns).forEach(key => {
      if (cooldowns[key] < oneDayAgo) {
        delete cooldowns[key];
      }
    });
    localStorage.setItem(VIEW_COOLDOWN_KEY, JSON.stringify(cooldowns));
  } catch {
    // Ignore storage errors
  }
}

// Detect device type from user agent
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// Log a view event for a shared report
export async function logSharedReportView(
  shareToken: string,
  reportId: string
): Promise<boolean> {
  // Check cooldown first
  if (isWithinCooldown(reportId)) {
    return false;
  }

  const viewerId = getOrCreateViewerId();
  const deviceType = getDeviceType();
  const userAgent = navigator.userAgent.substring(0, 500); // Truncate for safety
  const referrer = document.referrer || null;

  try {
    const { error } = await supabase
      .from('shared_report_views')
      .insert({
        share_token: shareToken,
        report_id: reportId,
        viewer_id: viewerId,
        device_type: deviceType,
        user_agent: userAgent,
        referrer: referrer,
      });

    if (error) {
      console.error('[ViewTracking] Failed to log view:', error);
      return false;
    }

    recordCooldown(reportId);
    return true;
    return true;
  } catch (err) {
    console.error('[ViewTracking] Error logging view:', err);
    return false;
  }
}

// Get view statistics for a report (for session owners/admins)
export interface ReportViewStats {
  totalViews: number;
  uniqueViewers: number;
  lastViewedAt: string | null;
  recentViews: Array<{
    viewed_at: string;
    device_type: string | null;
  }>;
}

export async function getReportViewStats(reportId: string): Promise<ReportViewStats | null> {
  try {
    const { data, error } = await supabase
      .from('shared_report_views')
      .select('viewed_at, device_type, viewer_id')
      .eq('report_id', reportId)
      .order('viewed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[ViewTracking] Failed to fetch view stats:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        totalViews: 0,
        uniqueViewers: 0,
        lastViewedAt: null,
        recentViews: [],
      };
    }

    const uniqueViewerIds = new Set(data.map(v => v.viewer_id));
    
    return {
      totalViews: data.length,
      uniqueViewers: uniqueViewerIds.size,
      lastViewedAt: data[0].viewed_at,
      recentViews: data.slice(0, 10).map(v => ({
        viewed_at: v.viewed_at,
        device_type: v.device_type,
      })),
    };
  } catch (err) {
    console.error('[ViewTracking] Error fetching stats:', err);
    return null;
  }
}

// Get view stats for multiple reports at once
export async function getBatchReportViewStats(
  reportIds: string[]
): Promise<Map<string, { totalViews: number; lastViewedAt: string | null }>> {
  const result = new Map<string, { totalViews: number; lastViewedAt: string | null }>();
  
  if (reportIds.length === 0) return result;

  try {
    const { data, error } = await supabase
      .from('shared_report_views')
      .select('report_id, viewed_at')
      .in('report_id', reportIds)
      .order('viewed_at', { ascending: false });

    if (error) {
      console.error('[ViewTracking] Failed to fetch batch stats:', error);
      return result;
    }

    // Group by report_id
    const groupedData: Record<string, { count: number; lastViewed: string }> = {};
    
    data?.forEach(view => {
      if (!groupedData[view.report_id]) {
        groupedData[view.report_id] = {
          count: 0,
          lastViewed: view.viewed_at,
        };
      }
      groupedData[view.report_id].count++;
    });

    // Convert to map
    Object.entries(groupedData).forEach(([reportId, stats]) => {
      result.set(reportId, {
        totalViews: stats.count,
        lastViewedAt: stats.lastViewed,
      });
    });

    return result;
  } catch (err) {
    console.error('[ViewTracking] Error fetching batch stats:', err);
    return result;
  }
}
import { supabase } from '@/integrations/supabase/client';
