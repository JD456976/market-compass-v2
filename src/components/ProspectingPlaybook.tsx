/**
 * ProspectingPlaybook — Agent-only panel that surfaces copy-paste-ready
 * social posts, mailer angles, community event ideas, and sphere scripts
 * grounded in live FRED signals. 100% deterministic — no AI, no cost.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Copy, Check, Sparkles,
  Instagram, Linkedin, Mail, Users, Phone, Settings2, X,
  BookmarkPlus, BookmarkCheck, Loader2, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePlaybook, PlaybookInput, PlaybookPlatform, PlaybookItem } from '@/lib/prospectingPlaybook';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Platform icons + colours ─────────────────────────────────────────────────

const platformMeta: Record<PlaybookPlatform, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  instagram: {
    icon: <Instagram className="h-3.5 w-3.5" />,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800',
  },
  facebook: {
    icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  linkedin: {
    icon: <Linkedin className="h-3.5 w-3.5" />,
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800',
  },
  mailer: {
    icon: <Mail className="h-3.5 w-3.5" />,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  community: {
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  sphere: {
    icon: <Phone className="h-3.5 w-3.5" />,
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
  },
};

// ─── Personalization state ────────────────────────────────────────────────────

interface PersonalizationConfig {
  agentName: string;
  brokerage: string;
  phone: string;
  licenseNum: string;
  cta: string;
}

const DEFAULT_CONFIG: PersonalizationConfig = {
  agentName: '',
  brokerage: '',
  phone: '',
  licenseNum: '',
  cta: '',
};

function applyPersonalization(body: string, cfg: PersonalizationConfig): string {
  let out = body;
  if (cfg.agentName) {
    out = out.replace(/\[Agent Name\]/g, cfg.agentName);
    out = out.replace(/\[Name\]/g, cfg.agentName);
  }
  if (cfg.brokerage) out = out.replace(/\[Brokerage\]/g, cfg.brokerage);
  if (cfg.phone) out = out.replace(/\[your number\]/g, cfg.phone);
  if (cfg.licenseNum) out = out.replace(/\[License #\]/g, cfg.licenseNum);
  if (cfg.cta) {
    out = out.trimEnd() + `\n\n${cfg.cta}`;
  }
  return out;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard' });
  };
  return (
    <Button
      size={small ? 'sm' : 'sm'}
      variant="ghost"
      onClick={handle}
      className={cn('gap-1.5 text-xs', small && 'h-7 px-2')}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// ─── Single playbook card ─────────────────────────────────────────────────────

function PlaybookCard({
  item,
  cfg,
}: {
  item: ReturnType<typeof generatePlaybook>['items'][number];
  cfg: PersonalizationConfig;
}) {
  const [open, setOpen] = useState(false);
  const meta = platformMeta[item.platform];
  const personalizedBody = applyPersonalization(item.body, cfg);

  return (
    <div className={cn('rounded-xl border overflow-hidden', meta.border)}>
      {/* Header */}
      <button
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-95',
          meta.bg,
        )}
        onClick={() => setOpen(o => !o)}
      >
        <span className={cn('shrink-0', meta.color)}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-bold uppercase tracking-widest', meta.color)}>
              {item.label}
            </span>
            {item.emoji && <span className="text-sm">{item.emoji}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
            {item.headline}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={cn('text-[9px] px-1.5 hidden sm:flex', meta.color, meta.border)}>
            {item.hook}
          </Badge>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="bg-card border-t border-border">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Grounded in:
              </span>
              <Badge variant="outline" className={cn('text-[9px] px-2', meta.color, meta.border)}>
                {item.hook}
              </Badge>
            </div>

            <div className="relative">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground/90 bg-muted/30 rounded-lg p-4 border border-border/50 overflow-x-auto">
                {personalizedBody}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={personalizedBody} small />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/60 italic">
              {cfg.agentName || cfg.brokerage || cfg.phone
                ? 'Personalization applied. Double-check all details before posting.'
                : 'Replace bracketed placeholders [Name], [your number], etc. before posting. All data points sourced from Federal Reserve Economic Data (FRED).'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customize panel ──────────────────────────────────────────────────────────

function CustomizePanel({
  cfg,
  onChange,
  onClose,
}: {
  cfg: PersonalizationConfig;
  onChange: (c: PersonalizationConfig) => void;
  onClose: () => void;
}) {
  const set = (key: keyof PersonalizationConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...cfg, [key]: e.target.value });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Personalize Your Copy</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Fill in your details once — all 5 assets update instantly. Leave any field blank to keep the placeholder.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Your Name</Label>
          <Input
            placeholder="Jane Smith"
            value={cfg.agentName}
            onChange={set('agentName')}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Brokerage</Label>
          <Input
            placeholder="Compass / Keller Williams / etc."
            value={cfg.brokerage}
            onChange={set('brokerage')}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Phone / Contact</Label>
          <Input
            placeholder="(555) 123-4567"
            value={cfg.phone}
            onChange={set('phone')}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">License #</Label>
          <Input
            placeholder="DRE 01234567"
            value={cfg.licenseNum}
            onChange={set('licenseNum')}
            className="h-8 text-xs"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-medium">Custom Call-to-Action <span className="text-muted-foreground font-normal">(appended to every asset)</span></Label>
          <Input
            placeholder="Text me at (555) 123-4567 or visit www.yoursite.com to get started."
            value={cfg.cta}
            onChange={set('cta')}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {(cfg.agentName || cfg.brokerage || cfg.phone || cfg.cta) && (
        <div className="flex items-center gap-2 pt-1">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Personalization active — expand any card to see updated copy.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Saved playbook type ──────────────────────────────────────────────────────

interface SavedPlaybook {
  id: string;
  zip_code: string;
  city_state: string | null;
  lead_type: string;
  opportunity_score: number | null;
  playbook_items: PlaybookItem[];
  personalization: PersonalizationConfig | null;
  label: string | null;
  created_at: string;
  analysis_id: string | null;
}

// ─── Saved playbooks panel ────────────────────────────────────────────────────

function SavedPlaybooksPanel({
  zip,
  userId,
  onRestore,
}: {
  zip: string;
  userId: string;
  onRestore: (saved: SavedPlaybook) => void;
}) {
  const queryClient = useQueryClient();

  const { data: saved = [], isLoading } = useQuery<SavedPlaybook[]>({
    queryKey: ['saved-playbooks', userId, zip],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_playbooks')
        .select('*')
        .eq('user_id', userId)
        .eq('zip_code', zip)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        ...r,
        playbook_items: (r.playbook_items as unknown as PlaybookItem[]) ?? [],
        personalization: r.personalization as unknown as PersonalizationConfig | null,
      }));
    },
  });

  const handleDelete = async (id: string) => {
    await supabase.from('saved_playbooks').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['saved-playbooks', userId, zip] });
    toast({ title: 'Playbook deleted' });
  };

  if (saved.length === 0 && !isLoading) return (
    <p className="text-xs text-muted-foreground italic px-1">No saved playbooks for this ZIP yet.</p>
  );

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      )}
      {saved.map(s => (
        <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {s.label || `Playbook — ${new Date(s.created_at).toLocaleDateString()}`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {s.lead_type} · Score {s.opportunity_score ?? '—'}/100
              {s.personalization?.agentName ? ` · by ${s.personalization.agentName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onRestore(s)}>
              Load
            </Button>
            <button
              onClick={() => handleDelete(s.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ProspectingPlaybookProps {
  input: PlaybookInput;
  analysisId?: string | null;
}

export function ProspectingPlaybook({ input, analysisId }: ProspectingPlaybookProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [cfg, setCfg] = useState<PersonalizationConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // ── Auto-fill from agent profile ──────────────────────────────────────────
  useQuery({
    queryKey: ['agent-profile-prefill', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, brokerage, phone, license, custom_cta')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (data) {
        setCfg(prev => {
          const next: PersonalizationConfig = { ...prev };
          if (!prev.agentName && data.full_name) next.agentName = data.full_name;
          if (!prev.brokerage && data.brokerage) next.brokerage = data.brokerage;
          if (!prev.phone && data.phone) next.phone = data.phone;
          // New fields: license and custom_cta stored in profiles table
          const d = data as any;
          if (!prev.licenseNum && d.license) next.licenseNum = d.license;
          if (!prev.cta && d.custom_cta) next.cta = d.custom_cta;
          const didFill = next.agentName !== prev.agentName || next.brokerage !== prev.brokerage || next.phone !== prev.phone || next.licenseNum !== prev.licenseNum || next.cta !== prev.cta;
          if (didFill) setAutoFilled(true);
          return next;
        });
      }
      return data;
    },
  });

  const playbook = generatePlaybook(input);
  const isPersonalized = !!(cfg.agentName || cfg.brokerage || cfg.phone || cfg.cta);

  const leadTypeLabel = {
    seller: 'Seller Market',
    buyer: 'Buyer Market',
    transitional: 'Transitional Market',
  }[input.leadType];

  const leadTypeColor = {
    seller: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
    buyer: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30',
    transitional: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30',
  }[input.leadType];

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Sign in to save playbooks', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const label = `${input.cityState || input.zip} — ${new Date().toLocaleDateString()}`;
      const { error } = await supabase
        .from('saved_playbooks')
        .insert({
          user_id: user.id,
          analysis_id: analysisId ?? null,
          zip_code: input.zip,
          city_state: input.cityState || null,
          lead_type: input.leadType,
          opportunity_score: input.opportunityScore,
          playbook_items: playbook.items as any,
          personalization: isPersonalized ? cfg as any : null,
          label,
        });
      if (error) throw error;
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['saved-playbooks', user.id, input.zip] });
      toast({ title: '✅ Playbook saved!', description: `Saved as "${label}"` });
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (saved: SavedPlaybook) => {
    if (saved.personalization) {
      setCfg(saved.personalization);
      setShowCustomize(true);
    }
    setShowSaved(false);
    toast({ title: 'Playbook loaded', description: 'Personalization restored.' });
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      {/* Header strip */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
            Prospecting Playbook
          </span>
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-primary/30 text-primary">
            Agent Only
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px] px-2 py-0', leadTypeColor)}>
            {leadTypeLabel}
          </Badge>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaved(v => !v)}
              className="h-7 px-2 gap-1.5 text-xs"
              title="View saved playbooks"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              Saved
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowCustomize(v => !v); setAutoFilled(false); }}
            className={cn(
              'h-7 px-2 gap-1.5 text-xs',
              isPersonalized && 'text-primary border border-primary/30 bg-primary/5',
              autoFilled && !showCustomize && 'animate-pulse',
            )}
            title={autoFilled && !showCustomize ? 'Auto-filled from your profile — click to review' : undefined}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {isPersonalized ? (autoFilled && !showCustomize ? 'Pre-filled ✓' : 'Personalized ✓') : 'Customize'}
          </Button>
          {user && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || justSaved}
              className="h-7 px-2 gap-1.5 text-xs"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : justSaved ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
              {justSaved ? 'Saved!' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Intro */}
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            5 ready-to-use prospecting assets — all grounded in live FRED data.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every post, mailer, and script below uses real numbers from ZIP <span className="font-mono font-semibold">{input.zip}</span>{input.cityState ? ` (${input.cityState})` : ''}. Click <strong>Customize</strong> to personalize, then <strong>Save</strong> to store this playbook to your account.
          </p>
        </div>

        {/* Saved playbooks panel */}
        {showSaved && user && (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                  Saved Playbooks — {input.zip}
                </span>
              </div>
              <button onClick={() => setShowSaved(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SavedPlaybooksPanel zip={input.zip} userId={user.id} onRestore={handleRestore} />
          </div>
        )}

        {/* Customize panel */}
        {showCustomize && (
          <CustomizePanel
            cfg={cfg}
            onChange={setCfg}
            onClose={() => setShowCustomize(false)}
          />
        )}

        {/* Platform legend */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(platformMeta) as [PlaybookPlatform, typeof platformMeta[PlaybookPlatform]][]).map(([key, m]) => (
            <span key={key} className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', m.color, m.bg, m.border)}>
              {m.icon}
              {key === 'instagram' ? 'Social' : key === 'linkedin' ? 'LinkedIn' : key === 'mailer' ? 'Mailer' : key === 'community' ? 'Event' : key === 'sphere' ? 'Sphere' : key}
            </span>
          ))}
        </div>

        <Separator />

        {/* Cards — first two always visible */}
        <div className="space-y-3">
          {playbook.items.slice(0, 2).map((item, i) => (
            <PlaybookCard key={i} item={item} cfg={cfg} />
          ))}
        </div>

        {/* Remaining — collapsible */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground border border-border/50 rounded-lg"
            >
              <span className="text-xs font-medium">
                {expanded ? 'Hide' : 'Show'} mailer, community event & sphere script
              </span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {playbook.items.slice(2).map((item, i) => (
              <PlaybookCard key={i} item={item} cfg={cfg} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground/50 pt-1 leading-relaxed">
          Copy is generated deterministically from live Federal Reserve Economic Data (FRED). Customize placeholders before publishing. Always verify data freshness — refresh your market analysis for updated numbers.
        </p>
      </CardContent>
    </Card>
  );
}

