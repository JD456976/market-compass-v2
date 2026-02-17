import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, Building2, Users, Target, TrendingUp, AlertCircle, 
  AlertTriangle, ShieldAlert, FileDown, Compass, Loader2, LayoutDashboard, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Session, LikelihoodBand, ExtendedLikelihoodBand, BuyerInputs, SellerInputs } from '@/types';
import { useSharedSession } from '@/hooks/useSession';
import { getReportErrorMessage } from '@/lib/supabaseStorage';
import { calculateSellerReport, calculateBuyerReport } from '@/lib/scoring';
import { ReportHeader } from '@/components/ReportHeader';
import { BrandedReportHeader } from '@/components/report/BrandedReportHeader';
import { SuccessPrediction } from '@/components/report/SuccessPrediction';
import { MethodologyFooter } from '@/components/MethodologyFooter';
import { formatLocation } from '@/lib/utils';
import { LikelihoodBar } from '@/components/ClientVisuals';
import { ForceClientMode } from '@/contexts/ClientModeContext';
import { exportReportToPdf } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { AnalysisMethodology } from '@/components/AnalysisMethodology';
import { LikelihoodHelperText, LikelihoodDefinitions } from '@/components/LikelihoodDefinitions';
import { ScenarioExplorer } from '@/components/ScenarioExplorer';
import { openScenarioExplorer } from '@/lib/scenarioExplorerEvents';
import { SellerScenarioExplorer, openSellerScenarioExplorer } from '@/components/SellerScenarioExplorer';
import { logSharedReportView } from '@/lib/viewTracking';
import { ClientFeedback } from '@/components/report/ClientFeedback';
import { loadBrandingForSession, AgentBranding } from '@/lib/agentBranding';
import { ReportWatermark } from '@/components/report/ReportWatermark';
import { ReportMessages } from '@/components/report/ReportMessages';
import { 
  getTitle, 
  buyerWhatThisMeans, 
  sellerWhatThisMeans,
  buyerRiskDescriptions,
} from '@/lib/clientLanguage';
import { calculateOfferPosition, calculateSellerLeverage, getBuyerStrategyInsights, getSellerStrategyInsights } from '@/lib/positionScoring';
import { OfferPositionMeter, SellerLeverageMeter, StrategyInsightsCard } from '@/components/report/PositionMeters';
import { DisclaimerFooter } from '@/components/report/DisclaimerFooter';
import { MetricCallout, MetricCalloutGrid } from '@/components/report/MetricCallout';
import { ImprovementPanel } from '@/components/report/ImprovementPanel';
import { ScenarioComparisonBanner } from '@/components/report/ScenarioComparisonBanner';
import { RegretRiskMeter } from '@/components/report/RegretRiskMeter';
import { calculateRegretRisk } from '@/lib/regretRiskScoring';
import { SellerRegretRiskMeter } from '@/components/report/SellerRegretRiskMeter';
import { calculateSellerRegretRisk } from '@/lib/sellerRegretRiskScoring';
import { WaitSimulatorCard } from '@/components/report/WaitSimulatorCard';
import { SellerWaitSimulatorCard } from '@/components/report/SellerWaitSimulatorCard';
import { AddressIntelligenceCard } from '@/components/report/AddressIntelligenceCard';
import { getMarketSnapshotOrBaseline, MarketSnapshot } from '@/lib/marketSnapshots';
import { BuyerCompetingOffersCard, SellerCompetingOffersCard } from '@/components/report/CompetingOffersCard';
import { SellerMotivationCard, BuyerMotivationCard } from '@/components/report/MotivationCard';
import { BuyerTimingCard, SellerTimingCard } from '@/components/report/TimingCard';
import { BuyerNegotiationCard, SellerNegotiationCard } from '@/components/report/NegotiationCard';

