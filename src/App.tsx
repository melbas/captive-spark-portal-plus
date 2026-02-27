
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Portal from "./pages/Portal";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import WifiPortalContainer from "./components/wifi-portal/WifiPortalContainer";
import { LanguageProvider } from "./components/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminResellers from "./pages/admin/AdminResellers";
import AdminSites from "./pages/admin/AdminSites";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVouchers from "./pages/admin/AdminVouchers";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<WifiPortalContainer />} />
                <Route path="/portal/:slug" element={<Portal />} />
                <Route path="/legacy" element={<Index />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="resellers" element={<AdminResellers />} />
                  <Route path="sites" element={<AdminSites />} />
                  <Route path="sessions" element={<AdminSessions />} />
                  <Route path="transactions" element={<AdminTransactions />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="vouchers" element={<AdminVouchers />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
