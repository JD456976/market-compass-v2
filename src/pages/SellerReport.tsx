import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Clock, Building2, Target, TrendingUp, AlertCircle, CheckCircle2, FileDown, Share2, FileText, Pencil } from 'lucide-react';
import { Session, SellerReportData, LikelihoodBand } from '@/types';
import { upsertSession, getMarketProfileById } from '@/lib/storage';
import { calculateSellerReport } from '@/lib/scoring';
import { useToast } from '@/hooks/use-toast';
import { exportReportToPdf } from '@/lib/pdfExport';
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
  getSellerFactors,
  getSellerImprovementSuggestions 
} from '@/components/AgentExplanations';
import { 
  getTitle, 
  sellerWhatThisMeans, 
  tradeoffDescriptions,
  sellerSuggestions 
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
import { LikelihoodBar, TradeoffMatrix, getSellerTradeoffPosition, MetricIcon } from '@/components/ClientVisuals';
import { LikelihoodDefinitions, likelihoodHelperText } from '@/components/LikelihoodDefinitions';
import { getMarketSnapshotOrBaseline, MarketSnapshot, parseCityFromLocation, getMarketContext } from '@/lib/marketSnapshots';
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
import { HistoricalTrends } from '@/components/report/HistoricalTrends';
import { MarketConfidenceScore } from '@/components/report/MarketConfidenceScore';
import { SellerCompetitiveAnalysis } from '@/components/report/CompetitiveAnalysis';
import { SuccessPrediction } from '@/components/report/SuccessPrediction';
import { AIInsights } from '@/components/report/AIInsights';
import { ReportWatermark } from '@/components/report/ReportWatermark';
import { ViewStatsPanel } from '@/components/report/ViewStatsPanel';
import { ClientActivityTimeline } from '@/components/report/ClientActivityTimeline';
import { EducationalTooltip } from '@/components/report/EducationalTooltip';
import { CommunicationHub } from '@/components/report/CommunicationHub';
import { ShareableInsight, generateInsights } from '@/components/report/ShareableInsight';

const IMPORTANT_NOTICE = `Important Notice: This report is an informational decision-support tool. It is not an appraisal, valuation, guarantee, or prediction of outcome. Actual results depend on market conditions, competing properties or offers, and buyer/seller decisions outside the scope of this analysis.`;

function LikelihoodBadge({ band }: { band: LikelihoodBand }) {
  if (band === 'High') {
    return <Badge variant="success" className="px-4 py-1.5 text-sm font-medium">High</Badge>;
  }
  if (band === 'Moderate') {
    return <Badge variant="warning" className="px-4 py-1.5 text-sm font-medium">Moderate</Badge>;
  }
  return <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">Low</Badge>;
}

const SellerReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isClientMode } = useClientMode();
  const [reportData, setReportData] = useState<SellerReportData | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [marketSnapshot, setMarketSnapshot] = useState<{ snapshot: MarketSnapshot; isGenericBaseline: boolean } | null>(null);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('current_session');
    if (!sessionData) {
      navigate('/seller');
      return;
    }
    
    try {
      const session: Session = JSON.parse(sessionData);
      const marketProfile = session.selected_market_profile_id 
        ? getMarketProfileById(session.selected_market_profile_id) 
        : undefined;
      
      const data = calculateSellerReport(session, marketProfile);
      setReportData(data);
      
      // Get market snapshot based on location
      const snapshotData = getMarketSnapshotOrBaseline(session.location);
      setMarketSnapshot(snapshotData);
    } catch {
      navigate('/seller');
    }
  }, [navigate]);

  const handleSave = () => {
    if (!reportData) return;
    
    try {
      upsertSession(reportData.session);
      setSaved(true);
      toast({
        title: "Session saved",
        description: "Your seller session has been saved successfully.",
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

  const handleExportPdf = async () => {
    if (!reportData) return;
    const wasAlreadySharedOrExported = reportData.session.share_link_created || reportData.session.pdf_exported;
    try {
      await exportReportToPdf('report-export', {
        clientName: reportData.session.client_name,
        reportType: 'Seller',
        snapshotTimestamp: reportData.snapshotTimestamp,
        isClientMode,
      });
      // Mark as exported and save
      const updatedSession = { ...reportData.session, pdf_exported: true };
      upsertSession(updatedSession);
      setReportData({ ...reportData, session: updatedSession });
      
      // Notify about lifecycle transition
      if (!wasAlreadySharedOrExported) {
        toast({
          title: "PDF exported",
          description: "Report moved to Shared Reports.",
        });
      } else {
        toast({
          title: "PDF exported",
          description: "Your report has been downloaded.",
        });
      }
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
      const url = `${window.location.origin}/share/${reportData.session.id}`;
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
    return '/seller';
  };

  if (!reportData) return null;

  const { session, marketProfile, likelihood30, likelihood60, likelihood90, snapshotTimestamp } = reportData;
  const inputs = session.seller_inputs!;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  // Get mode-appropriate text
  const mode = isClientMode ? 'client' : 'agent';
  const whatThisMeansText = likelihood30 === 'High' 
    ? sellerWhatThisMeans[mode].high
    : likelihood30 === 'Moderate'
    ? sellerWhatThisMeans[mode].moderate
    : sellerWhatThisMeans[mode].low;

  // Get tradeoff position for client visual
  const tradeoffPosition = getSellerTradeoffPosition(
    inputs.strategy_preference,
    inputs.desired_timeframe
  );

  // Agent-only: consistency checks and limiting factor
  const consistencyIssues = getConsistencyIssues(session);
  const limitingFactor = marketSnapshot 
    ? getPrimaryLimitingFactor(session, marketSnapshot.snapshot, likelihood30)
    : null;

  // Client-mode market reference
  const cityName = parseCityFromLocation(session.location) || formatLocation(session.location);

  const handleDraftUpdate = (updatedSession: Session) => {
    const updatedData = calculateSellerReport(updatedSession, marketProfile);
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
    const baselineTimeframe: '30' | '60' | '90+' = context.speedContext === 'faster' 
      ? '30' 
      : context.speedContext === 'slower' 
      ? '90+' 
      : '60';
    
    const baselineStrategy: 'Maximize price' | 'Balanced' | 'Prioritize speed' = 
      context.priceContext === 'above'
        ? 'Balanced'
        : context.priceContext === 'below'
        ? 'Prioritize speed'
        : 'Balanced';

    const updatedInputs = {
      ...inputs,
      desired_timeframe: baselineTimeframe,
      strategy_preference: baselineStrategy,
    };

    const updatedSession: Session = {
      ...session,
      seller_inputs: updatedInputs,
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
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold">Seller Report</h1>
                  <p className="text-sm text-primary-foreground/70 truncate">{session.client_name} • {formatLocation(session.location)}</p>
                </div>
              </div>
            </div>
            <ModeSwitcher className="bg-primary-foreground/10 rounded-lg px-3 py-2 self-end sm:self-auto" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Report content for PDF export */}
          <div id="report-export" className={`space-y-6 ${isClientMode ? 'client-mode' : 'agent-mode'}`}>
            {/* Draft Status - Agent Mode Only */}
            {!isClientMode && (
              <DraftStatusIndicator session={session} className="pdf-hide-agent-notes" />
            )}

            {/* Prepared For/By Header Block */}
            <div className="pdf-section pdf-header-section">
              <ReportHeader
                reportType="Seller"
                clientName={session.client_name}
                snapshotTimestamp={snapshotTimestamp}
                showTimestamp={false}
              />
            </div>

            {/* Property Overview */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-accent" />
                  {getTitle('propertyOverview', isClientMode)}
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

            {/* Inputs Chosen */}
            <Card className="pdf-section pdf-avoid-break">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  {getTitle('listingStrategy', isClientMode)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 likelihood-cards-mobile">
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1"><EducationalTooltip termKey="listPrice">List Price</EducationalTooltip></p>
                    <p className="text-base sm:text-xl font-serif font-bold break-words">{formatCurrency(inputs.seller_selected_list_price)}</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Timeframe</p>
                    <p className="text-base sm:text-xl font-serif font-bold">{inputs.desired_timeframe} days</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-secondary/50 text-center pdf-stat-tile col-span-2 sm:col-span-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Strategy</p>
                    <p className="text-base sm:text-xl font-serif font-bold">{inputs.strategy_preference}</p>
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

            {/* Client-mode: Market context reference */}
            {isClientMode && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Analysis reflects current market conditions in the {cityName} area.
              </p>
            )}

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

            {/* Success Prediction */}
            {marketSnapshot && (
              <SuccessPrediction
                type="seller"
                likelihood={likelihood30}
                session={session}
                snapshot={marketSnapshot.snapshot}
              />
            )}

            {/* Market Snapshot */}
            <Card className="pdf-section pdf-avoid-break overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 section-header-mobile">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-accent" />
                    {getTitle('saleLikelihood', isClientMode)}
                    <LikelihoodDefinitions />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Market snapshot as of: {new Date(snapshotTimestamp).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 likelihood-cards-mobile">
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1">
                      <MetricIcon type="timeline" className="h-3 w-3" />
                      30 Days
                    </p>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <LikelihoodBadge band={likelihood30} />
                      {!isClientMode && <ConfidenceRange band={likelihood30} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {likelihoodHelperText[likelihood30]}
                    </p>
                    {isClientMode && (
                      <div className="mt-3 px-1">
                        <LikelihoodBar band={likelihood30} showLabels={false} />
                      </div>
                    )}
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1">
                      <MetricIcon type="timeline" className="h-3 w-3" />
                      60 Days
                    </p>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <LikelihoodBadge band={likelihood60} />
                      {!isClientMode && <ConfidenceRange band={likelihood60} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {likelihoodHelperText[likelihood60]}
                    </p>
                    {isClientMode && (
                      <div className="mt-3 px-1">
                        <LikelihoodBar band={likelihood60} showLabels={false} />
                      </div>
                    )}
                  </div>
                  <div className="text-center p-6 rounded-xl border-2 border-border/50 pdf-stat-tile">
                    <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1">
                      <MetricIcon type="timeline" className="h-3 w-3" />
                      90 Days
                    </p>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <LikelihoodBadge band={likelihood90} />
                      {!isClientMode && <ConfidenceRange band={likelihood90} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {likelihoodHelperText[likelihood90]}
                    </p>
                    {isClientMode && (
                      <div className="mt-3 px-1">
                        <LikelihoodBar band={likelihood90} showLabels={false} />
                      </div>
                    )}
                  </div>
                </div>
                {/* Agent-only explanations */}
                {!isClientMode && (
                  <div className="mt-6 pdf-hide-agent-notes">
                    <WhyThisResult 
                      band={likelihood30} 
                      factors={getSellerFactors(session, likelihood30)} 
                    />
                    <WhatWouldChange suggestions={getSellerImprovementSuggestions(session, likelihood30)} />
                  </div>
                )}
                {/* Likelihood explainer footer */}
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Likelihood reflects pricing strategy, property condition, and market conditions.
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
                    {inputs.strategy_preference === 'Maximize price' && (
                      <li>{sellerSuggestions[mode].strategy}</li>
                    )}
                    {inputs.strategy_preference !== 'Prioritize speed' && (
                      <li>{sellerSuggestions[mode].price}</li>
                    )}
                    {inputs.desired_timeframe === '30' && likelihood30 !== 'High' && (
                      <li>{sellerSuggestions[mode].timeframe}</li>
                    )}
                    {(inputs.desired_timeframe !== '30' || likelihood30 === 'High') && inputs.strategy_preference !== 'Maximize price' && (
                      <li>{sellerSuggestions[mode].pricing}</li>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium not-italic">Tradeoff to consider:</span> {tradeoffDescriptions[mode].sellerPriceVsTime}
                </p>
              </CardContent>
            </Card>

            {/* Agent Takeaways - Agent Mode Only */}
            {!isClientMode && (
              <AgentTakeaways
                type="seller"
                session={session}
                likelihood30={likelihood30}
              />
            )}

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
                      {inputs.strategy_preference === 'Maximize price' 
                        ? 'Prioritizing maximum price tends to extend time on market.'
                        : inputs.strategy_preference === 'Prioritize speed'
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
                      At the current list price of {formatCurrency(inputs.seller_selected_list_price)}, 
                      the likelihood of sale tends to increase over time as market exposure grows.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitive Analysis */}
            {marketSnapshot && (
              <SellerCompetitiveAnalysis
                session={session}
                snapshot={marketSnapshot.snapshot}
                isGenericBaseline={marketSnapshot.isGenericBaseline}
              />
            )}

            {/* AI-Powered Insights */}
            {marketSnapshot && (
              <AIInsights
                session={session}
                snapshot={marketSnapshot.snapshot}
                isGenericBaseline={marketSnapshot.isGenericBaseline}
                likelihood={likelihood30}
                reportType="seller"
              />
            )}

            {/* How This Analysis Is Formed - Collapsible */}
            <AnalysisMethodology />

            {/* Important Notice */}
            <div className="pdf-section pdf-avoid-break flex gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{IMPORTANT_NOTICE}</p>
            </div>

            {/* Report Watermark */}
            <ReportWatermark
              reportId={session.id}
              createdAt={session.created_at}
              updatedAt={session.updated_at}
              isPdfExported={session.pdf_exported ?? false}
              isShareLinkCreated={session.share_link_created ?? false}
            />
          </div>

          {/* Shareable Insights - Agent Only */}
          {!isClientMode && (
            <ShareableInsight
              insights={generateInsights('Seller', reportData, formatLocation(session.location))}
              location={formatLocation(session.location)}
              reportType="Seller"
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
            <Link to="/seller">
              <Button variant="outline" size="lg" className="min-h-[44px]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
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
            {/* Agent-only: Edit Draft and Reset */}
            {!isClientMode && (
              <>
                <Button onClick={() => setEditSheetOpen(true)} size="lg" variant="outline" className="min-h-[44px]">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Draft
                </Button>
                <Button onClick={handleResetToBaseline} size="lg" variant="ghost" className="min-h-[44px] text-muted-foreground">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </>
            )}
            {/* Share/Export only visible in Client mode */}
            {isClientMode && (
              <>
                <Button onClick={handleExportPdf} size="lg" variant="outline" className="min-h-[44px]">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button onClick={handleShareLink} size="lg" variant="accent" className="min-h-[44px]">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </>
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
                  Current listing strategy positioning
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
                placeholder="e.g., Quick Sale, Maximum Value..."
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
    </div>
  );
};

export default SellerReport;
