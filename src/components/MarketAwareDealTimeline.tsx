/**
 * MarketAwareDealTimeline — The killer feature.
 *
 * Generates a dynamic, market-responsive deal timeline for either a buyer or seller
 * deal. Deadlines and recommendations shift in real-time based on live FRED data:
 *
 *  • Hot market (score ≥ 71, seller type) → compress inspection, remove appraisal gap,
 *    accelerate closing.
 *  • Cooling market (score ≤ 40, buyer type) → standard contingencies, extended timelines,
 *    negotiate for closing cost concessions.
 *  • Transitional → balanced defaults with conditional alerts.
 *
 * Shows a visual timeline with market-adjusted dates and color-coded risk flags.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Zap, ChevronDown, ChevronUp, Copy, Check, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface MarketData {
  opportunityScore: number;
  leadType: 'seller' | 'buyer' | 'transitional';
  metrics: {
    daysOnMarket?: { current: number | null; trend: string };
    inventory?: { trend: string };
    mortgage?: { current: number | null; trend: string };
  };
}

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  dayOffset: number; // days from accepted offer
  duration: number;  // days
  category: 'inspection' | 'financing' | 'closing' | 'negotiation' | 'contingency';
  risk: 'low' | 'medium' | 'high';
  marketNote?: string;
  adjusted: boolean; // was this modified from baseline by market data?
}

interface DealTimelineProps {
  offerDate?: Date;
  sessionType: 'buyer' | 'seller';
  clientName?: string;
  location?: string;
  marketData?: MarketData | null;
  zip?: string;
  className?: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildTimeline(
  sessionType: 'buyer' | 'seller',
  marketData: MarketData | null | undefined,
): TimelineStep[] {
  const score = marketData?.opportunityScore ?? 50;
  const leadType = marketData?.leadType ?? 'transitional';
  const dom = marketData?.metrics?.daysOnMarket?.current ?? 30;
  const mortgageTrend = marketData?.metrics?.mortgage?.trend ?? 'stable';

  const isHot = score >= 71 && leadType === 'seller';
  const isCool = score <= 40 && leadType === 'buyer';

  if (sessionType === 'buyer') {
    const inspectionWindow = isHot ? 5 : isCool ? 10 : 7;
    const inspectionNote = isHot
      ? `Market is extremely competitive (score ${score}). Sellers routinely reject standard 10-day windows. Compress to ${inspectionWindow} days to stay competitive.`
      : isCool
      ? `Buyer-favorable market (score ${score}). Sellers are motivated — take the full ${inspectionWindow} days to conduct thorough due diligence.`
      : `Balanced market. Standard ${inspectionWindow}-day window is competitive and defensible.`;

    const financingDays = isHot ? 14 : 21;
    const financingNote = isHot
      ? `Rising mortgage rates and high competition require lender pre-approval with updated commitment letter. Request ${financingDays}-day window — longer risks losing deal.`
      : `${mortgageTrend === 'rising' ? '⚠️ Rates are rising — ' : ''}Lock rate at application. ${financingDays}-day financing contingency is standard.`;

    const closingDays = isHot ? 25 : isCool ? 45 : 30;
    const closingNote = isHot
      ? `Sellers prefer faster closings in this market. Offering ${closingDays} days is a differentiator at no extra cost to the buyer.`
      : isCool
      ? `${closingDays}-day close gives seller flexibility and makes your offer more appealing in a slower market.`
      : `${closingDays}-day close is market standard.`;

    return [
      {
        id: 'offer-accepted',
        label: 'Offer Accepted',
        description: 'Countersigned purchase agreement received. Earnest money due within 3 business days.',
        dayOffset: 0, duration: 0,
        category: 'negotiation', risk: 'low',
        adjusted: false,
      },
      {
        id: 'inspection',
        label: `Inspection Period (${inspectionWindow} days)`,
        description: inspectionNote,
        dayOffset: 1, duration: inspectionWindow,
        category: 'inspection', risk: isHot ? 'high' : 'low',
        marketNote: isHot ? `Compressed from 10→${inspectionWindow} days due to market competition` : undefined,
        adjusted: isHot || isCool,
      },
      {
        id: 'appraisal',
        label: isHot ? 'Appraisal (waive gap coverage)' : 'Appraisal',
        description: isHot
          ? `Score ${score}: In this market, sellers expect appraisal gap coverage or full waiver. Discuss with your client before proceeding.`
          : isCool
          ? `In a buyer market, insist on appraisal contingency. Sellers are unlikely to reject on this point.`
          : `Standard appraisal contingency. Negotiate gap coverage only if multiple offers expected.`,
        dayOffset: inspectionWindow + 2, duration: 10,
        category: 'contingency', risk: isHot ? 'medium' : 'low',
        marketNote: isHot ? 'Sellers may request appraisal gap coverage in this market' : undefined,
        adjusted: isHot,
      },
      {
        id: 'financing',
        label: `Financing Commitment (${financingDays} days)`,
        description: financingNote,
        dayOffset: 5, duration: financingDays,
        category: 'financing', risk: mortgageTrend === 'rising' ? 'high' : 'medium',
        marketNote: mortgageTrend === 'rising' ? '⚠️ Rates are rising — lock ASAP' : undefined,
        adjusted: isHot || mortgageTrend === 'rising',
      },
      {
        id: 'walk-through',
        label: 'Final Walk-Through',
        description: 'Confirm condition matches contract. Check all negotiated repairs are complete.',
        dayOffset: closingDays - 2, duration: 1,
        category: 'closing', risk: 'low',
        adjusted: false,
      },
      {
        id: 'closing',
        label: `Closing (Day ${closingDays})`,
        description: closingNote,
        dayOffset: closingDays, duration: 0,
        category: 'closing', risk: 'low',
        marketNote: isHot ? `Accelerated from 30→${closingDays} days — competitive advantage` : undefined,
        adjusted: isHot || isCool,
      },
    ];
  }

  // Seller timeline
  const domDays = dom > 0 ? Math.round(dom) : 30;
  const pricingNote = isHot
    ? `Median DOM in this market is ${domDays} days. Price at or 1–2% above market — buyers are competing.`
    : isCool
    ? `Median DOM is ${domDays} days. Price competitively; overpricing in this market leads to extended days on market and stigma.`
    : `Median DOM is ${domDays} days. Price at market; small wiggle room (1%) is reasonable for negotiation.`;

  const showingWindow = isHot ? 5 : 14;
  const reviewOffers = isHot ? 7 : 21;

  return [
    {
      id: 'prep',
      label: 'Pre-Market Prep',
      description: `Deep clean, professional photography, and staging. In this ${leadType} market, first impressions ${isHot ? 'can trigger bidding wars' : 'are critical to avoid price reductions'}.`,
      dayOffset: -14, duration: 14,
      category: 'negotiation', risk: 'low',
      adjusted: false,
    },
    {
      id: 'pricing',
      label: 'Strategic Pricing',
      description: pricingNote,
      dayOffset: -7, duration: 3,
      category: 'negotiation', risk: isCool ? 'high' : 'low',
      marketNote: isHot ? `Hot market: pricing at ask may drive multiple offers` : isCool ? `Soft market: overpricing is high-risk` : undefined,
      adjusted: true,
    },
    {
      id: 'active',
      label: `Showings (${showingWindow}-day campaign)`,
      description: isHot
        ? `In a hot market (score ${score}), set an offer review date ${showingWindow} days out to create urgency and encourage competing offers.`
        : `Allow full ${showingWindow} days for buyer exposure. Don't rush — accepting the first offer in a soft market often leaves money on the table.`,
      dayOffset: 0, duration: showingWindow,
      category: 'negotiation', risk: 'low',
      marketNote: isHot ? 'Consider offer deadline to trigger bidding war' : undefined,
      adjusted: isHot || isCool,
    },
    {
      id: 'offer-review',
      label: 'Offer Review & Negotiation',
      description: isHot
        ? 'Review all offers simultaneously on the deadline date. Counter strongest offer on highest terms — price, close date, fewest contingencies.'
        : 'Negotiate thoughtfully. In this market, contingencies are standard — focus on price and close date first.',
      dayOffset: showingWindow, duration: 3,
      category: 'negotiation', risk: 'medium',
      adjusted: false,
    },
    {
      id: 'under-contract',
      label: 'Under Contract',
      description: `Buyer inspection period begins. Expect requests in a ${leadType} market — ${isHot ? 'negotiate repairs carefully; buyers know competition is high' : 'be flexible; buyers have leverage'}.`,
      dayOffset: reviewOffers, duration: 10,
      category: 'inspection', risk: isCool ? 'high' : 'medium',
      marketNote: isCool ? 'Buyers have leverage — expect repair requests' : undefined,
      adjusted: isCool,
    },
    {
      id: 'closing',
      label: 'Closing',
      description: `Target close ${reviewOffers + 20}–${reviewOffers + 30} days after acceptance. ${isHot ? 'Offer flexibility on date — it can be a differentiator for the right buyer.' : 'Negotiate a date that works for your move-out timeline.'}`,
      dayOffset: reviewOffers + 25, duration: 0,
      category: 'closing', risk: 'low',
      adjusted: false,
    },
  ];
}

const categoryColors: Record<string, string> = {
  inspection:   'border-l-amber-500',
  financing:    'border-l-blue-500',
  closing:      'border-l-emerald-500',
  negotiation:  'border-l-primary',
  contingency:  'border-l-orange-500',
};

const categoryBg: Record<string, string> = {
  inspection:   'bg-amber-50 dark:bg-amber-950/20',
  financing:    'bg-blue-50 dark:bg-blue-950/20',
  closing:      'bg-emerald-50 dark:bg-emerald-950/20',
  negotiation:  'bg-muted/40',
  contingency:  'bg-orange-50 dark:bg-orange-950/20',
};

const riskBadge = (risk: string) => {
  if (risk === 'high') return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High Risk</Badge>;
  if (risk === 'medium') return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Watch</Badge>;
  return null;
};

export function MarketAwareDealTimeline({
  offerDate = new Date(),
  sessionType,
  clientName,
  location,
  marketData,
  zip,
  className,
}: DealTimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const steps = buildTimeline(sessionType, marketData);
  const score = marketData?.opportunityScore;
  const leadType = marketData?.leadType;
  const adjustedCount = steps.filter(s => s.adjusted).length;

  const copyTimeline = async () => {
    const lines = [
      `📅 Market-Aware Deal Timeline`,
      clientName ? `Client: ${clientName}` : '',
      location ? `Location: ${location}` : '',
      zip ? `ZIP: ${zip}` : '',
      score != null ? `Market Score: ${score}/100 (${leadType} market)` : '',
      '',
      ...steps.map(s => [
        `▸ ${s.label}`,
        `  ${s.description}`,
        s.marketNote ? `  ⚡ ${s.marketNote}` : '',
      ].filter(Boolean).join('\n')),
      '',
      'Generated by Market Compass • market-compass-v2.lovable.app',
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(lines);
    setCopied(true);
    toast({ title: 'Timeline copied', description: 'Paste into your transaction management system or email.' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Market-Aware Deal Timeline
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />Live
                </Badge>
              </CardTitle>
              {adjustedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {adjustedCount} deadline{adjustedCount !== 1 ? 's' : ''} adjusted based on live market data
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={copyTimeline} className="gap-1.5 h-8">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Market context banner */}
        {score != null && (
          <div className={cn(
            'rounded-lg px-3 py-2 flex items-center gap-2 text-xs mt-1',
            score >= 71 ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' :
            score >= 41 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' :
                          'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
          )}>
            {score >= 71 ? <TrendingUp className="h-3.5 w-3.5 shrink-0" /> : score <= 40 ? <TrendingDown className="h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5 shrink-0" />}
            <span>
              <strong>Market Score {score}/100</strong> — {leadType} market.{' '}
              {score >= 71 ? 'Compressed timelines recommended to stay competitive.' :
               score <= 40 ? 'Extended timelines give your client negotiating leverage.' :
               'Balanced market — standard timelines apply.'}
            </span>
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-4 bottom-4 w-px bg-border/60" />

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex gap-3">
                  {/* Node */}
                  <div className={cn(
                    'shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10',
                    step.risk === 'high' ? 'border-destructive bg-destructive/10 text-destructive' :
                    step.risk === 'medium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                    'border-border bg-card text-muted-foreground',
                  )}>
                    {step.risk === 'high' ? <AlertTriangle className="h-4 w-4" /> :
                     step.risk === 'medium' ? <Clock className="h-3.5 w-3.5" /> :
                     <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    'flex-1 rounded-lg border-l-4 px-3 py-2 mb-1',
                    categoryColors[step.category] || 'border-l-border',
                    categoryBg[step.category] || 'bg-muted/20',
                  )}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold">{step.label}</span>
                        {step.adjusted && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary border-primary/30">
                            <Zap className="h-2 w-2 mr-0.5" />Market-adjusted
                          </Badge>
                        )}
                        {riskBadge(step.risk)}
                      </div>
                      {step.dayOffset > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          Day {step.dayOffset}
                          {offerDate && ` · ${formatDate(addDays(offerDate, step.dayOffset))}`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{step.description}</p>
                    {step.marketNote && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Zap className="h-3 w-3 text-primary shrink-0" />
                        <p className="text-[10px] text-primary font-medium">{step.marketNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Inspection</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Financing</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Closing</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Contingency</span>
            </div>
            {zip && (
              <a
                href={`https://market-compass-v2.lovable.app/lead-finder?zip=${zip}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                Full market analysis <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