function LikelihoodBadge({ band }: { band: LikelihoodBand | ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
  return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">Very Low</Badge>;
}

function RiskBadge({ band }: { band: LikelihoodBand | ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
  return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Very Low</Badge>;
}

const IMPORTANT_NOTICE_SHORT = `This report is a decision-support tool and not a guarantee of outcome.`;

const SharedReportContent = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isClient } = useUserRole();
  const { session, marketProfile, shareToken, loading, error } = useSharedSession(sessionId);
  const [exporting, setExporting] = useState(false);
  const viewLoggedRef = useRef(false);
  const [agentBranding, setAgentBranding] = useState<AgentBranding | null>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<{ snapshot: MarketSnapshot; isGenericBaseline: boolean } | null>(null);
  // What-If state for buyer reports
  const [originalBuyerInputs, setOriginalBuyerInputs] = useState<BuyerInputs | null>(null);
  const [whatIfInputs, setWhatIfInputs] = useState<BuyerInputs | null>(null);
  const [isWhatIfModified, setIsWhatIfModified] = useState(false);
  const [originalBuyerAcceptance, setOriginalBuyerAcceptance] = useState<ExtendedLikelihoodBand | null>(null);
  const [originalBuyerRiskOfLosing, setOriginalBuyerRiskOfLosing] = useState<ExtendedLikelihoodBand | null>(null);
  const [originalBuyerRiskOfOverpaying, setOriginalBuyerRiskOfOverpaying] = useState<ExtendedLikelihoodBand | null>(null);
  // What-If state for seller reports
  const [originalSellerInputs, setOriginalSellerInputs] = useState<SellerInputs | null>(null);
  const [whatIfSellerInputs, setWhatIfSellerInputs] = useState<SellerInputs | null>(null);
  const [isSellerWhatIfModified, setIsSellerWhatIfModified] = useState(false);
  const [originalSellerLikelihood30, setOriginalSellerLikelihood30] = useState<LikelihoodBand | null>(null);

  // Always use client mode language for shared reports - NO TOGGLE
  const isClientMode = true;
  const mode = 'client';

  // Initialize what-if state when session loads
  useEffect(() => {
    if (session?.session_type === 'Buyer' && session.buyer_inputs) {
      setOriginalBuyerInputs({ ...session.buyer_inputs });
      setWhatIfInputs({ ...session.buyer_inputs });
      // Store original buyer report metrics for comparison banner
      const originalReport = calculateBuyerReport(session, marketProfile);
      if ('acceptanceLikelihood' in originalReport) {
        setOriginalBuyerAcceptance(originalReport.acceptanceLikelihood);
        setOriginalBuyerRiskOfLosing(originalReport.riskOfLosingHome);
        setOriginalBuyerRiskOfOverpaying(originalReport.riskOfOverpaying);
      }
    }
    if (session?.session_type === 'Seller' && session.seller_inputs) {
      setOriginalSellerInputs({ ...session.seller_inputs });
      setWhatIfSellerInputs({ ...session.seller_inputs });
      // Store original likelihood for comparison banner
      const originalReport = calculateSellerReport(session, marketProfile);
      setOriginalSellerLikelihood30(originalReport.likelihood30);
    }
  }, [session]);

  // Log view event once when session loads (with share token)
  useEffect(() => {
    if (session && shareToken && !viewLoggedRef.current) {
      viewLoggedRef.current = true;
      logSharedReportView(shareToken, session.id);
    }
  }, [session, shareToken]);

  // Load agent branding for the session owner
  useEffect(() => {
    if (session && (session as any).owner_user_id) {
      loadBrandingForSession((session as any).owner_user_id).then(setAgentBranding);
    }
  }, [session]);

  // Load market snapshot based on session location
  useEffect(() => {
    if (session) {
      const snapshotData = getMarketSnapshotOrBaseline(session.location);
      setMarketSnapshot(snapshotData);
    }
  }, [session]);

  // Handle what-if input changes (buyer)
  const handleWhatIfChange = useCallback((inputs: BuyerInputs) => {
    setWhatIfInputs(inputs);
    if (originalBuyerInputs) {
      const isModified = JSON.stringify(inputs) !== JSON.stringify(originalBuyerInputs);
      setIsWhatIfModified(isModified);
    }
  }, [originalBuyerInputs]);

  // Handle what-if input changes (seller)
  const handleSellerWhatIfChange = useCallback((inputs: SellerInputs) => {
    setWhatIfSellerInputs(inputs);
    if (originalSellerInputs) {
      setIsSellerWhatIfModified(
        inputs.seller_selected_list_price !== originalSellerInputs.seller_selected_list_price ||
        inputs.desired_timeframe !== originalSellerInputs.desired_timeframe ||
        inputs.strategy_preference !== originalSellerInputs.strategy_preference
      );
    }
  }, [originalSellerInputs]);

  // Reset buyer what-if to original
  const handleBuyerReset = useCallback(() => {
    if (originalBuyerInputs) {
      setWhatIfInputs({ ...originalBuyerInputs });
      setIsWhatIfModified(false);
    }
  }, [originalBuyerInputs]);

  // Reset seller what-if to original
  const handleSellerReset = useCallback(() => {
    if (originalSellerInputs) {
      setWhatIfSellerInputs({ ...originalSellerInputs });
      setIsSellerWhatIfModified(false);
    }
  }, [originalSellerInputs]);

  // Create modified session for what-if calculations
  const getEffectiveSession = useCallback((): Session | null => {
    if (!session) return null;
    if (session.session_type === 'Buyer' && whatIfInputs) {
      return { ...session, buyer_inputs: whatIfInputs };
    }
    if (session.session_type === 'Seller' && whatIfSellerInputs) {
      return { ...session, seller_inputs: whatIfSellerInputs };
    }
    return session;
  }, [session, whatIfInputs, whatIfSellerInputs]);

  const effectiveSession = getEffectiveSession();

  const handleExportPdf = async () => {
    if (!session) return;
    setExporting(true);
    try {
      await exportReportToPdf('shared-report-export', {
        clientName: session.client_name,
        reportType: session.session_type === 'Seller' ? 'Seller' : 'Buyer',
        snapshotTimestamp: reportData?.snapshotTimestamp,
        isClientMode: true,
        customNotice: isWhatIfModified 
          ? 'This report reflects the selected offer settings at export time. To explore other scenarios, use the shared report link.'
          : undefined,
      });
      toast({
        title: "PDF exported",
        description: isWhatIfModified 
          ? "Your modified scenario has been downloaded."
          : "Your report has been downloaded.",
      });
    } catch {
      toast({
        title: "PDF export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Calculate report data using effective session (with what-if changes)
  const reportData = effectiveSession 
    ? (effectiveSession.session_type === 'Seller' 
        ? calculateSellerReport(effectiveSession, marketProfile)
        : calculateBuyerReport(effectiveSession, marketProfile))
    : null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  // Error state with specific messages
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-serif font-bold mb-2">Report Not Available</h2>
            <p className="text-muted-foreground mb-4">
              {getReportErrorMessage(error)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !effectiveSession || !reportData) return null;

  const isSeller = session.session_type === 'Seller';

  // Get mode-appropriate text for buyer
  const buyerAcceptance = !isSeller && 'acceptanceLikelihood' in reportData ? reportData.acceptanceLikelihood : 'Moderate';
  const buyerWhatThisMeansText = buyerAcceptance === 'High' 
    ? buyerWhatThisMeans[mode].high
    : buyerAcceptance === 'Moderate'
    ? buyerWhatThisMeans[mode].moderate
    : buyerWhatThisMeans[mode].low;

  // Get mode-appropriate text for seller
  const sellerLikelihood30 = isSeller && 'likelihood30' in reportData ? reportData.likelihood30 : 'Moderate';
  const sellerWhatThisMeansText = sellerLikelihood30 === 'High' 
    ? sellerWhatThisMeans[mode].high
    : sellerLikelihood30 === 'Moderate'
    ? sellerWhatThisMeans[mode].moderate
    : sellerWhatThisMeans[mode].low;

  return (
    <div className="min-h-screen bg-background">
      {/* Client Navigation Bar */}
      <div className="bg-muted border-b border-border">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/my-reports"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>My Reports</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Changes are for exploration only.
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPdf}
                disabled={exporting}
                className="min-h-[36px] px-3 text-xs shrink-0"
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                {exporting ? 'Exporting...' : 'PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Header - NO toggle, NO navigation */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6 report-header-mobile">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {agentBranding?.headshot_url ? (
                <img
                  src={agentBranding.headshot_url}
                  alt="Agent"
                  className="h-10 w-10 rounded-full object-cover border-2 border-primary-foreground/30 shrink-0"
                />
              ) : (
                <div className="p-2 rounded-lg bg-accent/20 shrink-0">
                  {isSeller ? <Building2 className="h-5 w-5 text-accent" /> : <Users className="h-5 w-5 text-accent" />}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-serif font-bold">{isSeller ? 'Seller' : 'Buyer'} Report</h1>
                <p className="text-sm text-primary-foreground/70 truncate">
                  {session.client_name} • {session.address_fields?.address_line 
                    ? `${session.address_fields.address_line}, ${formatLocation(session.location)}`
                    : formatLocation(session.location)}
                </p>
              </div>
            </div>
            {/* Desktop Scenario Explorer CTA */}
            {!isSeller && (
              <Button
                variant="outline"
                size="sm"
                onClick={openScenarioExplorer}
                className="hidden md:flex items-center gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 relative min-h-[44px]"
              >
                <Compass className="h-4 w-4" />
                Scenario Explorer
                {isWhatIfModified && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                )}
              </Button>
            )}
            {isSeller && (
              <Button
                variant="outline"
                size="sm"
                onClick={openSellerScenarioExplorer}
                className="hidden md:flex items-center gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 relative min-h-[44px]"
              >
                <Compass className="h-4 w-4" />
                Listing Scenarios
                {isSellerWhatIfModified && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add bottom padding on mobile for Scenario Explorer pill */}
      <div className={`container mx-auto px-4 py-8 max-w-3xl -mt-4 pb-28 md:pb-8`}>
        <motion.div
          id="shared-report-export"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Prepared For/By Header Block */}
          <div className="pdf-section pdf-header-section">
            <ReportHeader
              reportType={isSeller ? 'Seller' : 'Buyer'}
              clientName={session.client_name}
              snapshotTimestamp={reportData.snapshotTimestamp}
              branding={agentBranding}
              showTimestamp
            />
          </div>

          {/* Overview Card */}
          <Card className="pdf-section pdf-avoid-break">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-accent" />
                {isSeller ? getTitle('propertyOverview', isClientMode) : getTitle('offerOverview', isClientMode)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 report-info-block">
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
                  <p className="font-medium">{session.property_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <p className="font-medium">{session.condition}</p>
                </div>
                {marketProfile && (
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-sm text-muted-foreground">Market Profile</p>
                    <p className="font-medium">{marketProfile.label}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seller-specific content */}
          {isSeller && session.seller_inputs && (
            <>
              {/* Seller What-If Modified Banner */}
              {isSellerWhatIfModified && (
                <Card className="border-accent bg-accent/5">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" className="text-xs">Modified</Badge>
                        <span className="text-sm text-muted-foreground">
                          Viewing adjusted listing scenario
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    {getTitle('listingStrategy', isClientMode)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 likelihood-cards-mobile">
                    <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-sm text-muted-foreground mb-1">List Price</p>
                      <p className="text-lg sm:text-xl font-serif font-bold break-words">{formatCurrency(whatIfSellerInputs?.seller_selected_list_price || session.seller_inputs.seller_selected_list_price)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-sm text-muted-foreground mb-1">Timeframe</p>
                      <p className="text-lg sm:text-xl font-serif font-bold">{whatIfSellerInputs?.desired_timeframe || session.seller_inputs.desired_timeframe} days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile col-span-2 sm:col-span-1">
                      <p className="text-sm text-muted-foreground mb-1">Strategy</p>
                      <p className="text-lg sm:text-xl font-serif font-bold">{whatIfSellerInputs?.strategy_preference || session.seller_inputs.strategy_preference}</p>
                    </div>
                  </div>
                  {/* Only show client notes - NEVER agent notes */}
                  {(session.seller_inputs.client_notes || session.seller_inputs.notes) && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{session.seller_inputs.client_notes || session.seller_inputs.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="pdf-section pdf-avoid-break overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-accent" />
                        {getTitle('saleLikelihood', isClientMode)}
                      </CardTitle>
                      <LikelihoodDefinitions />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Market snapshot as of: {new Date(reportData.snapshotTimestamp).toLocaleString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {'likelihood30' in reportData && (
                      <>
                        <div className="text-center p-4 sm:p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                          <p className="text-sm text-muted-foreground mb-2">30 Days</p>
                          <LikelihoodBadge band={reportData.likelihood30} />
                          <LikelihoodHelperText band={reportData.likelihood30} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood30} showLabels={false} />
                          </div>
                        </div>
                        <div className="text-center p-4 sm:p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                          <p className="text-sm text-muted-foreground mb-2">60 Days</p>
                          <LikelihoodBadge band={reportData.likelihood60} />
                          <LikelihoodHelperText band={reportData.likelihood60} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood60} showLabels={false} />
                          </div>
                        </div>
                        <div className="text-center p-4 sm:p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                          <p className="text-sm text-muted-foreground mb-2">90 Days</p>
                          <LikelihoodBadge band={reportData.likelihood90} />
                          <LikelihoodHelperText band={reportData.likelihood90} />
                          <div className="mt-3 px-1">
                            <LikelihoodBar band={reportData.likelihood90} showLabels={false} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Success Prediction */}
              {marketSnapshot && (
                <SuccessPrediction
                  type="seller"
                  likelihood={'likelihood30' in reportData ? reportData.likelihood30 : 'Moderate'}
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                />
              )}

              {/* Seller Leverage Meter */}
              {(() => {
                const leverage = calculateSellerLeverage(session);
                const insights = getSellerStrategyInsights(leverage);
                return (
                  <>
                    <SellerLeverageMeter result={leverage} />
                    <StrategyInsightsCard insights={insights} />
                  </>
                );
              })()}

              {/* What This Means - Seller */}
              <Card className="pdf-section pdf-avoid-break border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{sellerWhatThisMeansText}</p>
                </CardContent>
              </Card>

              {/* Seller Pricing Regret Risk */}
              {(() => {
                const effectiveInputs = whatIfSellerInputs || session.seller_inputs!;
                return (
                  <SellerRegretRiskMeter
                    result={calculateSellerRegretRisk(effectiveInputs, sellerLikelihood30, marketSnapshot?.snapshot)}
                  />
                );
              })()}

              {/* Improvement Panel */}
              <ImprovementPanel type="seller" session={effectiveSession!} />

              {/* Expected Buyer Interest */}
              <SellerCompetingOffersCard inputs={whatIfSellerInputs || session.seller_inputs!} likelihood30={sellerLikelihood30} snapshot={marketSnapshot?.snapshot} />

              {/* Buyer Motivation Assessment */}
              <BuyerMotivationCard inputs={whatIfSellerInputs || session.seller_inputs!} likelihood30={sellerLikelihood30} snapshot={marketSnapshot?.snapshot} />

              {/* Listing Timing Advantage */}
              <SellerTimingCard inputs={whatIfSellerInputs || session.seller_inputs!} likelihood30={sellerLikelihood30} snapshot={marketSnapshot?.snapshot} />

              {/* Counter-Offer Strategy */}
              <SellerNegotiationCard inputs={whatIfSellerInputs || session.seller_inputs!} likelihood30={sellerLikelihood30} snapshot={marketSnapshot?.snapshot} />

              {/* What If You Wait to List? */}
              <SellerWaitSimulatorCard
                likelihood30={sellerLikelihood30}
                snapshot={marketSnapshot?.snapshot}
              />

              {/* Address Intelligence */}
              {marketSnapshot && (
                <AddressIntelligenceCard
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                  reportType="Seller"
                />
              )}

              {/* Scenario Comparison Banner - Seller */}
              {originalSellerInputs && whatIfSellerInputs && originalSellerLikelihood30 && (
                <ScenarioComparisonBanner
                  original={{
                    acceptance: originalSellerLikelihood30,
                    riskOfLosing: originalSellerLikelihood30 === 'High' ? 'Low' : originalSellerLikelihood30 === 'Moderate' ? 'Moderate' : 'High',
                    riskOfOverpaying: originalSellerInputs.strategy_preference === 'Maximize price' ? 'High' : originalSellerInputs.strategy_preference === 'Prioritize speed' ? 'Low' : 'Moderate',
                  }}
                  current={{
                    acceptance: sellerLikelihood30,
                    riskOfLosing: sellerLikelihood30 === 'High' ? 'Low' : sellerLikelihood30 === 'Moderate' ? 'Moderate' : 'High',
                    riskOfOverpaying: (whatIfSellerInputs.strategy_preference === 'Maximize price' ? 'High' : whatIfSellerInputs.strategy_preference === 'Prioritize speed' ? 'Low' : 'Moderate') as any,
                  }}
                  isModified={isSellerWhatIfModified}
                  labels={{ riskOfLosing: 'Stale Listing Risk', riskOfOverpaying: 'Pricing Regret' }}
                  onReset={handleSellerReset}
                />
              )}
              {/* Metric Callout Cards */}
              <MetricCalloutGrid>
                <MetricCallout
                  type="acceptance"
                  band={sellerLikelihood30}
                  label="Sale Likelihood (30 Days)"
                  description={sellerLikelihood30 === 'High' ? 'Strong probability of sale at current list price' : sellerLikelihood30 === 'Moderate' ? 'Reasonable chance of sale with current strategy' : 'May require adjustments to attract buyers'}
                />
                <MetricCallout
                  type="risk-losing"
                  band={sellerLikelihood30 === 'High' ? 'Low' : sellerLikelihood30 === 'Moderate' ? 'Moderate' : 'High'}
                  label="Stale Listing Risk"
                  description={sellerLikelihood30 === 'High' ? 'Low risk of listing going stale' : 'Consider strategy adjustments to maintain momentum'}
                />
                <MetricCallout
                  type="risk-overpay"
                  band={(whatIfSellerInputs?.strategy_preference || session.seller_inputs!.strategy_preference) === 'Maximize price' ? 'High' : (whatIfSellerInputs?.strategy_preference || session.seller_inputs!.strategy_preference) === 'Prioritize speed' ? 'Low' : 'Moderate'}
                  label="Pricing Regret Risk"
                  description={(whatIfSellerInputs?.strategy_preference || session.seller_inputs!.strategy_preference) === 'Maximize price' ? 'Aggressive pricing may lead to extended market time' : 'Current strategy balances price and timing'}
                />
              </MetricCalloutGrid>

              {/* Tradeoff Summary */}
              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{getTitle('tradeoffSummary', isClientMode)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 p-4 rounded-xl bg-secondary/50">
                    <TrendingUp className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Price vs. Time</p>
                      <p className="text-sm text-muted-foreground">
                        {(whatIfSellerInputs?.strategy_preference || session.seller_inputs!.strategy_preference) === 'Maximize price' 
                          ? 'Prioritizing maximum price tends to extend time on market.'
                          : (whatIfSellerInputs?.strategy_preference || session.seller_inputs!.strategy_preference) === 'Prioritize speed'
                          ? 'Prioritizing speed often requires more competitive pricing.'
                          : 'Balanced approach aims to optimize both price and timing.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 rounded-xl bg-secondary/50">
                    <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Certainty</p>
                      <p className="text-sm text-muted-foreground">
                        At the current list price of {formatCurrency(whatIfSellerInputs?.seller_selected_list_price || session.seller_inputs!.seller_selected_list_price)}, 
                        the likelihood of sale tends to increase over time as market exposure grows.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Buyer-specific content */}
          {!isSeller && session.buyer_inputs && (
            <>
              {/* What-If Modified Banner */}
              {isWhatIfModified && (
                <Card className="border-accent bg-accent/5">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" className="text-xs">Modified</Badge>
                        <span className="text-sm text-muted-foreground">
                          Viewing adjusted scenario
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={exporting}
                        className="h-7 text-xs"
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="pdf-section pdf-avoid-break">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    {getTitle('offerDetails', isClientMode)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 likelihood-cards-mobile">
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Offer Price</p>
                      <p className="text-base sm:text-xl font-serif font-bold break-words">{formatCurrency(whatIfInputs?.offer_price || session.buyer_inputs.offer_price)}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Financing</p>
                      <p className="text-base sm:text-xl font-serif font-bold">{whatIfInputs?.financing_type || session.buyer_inputs.financing_type}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Down Payment</p>
                      <p className="text-base sm:text-xl font-serif font-bold">{whatIfInputs?.down_payment_percent || session.buyer_inputs.down_payment_percent}%</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Contingencies</p>
                      <p className="text-sm sm:text-lg font-serif font-bold break-words">{(whatIfInputs?.contingencies || session.buyer_inputs.contingencies).join(', ') || 'None'}</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Close Timeline</p>
                      <p className="text-base sm:text-xl font-serif font-bold">{whatIfInputs?.closing_timeline || session.buyer_inputs.closing_timeline} days</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Strategy</p>
                      <p className="text-sm sm:text-lg font-serif font-bold break-words">{whatIfInputs?.buyer_preference || session.buyer_inputs.buyer_preference}</p>
                    </div>
                  </div>
                  {/* Only show client notes - NEVER agent notes */}
                  {(session.buyer_inputs.client_notes || session.buyer_inputs.notes) && (
                    <div className="mt-4 p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{session.buyer_inputs.client_notes || session.buyer_inputs.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="pdf-section pdf-avoid-break overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-accent" />
                        {getTitle('acceptanceLikelihood', isClientMode)}
                      </CardTitle>
                      <LikelihoodDefinitions />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Market snapshot as of: {new Date(reportData.snapshotTimestamp).toLocaleString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {'acceptanceLikelihood' in reportData && (
                    <div className="text-center p-8 rounded-xl border-2 border-border/50 max-w-sm mx-auto">
                      <p className="text-sm text-muted-foreground mb-4">Acceptance Likelihood</p>
                      <LikelihoodBadge band={reportData.acceptanceLikelihood} />
                      <LikelihoodHelperText band={reportData.acceptanceLikelihood} />
                      <div className="mt-4 px-4">
                        <LikelihoodBar band={reportData.acceptanceLikelihood} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              {'riskOfLosingHome' in reportData && (
                <Card className="pdf-section pdf-avoid-break">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="h-5 w-5 text-accent" />
                      {getTitle('riskTradeoff', isClientMode)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 sm:p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm sm:text-base">{getTitle('riskOfLosingHome', isClientMode)}</p>
                        </div>
                        <div className="mb-2">
                          <RiskBadge band={reportData.riskOfLosingHome} />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {reportData.riskOfLosingHome === 'Very High' || reportData.riskOfLosingHome === 'High' 
                            ? buyerRiskDescriptions.client.losingHomeHigh 
                            : buyerRiskDescriptions.client.losingHomeLow}
                        </p>
                      </div>
                      <div className="p-4 sm:p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm sm:text-base">{getTitle('riskOfOverpaying', isClientMode)}</p>
                        </div>
                        <div className="mb-2">
                          <RiskBadge band={reportData.riskOfOverpaying} />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {reportData.riskOfOverpaying === 'Very High' || reportData.riskOfOverpaying === 'High' 
                            ? buyerRiskDescriptions.client.overpayingHigh 
                            : buyerRiskDescriptions.client.overpayingLow}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Offer Position Meter */}
              {(() => {
                const effectiveBuyerSession = whatIfInputs ? { ...session, buyer_inputs: whatIfInputs } : session;
                const offerPosition = calculateOfferPosition(effectiveBuyerSession);
                const insights = getBuyerStrategyInsights(offerPosition);
                return (
                  <>
                    <OfferPositionMeter result={offerPosition} />
                    <StrategyInsightsCard insights={insights} />
                  </>
                );
              })()}

              {/* What This Means - Buyer */}
              <Card className="pdf-section pdf-avoid-break border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{buyerWhatThisMeansText}</p>
                </CardContent>
              </Card>

              {/* Regret Risk Meter */}
              {(() => {
                const effectiveInputs = whatIfInputs || session.buyer_inputs!;
                const effectiveSession = whatIfInputs ? { ...session, buyer_inputs: whatIfInputs } : session;
                const buyerReport = calculateBuyerReport(effectiveSession, marketProfile);
                return (
                  <RegretRiskMeter
                    result={calculateRegretRisk(effectiveInputs, 'riskOfOverpaying' in buyerReport ? buyerReport.riskOfOverpaying : 'Moderate', marketSnapshot?.snapshot)}
                  />
                );
              })()}

              {/* What If You Wait? Simulator */}
              {(() => {
                const effectiveInputs = whatIfInputs || session.buyer_inputs!;
                return (
                  <WaitSimulatorCard
                    marketConditions={effectiveInputs.market_conditions || 'Balanced'}
                    daysOnMarket={effectiveInputs.days_on_market ?? null}
                    offerPrice={effectiveInputs.offer_price}
                    referencePrice={effectiveInputs.reference_price || effectiveInputs.offer_price}
                    snapshot={marketSnapshot?.snapshot}
                  />
                );
              })()}

              {/* Address Intelligence */}
              {marketSnapshot && (
                <AddressIntelligenceCard
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                  reportType="Buyer"
                />
              )}

              {/* Competing Offer Simulator */}
              <BuyerCompetingOffersCard inputs={whatIfInputs || session.buyer_inputs!} snapshot={marketSnapshot?.snapshot} className="pdf-exclude" />

              {/* Seller Motivation Profile */}
              <SellerMotivationCard inputs={whatIfInputs || session.buyer_inputs!} snapshot={marketSnapshot?.snapshot} />

              {/* Offer Timing Advantage */}
              <BuyerTimingCard inputs={whatIfInputs || session.buyer_inputs!} snapshot={marketSnapshot?.snapshot} />

              {/* Negotiation Pathway */}
              {'acceptanceLikelihood' in reportData && 'riskOfLosingHome' in reportData && (
                <BuyerNegotiationCard
                  inputs={whatIfInputs || session.buyer_inputs!}
                  acceptance={reportData.acceptanceLikelihood}
                  riskOfLosing={reportData.riskOfLosingHome}
                  snapshot={marketSnapshot?.snapshot}
                />
              )}

              {/* Scenario Comparison Banner - Buyer */}
              {originalBuyerInputs && whatIfInputs && originalBuyerAcceptance && 'acceptanceLikelihood' in reportData && (
                <ScenarioComparisonBanner
                  original={{
                    acceptance: originalBuyerAcceptance,
                    riskOfLosing: originalBuyerRiskOfLosing || undefined,
                    riskOfOverpaying: originalBuyerRiskOfOverpaying || undefined,
                  }}
                  current={{
                    acceptance: reportData.acceptanceLikelihood,
                    riskOfLosing: 'riskOfLosingHome' in reportData ? reportData.riskOfLosingHome : undefined,
                    riskOfOverpaying: 'riskOfOverpaying' in reportData ? reportData.riskOfOverpaying : undefined,
                  }}
                  isModified={isWhatIfModified}
                  onReset={handleBuyerReset}
                />
              )}
            </>
          )}

          {/* Messages Thread - Client View */}
          <ReportMessages
            reportId={session.id}
            isAgent={false}
            authenticatedUserId={isClient && user ? user.id : undefined}
            authenticatedUserName={isClient && user ? (user.user_metadata?.full_name || user.email || 'Client') : undefined}
          />

          {/* Client Feedback */}
          {shareToken && (
            <ClientFeedback reportId={session.id} shareToken={shareToken} />
          )}

          {/* Methodology */}
          <div className="pdf-section">
            <AnalysisMethodology />
          </div>

          {/* Disclaimer */}
          <DisclaimerFooter variant="full" />

          {/* Report Watermark */}
          <ReportWatermark
            reportId={session.id}
            createdAt={session.created_at}
            updatedAt={session.updated_at}
            isPdfExported={session.pdf_exported ?? false}
            isShareLinkCreated={session.share_link_created ?? false}
          />

          {/* Custom Footer */}
          {agentBranding?.footer_text && (
            <div className="pdf-section text-center">
              <p className="text-xs text-muted-foreground italic">{agentBranding.footer_text}</p>
            </div>
          )}

          {/* Footer */}
          <div className="pdf-section">
            <MethodologyFooter />
          </div>

        </motion.div>
      </div>

      {/* Scenario Explorer for Buyer reports */}
      {!isSeller && session.buyer_inputs && originalBuyerInputs && whatIfInputs && (
        <ScenarioExplorer
          originalInputs={originalBuyerInputs}
          currentInputs={whatIfInputs}
          onInputsChange={handleWhatIfChange}
          reportId={session.id}
        />
      )}

      {/* Scenario Explorer for Seller reports */}
      {isSeller && session.seller_inputs && originalSellerInputs && whatIfSellerInputs && (
        <SellerScenarioExplorer
          originalInputs={originalSellerInputs}
          onInputsChange={handleSellerWhatIfChange}
          currentInputs={whatIfSellerInputs}
          likelihood30={sellerLikelihood30}
          snapshot={marketSnapshot?.snapshot}
          reportId={session.id}
        />
      )}
    </div>
  );
};

const SharedReport = () => {
  return (
    <ForceClientMode>
      <SharedReportContent />
    </ForceClientMode>
  );
};

export default SharedReport;
