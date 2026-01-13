import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import { ConsentGeneratorPage } from "./pages/ConsentGeneratorPage";
import NotFound from "./pages/NotFound";
import ConsentManagement from "./pages/ConsentManagement";
import AdminPanel from "./pages/AdminPanel";
import Auth from "./pages/Auth";
import DoctorRegistration from "./pages/DoctorRegistration";
import { PublicConsentSigning } from "./pages/PublicConsentSigning";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/generador" element={
              <ProtectedRoute>
                <ConsentGeneratorPage />
              </ProtectedRoute>
            } />
            <Route path="/consent-management" element={
              <ProtectedRoute>
                <ConsentManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/doctor-registration" element={
              <ProtectedRoute requiredRole={['admin']}>
                <DoctorRegistration />
              </ProtectedRoute>
            } />
            <Route path="/firmar/:token" element={<PublicConsentSigning />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
