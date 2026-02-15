import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, Users, Target, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert, FileDown, Share2, FileText, Pencil, Link2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Session, BuyerReportData, ExtendedLikelihoodBand } from '@/types';
import { upsertSession, getMarketProfileById } from '@/lib/storage';
import { calculateBuyerReport } from '@/lib/scoring';
import { useToast } from '@/hooks/use-toast';
import { exportReportToPdf } from '@/lib/pdfExport';
import { getShareUrl } from '@/lib/shareUrl';
import { ReportHeader } from '@/components/ReportHeader';
import { formatLocation } from '@/lib/utils';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import { useClientMode } from '@/contexts/ClientModeContext';
import { createTemplateFromSession, saveTemplate } from '@/lib/templates';
import { AgentTakeaways } from '@/components/AgentTakeaways';
import { 
  ConfidenceRange, 
  WhyThisResult, 
  WhatWouldChange,
  getAcceptanceFactors,
  getImprovementSuggestions 
} from '@/components/AgentExplanations';
import { 
  getTitle, 
  buyerWhatThisMeans, 
  buyerRiskDescriptions, 
  tradeoffDescriptions,
  buyerSuggestions 
} from '@/lib/clientLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DraftEditorSheet } from '@/components/DraftEditorSheet';
import { LikelihoodBar, TradeoffMatrix, getBuyerTradeoffPosition, MetricIcon } from '@/components/ClientVisuals';
import { LikelihoodDefinitions, likelihoodHelperText } from '@/components/LikelihoodDefinitions';
import { AgentLab, AgentLabTrigger } from '@/components/AgentLab';
import { getMarketSnapshotOrBaseline, MarketSnapshot, parseCityFromLocation, getMarketContext, GENERIC_BASELINE } from '@/lib/marketSnapshots';
import { 
  MarketGrounding, 
  RealityAnchorNotes, 
  ConsistencyWarning, 
  PrimaryLimitingFactor,
  getConsistencyIssues,
  getPrimaryLimitingFactor
} from '@/components/RealityAnchors';
import { RotateCcw } from 'lucide-react';
import { AnalysisMethodology } from '@/components/AnalysisMethodology';
import { DraftStatusIndicator } from '@/components/DraftStatusIndicator';
import { ScenarioExplorer, ScenarioExplorerCard } from '@/components/ScenarioExplorer';
import { openScenarioExplorer } from '@/lib/scenarioExplorerEvents';
import { BuyerInputs } from '@/types';
import { HistoricalTrends } from '@/components/report/HistoricalTrends';
import { MarketConfidenceScore } from '@/components/report/MarketConfidenceScore';
// CompetitiveAnalysis merged into CompetingOffersCard
import { SuccessPrediction } from '@/components/report/SuccessPrediction';
import { PropertyFactorsCard } from '@/components/report/PropertyFactorsCard';
import { PropertyDetailsCard } from '@/components/report/PropertyDetailsCard';

import { ReportWatermark } from '@/components/report/ReportWatermark';
import { ViewStatsPanel } from '@/components/report/ViewStatsPanel';
import { ClientActivityTimeline } from '@/components/report/ClientActivityTimeline';
import { EducationalTooltip } from '@/components/report/EducationalTooltip';
import { CommunicationHub } from '@/components/report/CommunicationHub';
import { ShareableInsight, generateInsights } from '@/components/report/ShareableInsight';
import { loadPropertyFactorsForSession } from '@/lib/loadPropertyFactors';
import { calculateOfferPosition, getBuyerStrategyInsights } from '@/lib/positionScoring';
import { OfferPositionMeter, StrategyInsightsCard } from '@/components/report/PositionMeters';
import { DisclaimerFooter } from '@/components/report/DisclaimerFooter';
import { MetricCallout, MetricCalloutGrid } from '@/components/report/MetricCallout';
import { ImprovementPanel } from '@/components/report/ImprovementPanel';
import { ScenarioComparisonBanner } from '@/components/report/ScenarioComparisonBanner';
import { BuyerCompetingOffersCard } from '@/components/report/CompetingOffersCard';
import { SellerMotivationCard } from '@/components/report/MotivationCard';
import { BuyerTimingCard } from '@/components/report/TimingCard';
import { BuyerNegotiationCard } from '@/components/report/NegotiationCard';
import { ReportProvider, TemplateSection, ReportTemplate } from '@/components/report/ReportContext';
import { ReportTemplateSelector } from '@/components/report/ReportTemplateSelector';
import { RegretRiskMeter } from '@/components/report/RegretRiskMeter';
import { calculateRegretRisk } from '@/lib/regretRiskScoring';
import { WaitSimulatorCard } from '@/components/report/WaitSimulatorCard';
import { AddressIntelligenceCard } from '@/components/report/AddressIntelligenceCard';

