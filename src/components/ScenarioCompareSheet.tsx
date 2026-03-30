import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BuyerInputs, SellerInputs } from '@/types';
import { cn } from '@/lib/utils';

interface ScenarioCompareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioId: string;
  reportId: string;
  clientName?: string;
  scenarioTitle?: string;
  noteToAgent?: string;
  scenarioPayload: BuyerInputs | SellerInputs;
  onAction?: (id: string, action: 'accepted' | 'needs_changes') => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const BUYER_FIELD_LABELS: Record<string, string> = {
  offer_price: 'Offer Price',
  financing_type: 'Financing Type',
  down_payment_percent: 'Down Payment',
  contingencies: 'Contingencies',
  closing_timeline: 'Closing Timeline',
  buyer_preference: 'Buyer Preference',
};

const SELLER_FIELD_LABELS: Record<string, string> = {
  seller_selected_list_price: 'List Price',
  desired_timeframe: 'Desired Timeframe',
  strategy_preference: 'Strategy Preference',
};

function formatValue(key: string, value: any): string {
  if (value == null || value === undefined) return '—';
  if (key === 'offer_price' || key === 'seller_selected_list_price') return formatCurrency(value as number);
  if (key === 'contingencies' && Array.isArray(value)) return value.length === 0 ? 'None' : value.join(', ');
  if (key === 'down_payment_percent') {
    const labels: Record<string, string> = { '<10': 'Less than 10%', '10-19': '10–19%', '20+': '20% or more' };
    return labels[value] || String(value);
  }
  if (key === 'closing_timeline') {
    const labels: Record<string, string> = { '<21': 'Under 21 days', '21-30': '21–30 days', '31-45': '31–45 days', '45+': 'Over 45 days' };
    return labels[value] || String(value);
  }
  if (key === 'desired_timeframe') {
    const labels: Record<string, string> = { '30': '30 days', '60': '60 days', '90+': '90+ days' };
    return labels[value] || String(value);
  }
  return String(value);
}

function hasChanged(key: string, original: any, modified: any): boolean {
  if (key === 'contingencies') {
    const a = new Set(original || []);
    const b = new Set(modified || []);
    return a.size !== b.size || [...a].some(v => !b.has(v));
  }
  return original !== modified;
}

export function ScenarioCompareSheet({
  open,
  onOpenChange,
  scenarioId,
  reportId,
  clientName,
  scenarioTitle,
  noteToAgent,
  scenarioPayload,
  onAction,
}: ScenarioCompareSheetProps) {
  const { toast } = useToast();
  const [original, setOriginal] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionType, setSessionType] = useState<'Buyer' | 'Seller'>('Buyer');

  useEffect(() => {
    if (!open || !reportId) return;
    const fetchOriginal = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('sessions')
          .select('buyer_inputs, seller_inputs, session_type')
          .eq('id', reportId)
          .single();
        if (data) {
          const type = data.session_type === 'Seller' ? 'Seller' : 'Buyer';
          setSessionType(type);
          const inputs = type === 'Seller' ? data.seller_inputs : data.buyer_inputs;
          setOriginal(inputs as Record<string, any> || null);
        }
      } catch (err) {
        console.error('Error fetching original:', err);
      }
      setLoading(false);
    };
    fetchOriginal();
  }, [open, reportId]);

  const fieldLabels = sessionType === 'Seller' ? SELLER_FIELD_LABELS : BUYER_FIELD_LABELS;
  const compareFields = Object.keys(fieldLabels);

  const handleAction = async (action: 'accepted' | 'needs_changes') => {
    setSending(true);
    try {
      // If there's a comment, send it as a message first
      if (comment.trim()) {
        await supabase.from('report_messages').insert({
          report_id: reportId,
          sender_role: 'agent',
          sender_id: 'agent',
          body: `Re: ${scenarioTitle || 'Scenario'} — ${comment.trim()}`,
          read_by_agent_at: new Date().toISOString(),
        });
        supabase.functions.invoke('report-notifications', {
          body: {
            type: 'agent_reply',
            report_id: reportId,
            sender_name: 'Agent',
            message_snippet: comment.trim().slice(0, 200),
          },
        }).catch(() => {});
      }

      onAction?.(scenarioId, action);
      toast({ title: action === 'accepted' ? 'Scenario accepted' : 'Changes requested' });
      setComment('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error handling action:', err);
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-sans">
            {scenarioTitle || 'Client Scenario'}
          </SheetTitle>
          <SheetDescription>
            {clientName ? `Submitted by ${clientName}` : 'Review client changes side-by-side'}
          </SheetDescription>
        </SheetHeader>

        {noteToAgent && (
          <Card className="mb-4 border-accent/20 bg-accent/5">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Client's note</p>
              <p className="text-sm italic">"{noteToAgent}"</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading comparison…</div>
        ) : !original ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No baseline data found for this report.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-1 pb-2 border-b border-border mb-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Original</span>
              <span />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Client's Version</span>
            </div>

            {compareFields.map(key => {
              const origVal = (original as any)[key];
              const modVal = (scenarioPayload as any)[key];
              const changed = hasChanged(key, origVal, modVal);

              return (
                <div
                  key={key}
                  className={cn(
                    'grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-2 py-2.5 rounded-lg transition-colors',
                    changed ? 'bg-accent/8 border border-accent/20' : 'border border-transparent'
                  )}
                >
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{fieldLabels[key]}</p>
                    <p className={cn('text-sm', changed ? 'text-muted-foreground line-through' : '')}>{formatValue(key, origVal)}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    {changed && <ArrowRight className="h-3.5 w-3.5 text-accent" />}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">&nbsp;</p>
                    <p className={cn('text-sm', changed ? 'font-medium text-accent' : '')}>
                      {formatValue(key, modVal)}
                    </p>
                  </div>
                </div>
              );
            })}

            {(() => {
              const changedCount = compareFields.filter(k => hasChanged(k, (original as any)[k], (scenarioPayload as any)[k])).length;
              return (
                <div className="pt-3 border-t border-border mt-3">
                  <Badge variant={changedCount > 0 ? 'accent' : 'secondary'} className="text-[10px]">
                    {changedCount} change{changedCount !== 1 ? 's' : ''} from original
                  </Badge>
                </div>
              );
            })()}
          </div>
        )}

        {/* Optional comment (inline, no separate send button) */}
        <div className="mt-6 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Optional feedback for the client</p>
          <Textarea
            placeholder="Add a note about your decision…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="text-sm min-h-[60px] resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 mt-2">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => handleAction('needs_changes')}
            disabled={sending}
          >
            <AlertCircle className="h-4 w-4 mr-1.5" />
            Needs Changes
          </Button>
          <Button
            className="flex-1 min-h-[44px]"
            onClick={() => handleAction('accepted')}
            disabled={sending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Accept
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
