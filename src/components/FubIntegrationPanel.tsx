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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle,
  Link2, Link2Off, ExternalLink, Settings, Zap,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface CrmConnection {
  is_active: boolean;
  api_key_hint: string | null;
  auto_push_on_analyze: boolean;
  auto_push_on_score_change: boolean;
  score_change_threshold: number;
  auto_push_on_csv_upload: boolean;
}

interface FubIntegrationPanelProps {
  /** If provided, show a one-click "Push this analysis" button */
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
  /** Show compact mode (sidebar) vs full settings mode */
  compact?: boolean;
}

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

export function FubIntegrationPanel({ pendingPush, compact = false }: FubIntegrationPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: connection, isLoading } = useQuery<CrmConnection | null>({
    queryKey: ['fub-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('crm_connections')
        .select('is_active, api_key_hint, auto_push_on_analyze, auto_push_on_score_change, score_change_threshold, auto_push_on_csv_upload')
        .eq('user_id', user.id)
        .eq('crm_type', 'follow_up_boss')
        .maybeSingle();
      return (data as CrmConnection | null) ?? null;
    },
    enabled: !!user,
  });

  const isConnected = !!(connection?.is_active);

  const updateSetting = async (field: keyof CrmConnection, value: boolean | number) => {
    if (!user) return;
    await supabase
      .from('crm_connections')
      .update({ [field]: value })
      .eq('user_id', user.id)
      .eq('crm_type', 'follow_up_boss');
    queryClient.invalidateQueries({ queryKey: ['fub-connection', user?.id] });
  };

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) {
      toast({ title: 'Enter your API key', variant: 'destructive' });
      return;
    }
    setValidating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const result = await callFubFunction(session, { action: 'validate', apiKey: apiKeyInput.trim() });
      if (!result.valid) throw new Error(result.error || 'Invalid API key');
      toast({ title: '✅ Follow Up Boss connected!', description: `Account: ${result.account}` });
      setApiKeyInput('');
      queryClient.invalidateQueries({ queryKey: ['fub-connection', user?.id] });
    } catch (err: any) {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    }
    setValidating(false);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await callFubFunction(session, { action: 'disconnect' });
      toast({ title: 'Follow Up Boss disconnected' });
      queryClient.invalidateQueries({ queryKey: ['fub-connection', user?.id] });
    } catch (err: any) {
      toast({ title: 'Error disconnecting', description: err.message, variant: 'destructive' });
    }
    setDisconnecting(false);
  };

  const handlePushAnalysis = async () => {
    if (!pendingPush) return;
    setPushing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await callFubFunction(session, {
        action: 'push_analysis',
        ...pendingPush,
      });
      toast({
        title: '📤 Pushed to Follow Up Boss',
        description: `Market analysis for ZIP ${pendingPush.zip} logged as an event in FUB.${pendingPush.scoreDelta !== 0 ? ' Score change task created.' : ''}`,
      });
    } catch (err: any) {
      toast({ title: 'Push failed', description: err.message, variant: 'destructive' });
    }
    setPushing(false);
  };

  if (isLoading) {
    return <div className="h-12 bg-muted/30 rounded-xl animate-pulse" />;
  }

  // ── Compact mode: just show push button + connection status badge ─────────
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {isConnected ? (
          <>
            <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50 dark:bg-green-950/30 dark:text-green-400 gap-1.5 text-xs">
              <CheckCircle2 className="h-3 w-3" />FUB Connected
            </Badge>
            {pendingPush && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePushAnalysis}
                disabled={pushing}
                className="gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/5"
              >
                {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                {pushing ? 'Pushing…' : 'Push to FUB'}
              </Button>
            )}
          </>
        ) : (
          <Badge variant="outline" className="text-muted-foreground gap-1.5 text-xs cursor-pointer" onClick={() => setOpen(true)}>
            <Link2Off className="h-3 w-3" />Connect FUB
          </Badge>
        )}
      </div>
    );
  }

  // ── Full settings panel ────────────────────────────────────────────────────
  return (
    <Card className={cn(isConnected ? 'border-emerald-200 dark:border-emerald-800' : 'border-border')}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors rounded-t-xl pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  isConnected ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-muted'
                )}>
                  {isConnected
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    : <Link2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Follow Up Boss
                    {isConnected && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] px-1.5">
                        Connected ···{connection?.api_key_hint}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isConnected
                      ? 'Auto-push market analyses, score alerts & leads'
                      : 'Connect to push market intelligence directly into your CRM'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingPush && isConnected && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePushAnalysis(); }}
                    disabled={pushing}
                    className="gap-1.5 text-xs"
                  >
                    {pushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {pushing ? 'Pushing…' : 'Push to FUB'}
                  </Button>
                )}
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            <Separator />

            {!isConnected ? (
              /* ── Connection form ─────────────────────────────────────── */
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-2 text-sm text-foreground/70">
                  <p className="font-semibold text-foreground text-sm">How to get your API key:</p>
                  <ol className="space-y-1 text-xs list-decimal list-inside">
                    <li>Log in to Follow Up Boss</li>
                    <li>Go to <strong>Admin → API</strong></li>
                    <li>Copy your API key (starts with <code className="bg-muted px-1 rounded">fka_</code>)</li>
                  </ol>
                  <a
                    href="https://help.followupboss.com/article/127-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    View FUB API docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="fka_••••••••••••••••"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  />
                  <Button onClick={handleConnect} disabled={validating || !apiKeyInput.trim()} className="gap-1.5 shrink-0">
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    {validating ? 'Validating…' : 'Connect'}
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Your API key is stored securely and never exposed to other users.
                </p>
              </div>
            ) : (
              /* ── Connected settings ──────────────────────────────────── */
              <div className="space-y-5">

                {/* What gets pushed */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Settings className="h-3 w-3" />Auto-Push Triggers
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-sm font-medium">New ZIP analyzed</Label>
                        <p className="text-[11px] text-muted-foreground">Log a FUB event every time you analyze a market</p>
                      </div>
                      <Switch
                        checked={connection?.auto_push_on_analyze ?? true}
                        onCheckedChange={v => updateSetting('auto_push_on_analyze', v)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-sm font-medium">Score change alert</Label>
                        <p className="text-[11px] text-muted-foreground">Create a FUB task when a saved market's score changes significantly</p>
                      </div>
                      <Switch
                        checked={connection?.auto_push_on_score_change ?? true}
                        onCheckedChange={v => updateSetting('auto_push_on_score_change', v)}
                      />
                    </div>

                    {connection?.auto_push_on_score_change && (
                      <div className="flex items-center gap-3 pl-4 border-l-2 border-border/50">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Alert threshold</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={connection?.score_change_threshold ?? 10}
                          onChange={e => updateSetting('score_change_threshold', parseInt(e.target.value, 10) || 10)}
                          className="w-20 h-8 text-sm text-center"
                        />
                        <span className="text-xs text-muted-foreground">points</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-sm font-medium">CSV bulk upload</Label>
                        <p className="text-[11px] text-muted-foreground">Push high-scoring leads (score ≥ 71) as FUB contacts after CSV scoring</p>
                      </div>
                      <Switch
                        checked={connection?.auto_push_on_csv_upload ?? true}
                        onCheckedChange={v => updateSetting('auto_push_on_csv_upload', v)}
                      />
                    </div>
                  </div>
                </div>

                {/* What FUB receives */}
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs">What gets sent to Follow Up Boss:</p>
                  <ul className="space-y-1">
                    <li>• <strong>Events</strong> — market analysis with score, lead type & market brief</li>
                    <li>• <strong>Tags</strong> — <code className="bg-muted px-1 rounded">MC:seller-market</code>, <code className="bg-muted px-1 rounded">MC:score-72</code>, <code className="bg-muted px-1 rounded">MC:zip-02108</code></li>
                    <li>• <strong>Tasks</strong> — score change alerts assigned to you, due tomorrow</li>
                    <li>• <strong>Contacts</strong> — high-scoring CSV leads imported with MC tags</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Follow Up Boss'}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
