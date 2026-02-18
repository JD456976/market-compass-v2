import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { EntitlementProvider } from "@/contexts/EntitlementContext";
import { BetaAccessGate } from "@/components/BetaAccessGate";
import { RequireAuth } from "@/components/RequireAuth";
import { GlobalNav, MobileNavSpacer } from "@/components/GlobalNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTransition } from "@/components/PageTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TrialBanner } from "@/components/TrialBanner";
import Index from "./pages/Index";
import MarketIntelligence from "./pages/MarketIntelligence";
import QuickReport from "./pages/QuickReport";
import MarketData from "./pages/MarketData";
import Methodology from "./pages/Methodology";
import SellerFlow from "./pages/SellerFlow";
import BuyerFlow from "./pages/BuyerFlow";
import SellerReport from "./pages/SellerReport";
import BuyerReport from "./pages/BuyerReport";
import DraftAnalyses from "./pages/DraftAnalyses";
import SharedReports from "./pages/SharedReports";
import SharedReport from "./pages/SharedReport";
import CompareSessions from "./pages/CompareSessions";
import ClientComparisonReport from "./pages/ClientComparisonReport";
import SharedComparisonReport from "./pages/SharedComparisonReport";
import AgentProfile from "./pages/AgentProfile";
import Templates from "./pages/Templates";
import Admin from "./pages/Admin";
import BetaAccess from "./pages/BetaAccess";
import Subscription from "./pages/Subscription";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AccountSettings from "./pages/AccountSettings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import PublicMarketTrends from "./pages/PublicMarketTrends";
import ClientDashboard from "./pages/ClientDashboard";
import ClientPropertyComparison from "./pages/ClientPropertyComparison";
import ClientInvite from "./pages/ClientInvite";
import Clients from "./pages/Clients";
import Documents from "./pages/Documents";
import UploadDocument from "./pages/UploadDocument";
import ReviewDocument from "./pages/ReviewDocument";
import LeadFinder from "./pages/LeadFinder";
import MarketIntelEmbed from "./pages/MarketIntelEmbed";
import SavedPlaybooks from "./pages/SavedPlaybooks";
import OfferTracker from "./pages/OfferTracker";
import ListingNavigator from "./pages/ListingNavigator";

const queryClient = new QueryClient();

// Routes that bypass both beta gate AND auth (truly public)
const PUBLIC_ROUTES = ['/share/', '/admin', '/beta', '/privacy', '/terms', '/login', '/signup', '/forgot-password', '/reset-password', '/market-trends', '/invite', '/pricing', '/my-reports', '/embed/'];

function AppRoutes() {
  const location = useLocation();
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  const routes = (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          {/* Public routes - no auth required */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/beta" element={<BetaAccess />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/share/:sessionId" element={<SharedReport />} />
          <Route path="/share/compare" element={<SharedComparisonReport />} />
          <Route path="/market-trends" element={<PublicMarketTrends />} />
          <Route path="/my-reports" element={<RequireAuth><ClientDashboard /></RequireAuth>} />
          <Route path="/my-reports/compare" element={<RequireAuth><ClientPropertyComparison /></RequireAuth>} />
          <Route path="/invite" element={<ClientInvite />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/pricing" element={<RequireAuth><Pricing /></RequireAuth>} />
          <Route path="/embed/market-intel" element={<MarketIntelEmbed />} />

          {/* Protected routes - require auth */}
          <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
          <Route path="/market-profiles" element={<RequireAuth><MarketIntelligence /></RequireAuth>} />
          <Route path="/market-scenarios" element={<RequireAuth><MarketIntelligence /></RequireAuth>} />
          <Route path="/market-intelligence" element={<RequireAuth><MarketIntelligence /></RequireAuth>} />
          <Route path="/quick-report" element={<RequireAuth><QuickReport /></RequireAuth>} />
          <Route path="/market-data" element={<RequireAuth><MarketData /></RequireAuth>} />
          <Route path="/methodology" element={<RequireAuth><Methodology /></RequireAuth>} />
          <Route path="/seller" element={<RequireAuth><SellerFlow /></RequireAuth>} />
          <Route path="/seller/report" element={<RequireAuth><SellerReport /></RequireAuth>} />
          <Route path="/buyer" element={<RequireAuth><BuyerFlow /></RequireAuth>} />
          <Route path="/buyer/report" element={<RequireAuth><BuyerReport /></RequireAuth>} />
          <Route path="/drafts" element={<RequireAuth><DraftAnalyses /></RequireAuth>} />
          <Route path="/shared-reports" element={<RequireAuth><SharedReports /></RequireAuth>} />
          <Route path="/compare" element={<RequireAuth><CompareSessions /></RequireAuth>} />
          <Route path="/compare/client" element={<RequireAuth><ClientComparisonReport /></RequireAuth>} />
          <Route path="/agent-profile" element={<RequireAuth><AgentProfile /></RequireAuth>} />
          <Route path="/templates" element={<RequireAuth><Templates /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Subscription /></RequireAuth>} />
          <Route path="/subscription" element={<RequireAuth><Subscription /></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
          <Route path="/lead-finder" element={<RequireAuth><LeadFinder /></RequireAuth>} />
          <Route path="/listing-navigator" element={<RequireAuth><ListingNavigator /></RequireAuth>} />
          <Route path="/saved-playbooks" element={<RequireAuth><SavedPlaybooks /></RequireAuth>} />
          <Route path="/offer-tracker" element={<RequireAuth><OfferTracker /></RequireAuth>} />
          <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
          <Route path="/documents/upload" element={<RequireAuth><UploadDocument /></RequireAuth>} />
          <Route path="/documents/:documentId/review" element={<RequireAuth><ReviewDocument /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><AccountSettings /></RequireAuth>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );

  if (isPublicRoute) {
    return routes;
  }

  return <BetaAccessGate>{routes}</BetaAccessGate>;
}

function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <GlobalNav />
      <TrialBanner />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <MobileNavSpacer />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntitlementProvider>
          <ClientModeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <div className="min-h-screen flex flex-col">
                  <OfflineBanner />
                  <AppLayout />
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </ClientModeProvider>
        </EntitlementProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
