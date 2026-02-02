import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import { BetaAccessGate } from "@/components/BetaAccessGate";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Routes that bypass beta gate (shared links and admin)
const PUBLIC_ROUTES = ['/share/', '/admin'];

function AppRoutes() {
  const location = useLocation();
  
  // Check if current route is public (shared links or admin)
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  const routes = (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/market-profiles" element={<MarketProfiles />} />
      <Route path="/market-scenarios" element={<MarketScenarios />} />
      <Route path="/market-data" element={<MarketData />} />
      <Route path="/methodology" element={<Methodology />} />
      <Route path="/seller" element={<SellerFlow />} />
      <Route path="/seller/report" element={<SellerReport />} />
      <Route path="/buyer" element={<BuyerFlow />} />
      <Route path="/buyer/report" element={<BuyerReport />} />
      {/* Draft Analyses (internal working sessions) */}
      <Route path="/drafts" element={<DraftAnalyses />} />
      <Route path="/saved-sessions" element={<DraftAnalyses />} /> {/* Legacy redirect */}
      {/* Shared Reports (read-only log of shared/exported) */}
      <Route path="/shared-reports" element={<SharedReports />} />
      <Route path="/client-deliverables" element={<SharedReports />} /> {/* Legacy redirect */}
      <Route path="/compare" element={<CompareSessions />} />
      <Route path="/compare/client" element={<ClientComparisonReport />} />
      <Route path="/agent-profile" element={<AgentProfile />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/share/:sessionId" element={<SharedReport />} />
      <Route path="/share/compare" element={<SharedComparisonReport />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  // Public routes bypass beta gate
  if (isPublicRoute) {
    return routes;
  }

  // All other routes require beta access
  return <BetaAccessGate>{routes}</BetaAccessGate>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClientModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ClientModeProvider>
  </QueryClientProvider>
);

export default App;
