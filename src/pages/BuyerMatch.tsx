import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Sparkles, Flame, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingDetails {
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  neighborhood: string;
  propertyType: string;
  keyFeatures: string;
  description: string;
}

interface BuyerProfile {
  id: string;
  name: string;
  budgetMax: string;
  minBedrooms: string;
  preferredAreas: string;
  mustHaveFeatures: string;
  timeline: string;
  notes: string;
}

interface MatchResult {
  buyerName: string;
  score: number;
  reason: string;
  isHotMatch: boolean;
}

const BUYERS_KEY = 'market_compass_buyer_profiles';
const PROPERTY_TYPES = ['Single-family', 'Condo', 'Townhome', 'Multi-family'];
const TIMELINES = ['ASAP', '1-3 months', '3-6 months', 'Flexible'];

function loadBuyers(): BuyerProfile[] {
  try {
    const raw = localStorage.getItem(BUYERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBuyers(buyers: BuyerProfile[]) {
  localStorage.setItem(BUYERS_KEY, JSON.stringify(buyers));
}

function emptyBuyer(): BuyerProfile {
  return {
    id: crypto.randomUUID(),
    name: '',
    budgetMax: '',
    minBedrooms: '',
    preferredAreas: '',
    mustHaveFeatures: '',
    timeline: 'Flexible',
    notes: '',
  };
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, isHot }: { score: number; isHot: boolean }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'hsl(var(--chart-2))' : score >= 60 ? 'hsl(var(--primary))' : score >= 40 ? 'hsl(210 80% 55%)' : 'hsl(var(--muted-foreground))';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
      {isHot && (
        <Flame className="absolute -top-1 -right-1 h-5 w-5 text-orange-400 drop-shadow" />
      )}
    </div>
  );
}

// ─── Buyer Card ───────────────────────────────────────────────────────────────

function BuyerCard({ buyer, onChange, onRemove }: { buyer: BuyerProfile; onChange: (b: BuyerProfile) => void; onRemove: () => void }) {
  const [collapsed, setCollapsed] = useState(!!buyer.name);

  return (
    <Card className="bg-secondary/40 border-border/40">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">{buyer.name || 'New Buyer'}</span>
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        <button onClick={onRemove} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Trash2 className="h-4 w-4" />
        </button>
      </CardHeader>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <CardContent className="pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={buyer.name} onChange={e => onChange({ ...buyer, name: e.target.value })} placeholder="Client name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Budget Max ($)</Label>
                  <Input type="number" value={buyer.budgetMax} onChange={e => onChange({ ...buyer, budgetMax: e.target.value })} placeholder="750000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Min Bedrooms</Label>
                  <Input type="number" value={buyer.minBedrooms} onChange={e => onChange({ ...buyer, minBedrooms: e.target.value })} placeholder="3" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Timeline</Label>
                  <Select value={buyer.timeline} onValueChange={v => onChange({ ...buyer, timeline: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMELINES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Preferred Areas</Label>
                <Input value={buyer.preferredAreas} onChange={e => onChange({ ...buyer, preferredAreas: e.target.value })} placeholder="e.g. Back Bay, Brookline" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Must-Have Features</Label>
                <Input value={buyer.mustHaveFeatures} onChange={e => onChange({ ...buyer, mustHaveFeatures: e.target.value })} placeholder="e.g. garage, yard, updated kitchen" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={buyer.notes} onChange={e => onChange({ ...buyer, notes: e.target.value })} rows={2} placeholder="Any additional context..." className="resize-none" />
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BuyerMatch() {
  const [listing, setListing] = useState<ListingDetails>({
    address: '', price: '', bedrooms: '', bathrooms: '', sqft: '',
    neighborhood: '', propertyType: 'Single-family', keyFeatures: '', description: '',
  });
  const [buyers, setBuyers] = useState<BuyerProfile[]>(loadBuyers);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { saveBuyers(buyers); }, [buyers]);

  const addBuyer = () => setBuyers(prev => [...prev, emptyBuyer()]);
  const removeBuyer = (id: string) => setBuyers(prev => prev.filter(b => b.id !== id));
  const updateBuyer = (id: string, updated: BuyerProfile) => setBuyers(prev => prev.map(b => b.id === id ? updated : b));

  const runMatch = useCallback(async () => {
    const validBuyers = buyers.filter(b => b.name.trim());
    if (!listing.address.trim() || !listing.price.trim()) {
      toast({ title: 'Missing listing info', description: 'Please enter at least the address and price.', variant: 'destructive' });
      return;
    }
    if (validBuyers.length === 0) {
      toast({ title: 'No buyers', description: 'Add at least one buyer with a name.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('buyer-match', {
        body: { listing, buyers: validBuyers },
      });
      if (error) throw error;

      const matches: MatchResult[] = data?.matches ?? data;
      if (!Array.isArray(matches)) throw new Error('Invalid response');

      setResults(matches.sort((a, b) => b.score - a.score));
    } catch (err: any) {
      console.error('Buyer match error:', err);
      toast({ title: 'Match failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [listing, buyers]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-sans font-bold">Buyer Match</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered buyer-to-listing matching — an industry first.</p>
      </motion.div>

      {/* Listing Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">New Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Input value={listing.address} onChange={e => setListing(l => ({ ...l, address: e.target.value }))} placeholder="123 Main St, Boston MA" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Price ($)</Label>
                <Input type="number" value={listing.price} onChange={e => setListing(l => ({ ...l, price: e.target.value }))} placeholder="650000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                <Input type="number" value={listing.bedrooms} onChange={e => setListing(l => ({ ...l, bedrooms: e.target.value }))} placeholder="3" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                <Input type="number" value={listing.bathrooms} onChange={e => setListing(l => ({ ...l, bathrooms: e.target.value }))} placeholder="2" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sqft</Label>
                <Input type="number" value={listing.sqft} onChange={e => setListing(l => ({ ...l, sqft: e.target.value }))} placeholder="1800" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Neighborhood / Area</Label>
                <Input value={listing.neighborhood} onChange={e => setListing(l => ({ ...l, neighborhood: e.target.value }))} placeholder="Back Bay" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Property Type</Label>
                <Select value={listing.propertyType} onValueChange={v => setListing(l => ({ ...l, propertyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Key Features</Label>
              <Textarea value={listing.keyFeatures} onChange={e => setListing(l => ({ ...l, keyFeatures: e.target.value }))} rows={2} placeholder="e.g. garage, yard, updated kitchen, near top schools" className="resize-none" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={listing.description} onChange={e => setListing(l => ({ ...l, description: e.target.value }))} rows={2} placeholder="Brief listing description..." className="resize-none" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Buyers */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-sans font-semibold">Your Buyers</h2>
          <Button variant="outline" size="sm" onClick={addBuyer} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Buyer
          </Button>
        </div>
        {buyers.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No buyer profiles yet. Click "+ Add Buyer" to start building your client roster.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {buyers.map(b => (
              <BuyerCard key={b.id} buyer={b} onChange={u => updateBuyer(b.id, u)} onRemove={() => removeBuyer(b.id)} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Run Match */}
      <div className="flex justify-center pt-2">
        <Button onClick={runMatch} disabled={loading} size="lg" className="gap-2 px-8 accent-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
          <Sparkles className="h-4 w-4" />
          {loading ? 'Matching…' : 'Run Buyer Match'}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold">Match Results</h2>
              <button onClick={() => setResults(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
            {results.map((r, i) => (
              <motion.div key={r.buyerName} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className={cn(
                  'transition-all',
                  r.isHotMatch && 'ring-1 ring-orange-400/40 bg-orange-500/5'
                )}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <ScoreRing score={r.score} isHot={r.isHotMatch} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{r.buyerName}</span>
                        {r.isHotMatch && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                            Hot Match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{r.reason}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
