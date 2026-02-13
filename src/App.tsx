import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BetaAccessGate } from "@/components/BetaAccessGate";
import { GlobalNav, MobileNavSpacer } from "@/components/GlobalNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import MarketProfiles from "./pages/MarketProfiles";
import MarketScenarios from "./pages/MarketScenarios";
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

const queryClient = new QueryClient();

// Routes that bypass beta gate (shared links, admin, beta access, auth pages, legal, public market, client dashboard)
const PUBLIC_ROUTES = ['/share/', '/admin', '/beta', '/privacy', '/terms', '/login', '/signup', '/forgot-password', '/reset-password', '/market-trends', '/my-reports', '/invite'];

function AppRoutes() {
  const location = useLocation();
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  const routes = (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/beta" element={<BetaAccess />} />
          <Route path="/market-profiles" element={<MarketProfiles />} />
          <Route path="/market-scenarios" element={<MarketScenarios />} />
          <Route path="/market-data" element={<MarketData />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/seller" element={<SellerFlow />} />
          <Route path="/seller/report" element={<SellerReport />} />
          <Route path="/buyer" element={<BuyerFlow />} />
          <Route path="/buyer/report" element={<BuyerReport />} />
          <Route path="/drafts" element={<DraftAnalyses />} />
          <Route path="/saved-sessions" element={<DraftAnalyses />} />
          <Route path="/shared-reports" element={<SharedReports />} />
          <Route path="/client-deliverables" element={<SharedReports />} />
          <Route path="/compare" element={<CompareSessions />} />
          <Route path="/compare/client" element={<ClientComparisonReport />} />
          <Route path="/agent-profile" element={<AgentProfile />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/share/:sessionId" element={<SharedReport />} />
          <Route path="/share/compare" element={<SharedComparisonReport />} />
          <Route path="/market-trends" element={<PublicMarketTrends />} />
          <Route path="/my-reports" element={<ClientDashboard />} />
          <Route path="/my-reports/compare" element={<ClientPropertyComparison />} />
          <Route path="/invite" element={<ClientInvite />} />
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
      <main className="flex-1">
        <AppRoutes />
      </main>
      <FloatingActionButton />
      <MobileNavSpacer />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClientModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <AppLayout />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </ClientModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
