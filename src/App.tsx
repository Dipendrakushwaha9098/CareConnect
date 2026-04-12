import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import TreatmentsPage from "./pages/TreatmentsPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import EmergencyChatPage from "./pages/EmergencyChatPage";
import NotFound from "./pages/NotFound";

import AppLayout from "./components/AppLayout"; // ✅ FIX 1
import { ScrollRevealProvider } from "./components/ScrollReveal";

import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AppPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <ScrollRevealProvider> {/* ✅ FIX 2 */}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<AppPage><DashboardPage /></AppPage>} />
              <Route path="/patient-dashboard" element={<AppPage><PatientDashboardPage /></AppPage>} />
              <Route path="/patients" element={<AppPage><PatientsPage /></AppPage>} />
              <Route path="/appointments" element={<AppPage><AppointmentsPage /></AppPage>} />
              <Route path="/support" element={<AppPage><EmergencyChatPage /></AppPage>} />
              <Route path="/treatments" element={<AppPage><TreatmentsPage /></AppPage>} />
              <Route path="/prescriptions" element={<AppPage><PrescriptionsPage /></AppPage>} />
              <Route path="/notifications" element={<AppPage><NotificationsPage /></AppPage>} />
              <Route path="/settings" element={<AppPage><SettingsPage /></AppPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ScrollRevealProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
