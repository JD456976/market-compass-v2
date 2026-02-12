import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Session, ExtendedLikelihoodBand, LikelihoodBand } from '@/types';
import { MarketSnapshot } from '@/lib/marketSnapshots';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AIInsightsProps {
  session: Session;
  snapshot?: MarketSnapshot;
  isGenericBaseline?: boolean;
  likelihood: string;
  reportType: 'buyer' | 'seller';
}

export function AIInsights({ session, snapshot, isGenericBaseline, likelihood, reportType }: AIInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reportContext = {
        reportType,
        clientName: session.client_name,
        location: session.location,
        propertyType: session.property_type,
        condition: session.condition,
        likelihood,
        ...(reportType === 'buyer' && session.buyer_inputs ? {
          offerPrice: session.buyer_inputs.offer_price,
          referencePrice: session.buyer_inputs.reference_price,
          financingType: session.buyer_inputs.financing_type,
          downPayment: session.buyer_inputs.down_payment_percent,
          contingencies: session.buyer_inputs.contingencies,
          closingTimeline: session.buyer_inputs.closing_timeline,
          buyerPreference: session.buyer_inputs.buyer_preference,
          marketConditions: session.buyer_inputs.market_conditions,
          daysOnMarket: session.buyer_inputs.days_on_market,
        } : {}),
        ...(reportType === 'seller' && session.seller_inputs ? {
          listPrice: session.seller_inputs.seller_selected_list_price,
          timeframe: session.seller_inputs.desired_timeframe,
          strategy: session.seller_inputs.strategy_preference,
        } : {}),
        ...(snapshot ? {
          snapshotLocation: snapshot.location,
          medianDOM: snapshot.medianDOM,
          saleToListRatio: snapshot.saleToListRatio,
          inventorySignal: snapshot.inventorySignal,
          isGenericBaseline,
        } : {}),
      };

      const { data, error: fnError } = await supabase.functions.invoke('ai-report-insights', {
        body: { context: reportContext },
      });

      if (fnError) throw fnError;

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setHasFetched(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('AI Insights error:', err);
      if (err?.message?.includes('429') || err?.status === 429) {
        setError('Rate limit reached. Please try again in a moment.');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        setError('AI credits exhausted. Please add credits in Settings.');
      } else {
        setError('Could not generate insights. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen && !hasFetched && !isLoading) {
      fetchInsights();
    }
  };

  return (
    <Card className="pdf-section pdf-avoid-break overflow-hidden border-accent/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={handleToggle}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-accent" />
                AI-Powered Insights
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasFetched && !isLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchInsights();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing report data...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && insights.length > 0 && (
              <div className="space-y-2.5">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <Sparkles className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground italic">
              AI insights are generated from report data and market context. They are informational only and should not replace professional judgment.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
