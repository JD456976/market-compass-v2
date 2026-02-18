import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
import {
  Trophy, TrendingUp, Target, Plus, Trash2, Home, CheckCircle2,
  XCircle, Clock, Minus, BarChart3, Percent, Users, Loader2, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfferOutcome {
  id: string;
  address: string;
  list_price: number;
  offer_price: number;
  result: 'won' | 'lost' | 'withdrawn' | 'pending';
  competing_offers: number;
  days_on_market: number;
  financing_type: string;
  had_inspection_contingency: boolean;
  had_escalation: boolean;
  notes: string | null;
  created_at: string;
}

const RESULT_CONFIG = {
  won: { label: 'Won', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: 'success' as const },
  lost: { label: 'Lost', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  withdrawn: { label: 'Withdrawn', icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/50', badge: 'secondary' as const },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'warning' as const },
};

const DEFAULT_FORM = {
  address: '',
  list_price: '',
  offer_price: '',
  result: 'pending' as const,
  competing_offers: '0',
  days_on_market: '0',
  financing_type: 'Conventional',
  had_inspection_contingency: true,
  had_escalation: false,
  notes: '',
};

export default function OfferTracker() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: outcomes = [], isLoading } = useQuery({
    queryKey: ['offer-outcomes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_outcomes' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferOutcome[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (values: typeof DEFAULT_FORM) => {
      const { error } = await supabase.from('offer_outcomes' as any).insert({
        user_id: user!.id,
        address: values.address,
        list_price: parseInt(values.list_price.replace(/\D/g, '')) || 0,
        offer_price: parseInt(values.offer_price.replace(/\D/g, '')) || 0,
        result: values.result,
        competing_offers: parseInt(values.competing_offers) || 0,
        days_on_market: parseInt(values.days_on_market) || 0,
        financing_type: values.financing_type,
        had_inspection_contingency: values.had_inspection_contingency,
        had_escalation: values.had_escalation,
        notes: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-outcomes'] });
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      toast({ title: 'Offer logged', description: 'Your offer outcome has been saved.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save offer.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offer_outcomes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-outcomes'] });
      setDeleteId(null);
      toast({ title: 'Deleted', description: 'Offer removed.' });
    },
  });

  // ── Analytics ────────────────────────────────────────────────────────────────
  const closed = outcomes.filter(o => o.result === 'won' || o.result === 'lost');
  const won = outcomes.filter(o => o.result === 'won');
  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : null;

  const avgPriceRatio = won.length > 0
    ? (won.reduce((s, o) => s + (o.offer_price / o.list_price), 0) / won.length * 100).toFixed(1)
    : null;

  const avgCompeting = closed.length > 0
    ? (closed.reduce((s, o) => s + o.competing_offers, 0) / closed.length).toFixed(1)
    : null;

  const escalationWinRate = (() => {
    const withEsc = closed.filter(o => o.had_escalation);
    if (withEsc.length === 0) return null;
    return Math.round(withEsc.filter(o => o.result === 'won').length / withEsc.length * 100);
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Offer Tracker</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Log every offer to build your personal win-rate model.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Log Offer
          </Button>
        </div>

        {/* Stat Cards */}
        {outcomes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Win Rate',
                value: winRate !== null ? `${winRate}%` : '—',
                icon: Trophy,
                sub: `${won.length} of ${closed.length} offers`,
                highlight: winRate !== null && winRate >= 50,
              },
              {
                label: 'Avg Offer / List',
                value: avgPriceRatio ? `${avgPriceRatio}%` : '—',
                icon: Percent,
                sub: 'On winning offers',
                highlight: false,
              },
              {
                label: 'Avg Competition',
                value: avgCompeting ?? '—',
                icon: Users,
                sub: 'Competing offers faced',
                highlight: false,
              },
              {
                label: 'Escalation Win Rate',
                value: escalationWinRate !== null ? `${escalationWinRate}%` : '—',
                icon: ArrowUpRight,
                sub: 'When using escalation',
                highlight: escalationWinRate !== null && escalationWinRate >= 60,
              },
            ].map((stat) => (
              <Card key={stat.label} className={cn('transition-all', stat.highlight && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                      <p className={cn('text-2xl font-bold mt-1 font-serif', stat.highlight && 'text-primary')}>{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                    </div>
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', stat.highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                      <stat.icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Outcomes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : outcomes.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold">No offers logged yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Every offer you log builds your personal win-rate model. Start with your most recent one.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Log Your First Offer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {outcomes.map((o, i) => {
                const cfg = RESULT_CONFIG[o.result];
                const ratio = ((o.offer_price / o.list_price) * 100).toFixed(1);
                return (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="group hover:border-border transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                              <cfg.icon className={cn('h-4.5 w-4.5', cfg.color)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">{o.address}</p>
                                <Badge variant={cfg.badge} className="text-[10px] px-2 py-0">{cfg.label}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                <span className="text-xs text-muted-foreground">
                                  Offer: <span className="text-foreground font-medium">{formatCurrency(o.offer_price)}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  List: <span className="text-foreground font-medium">{formatCurrency(o.list_price)}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Ratio: <span className={cn('font-medium', parseFloat(ratio) > 100 ? 'text-emerald-500' : 'text-foreground')}>{ratio}%</span>
                                </span>
                                {o.competing_offers > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {o.competing_offers} competing
                                  </span>
                                )}
                                <div className="flex gap-1 flex-wrap">
                                  {o.had_escalation && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Escalation</Badge>}
                                  {!o.had_inspection_contingency && <Badge variant="outline" className="text-[9px] px-1.5 py-0">No Inspection</Badge>}
                                </div>
                              </div>
                              {o.notes && (
                                <p className="text-[11px] text-muted-foreground mt-1.5 italic line-clamp-1">{o.notes}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => setDeleteId(o.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Log Offer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Log an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Property Address</Label>
              <Input
                placeholder="123 Main St, Boston MA"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>List Price</Label>
                <Input
                  placeholder="$500,000"
                  value={form.list_price}
                  onChange={e => setForm(f => ({ ...f, list_price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Offer Price</Label>
                <Input
                  placeholder="$520,000"
                  value={form.offer_price}
                  onChange={e => setForm(f => ({ ...f, offer_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">Won ✅</SelectItem>
                  <SelectItem value="lost">Lost ❌</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="pending">Pending ⏳</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Competing Offers</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.competing_offers}
                  onChange={e => setForm(f => ({ ...f, competing_offers: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Days on Market</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.days_on_market}
                  onChange={e => setForm(f => ({ ...f, days_on_market: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Financing Type</Label>
              <Select value={form.financing_type} onValueChange={v => setForm(f => ({ ...f, financing_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Conventional', 'FHA', 'VA', 'Cash', 'USDA', 'Jumbo'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Inspection Contingency</Label>
                <Switch
                  checked={form.had_inspection_contingency}
                  onCheckedChange={v => setForm(f => ({ ...f, had_inspection_contingency: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Escalation Clause</Label>
                <Switch
                  checked={form.had_escalation}
                  onCheckedChange={v => setForm(f => ({ ...f, had_escalation: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="What factors do you think determined the outcome?"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate(form)}
              disabled={!form.address || !form.list_price || !form.offer_price || addMutation.isPending}
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this offer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove it from your win-rate model permanently.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
