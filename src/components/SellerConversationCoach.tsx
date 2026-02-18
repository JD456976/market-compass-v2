import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ChevronDown, ChevronUp, Copy, Check, TrendingDown, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Objection {
  id: string;
  trigger: string;
  objection: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: 'destructive' | 'warning' | 'secondary' | 'outline';
  response: (ctx: CoachContext) => string;
  followUp: string;
}

interface CoachContext {
  location: string;
  likelihood30: string;
  dom?: number;
  saleToList?: number;
  askingPrice?: number;
}

const OBJECTIONS: Objection[] = [
  {
    id: 'price_too_low',
    trigger: 'I want to price higher',
    objection: '"I think we should list higher to leave room to negotiate."',
    icon: <DollarSign className="h-4 w-4" />,
    badge: 'Pricing',
    badgeVariant: 'warning',
    response: (ctx) =>
      `I understand wanting to maximize value — that's exactly what we both want. But in ${ctx.location}, overpriced homes are averaging ${ctx.dom ?? 45}+ days on market before price reductions, and properties that sit that long often sell for less than they would have at a sharp list price. Buyers today are sophisticated — they're comparing your home to everything else on the market in real time. A well-priced home generates immediate interest and often multiple offers, which is actually the best way to drive your final price up.`,
    followUp: 'Would you like to see the data on homes that reduced vs. those that priced sharply from day one?',
  },
  {
    id: 'wait_for_better_market',
    trigger: 'Wait for better market',
    objection: '"Maybe we should wait until the market improves."',
    icon: <Clock className="h-4 w-4" />,
    badge: 'Timing',
    badgeVariant: 'secondary',
    response: (ctx) =>
      `That's a question worth taking seriously. The challenge is that "waiting for a better market" is extremely difficult to time — and waiting has real costs too. Every month you wait, you're paying carrying costs: mortgage, taxes, insurance, and maintenance. On a $500K home, that's easily $3,000–4,000/month. Meanwhile, the current ${ctx.likelihood30} market conditions in ${ctx.location} still represent real buyer demand. Let's look at the specific triggers that would indicate a better window — and whether the math actually works in your favor.`,
    followUp: 'What specific conditions would need to change for you to feel confident about listing?',
  },
  {
    id: 'low_offer',
    trigger: 'Reject a low offer',
    objection: '"That offer is insulting. I don\'t even want to counter."',
    icon: <AlertCircle className="h-4 w-4" />,
    badge: 'Negotiation',
    badgeVariant: 'destructive',
    response: (ctx) =>
      `I completely understand that reaction — it can feel personal. But let me reframe it: a low offer is actually a buyer expressing interest. They want your home; they're just testing where you'll land. The worst response is silence — that ends the conversation entirely. A counter at your number, even with minimal movement, keeps them at the table. In ${ctx.location}, ${ctx.saleToList ? `homes are selling at ${(ctx.saleToList * 100).toFixed(1)}% of list price on average` : 'negotiation is part of every transaction'}. Let's use their offer as the opening of a conversation, not a verdict.`,
    followUp: 'What\'s the minimum net proceeds you need from this sale to move forward comfortably?',
  },
  {
    id: 'staging_cost',
    trigger: '"Staging costs too much"',
    objection: '"I don\'t want to spend money on staging. We\'ll just sell as-is."',
    icon: <TrendingDown className="h-4 w-4" />,
    badge: 'Preparation',
    badgeVariant: 'secondary',
    response: (ctx) =>
      `Staging feels like an expense, but the data consistently shows it as an investment. Staged homes in comparable markets sell 30–50% faster and typically 5–10% above comparable unstaged listings. On a home at your price point, that could mean tens of thousands more in your pocket — for a staging investment that's a fraction of that. And critically, first impressions online matter enormously now. The first showing for most buyers happens on their phone before they ever visit in person.`,
    followUp: 'Would a virtual staging option at a lower price point be worth exploring first?',
  },
  {
    id: 'bad_feedback',
    trigger: 'Dismissing negative feedback',
    objection: '"Those buyers just didn\'t get it. The next buyer will appreciate it."',
    icon: <MessageSquare className="h-4 w-4" />,
    badge: 'Feedback',
    badgeVariant: 'warning',
    response: (ctx) =>
      `I know it's hard to hear critical feedback about a home you care about. But when we're seeing the same comments from multiple showings, it becomes market data — and market data is the most honest intelligence we have. The good news: buyers are essentially telling us exactly what would make them write an offer. If we address even one or two of the top concerns, we can change the trajectory of this listing entirely. Let's look at what's come up most frequently and find solutions that fit your budget.`,
    followUp: 'Would you be open to a showing debrief call where we go through the feedback patterns together?',
  },
];

interface SellerConversationCoachProps {
  location: string;
  likelihood30?: string;
  dom?: number;
  saleToList?: number;
}

export function SellerConversationCoach({ location, likelihood30 = 'current', dom, saleToList }: SellerConversationCoachProps) {
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const ctx: CoachContext = { location, likelihood30, dom, saleToList };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: 'Copied', description: 'Response copied to clipboard.' });
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Conversation Coach</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">Data-backed responses to common seller objections</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-2">
              {OBJECTIONS.map((obj, i) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className={cn(
                      'rounded-lg border transition-all cursor-pointer',
                      openId === obj.id ? 'border-border bg-card' : 'border-border/40 hover:border-border/70 bg-muted/20'
                    )}
                  >
                    <button
                      className="w-full text-left p-3 flex items-center gap-2.5"
                      onClick={() => setOpenId(openId === obj.id ? null : obj.id)}
                    >
                      <div className="h-7 w-7 rounded-md bg-background border border-border/50 flex items-center justify-center text-muted-foreground shrink-0">
                        {obj.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{obj.trigger}</span>
                          <Badge variant={obj.badgeVariant} className="text-[9px] px-1.5 py-0">{obj.badge}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate">{obj.objection}</p>
                      </div>
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', openId === obj.id && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                      {openId === obj.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
                            <div className="text-[11px] italic text-muted-foreground border-l-2 border-border pl-3 py-0.5">
                              {obj.objection}
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Your Response</p>
                              <p className="text-xs leading-relaxed text-foreground">{obj.response(ctx)}</p>
                            </div>
                            <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5">
                              <p className="text-[10px] text-primary font-medium mb-0.5">Follow-up Question</p>
                              <p className="text-xs text-muted-foreground italic">{obj.followUp}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => handleCopy(obj.id, `${obj.response(ctx)}\n\n${obj.followUp}`)}
                            >
                              {copied === obj.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied === obj.id ? 'Copied!' : 'Copy Response'}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