function LikelihoodBadge({ band }: { band: ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
  return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">Very Low</Badge>;
}

function RiskBadge({ band }: { band: ExtendedLikelihoodBand }) {
  if (band === 'Very High') return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">Very High</Badge>;
  if (band === 'High') return <Badge variant="destructive" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  if (band === 'Moderate') return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  if (band === 'Low') return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
  return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">Very Low</Badge>;
}

const BuyerReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isClientMode } = useClientMode();
  const [reportData, setReportData] = useState<BuyerReportData | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [marketSnapshot, setMarketSnapshot] = useState<{ snapshot: MarketSnapshot; isGenericBaseline: boolean } | null>(null);
  const [mlsDetails, setMlsDetails] = useState<Record<string, string> | null>(null);
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('modern');
  
  // Scenario Explorer state
  const [originalInputs, setOriginalInputs] = useState<BuyerInputs | null>(null);
  const [scenarioInputs, setScenarioInputs] = useState<BuyerInputs | null>(null);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/buyer');
      return;
    }
    
    const initReport = async () => {
      try {
        const session: Session = JSON.parse(sessionData);
        const marketProfile = session.selected_market_profile_id 
          ? getMarketProfileById(session.selected_market_profile_id) 
          : undefined;
        
        // Load property factors from linked documents if not already attached
        if (!session.property_factors || session.property_factors.length === 0) {
          try {
            const factors = await loadPropertyFactorsForSession(session.id);
            if (factors.length > 0) {
              session.property_factors = factors;
            }
          } catch {
            // Non-critical - continue without factors
          }
        }

        const data = calculateBuyerReport(session, marketProfile);
        setReportData(data);
        
        // Initialize Scenario Explorer inputs
        if (session.buyer_inputs) {
          setOriginalInputs({ ...session.buyer_inputs });
          setScenarioInputs({ ...session.buyer_inputs });
        }
        
        // Load MLS details from sessionStorage
        try {
          const mlsData = sessionStorage.getItem('current_mls_details');
          if (mlsData) setMlsDetails(JSON.parse(mlsData));
        } catch { /* ignore */ }

        // Get market snapshot based on location
        const snapshotData = getMarketSnapshotOrBaseline(session.location);
        setMarketSnapshot(snapshotData);
      } catch {
        navigate('/buyer');
      }
    };

    initReport();
  }, [navigate]);

  // Handle scenario input changes - recalculate report with new inputs
  const handleScenarioChange = useCallback((newInputs: BuyerInputs) => {
    setScenarioInputs(newInputs);
    if (reportData) {
      const updatedSession = { ...reportData.session, buyer_inputs: newInputs };
      const newData = calculateBuyerReport(updatedSession, reportData.marketProfile);
      setReportData(newData);
    }
  }, [reportData]);

  const handleSave = () => {
    if (!reportData) return;
    
    try {
      upsertSession(reportData.session);
      setSaved(true);
      toast({
        title: "Session saved",
        description: "Your buyer session has been saved successfully.",
      });
    } catch {
      toast({
        title: "Could not save session",
        description: "There was an error saving your session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsTemplate = () => {
    if (!reportData || !templateName.trim()) return;
    
    try {
      const template = createTemplateFromSession(reportData.session, templateName.trim());
      saveTemplate(template);
      setTemplateDialogOpen(false);
      setTemplateName('');
      toast({
        title: "Template saved",
        description: `Template "${templateName}" has been created.`,
      });
    } catch {
      toast({
        title: "Could not save template",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async (markShared = false) => {
    if (!reportData) return;
    try {
      await exportReportToPdf('report-export', {
        clientName: reportData.session.client_name,
        reportType: 'Buyer',
        snapshotTimestamp: reportData.snapshotTimestamp,
        isClientMode,
      });
      const updatedSession = { 
        ...reportData.session, 
        pdf_exported: true,
        ...(markShared ? { share_link_created: true } : {}),
      };
      upsertSession(updatedSession);
      setReportData({ ...reportData, session: updatedSession });
      
      toast({
        title: "PDF exported",
        description: markShared ? "Report shared and PDF downloaded." : "Your report has been downloaded.",
      });
    } catch {
      toast({
        title: "PDF export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareLink = () => {
    if (!reportData) return;
    const wasAlreadySharedOrExported = reportData.session.share_link_created || reportData.session.pdf_exported;
    try {
      // Mark as shared and save
      const updatedSession = { ...reportData.session, share_link_created: true };
      upsertSession(updatedSession);
      setReportData({ ...reportData, session: updatedSession });
      const token = (reportData.session as any).share_token || reportData.session.id;
      const url = getShareUrl(token);
      navigator.clipboard.writeText(url);
      
      // Notify about lifecycle transition
      if (!wasAlreadySharedOrExported) {
        toast({
          title: "Link copied",
          description: "Report moved to Shared Reports.",
        });
      } else {
        toast({
          title: "Link copied",
          description: "Share link has been copied to clipboard.",
        });
      }
    } catch {
      toast({
        title: "Could not generate share link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get entry context for back navigation
  const getBackPath = () => {
    const entryContext = sessionStorage.getItem('report_entry_context');
    if (entryContext === '/drafts' || entryContext === '/shared-reports') {
      return entryContext;
    }
    return '/buyer';
  };

  if (!reportData) return null;

  const { session, marketProfile, acceptanceLikelihood, riskOfLosingHome, riskOfOverpaying, snapshotTimestamp } = reportData;
  const inputs = session.buyer_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Get mode-appropriate text
  const mode = isClientMode ? 'client' : 'agent';
  const whatThisMeansText = acceptanceLikelihood === 'High' 
    ? buyerWhatThisMeans[mode].high
    : acceptanceLikelihood === 'Moderate'
    ? buyerWhatThisMeans[mode].moderate
    : buyerWhatThisMeans[mode].low;

  const losingHomeDesc = riskOfLosingHome === 'Very High' || riskOfLosingHome === 'High' || riskOfLosingHome === 'Moderate'
    ? buyerRiskDescriptions[mode].losingHomeHigh
    : buyerRiskDescriptions[mode].losingHomeLow;

  const overpayingDesc = riskOfOverpaying === 'Very High' || riskOfOverpaying === 'High' || riskOfOverpaying === 'Moderate'
    ? buyerRiskDescriptions[mode].overpayingHigh
    : buyerRiskDescriptions[mode].overpayingLow;

  // Get tradeoff position for client visual
  const tradeoffPosition = getBuyerTradeoffPosition(
    inputs.buyer_preference,
    inputs.contingencies.length,
    inputs.financing_type,
    inputs.closing_timeline
  );

  // Agent-only: consistency checks and limiting factor
  const consistencyIssues = getConsistencyIssues(session);
  const limitingFactor = marketSnapshot 
    ? getPrimaryLimitingFactor(session, marketSnapshot.snapshot, acceptanceLikelihood)
    : null;

  // Client-mode market reference
  const cityName = parseCityFromLocation(session.location) || formatLocation(session.location);

  const handleDraftUpdate = (updatedSession: Session) => {
    const updatedData = calculateBuyerReport(updatedSession, marketProfile);
    setReportData(updatedData);
    sessionStorage.setItem('current_session', JSON.stringify(updatedSession));
    
    // Update market snapshot if location changed
    const newSnapshot = getMarketSnapshotOrBaseline(updatedSession.location);
    setMarketSnapshot(newSnapshot);
    
    setSaved(false);
    toast({
      title: "Draft updated",
      description: "Your changes have been applied.",
    });
  };

  // Reset to market baseline defaults (Agent-only)
  const handleResetToBaseline = () => {
    if (!marketSnapshot) return;
    
    const snapshot = marketSnapshot.snapshot;
    const context = getMarketContext(snapshot);
    
    // Derive defaults from market context - properly typed
    const baselineContingencies: ('Inspection' | 'Financing' | 'Appraisal' | 'Home sale' | 'None')[] = 
      context.competitionContext === 'high' 
        ? ['Inspection'] 
        : ['Inspection', 'Financing'];
    
    const baselineTimeline: '<21' | '21-30' | '31-45' | '45+' = context.speedContext === 'faster' 
      ? '21-30' 
      : context.speedContext === 'slower' 
      ? '45+' 
      : '31-45';
    
    const baselinePreference: 'Must win' | 'Balanced' | 'Price-protective' = 
      context.competitionContext === 'high'
        ? 'Must win'
        : 'Balanced';

    const updatedInputs = {
      ...inputs,
      contingencies: baselineContingencies,
      closing_timeline: baselineTimeline,
      buyer_preference: baselinePreference,
    };

    const updatedSession: Session = {
      ...session,
      buyer_inputs: updatedInputs,
      updated_at: new Date().toISOString(),
    };

    handleDraftUpdate(updatedSession);
    toast({
      title: "Reset to baseline",
      description: "Strategy defaults derived from market conditions.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-6 report-header-mobile">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link to={getBackPath()}>
                <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-accent/20 shrink-0">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold">Buyer Report</h1>
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

      {/* Add bottom padding on mobile when Scenario Explorer pill is visible (client mode) */}
      <div className={`container mx-auto px-4 py-8 max-w-3xl -mt-4 ${isClientMode ? 'pb-24 md:pb-8' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Report content for PDF export */}
          <div id="report-export" className={`${isClientMode ? 'client-mode' : 'agent-mode'}`}>
          <ReportProvider template={reportTemplate}>
            {/* Template Selector */}
            <div className="pdf-hide-agent-notes">
              <ReportTemplateSelector selected={reportTemplate} onSelect={setReportTemplate} />
            </div>

            {/* Draft Status - Agent Mode Only */}
            {!isClientMode && (
              <DraftStatusIndicator session={session} className="pdf-hide-agent-notes" />
            )}

            {/* Prepared For/By Header Block */}
            <div className="pdf-section pdf-header-section">
              <ReportHeader
                reportType="Buyer"
                clientName={session.client_name}
                snapshotTimestamp={snapshotTimestamp}
                showTimestamp={false}
              />
            </div>

            {/* Scenario Explorer Card - Client Mode Only, Top of Report */}
            {isClientMode && originalInputs && scenarioInputs && (
              <ScenarioExplorerCard
                hasChanges={JSON.stringify(scenarioInputs) !== JSON.stringify(originalInputs)}
                onClick={openScenarioExplorer}
              />
            )}

            {/* Offer Overview */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  {getTitle('offerOverview', isClientMode)}
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

            {/* Offer Details */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  {getTitle('offerDetails', isClientMode)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${inputs.financing_type === 'Cash' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-3 mb-4 likelihood-cards-mobile`}>
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Offer Price</p>
                    <p className="text-base sm:text-lg font-serif font-bold break-words">{formatCurrency(inputs.offer_price)}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1"><EducationalTooltip termKey="financing">Financing</EducationalTooltip></p>
                    <p className="text-base sm:text-lg font-serif font-bold">{inputs.financing_type}</p>
                  </div>
                  {/* Hide Down Payment for Cash offers */}
                  {inputs.financing_type !== 'Cash' && (
                    <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Down Payment</p>
                      <p className="text-base sm:text-lg font-serif font-bold">{inputs.down_payment_percent}</p>
                    </div>
                  )}
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Closing</p>
                    <p className="text-base sm:text-lg font-serif font-bold">{inputs.closing_timeline} days</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 sm:p-4 rounded-xl bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1"><EducationalTooltip termKey="contingency">Contingencies</EducationalTooltip></p>
                    <p className="font-medium text-sm sm:text-base contingencies-list">{inputs.contingencies.length > 0 ? inputs.contingencies.join(', ') : 'None'}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Buyer Preference</p>
                    <p className="font-medium text-sm sm:text-base">{inputs.buyer_preference}</p>
                  </div>
                </div>
                {/* Client Notes - visible in PDF/Share */}
                {(inputs.client_notes || inputs.notes) && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{inputs.client_notes || inputs.notes}</p>
                  </div>
                )}
                {/* Agent Notes - hidden from PDF/Share and client mode */}
                {inputs.agent_notes && !isClientMode && (
                  <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50 pdf-hide-agent-notes">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      Agent Notes <span className="text-xs">(Private)</span>
                    </p>
                    <p className="text-sm">{inputs.agent_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <TemplateSection show={['executive']}>
            {/* Agent-only: Market Grounding & Reality Anchors */}
            {!isClientMode && marketSnapshot && (
              <div className="space-y-3 pdf-hide-agent-notes">
                <MarketGrounding 
                  session={session}
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                />
                <RealityAnchorNotes session={session} snapshot={marketSnapshot.snapshot} />
                {consistencyIssues.length > 0 && (
                  <ConsistencyWarning issues={consistencyIssues} />
                )}
                {limitingFactor && (
                  <PrimaryLimitingFactor factor={limitingFactor.factor} lever={limitingFactor.lever} />
                )}
              </div>
            )}
            </TemplateSection>

            {/* Client-mode: Market context reference */}
            {isClientMode && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Analysis reflects current market conditions in the {cityName} area.
              </p>
            )}

            <TemplateSection show={['executive']}>
            {/* Market Confidence Score */}
            {marketSnapshot && (
              <div className="flex justify-center">
                <MarketConfidenceScore
                  snapshot={marketSnapshot.snapshot}
                  isGenericBaseline={marketSnapshot.isGenericBaseline}
                  session={session}
                />
              </div>
            )}

            {/* Historical Trends & Market Context */}
            {marketSnapshot && (
              <HistoricalTrends
                snapshot={marketSnapshot.snapshot}
                isGenericBaseline={marketSnapshot.isGenericBaseline}
                isClientMode={isClientMode}
              />
            )}
            </TemplateSection>

            <TemplateSection hide={['snapshot']}>
            {/* Property Details from MLS */}
            {mlsDetails && <PropertyDetailsCard details={mlsDetails} />}

            {/* Property Intelligence Factors */}
            {session.property_factors && session.property_factors.length > 0 && (
              <PropertyFactorsCard
                factors={session.property_factors}
                editable={!isClientMode}
                onFactorsChange={(newFactors) => {
                  const updatedSession = { ...session, property_factors: newFactors };
                  const newData = calculateBuyerReport(updatedSession, marketProfile);
                  setReportData(newData);
                  sessionStorage.setItem('current_session', JSON.stringify(updatedSession));
                  setSaved(false);
                }}
              />
            )}
            </TemplateSection>

            <TemplateSection hide={['snapshot']}>
            {/* Success Prediction */}
            {marketSnapshot && (
              <SuccessPrediction
                type="buyer"
                likelihood={acceptanceLikelihood}
                session={session}
                snapshot={marketSnapshot.snapshot}
              />
            )}

            {/* Offer Position Meter */}
            {(() => {
              const offerPosition = calculateOfferPosition(session, marketSnapshot?.snapshot);
              const positionInsights = getBuyerStrategyInsights(offerPosition);
              return (
                <>
                  <OfferPositionMeter result={offerPosition} />
                  <StrategyInsightsCard insights={positionInsights} />
                </>
              );
            })()}
            </TemplateSection>

            {/* Core interactive features — available on ALL templates */}

            {/* Regret Risk Meter */}
            <RegretRiskMeter
              result={calculateRegretRisk(inputs, riskOfOverpaying, marketSnapshot?.snapshot)}
            />

            {/* What If You Wait? Simulator */}
            <WaitSimulatorCard
              marketConditions={inputs.market_conditions || 'Balanced'}
              daysOnMarket={inputs.days_on_market ?? null}
              offerPrice={inputs.offer_price}
              referencePrice={inputs.reference_price || inputs.offer_price}
              snapshot={marketSnapshot?.snapshot}
            />

            {/* Address Intelligence */}
            {marketSnapshot && (
              <AddressIntelligenceCard
                session={session}
                snapshot={marketSnapshot.snapshot}
                isGenericBaseline={marketSnapshot.isGenericBaseline}
                reportType="Buyer"
              />
            )}

            {/* Improvement Panel */}
            <ImprovementPanel type="buyer" session={session} />

            {/* Competitive Intelligence */}
            <BuyerCompetingOffersCard inputs={inputs} snapshot={marketSnapshot?.snapshot} isGenericBaseline={marketSnapshot?.isGenericBaseline} className="pdf-exclude" />

            {/* Seller Motivation Profile */}
            <SellerMotivationCard inputs={inputs} snapshot={marketSnapshot?.snapshot} />

            {/* Offer Timing Advantage */}
            <BuyerTimingCard inputs={inputs} snapshot={marketSnapshot?.snapshot} />

            {/* Negotiation Pathway */}
            <BuyerNegotiationCard
              inputs={inputs}
              acceptance={reportData.acceptanceLikelihood}
              riskOfLosing={reportData.riskOfLosingHome}
              snapshot={marketSnapshot?.snapshot}
            />

            {/* Scenario Comparison Banner */}
            {originalInputs && scenarioInputs && (
              <ScenarioComparisonBanner
                original={{
                  acceptance: reportData.acceptanceLikelihood,
                  riskOfLosing: reportData.riskOfLosingHome,
                  riskOfOverpaying: reportData.riskOfOverpaying,
                }}
                current={{
                  acceptance: reportData.acceptanceLikelihood,
                  riskOfLosing: reportData.riskOfLosingHome,
                  riskOfOverpaying: reportData.riskOfOverpaying,
                }}
                isModified={JSON.stringify(scenarioInputs) !== JSON.stringify(originalInputs)}
              />
            )}

            <TemplateSection show={['executive']}>
            {/* Acceptance Likelihood */}
            <Card className="pdf-section pdf-avoid-break overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-accent" />
                    {getTitle('acceptanceLikelihood', isClientMode)}
                    <LikelihoodDefinitions />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-center">
                  <div className="text-center p-8 rounded-xl border-2 border-accent/30 bg-accent/5 min-w-[200px] pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                      <MetricIcon type="certainty" className="h-3.5 w-3.5" />
                      Likelihood of Acceptance
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <LikelihoodBadge band={acceptanceLikelihood} />
                      {!isClientMode && <ConfidenceRange band={acceptanceLikelihood} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {likelihoodHelperText[acceptanceLikelihood]}
                    </p>
                    {isClientMode && (
                      <div className="mt-4 px-2">
                        <LikelihoodBar band={acceptanceLikelihood} />
                      </div>
                    )}
                    {!isClientMode && (
                      <div className="mt-4 text-left pdf-hide-agent-notes">
                        <WhyThisResult 
                          band={acceptanceLikelihood} 
                          factors={getAcceptanceFactors(session, acceptanceLikelihood)} 
                        />
                        <WhatWouldChange suggestions={getImprovementSuggestions(session, acceptanceLikelihood)} />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Likelihood reflects price, financing strength, contingencies, and market conditions.
                </p>
              </CardContent>
            </Card>

            {/* What This Means */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{getTitle('whatThisMeans', isClientMode)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {whatThisMeansText}
                </p>
                <div>
                  <p className="font-medium text-sm mb-2">If your goal is to increase certainty:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    {inputs.contingencies.length > 0 && inputs.contingencies[0] !== 'None' && (
                      <li>{buyerSuggestions[mode].contingencies}</li>
                    )}
                    {(inputs.closing_timeline === '31-45' || inputs.closing_timeline === '45+') && (
                      <li>{buyerSuggestions[mode].timeline}</li>
                    )}
                    {inputs.financing_type !== 'Cash' && (
                      <li>{buyerSuggestions[mode].financing}</li>
                    )}
                    {inputs.buyer_preference !== 'Must win' && (
                      <li>{buyerSuggestions[mode].price}</li>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium not-italic">Tradeoff to consider:</span> {tradeoffDescriptions[mode].buyerMain}
                </p>
              </CardContent>
            </Card>

            {/* Agent Takeaways - Agent Mode Only */}
            {!isClientMode && (
              <AgentTakeaways
                type="buyer"
                session={session}
                acceptanceLikelihood={acceptanceLikelihood}
                riskOfLosingHome={riskOfLosingHome}
                riskOfOverpaying={riskOfOverpaying}
              />
            )}
            </TemplateSection>

            {/* Risk Assessment Callout Cards */}
            <MetricCalloutGrid>
              <MetricCallout
                type="acceptance"
                band={acceptanceLikelihood}
                label="Acceptance Likelihood"
                description={whatThisMeansText}
              />
              <MetricCallout
                type="risk-losing"
                band={riskOfLosingHome}
                label="Risk of Losing Home"
                description={losingHomeDesc}
              />
              <MetricCallout
                type="risk-overpay"
                band={riskOfOverpaying}
                label="Risk of Overpaying"
                description={overpayingDesc}
              />
            </MetricCalloutGrid>

            <TemplateSection show={['executive']}>
            {/* How This Analysis Is Formed - Collapsible */}
            <AnalysisMethodology />
            </TemplateSection>

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
          </ReportProvider>
          </div>

          {/* Shareable Insights - Agent Only */}
          {!isClientMode && (
            <ShareableInsight
              insights={generateInsights('Buyer', reportData, formatLocation(session.location))}
              location={formatLocation(session.location)}
              reportType="Buyer"
            />
          )}

          {/* Communication Hub - Agent Only */}
          {!isClientMode && session.share_link_created && (
            <CommunicationHub reportId={session.id} isAgent={true} />
          )}

          {/* View Stats - Agent Only, Outside PDF export */}
          {!isClientMode && session.share_link_created && (
            <ViewStatsPanel reportId={session.id} />
          )}

          {/* Client Activity Timeline - Agent Only */}
          {!isClientMode && session.share_link_created && (
            <ClientActivityTimeline reportId={session.id} />
          )}

          {/* Actions - OUTSIDE report-export container */}
          <div className="flex flex-wrap gap-3 pt-4 report-actions">
            <Link to="/buyer">
              <Button variant="outline" size="lg" className="min-h-[44px]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            {/* Only show editing controls when NOT shared */}
            {!session.share_link_created && (
              <>
                <Button onClick={handleSave} disabled={saved} size="lg" variant={saved ? "secondary" : "accent"} className="min-h-[44px]">
                  {saved ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>
                <Button onClick={() => setTemplateDialogOpen(true)} size="lg" variant="outline" className="min-h-[44px]">
                  <FileText className="mr-2 h-4 w-4" />
                  Template
                </Button>
                {/* Agent-only: Edit in Flow, Edit Draft, Lab, and Reset */}
                {!isClientMode && (
                  <>
                    <Button 
                      onClick={() => {
                        sessionStorage.setItem('returning_to_edit', 'true');
                        sessionStorage.setItem('current_session', JSON.stringify(session));
                        navigate('/buyer');
                      }} 
                      size="lg" variant="outline" className="min-h-[44px]"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit in Flow
                    </Button>
                    <Button onClick={() => setEditSheetOpen(true)} size="lg" variant="outline" className="min-h-[44px]">
                      <Pencil className="mr-2 h-4 w-4" />
                      Quick Edit
                    </Button>
                    <Button onClick={handleResetToBaseline} size="lg" variant="ghost" className="min-h-[44px] text-muted-foreground">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <AgentLabTrigger onClick={() => setLabOpen(true)} />
                  </>
                )}
              </>
            )}
            {session.share_link_created && !isClientMode && (
              <Badge variant="secondary" className="h-11 px-4 flex items-center gap-2 text-sm">
                <Share2 className="h-4 w-4" />
                Shared — Read Only
              </Badge>
            )}
            {/* Share dropdown - visible in Client mode, only when not yet shared */}
            {isClientMode && !session.share_link_created && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg" variant="accent" className="min-h-[44px]">
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
            )}
          </div>

          {/* Client mode: Tradeoff Matrix */}
          {isClientMode && (
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MetricIcon type="tradeoff" />
                  Position Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <TradeoffMatrix 
                  positions={[{ position: tradeoffPosition }]}
                  xAxis={{ left: 'Speed', right: 'Price' }}
                  yAxis={{ top: 'Certainty', bottom: 'Flexibility' }}
                />
                <p className="text-[10px] text-center text-muted-foreground mt-3">
                  Current offer positioning based on strategy and terms
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this session's settings. Client name and location will not be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., First-Time Buyer, Cash Offer..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Editor Sheet - Agent Mode Only */}
      <DraftEditorSheet
        session={session}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSave={handleDraftUpdate}
      />

      {/* Agent Lab - Agent Mode Only */}
      <AgentLab
        session={session}
        currentLikelihood={acceptanceLikelihood}
        open={labOpen}
        onOpenChange={setLabOpen}
        onApply={handleDraftUpdate}
      />

      {/* Scenario Explorer - Client mode only */}
      {isClientMode && originalInputs && scenarioInputs && (
        <ScenarioExplorer
          originalInputs={originalInputs}
          currentInputs={scenarioInputs}
          onInputsChange={handleScenarioChange}
          reportId={session.id}
        />
      )}
    </div>
  );
};

export default BuyerReport;
