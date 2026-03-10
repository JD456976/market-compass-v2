import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Target, TrendingUp, Home, Share2, FileDown, Link2, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Session, BuyerInputs } from '@/types';
import { upsertSession } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { exportReportToPdf } from '@/lib/pdfExport';
import { getShareUrl } from '@/lib/shareUrl';
import { ReportHeader } from '@/components/ReportHeader';
import { formatLocation } from '@/lib/utils';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { useClientMode } from '@/contexts/ClientModeContext';
import { getMarketSnapshotOrBaseline, MarketSnapshot, parseCityFromLocation } from '@/lib/marketSnapshots';
import { PropertyDetailsCard } from '@/components/report/PropertyDetailsCard';
import { PropertyFactorsCard } from '@/components/report/PropertyFactorsCard';
import { MortgageRateCard } from '@/components/report/MortgageRateCard';
import { AddressIntelligenceCard } from '@/components/report/AddressIntelligenceCard';
import { BuyerCompetingOffersCard } from '@/components/report/CompetingOffersCard';
import { SellerMotivationCard } from '@/components/report/MotivationCard';
import { BuyerTimingCard } from '@/components/report/TimingCard';
import { WaitSimulatorCard } from '@/components/report/WaitSimulatorCard';
import { HistoricalTrends } from '@/components/report/HistoricalTrends';
import { MarketConfidenceScore } from '@/components/report/MarketConfidenceScore';
import { ListingHistoryCard } from '@/components/report/ListingHistoryCard';
import { ReportProvider, ReportTemplate } from '@/components/report/ReportContext';
import { ReportTemplateSelector } from '@/components/report/ReportTemplateSelector';
import { ReportWatermark } from '@/components/report/ReportWatermark';
import { DisclaimerFooter } from '@/components/report/DisclaimerFooter';
import { MetricCallout, MetricCalloutGrid } from '@/components/report/MetricCallout';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const TouringReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isClientMode } = useClientMode();
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState(false);
  const [marketSnapshot, setMarketSnapshot] = useState<{ snapshot: MarketSnapshot; isGenericBaseline: boolean } | null>(null);
  const [mlsDetails, setMlsDetails] = useState<Record<string, string> | null>(null);
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('modern');

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    const isTouringBrief = sessionStorage.getItem('touring_brief');
    if (!sessionData || !isTouringBrief) {
      navigate('/touring');
      return;
    }
    try {
      const parsed: Session = JSON.parse(sessionData);
      // Load listing history from sessionStorage if not on session
      try {
        const historyData = sessionStorage.getItem('current_listing_history');
        if (historyData && !parsed.listing_history) {
          parsed.listing_history = JSON.parse(historyData);
        }
      } catch { /* ignore */ }
      setSession(parsed);
      setMarketSnapshot(getMarketSnapshotOrBaseline(parsed.location));

      try {
        const mlsData = sessionStorage.getItem('current_mls_details');
        if (mlsData) setMlsDetails(JSON.parse(mlsData));
      } catch { /* ignore */ }
    } catch {
      navigate('/touring');
    }
  }, [navigate]);

  // Auto-export PDF when navigated from SharedReports
  useEffect(() => {
    if (!session) return;
    const autoExport = sessionStorage.getItem('auto_export_pdf');
    if (!autoExport) return;
    sessionStorage.removeItem('auto_export_pdf');
    const timer = setTimeout(() => {
      handleExportPdf(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [session]);

  const handleSave = () => {
    if (!session) return;
    try {
      upsertSession(session);
      setSaved(true);
      toast({ title: 'Brief saved', description: `"${session.client_name}" saved to Drafts.` });
    } catch {
      toast({ title: 'Save failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleExportPdf = async (markShared = false) => {
    if (!session) return;
    try {
      await exportReportToPdf('report-export', {
        clientName: session.client_name,
        reportType: 'Touring Brief',
        snapshotTimestamp: session.created_at,
        isClientMode,
      });
      const updated = { ...session, pdf_exported: true, ...(markShared ? { share_link_created: true } : {}) };
      upsertSession(updated);
      setSession(updated);
      toast({ title: 'PDF exported', description: markShared ? 'Brief shared and downloaded.' : 'Brief downloaded.' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const handleShareLink = () => {
    if (!session) return;
    try {
      const updated = { ...session, share_link_created: true };
      upsertSession(updated);
      setSession(updated);
      const token = (session as any).share_token || session.id;
      const url = getShareUrl(token);
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Share link copied to clipboard.' });
    } catch {
      toast({ title: 'Could not generate link', variant: 'destructive' });
    }
  };

  const handlePromoteToBuyer = () => {
    if (!session) return;
    // Pre-fill buyer flow with all touring data
    sessionStorage.setItem('returning_to_edit', 'true');
    sessionStorage.setItem('current_session', JSON.stringify({
      ...session,
      session_type: 'Buyer',
    }));
    sessionStorage.removeItem('touring_brief');
    navigate('/buyer');
  };

  if (!session) return null;

  const inputs = session.buyer_inputs!;
  const cityName = parseCityFromLocation(session.location) || formatLocation(session.location);
  const hasListPrice = inputs.reference_price && inputs.reference_price > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6 report-header-mobile">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link to="/touring">
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-accent/20 shrink-0">
                  <Eye className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-serif font-bold">Touring Brief</h1>
                    <Badge variant="outline" className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground text-[10px]">Pre-Showing</Badge>
                  </div>
                  <p className="text-sm text-primary-foreground/70 truncate">{session.client_name} • {formatLocation(session.location)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ModeSwitcher className="bg-primary-foreground/10 rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-4 py-8 max-w-3xl -mt-4 ${isClientMode ? 'pb-24 md:pb-8' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div id="report-export" className={isClientMode ? 'client-mode' : 'agent-mode'}>
            <ReportProvider template={reportTemplate}>
              {/* Template Selector */}
              <div className="pdf-hide-agent-notes">
                <ReportTemplateSelector selected={reportTemplate} onSelect={setReportTemplate} />
              </div>

              {/* Report Header */}
              <div className="pdf-section pdf-header-section">
              <ReportHeader
                  reportType="Touring Brief"
                  clientName={session.client_name}
                  snapshotTimestamp={session.created_at}
                  showTimestamp={false}
                />
              </div>

              {/* Promote to Buyer Report CTA */}
              {!isClientMode && (
                <Card className="border-2 border-dashed border-accent/30 bg-accent/5 hover:border-accent/50 transition-colors cursor-pointer pdf-hide-agent-notes" onClick={handlePromoteToBuyer}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="p-2.5 rounded-full bg-accent/10">
                      <ArrowRight className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Ready to make an offer?</p>
                      <p className="text-xs text-muted-foreground">Promote to a full Buyer Report — all property data carries over</p>
                    </div>
                    <Button size="sm" variant="accent" className="shrink-0">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Buyer Report
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Property Overview */}
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-accent" />
                    Property Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">{session.client_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{formatLocation(session.location)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Property Type</p>
                      <p className="font-medium">{session.property_type === 'SFH' ? 'Single Family' : session.property_type === 'MFH' ? 'Multi-Family' : session.property_type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Condition</p>
                      <p className="font-medium">{session.condition}</p>
                    </div>
                  </div>
                  {hasListPrice && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-secondary/50 text-center">
                        <p className="text-xs text-muted-foreground mb-1">List Price</p>
                        <p className="text-lg font-serif font-bold">{formatCurrency(inputs.reference_price!)}</p>
                      </div>
                      {inputs.days_on_market !== undefined && inputs.days_on_market > 0 && (
                        <div className="p-3 rounded-xl bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Days on Market</p>
                          <p className="text-lg font-serif font-bold">{inputs.days_on_market}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-secondary/50 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Market</p>
                        <p className="text-lg font-serif font-bold">{inputs.market_conditions || 'Balanced'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Market Confidence */}
              {marketSnapshot && (
                <div className="flex justify-center">
                  <MarketConfidenceScore
                    snapshot={marketSnapshot.snapshot}
                    isGenericBaseline={marketSnapshot.isGenericBaseline}
                    session={session}
                  />
                </div>
              )}

              {/* Historical Trends */}
              {marketSnapshot && (
                <HistoricalTrends
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                  isClientMode={isClientMode}
                />
              )}

              {/* Mortgage Rate */}
              <MortgageRateCard />

              {/* Property Details from MLS */}
              {mlsDetails && <PropertyDetailsCard details={mlsDetails} />}

              {/* Property Intelligence Factors */}
              {session.property_factors && session.property_factors.length > 0 && (
                <PropertyFactorsCard
                  factors={session.property_factors}
                  editable={!isClientMode}
                  onFactorsChange={(newFactors) => {
                    const updated = { ...session, property_factors: newFactors };
                    setSession(updated);
                    sessionStorage.setItem('current_session', JSON.stringify(updated));
                    setSaved(false);
                  }}
                />
              )}

              {/* Address Intelligence */}
              {marketSnapshot && (
                <AddressIntelligenceCard
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                  reportType="Buyer"
                />
              )}

              {/* Market Read Callouts */}
              {marketSnapshot && (
                <MetricCalloutGrid>
                  <MetricCallout
                    type="acceptance"
                    band={marketSnapshot.snapshot.medianDOM <= 14 ? 'High' : marketSnapshot.snapshot.medianDOM <= 30 ? 'Moderate' : 'Low'}
                    label="Market Heat"
                    description={
                      marketSnapshot.snapshot.medianDOM <= 14
                        ? 'Fast-moving market — properties sell quickly with strong demand.'
                        : marketSnapshot.snapshot.medianDOM <= 30
                        ? 'Average pace — reasonable time for decision-making.'
                        : 'Slower market — more room for negotiation and due diligence.'
                    }
                  />
                  <MetricCallout
                    type="risk-overpay"
                    band={marketSnapshot.snapshot.saleToListRatio >= 1.03 ? 'High' : marketSnapshot.snapshot.saleToListRatio >= 0.98 ? 'Moderate' : 'Low'}
                    label="Premium Likelihood"
                    description={
                      marketSnapshot.snapshot.saleToListRatio >= 1.03
                        ? 'Homes in this area typically sell above asking — expect competitive pricing.'
                        : marketSnapshot.snapshot.saleToListRatio >= 0.98
                        ? 'Homes tend to sell near asking price in this market.'
                        : 'Homes typically sell below asking — room for negotiation.'
                    }
                  />
                  <MetricCallout
                    type="risk-losing"
                    band={
                      (inputs.days_on_market ?? marketSnapshot.snapshot.medianDOM) <= 7 ? 'High'
                      : (inputs.days_on_market ?? marketSnapshot.snapshot.medianDOM) <= 21 ? 'Moderate'
                      : 'Low'
                    }
                    label="Urgency Level"
                    description={
                      (inputs.days_on_market ?? marketSnapshot.snapshot.medianDOM) <= 7
                        ? 'New or fast-selling listing — act quickly if interested.'
                        : (inputs.days_on_market ?? marketSnapshot.snapshot.medianDOM) <= 21
                        ? 'Moderate timeline — still time to evaluate but don\'t delay.'
                        : 'This listing has been available — less pressure to rush.'
                    }
                  />
                </MetricCalloutGrid>
              )}

              {/* Listing History */}
              {session.listing_history && (
                <ListingHistoryCard history={session.listing_history} />
              )}

              {/* Competitive Intelligence */}
              {hasListPrice && (
                <BuyerCompetingOffersCard
                  inputs={inputs}
                  snapshot={marketSnapshot?.snapshot}
                  isGenericBaseline={marketSnapshot?.isGenericBaseline}
                />
              )}

              {/* Seller Motivation Profile */}
              <SellerMotivationCard inputs={inputs} snapshot={marketSnapshot?.snapshot} listingHistory={session.listing_history} />

              {/* Timing Signals */}
              <BuyerTimingCard inputs={inputs} snapshot={marketSnapshot?.snapshot} />

              {/* What If You Wait? */}
              {hasListPrice && (
                <WaitSimulatorCard
                  marketConditions={inputs.market_conditions || 'Balanced'}
                  daysOnMarket={inputs.days_on_market ?? null}
                  offerPrice={inputs.reference_price!}
                  referencePrice={inputs.reference_price!}
                  snapshot={marketSnapshot?.snapshot}
                />
              )}

              {/* Client-mode market note */}
              {isClientMode && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Analysis reflects current market conditions in the {cityName} area. This is a pre-showing intelligence brief — not a formal offer analysis.
                </p>
              )}

              {/* Disclaimer */}
              <DisclaimerFooter variant="full" />

              {/* Watermark */}
              <ReportWatermark
                reportId={session.id}
                createdAt={session.created_at}
                updatedAt={session.updated_at}
                isPdfExported={session.pdf_exported ?? false}
                isShareLinkCreated={session.share_link_created ?? false}
              />
            </ReportProvider>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 report-actions">
            <Link to="/touring">
              <Button variant="outline" size="lg" className="min-h-[44px]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            {!session.share_link_created && (
              <>
                <Button onClick={handleSave} disabled={saved} size="lg" variant={saved ? 'secondary' : 'accent'} className="min-h-[44px]">
                  {saved ? <><CheckCircle2 className="mr-2 h-4 w-4" />Saved</> : <><Save className="mr-2 h-4 w-4" />Save Draft</>}
                </Button>
                {!isClientMode && (
                  <Button onClick={handlePromoteToBuyer} size="lg" variant="outline" className="min-h-[44px]">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Promote to Buyer Report
                  </Button>
                )}
              </>
            )}

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant={session.share_link_created ? 'secondary' : 'outline'} className="min-h-[44px]">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportPdf(true)}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy Share Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TouringReport;
