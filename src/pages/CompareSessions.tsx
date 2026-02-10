import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitCompare, Building2, Users, Target, TrendingUp, Clock, ShieldAlert, AlertTriangle, FileText, Eye } from 'lucide-react';
import { Session, LikelihoodBand, ExtendedLikelihoodBand, SellerReportData, BuyerReportData } from '@/types';
import { getSessionById, getMarketProfileById } from '@/lib/storage';
import { calculateSellerReport, calculateBuyerReport } from '@/lib/scoring';
import { formatLocation } from '@/lib/utils';

function LikelihoodBadge({ band }: { band: LikelihoodBand | ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="success" className="px-3 py-1 text-xs font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="success" className="px-3 py-1 text-xs font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-3 py-1 text-xs font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="outline" className="px-3 py-1 text-xs font-medium">Low</Badge>;
  return <Badge variant="destructive" className="px-3 py-1 text-xs font-medium">Very Low</Badge>;
}

function RiskBadge({ band }: { band: LikelihoodBand | ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="destructive" className="px-3 py-1 text-xs font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="destructive" className="px-3 py-1 text-xs font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-3 py-1 text-xs font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="success" className="px-3 py-1 text-xs font-medium">Low</Badge>;
  return <Badge variant="success" className="px-3 py-1 text-xs font-medium">Very Low</Badge>;
}

function CompareCell({ label, valueA, valueB, highlight = false }: { 
  label: string; 
  valueA: string | React.ReactNode; 
  valueB: string | React.ReactNode;
  highlight?: boolean;
}) {
  const isDifferent = typeof valueA === 'string' && typeof valueB === 'string' && valueA !== valueB;
  
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium text-center ${isDifferent ? 'bg-accent/10 rounded px-2 py-1 -my-1' : ''}`}>
        {valueA}
      </div>
      <div className={`text-sm font-medium text-center ${isDifferent ? 'bg-accent/10 rounded px-2 py-1 -my-1' : ''}`}>
        {valueB}
      </div>
    </div>
  );
}

const CompareSessions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessionA, setSessionA] = useState<Session | null>(null);
  const [sessionB, setSessionB] = useState<Session | null>(null);
  const [reportA, setReportA] = useState<SellerReportData | BuyerReportData | null>(null);
  const [reportB, setReportB] = useState<SellerReportData | BuyerReportData | null>(null);

  const sessionIdA = searchParams.get('a');
  const sessionIdB = searchParams.get('b');

  useEffect(() => {
    if (!sessionIdA || !sessionIdB) {
      navigate('/drafts');
      return;
    }

    const loadedA = getSessionById(sessionIdA);
    const loadedB = getSessionById(sessionIdB);

    if (!loadedA || !loadedB) {
      navigate('/drafts');
      return;
    }

    setSessionA(loadedA);
    setSessionB(loadedB);

    // Calculate reports
    const marketProfileA = loadedA.selected_market_profile_id 
      ? getMarketProfileById(loadedA.selected_market_profile_id) 
      : undefined;
    const marketProfileB = loadedB.selected_market_profile_id 
      ? getMarketProfileById(loadedB.selected_market_profile_id) 
      : undefined;

    if (loadedA.session_type === 'Seller') {
      setReportA(calculateSellerReport(loadedA, marketProfileA));
    } else {
      setReportA(calculateBuyerReport(loadedA, marketProfileA));
    }

    if (loadedB.session_type === 'Seller') {
      setReportB(calculateSellerReport(loadedB, marketProfileB));
    } else {
      setReportB(calculateBuyerReport(loadedB, marketProfileB));
    }
  }, [sessionIdA, sessionIdB, navigate]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Get agent notes from session
  const getAgentNotes = (session: Session): string | undefined => {
    if (session.session_type === 'Seller' && session.seller_inputs) {
      return session.seller_inputs.agent_notes;
    }
    if (session.session_type === 'Buyer' && session.buyer_inputs) {
      return session.buyer_inputs.agent_notes;
    }
    return undefined;
  };

  if (!sessionA || !sessionB || !reportA || !reportB) {
    return null;
  }

  const isSellerA = sessionA.session_type === 'Seller';
  const isSellerB = sessionB.session_type === 'Seller';
  const bothSellers = isSellerA && isSellerB;
  const bothBuyers = !isSellerA && !isSellerB;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link to="/drafts">
                <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GitCompare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold">Compare Sessions</h1>
                  <p className="text-sm text-muted-foreground">Side-by-side analysis (Agent View)</p>
                </div>
              </div>
            </div>
            <Link to={`/compare/client?a=${sessionIdA}&b=${sessionIdB}`}>
              <Button variant="default" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Create Client Comparison
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Session Headers */}
          <div className="grid grid-cols-3 gap-4">
            <div></div>
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg ${isSellerA ? 'bg-primary/10' : 'bg-accent/10'} mb-2`}>
                  {isSellerA ? <Building2 className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-accent" />}
                </div>
                <h3 className="font-serif font-semibold">{sessionA.client_name}</h3>
                <p className="text-sm text-muted-foreground">{formatLocation(sessionA.location)}</p>
                <Badge variant={isSellerA ? 'default' : 'accent'} className="mt-2">{sessionA.session_type}</Badge>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg ${isSellerB ? 'bg-primary/10' : 'bg-accent/10'} mb-2`}>
                  {isSellerB ? <Building2 className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-accent" />}
                </div>
                <h3 className="font-serif font-semibold">{sessionB.client_name}</h3>
                <p className="text-sm text-muted-foreground">{formatLocation(sessionB.location)}</p>
                <Badge variant={isSellerB ? 'default' : 'accent'} className="mt-2">{sessionB.session_type}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Property Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-accent" />
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompareCell label="Property Type" valueA={sessionA.property_type} valueB={sessionB.property_type} />
              <CompareCell label="Condition" valueA={sessionA.condition} valueB={sessionB.condition} />
              <CompareCell 
                label="Market Profile" 
                valueA={reportA.marketProfile?.label || 'None'} 
                valueB={reportB.marketProfile?.label || 'None'} 
              />
            </CardContent>
          </Card>

          {/* Strategy/Offer Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
                {bothSellers ? 'Listing Strategy' : bothBuyers ? 'Offer Details' : 'Strategy / Offer'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Seller comparisons */}
              {(isSellerA || isSellerB) && (
                <>
                  <CompareCell 
                    label="List Price" 
                    valueA={isSellerA && sessionA.seller_inputs ? formatCurrency(sessionA.seller_inputs.seller_selected_list_price) : '—'} 
                    valueB={isSellerB && sessionB.seller_inputs ? formatCurrency(sessionB.seller_inputs.seller_selected_list_price) : '—'} 
                  />
                  <CompareCell 
                    label="Timeframe" 
                    valueA={isSellerA && sessionA.seller_inputs ? `${sessionA.seller_inputs.desired_timeframe} days` : '—'} 
                    valueB={isSellerB && sessionB.seller_inputs ? `${sessionB.seller_inputs.desired_timeframe} days` : '—'} 
                  />
                  <CompareCell 
                    label="Strategy" 
                    valueA={isSellerA && sessionA.seller_inputs ? sessionA.seller_inputs.strategy_preference : '—'} 
                    valueB={isSellerB && sessionB.seller_inputs ? sessionB.seller_inputs.strategy_preference : '—'} 
                  />
                </>
              )}
              {/* Buyer comparisons */}
              {(!isSellerA || !isSellerB) && (
                <>
                  <CompareCell 
                    label="Offer Price" 
                    valueA={!isSellerA && sessionA.buyer_inputs ? formatCurrency(sessionA.buyer_inputs.offer_price) : '—'} 
                    valueB={!isSellerB && sessionB.buyer_inputs ? formatCurrency(sessionB.buyer_inputs.offer_price) : '—'} 
                  />
                  <CompareCell 
                    label="Financing" 
                    valueA={!isSellerA && sessionA.buyer_inputs ? sessionA.buyer_inputs.financing_type : '—'} 
                    valueB={!isSellerB && sessionB.buyer_inputs ? sessionB.buyer_inputs.financing_type : '—'} 
                  />
                  {/* Only show Down Payment if not Cash */}
                  {((!isSellerA && sessionA.buyer_inputs?.financing_type !== 'Cash') || 
                    (!isSellerB && sessionB.buyer_inputs?.financing_type !== 'Cash')) && (
                    <CompareCell 
                      label="Down Payment" 
                      valueA={!isSellerA && sessionA.buyer_inputs && sessionA.buyer_inputs.financing_type !== 'Cash' 
                        ? sessionA.buyer_inputs.down_payment_percent 
                        : '—'} 
                      valueB={!isSellerB && sessionB.buyer_inputs && sessionB.buyer_inputs.financing_type !== 'Cash' 
                        ? sessionB.buyer_inputs.down_payment_percent 
                        : '—'} 
                    />
                  )}
                  <CompareCell 
                    label="Closing Timeline" 
                    valueA={!isSellerA && sessionA.buyer_inputs ? `${sessionA.buyer_inputs.closing_timeline} days` : '—'} 
                    valueB={!isSellerB && sessionB.buyer_inputs ? `${sessionB.buyer_inputs.closing_timeline} days` : '—'} 
                  />
                  <CompareCell 
                    label="Contingencies" 
                    valueA={!isSellerA && sessionA.buyer_inputs ? sessionA.buyer_inputs.contingencies.join(', ') : '—'} 
                    valueB={!isSellerB && sessionB.buyer_inputs ? sessionB.buyer_inputs.contingencies.join(', ') : '—'} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Likelihood Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-accent" />
                Likelihood Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bothSellers && 'likelihood30' in reportA && 'likelihood30' in reportB && (
                <>
                  <CompareCell 
                    label="30 Days" 
                    valueA={<LikelihoodBadge band={reportA.likelihood30} />}
                    valueB={<LikelihoodBadge band={reportB.likelihood30} />}
                  />
                  <CompareCell 
                    label="60 Days" 
                    valueA={<LikelihoodBadge band={reportA.likelihood60} />}
                    valueB={<LikelihoodBadge band={reportB.likelihood60} />}
                  />
                  <CompareCell 
                    label="90 Days" 
                    valueA={<LikelihoodBadge band={reportA.likelihood90} />}
                    valueB={<LikelihoodBadge band={reportB.likelihood90} />}
                  />
                </>
              )}
              {bothBuyers && 'acceptanceLikelihood' in reportA && 'acceptanceLikelihood' in reportB && (
                <CompareCell 
                  label="Acceptance Likelihood" 
                  valueA={<LikelihoodBadge band={reportA.acceptanceLikelihood} />}
                  valueB={<LikelihoodBadge band={reportB.acceptanceLikelihood} />}
                />
              )}
              {/* Mixed type comparison */}
              {!bothSellers && !bothBuyers && (
                <CompareCell 
                  label="Primary Likelihood" 
                  valueA={
                    'likelihood30' in reportA 
                      ? <LikelihoodBadge band={reportA.likelihood30} />
                      : 'acceptanceLikelihood' in reportA 
                        ? <LikelihoodBadge band={reportA.acceptanceLikelihood} />
                        : '—'
                  }
                  valueB={
                    'likelihood30' in reportB 
                      ? <LikelihoodBadge band={reportB.likelihood30} />
                      : 'acceptanceLikelihood' in reportB 
                        ? <LikelihoodBadge band={reportB.acceptanceLikelihood} />
                        : '—'
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Risk Tradeoffs (Buyer only) */}
          {bothBuyers && 'riskOfLosingHome' in reportA && 'riskOfLosingHome' in reportB && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                  Risk Tradeoff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CompareCell 
                  label="Risk of Losing Home" 
                  valueA={<RiskBadge band={reportA.riskOfLosingHome} />}
                  valueB={<RiskBadge band={reportB.riskOfLosingHome} />}
                />
                <CompareCell 
                  label="Risk of Overpaying" 
                  valueA={<RiskBadge band={reportA.riskOfOverpaying} />}
                  valueB={<RiskBadge band={reportB.riskOfOverpaying} />}
                />
              </CardContent>
            </Card>
          )}

          {/* Agent Notes (Agent Compare only) */}
          {(getAgentNotes(sessionA) || getAgentNotes(sessionB)) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5 text-accent" />
                  Agent Notes (Internal Only)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getAgentNotes(sessionA) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{sessionA.client_name}</p>
                    <p className="text-sm">{getAgentNotes(sessionA)}</p>
                  </div>
                )}
                {getAgentNotes(sessionB) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{sessionB.client_name}</p>
                    <p className="text-sm">{getAgentNotes(sessionB)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-4 h-4 bg-accent/10 rounded"></div>
            <span>Highlighted cells indicate differences between sessions</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompareSessions;
