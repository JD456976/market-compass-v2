/**
 * ProspectingPlaybook — Agent-only panel that surfaces copy-paste-ready
 * social posts, mailer angles, community event ideas, and sphere scripts
 * grounded in live FRED signals. 100% deterministic — no AI, no cost.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, Copy, Check, Sparkles,
  Instagram, Linkedin, Mail, Users, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePlaybook, PlaybookInput, PlaybookPlatform } from '@/lib/prospectingPlaybook';
import { toast } from '@/hooks/use-toast';

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

function PlaybookCard({ item }: { item: ReturnType<typeof generatePlaybook>['items'][number] }) {
  const [open, setOpen] = useState(false);
  const meta = platformMeta[item.platform];

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
            {/* Data hook label */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Grounded in:
              </span>
              <Badge variant="outline" className={cn('text-[9px] px-2', meta.color, meta.border)}>
                {item.hook}
              </Badge>
            </div>

            {/* The copy */}
            <div className="relative">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground/90 bg-muted/30 rounded-lg p-4 border border-border/50 overflow-x-auto">
                {item.body}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={item.body} small />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/60 italic">
              Replace bracketed placeholders [Name], [your number], etc. before posting. All data points sourced from Federal Reserve Economic Data (FRED).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ProspectingPlaybookProps {
  input: PlaybookInput;
}

export function ProspectingPlaybook({ input }: ProspectingPlaybookProps) {
  const [expanded, setExpanded] = useState(false);
  const playbook = generatePlaybook(input);

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
        <Badge variant="outline" className={cn('text-[10px] px-2 py-0', leadTypeColor)}>
          {leadTypeLabel}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Intro */}
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            5 ready-to-use prospecting assets — all grounded in live FRED data.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every post, mailer, and script below uses real numbers from ZIP <span className="font-mono font-semibold">{input.zip}</span>{input.cityState ? ` (${input.cityState})` : ''}. Click any card to expand and copy the full copy.
            No AI. No guesswork. Just your market data, turned into words.
          </p>
        </div>

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
            <PlaybookCard key={i} item={item} />
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
              <PlaybookCard key={i} item={item} />
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
