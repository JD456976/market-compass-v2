import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClientModeProvider } from "@/contexts/ClientModeContext";
import Index from "./pages/Index";
import MarketProfiles from "./pages/MarketProfiles";
import SellerFlow from "./pages/SellerFlow";
import BuyerFlow from "./pages/BuyerFlow";
import SellerReport from "./pages/SellerReport";
import BuyerReport from "./pages/BuyerReport";
import SavedSessions from "./pages/SavedSessions";
import SharedReport from "./pages/SharedReport";
import CompareSessions from "./pages/CompareSessions";
import ClientComparisonReport from "./pages/ClientComparisonReport";
import SharedComparisonReport from "./pages/SharedComparisonReport";
import AgentProfile from "./pages/AgentProfile";
import Templates from "./pages/Templates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClientModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/market-profiles" element={<MarketProfiles />} />
            <Route path="/seller" element={<SellerFlow />} />
            <Route path="/seller/report" element={<SellerReport />} />
            <Route path="/buyer" element={<BuyerFlow />} />
            <Route path="/buyer/report" element={<BuyerReport />} />
            <Route path="/saved-sessions" element={<SavedSessions />} />
            <Route path="/compare" element={<CompareSessions />} />
            <Route path="/compare/client" element={<ClientComparisonReport />} />
            <Route path="/agent-profile" element={<AgentProfile />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/share/:sessionId" element={<SharedReport />} />
            <Route path="/share/compare" element={<SharedComparisonReport />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ClientModeProvider>
  </QueryClientProvider>
);

export default App;
