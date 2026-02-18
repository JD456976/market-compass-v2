import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle,
  Link2, Link2Off, ExternalLink, Settings, Zap, Clock, ArrowUpRight,
  ArrowDownRight, Users, Activity,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CrmConnection {
  is_active: boolean;
  api_key_hint: string | null;
  auto_push_on_analyze: boolean;
  auto_push_on_score_change: boolean;
  score_change_threshold: number;
  auto_push_on_csv_upload: boolean;
  crm_type: string;
  webhook_url: string | null;
  crm_display_name: string | null;
}

interface PushLogEntry {
  id: string;
  crm_type: string;
  action: string;
  zip_code: string | null;
  city_state: string | null;
  opportunity_score: number | null;
  score_delta: number | null;
  lead_type: string | null;
  leads_pushed: number | null;
  status: string;
  error_msg: string | null;
  created_at: string;
}

interface CrmDefinition {
  id: string;
  name: string;
  logo: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  authType: 'api_key' | 'webhook';
  apiKeyPlaceholder?: string;
  apiKeyPrefix?: string;
  docsUrl: string;
  docsSteps: string[];
}

// ─── CRM Definitions ──────────────────────────────────────────────────────────

const CRM_DEFINITIONS: CrmDefinition[] = [
  {
    id: 'follow_up_boss',
    name: 'Follow Up Boss',
    logo: '🎯',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Push market analyses, score alerts & CSV leads as events, tasks, and contacts directly into FUB.',
    authType: 'api_key',
    apiKeyPlaceholder: 'fka_••••••••••••••••',
    apiKeyPrefix: 'fka_',
    docsUrl: 'https://help.followupboss.com/article/127-api',
    docsSteps: [
      'Log in to Follow Up Boss',
      'Go to Admin → API',
      'Copy your API key (starts with fka_)',
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: '🟠',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Push market intelligence as HubSpot contacts with custom properties and activity notes.',
    authType: 'webhook',
    docsUrl: 'https://knowledge.hubspot.com/integrations/how-do-i-use-webhooks-with-hubspot-workflows',
    docsSteps: [
      'In HubSpot, go to Automation → Workflows',
      'Create a new workflow triggered by a webhook',
      'Copy the webhook URL from the trigger step',
    ],
  },
  {
    id: 'kvcore',
    name: 'kvCORE',
    logo: '🔷',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Send market scores and lead data to kvCORE via webhook for automated follow-up sequences.',
    authType: 'webhook',
    docsUrl: 'https://help.kvcore.com/hc/en-us/articles/360043053952',
    docsSteps: [
      'In kvCORE, navigate to Settings → Integrations',
      'Select Zapier or Webhook integration',
      'Copy your webhook endpoint URL',
    ],
  },
  {
    id: 'liondesk',
    name: 'LionDesk',
    logo: '🦁',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Push high-opportunity market alerts to LionDesk for automated drip campaigns and follow-ups.',
    authType: 'webhook',
    docsUrl: 'https://help.liondesk.com/hc/en-us/articles/360050014714',
    docsSteps: [
      'Log in to LionDesk',
      'Go to Settings → API & Integrations',
      'Generate a Zapier webhook or use the REST API',
    ],
  },
  {
    id: 'sierra',
    name: 'Sierra Interactive',
    logo: '⛰️',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900/30',
    borderColor: 'border-slate-200 dark:border-slate-700',
    description: 'Forward scored market data to Sierra Interactive to trigger smart campaigns and lead assignments.',
    authType: 'webhook',
    docsUrl: 'https://api.sierrainteractivedev.com/',
    docsSteps: [
      'Log in to Sierra Interactive',
      'Go to Admin → API Settings',
      'Copy your site API key and team ID',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callFubFunction(session: any, body: Record<string, unknown>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const resp = await fetch(`${supabaseUrl}/functions/v1/follow-up-boss`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
  return data;
}

async function callWebhook(webhookUrl: string, payload: Record<string, unknown>) {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Webhook returned ${resp.status}`);
  return { success: true };
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function CrmActivityLog() {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery<PushLogEntry[]>({
    queryKey: ['crm-push-log', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('crm_push_log' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as PushLogEntry[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const crmDef = (crmType: string) => CRM_DEFINITIONS.find(c => c.id === crmType);

  const actionLabel = (action: string, leadsCount: number | null) => {
    if (action === 'push_analysis') return 'Analysis pushed';
    if (action === 'push_csv_leads') return `${leadsCount ?? 0} leads pushed`;
    if (action === 'score_alert') return 'Score alert sent';
    return action;
  };

  if (isLoading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;
  if (!logs.length) return (
    <div className="text-center py-6 text-muted-foreground text-xs">
      <Activity className="h-5 w-5 mx-auto mb-2 opacity-40" />
      No CRM pushes yet
    </div>
  );

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const def = crmDef(log.crm_type);
        const isSuccess = log.status === 'success';
        const delta = log.score_delta;
        return (
          <div key={log.id} className={cn(
            'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs',
            isSuccess ? 'border-border/50 bg-muted/20' : 'border-destructive/30 bg-destructive/5'
          )}>
            <span className="text-base shrink-0 mt-0.5">{def?.logo ?? '📤'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground/80">{def?.name ?? log.crm_type}</span>
                {log.zip_code && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{log.zip_code}</Badge>
                )}
                {delta !== null && delta !== 0 && (
                  <span className={cn('flex items-center gap-0.5 font-bold', delta > 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {delta > 0 ? '+' : ''}{delta} pts
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-0.5">{actionLabel(log.action, log.leads_pushed)}</p>
              <p className="text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
            {isSuccess
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Single CRM Card ──────────────────────────────────────────────────────────

function CrmCard({
  crm,
  pendingPush,
}: {
  crm: CrmDefinition;
  pendingPush?: CrmIntegrationHubProps['pendingPush'];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [webhookInput, setWebhookInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: connection } = useQuery<CrmConnection | null>({
    queryKey: ['crm-connection', user?.id, crm.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('crm_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('crm_type', crm.id)
        .maybeSingle();
      return (data as CrmConnection | null) ?? null;
    },
    enabled: !!user,
  });

  const isConnected = !!(connection?.is_active);

  const logPush = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    await supabase.from('crm_push_log' as any).insert({
      user_id: user.id,
      crm_type: crm.id,
      action,
      ...extra,
    });
    queryClient.invalidateQueries({ queryKey: ['crm-push-log', user?.id] });
  };

  const updateSetting = async (field: string, value: boolean | number) => {
    if (!user) return;
    await supabase
      .from('crm_connections')
      .update({ [field]: value })
      .eq('user_id', user.id)
      .eq('crm_type', crm.id);
    queryClient.invalidateQueries({ queryKey: ['crm-connection', user?.id, crm.id] });
  };

  const handleConnect = async () => {
    const isApiKey = crm.authType === 'api_key';
    const value = isApiKey ? apiKeyInput.trim() : webhookInput.trim();
    if (!value) {
      toast({ title: isApiKey ? 'Enter your API key' : 'Enter webhook URL', variant: 'destructive' });
      return;
    }
    setValidating(true);
    try {
      if (crm.id === 'follow_up_boss') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const result = await callFubFunction(session, { action: 'validate', apiKey: value });
        if (!result.valid) throw new Error(result.error || 'Invalid API key');
        toast({ title: `✅ ${crm.name} connected!`, description: `Account: ${result.account}` });
      } else {
        // Webhook-based: upsert connection with webhook_url
        if (!user) throw new Error('Not authenticated');
        await supabase.from('crm_connections').upsert({
          user_id: user.id,
          crm_type: crm.id,
          webhook_url: value,
          crm_display_name: crm.name,
          is_active: true,
          api_key_hint: null,
        }, { onConflict: 'user_id,crm_type' });
        toast({ title: `✅ ${crm.name} connected!`, description: 'Webhook URL saved. Market data will be pushed automatically.' });
      }
      setApiKeyInput('');
      setWebhookInput('');
      queryClient.invalidateQueries({ queryKey: ['crm-connection', user?.id, crm.id] });
    } catch (err: any) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    }
    setValidating(false);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      if (crm.id === 'follow_up_boss') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        await callFubFunction(session, { action: 'disconnect' });
      } else {
        if (!user) throw new Error('Not authenticated');
        await supabase.from('crm_connections')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('crm_type', crm.id);
      }
      toast({ title: `${crm.name} disconnected` });
      queryClient.invalidateQueries({ queryKey: ['crm-connection', user?.id, crm.id] });
    } catch (err: any) {
      toast({ title: 'Error disconnecting', description: err.message, variant: 'destructive' });
    }
    setDisconnecting(false);
  };

  const handlePushAnalysis = async () => {
    if (!pendingPush) return;
    setPushing(true);
    try {
      if (crm.id === 'follow_up_boss') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        await callFubFunction(session, { action: 'push_analysis', ...pendingPush });
      } else if (connection?.webhook_url) {
        await callWebhook(connection.webhook_url, {
          source: 'MarketCompass',
          event: 'market_analysis',
          ...pendingPush,
          timestamp: new Date().toISOString(),
        });
      }
      await logPush('push_analysis', {
        zip_code: pendingPush.zip,
        city_state: pendingPush.cityState,
        opportunity_score: pendingPush.opportunityScore,
        score_delta: pendingPush.scoreDelta ?? 0,
        lead_type: pendingPush.leadType,
        status: 'success',
      });
      toast({
        title: `📤 Pushed to ${crm.name}`,
        description: `Market analysis for ZIP ${pendingPush.zip} logged.${(pendingPush.scoreDelta ?? 0) !== 0 ? ' Score change alert included.' : ''}`,
      });
    } catch (err: any) {
      await logPush('push_analysis', { zip_code: pendingPush.zip, status: 'error', error_msg: err.message });
      toast({ title: 'Push failed', description: err.message, variant: 'destructive' });
    }
    setPushing(false);
  };

  return (
    <Card className={cn(isConnected ? crm.borderColor : 'border-border')}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors rounded-t-xl pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-lg', isConnected ? crm.bgColor : 'bg-muted')}>
                  {crm.logo}
                </div>
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {crm.name}
                    {isConnected && (
                      <Badge variant="outline" className={cn('text-[10px] px-1.5', crm.color, crm.borderColor, crm.bgColor)}>
                        Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight max-w-[200px]">
                    {crm.description.split('.')[0]}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingPush && isConnected && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePushAnalysis(); }}
                    disabled={pushing}
                    className={cn('gap-1 text-[11px] h-7 px-2', crm.bgColor, crm.color, crm.borderColor, 'border hover:opacity-80')}
                    variant="outline"
                  >
                    {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    {pushing ? '…' : 'Push'}
                  </Button>
                )}
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <Separator />

            {!isConnected ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-2 text-xs text-foreground/70">
                  <p className="font-semibold text-foreground text-xs">
                    {crm.authType === 'api_key' ? 'How to get your API key:' : 'How to set up the webhook:'}
                  </p>
                  <ol className="space-y-1 text-[11px] list-decimal list-inside">
                    {crm.docsSteps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  <a href={crm.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary flex items-center gap-1 hover:underline">
                    View docs <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <Input
                    type={crm.authType === 'api_key' ? 'password' : 'url'}
                    placeholder={crm.authType === 'api_key' ? (crm.apiKeyPlaceholder ?? 'API Key') : 'https://your-webhook-url.com'}
                    value={crm.authType === 'api_key' ? apiKeyInput : webhookInput}
                    onChange={e => crm.authType === 'api_key' ? setApiKeyInput(e.target.value) : setWebhookInput(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  />
                  <Button onClick={handleConnect} disabled={validating} size="sm" className="shrink-0 gap-1">
                    {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    {validating ? '…' : 'Connect'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Settings className="h-3 w-3" />Auto-Push Triggers
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { field: 'auto_push_on_analyze', label: 'New ZIP analyzed', desc: 'Push on every new analysis' },
                      { field: 'auto_push_on_score_change', label: 'Score change alert', desc: 'Push on significant score shifts' },
                      { field: 'auto_push_on_csv_upload', label: 'CSV bulk upload', desc: 'Auto-push high-score leads (≥71)' },
                    ].map(({ field, label, desc }) => (
                      <div key={field} className="flex items-center justify-between gap-2">
                        <div>
                          <Label className="text-xs font-medium">{label}</Label>
                          <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={(connection as any)?.[field] ?? true}
                          onCheckedChange={v => updateSetting(field, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 text-xs"
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                  {disconnecting ? 'Disconnecting…' : `Disconnect ${crm.name}`}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface CrmIntegrationHubProps {
  pendingPush?: {
    zip: string;
    cityState: string | null;
    opportunityScore: number;
    leadType: string;
    topFactor: string;
    briefText: string;
    previousScore: number | null;
    scoreDelta: number;
  } | null;
  /** Show compact sidebar variant */
  sidebarMode?: boolean;
}

export function CrmIntegrationHub({ pendingPush, sidebarMode = false }: CrmIntegrationHubProps) {
  const [tab, setTab] = useState<'crms' | 'activity'>('crms');

  if (sidebarMode) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">CRM Integrations</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-9 p-0">
              <TabsTrigger value="crms" className="flex-1 text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Connect
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Activity
              </TabsTrigger>
            </TabsList>
            <TabsContent value="crms" className="p-3 space-y-2 mt-0">
              {CRM_DEFINITIONS.map(crm => (
                <CrmCard key={crm.id} crm={crm} pendingPush={pendingPush} />
              ))}
            </TabsContent>
            <TabsContent value="activity" className="p-3 mt-0">
              <CrmActivityLog />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Full panel (used in main report area)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CRM_DEFINITIONS.map(crm => (
          <CrmCard key={crm.id} crm={crm} pendingPush={pendingPush} />
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">CRM Push Activity</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Last 10 pushes across all connected CRMs</p>
        </CardHeader>
        <CardContent>
          <CrmActivityLog />
        </CardContent>
      </Card>
    </div>
  );
}

// Keep FubIntegrationPanel export for backward compatibility
export { CrmIntegrationHub as FubIntegrationPanel };
