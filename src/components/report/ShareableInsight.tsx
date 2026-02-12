import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Check, TrendingUp, BarChart3, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InsightData {
  title: string;
  value: string;
  subtitle: string;
  icon: 'trend' | 'chart' | 'target';
  color: 'primary' | 'accent' | 'emerald';
}

interface ShareableInsightProps {
  insights: InsightData[];
  location: string;
  reportType: string;
  className?: string;
}

const iconMap = {
  trend: TrendingUp,
  chart: BarChart3,
  target: Target,
};

const colorMap = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  emerald: 'bg-emerald-500/10 text-emerald-600',
};

export function ShareableInsight({ insights, location, reportType, className = '' }: ShareableInsightProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyInsight = (insight: InsightData, index: number) => {
    const text = `📊 ${insight.title}: ${insight.value}\n${insight.subtitle}\n\n📍 ${location} | ${reportType} Analysis\nPowered by Market Compass`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: 'Insight copied!', description: 'Ready to share on social media.' });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleShareInsight = async (insight: InsightData) => {
    const text = `📊 ${insight.title}: ${insight.value} — ${insight.subtitle} | ${location}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Market Insight', text });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Insight copied to clipboard' });
    }
  };

  if (!insights.length) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Share2 className="h-5 w-5 text-accent" />
          Shareable Insights
        </CardTitle>
        <p className="text-xs text-muted-foreground">Quick stats to share with clients or on social media</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.icon];
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors group"
              >
                <div className={`p-2 rounded-lg shrink-0 ${colorMap[insight.color]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-lg font-serif font-bold">{insight.value}</p>
                  <p className="text-xs text-muted-foreground">{insight.subtitle}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyInsight(insight, i)}
                  >
                    {copiedIndex === i ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleShareInsight(insight)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Generate shareable insights from report data */
export function generateInsights(
  reportType: 'Buyer' | 'Seller',
  reportData: any,
  location: string
): InsightData[] {
  const insights: InsightData[] = [];

  if (reportType === 'Seller') {
    if (reportData.likelihood30) {
      insights.push({
        title: '30-Day Sale Likelihood',
        value: reportData.likelihood30,
        subtitle: `Based on current ${location} market conditions`,
        icon: 'target',
        color: reportData.likelihood30 === 'High' ? 'emerald' : 'accent',
      });
    }
    if (reportData.session?.seller_inputs?.seller_selected_list_price) {
      insights.push({
        title: 'List Price Strategy',
        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(reportData.session.seller_inputs.seller_selected_list_price),
        subtitle: `${reportData.session.seller_inputs.strategy_preference} approach in ${location}`,
        icon: 'chart',
        color: 'primary',
      });
    }
  } else {
    if (reportData.acceptanceLikelihood) {
      insights.push({
        title: 'Offer Acceptance Likelihood',
        value: reportData.acceptanceLikelihood,
        subtitle: `Competitive position in ${location}`,
        icon: 'target',
        color: reportData.acceptanceLikelihood === 'High' ? 'emerald' : 'accent',
      });
    }
    if (reportData.session?.buyer_inputs?.offer_price) {
      insights.push({
        title: 'Offer Price',
        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(reportData.session.buyer_inputs.offer_price),
        subtitle: `${reportData.session.buyer_inputs.buyer_preference} strategy`,
        icon: 'trend',
        color: 'primary',
      });
    }
  }

  insights.push({
    title: 'Market Analysis',
    value: reportType === 'Seller' ? 'Seller Report' : 'Buyer Report',
    subtitle: `Professional analysis for ${location}`,
    icon: 'chart',
    color: 'accent',
  });

  return insights;
}
