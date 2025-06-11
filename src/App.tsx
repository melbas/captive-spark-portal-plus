
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import WifiPortalContainer from "./components/wifi-portal/WifiPortalContainer";
import { LanguageProvider } from "./components/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminThemeManager from "./components/wifi-portal/AdminThemeManager";
import ThemePackageManager from "./components/wifi-portal/ThemePackageManager";
import ThemeImporter from "./components/wifi-portal/ThemeImporter";
import ThemeMarketplace from "./components/wifi-portal/ThemeMarketplace";
import ThemeVersionManager from "./components/wifi-portal/ThemeVersionManager";

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
                <Route path="/legacy" element={<Index />} />
                <Route path="/admin/theme" element={<AdminThemeManager />} />
                <Route path="/admin/theme/package" element={<ThemePackageManager />} />
                <Route path="/admin/theme/import" element={<ThemeImporter />} />
                <Route path="/admin/theme/marketplace" element={<ThemeMarketplace />} />
                <Route path="/admin/theme/versions" element={<ThemeVersionManager />} />
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
