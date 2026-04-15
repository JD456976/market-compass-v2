import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Sparkles, Flame, ChevronDown, ChevronUp, X, Mail, Copy, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    name: '', budgetMax: '', minBedrooms: '', preferredAreas: '',
    mustHaveFeatures: '', timeline: 'Flexible', notes: '',
  };
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, isHot }: { score: number; isHot: boolean }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = score >= 75 ? 'hsl(142 70% 45%)' : score >= 50 ? 'hsl(38 72% 58%)' : 'hsl(0 72% 51%)';

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke={ringColor} strokeWidth="5"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums" style={{ color: ringColor }}>{score}</span>
      {isHot && (
        <Star className="absolute -top-1 -right-1 h-5 w-5 text-primary fill-primary drop-shadow" />
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

// ─── Match Result Card ────────────────────────────────────────────────────────

function MatchResultCard({
  result: r,
  index,
  listing,
  buyers,
}: {
  result: MatchResult;
  index: number;
  listing: ListingDetails;
  buyers: BuyerProfile[];
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const draftEmail = async () => {
    setEmailLoading(true);
    try {
      const buyer = buyers.find(b => b.name === r.buyerName);
      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: 'You are a real estate agent. Write a concise, warm email introducing a listing to a buyer. Keep it under 150 words.',
          messages: [{ role: 'user', content: `Write an email to ${r.buyerName} about the listing at ${listing.address} listed at ${listing.price}. Match score: ${r.score}/100. Reason: ${r.reason}. Make it feel personal and highlight why this fits them.` }],
        }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const result = await resp.json();
      setEmail(result?.content?.[0]?.text || 'Could not generate email.');
    } catch (err: any) {
      toast({ title: 'Email draft failed', description: err.message, variant: 'destructive' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    toast({ title: 'Email copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
      <Card className={cn(
        'transition-all',
        r.isHotMatch && 'ring-1 ring-primary/30 bg-primary/5'
      )}>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-4">
            <ScoreRing score={r.score} isHot={r.isHotMatch} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{r.buyerName}</span>
                {r.isHotMatch && (
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] gap-1">
                    <Star className="h-3 w-3 fill-primary" />
                    Hot Match
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{r.reason}</p>
            </div>
          </div>

          {/* Draft Email button / output */}
          {email ? (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2" style={{ borderLeft: '3px solid hsl(38 72% 58%)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Draft Outreach Email
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{email}</p>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-primary/20 text-primary hover:bg-primary/10"
              onClick={draftEmail}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Draft Email
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
      toast({ title: 'Missing listing info', description: 'Enter at least the address and price.', variant: 'destructive' });
      return;
    }
    if (validBuyers.length === 0) {
      toast({ title: 'No buyers', description: 'Add at least one buyer with a name.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const buyerList = validBuyers.map(b =>
        `- ${b.name}: budget ${b.budget || 'unspecified'}, wants ${b.bedrooms || '?'}bd/${b.bathrooms || '?'}ba, ${b.propertyType || 'any type'}, neighborhoods: ${b.neighborhoods || 'flexible'}, timeline: ${b.timeline || 'unknown'}, preapproved: ${b.preapproved ? 'yes' : 'no'}`
      ).join('\n');
      const prompt = `You are a real estate buyer-matching AI. Given this listing and buyers, score each buyer 0-100 for fit.

LISTING:
Address: ${listing.address}
Price: ${listing.price}
Beds: ${listing.bedrooms} | Baths: ${listing.bathrooms} | Sqft: ${listing.sqft}
Type: ${listing.propertyType} | Neighborhood: ${listing.neighborhood}
Features: ${listing.keyFeatures}

BUYERS:
${buyerList}

Return ONLY valid JSON array, no markdown:
[{"buyerName":"...","score":85,"isHotMatch":true,"reason":"2-3 sentence explanation","emailSubject":"suggested email subject"}]`;

      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a real estate buyer-matching assistant. Always respond with valid JSON only, no markdown or explanation.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const result = await resp.json();
      const text = result?.content?.[0]?.text || '[]';
      const clean = text.replace(/```json|```/g, '').trim();
      const matches: MatchResult[] = JSON.parse(clean);
      if (!Array.isArray(matches)) throw new Error('Invalid response');
      setResults(matches.sort((a, b) => b.score - a.score));
    } catch (err: any) {
      toast({ title: 'Match failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [listing, buyers]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-sans font-bold text-foreground">Buyer Match</h1>
            <p className="text-sm text-muted-foreground">AI-powered buyer-to-listing matching — an industry first</p>
          </div>
        </div>
      </motion.div>

      {/* Listing Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans">New Listing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Address *</Label>
              <Input value={listing.address} onChange={e => setListing(l => ({ ...l, address: e.target.value }))} placeholder="123 Main St, Boston MA" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Price ($) *</Label>
                <Input type="number" value={listing.price} onChange={e => setListing(l => ({ ...l, price: e.target.value }))} placeholder="650000" className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Beds</Label>
                <Input type="number" value={listing.bedrooms} onChange={e => setListing(l => ({ ...l, bedrooms: e.target.value }))} placeholder="3" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Baths</Label>
                <Input type="number" value={listing.bathrooms} onChange={e => setListing(l => ({ ...l, bathrooms: e.target.value }))} placeholder="2" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sqft</Label>
                <Input type="number" value={listing.sqft} onChange={e => setListing(l => ({ ...l, sqft: e.target.value }))} placeholder="1800" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label className="text-xs text-muted-foreground">Brief Description</Label>
              <Textarea value={listing.description} onChange={e => setListing(l => ({ ...l, description: e.target.value }))} rows={2} placeholder="Brief listing description..." className="resize-none" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Buyers */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-sans font-semibold">Your Buyers</h2>
          <Button variant="outline" size="sm" onClick={addBuyer} className="gap-1.5 border-primary/20 text-primary hover:bg-primary/10">
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
              <h2 className="text-lg font-sans font-semibold">Match Results</h2>
              <button onClick={() => setResults(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
            {results.map((r, i) => (
              <MatchResultCard key={r.buyerName} result={r} index={i} listing={listing} buyers={buyers} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
