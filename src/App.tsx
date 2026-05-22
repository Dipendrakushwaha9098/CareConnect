import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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

import AppLayout from "./components/AppLayout";
import { ScrollRevealProvider } from "./components/ScrollReveal";
import PageTransition from "./components/PageTransition";

import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

/* ================= PROTECTED ROUTE ================= */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading CareConnect...</p>
        </div>
      </div>
    );

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

/* ================= APP PAGE WRAPPER ================= */
const AppPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

/* ================= ROUTES WITH ANIMATION ================= */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />

        <Route path="/dashboard" element={<AppPage><PageTransition><DashboardPage /></PageTransition></AppPage>} />
        <Route path="/patient-dashboard" element={<AppPage><PageTransition><PatientDashboardPage /></PageTransition></AppPage>} />
        <Route path="/patients" element={<AppPage><PageTransition><PatientsPage /></PageTransition></AppPage>} />
        <Route path="/appointments" element={<AppPage><PageTransition><AppointmentsPage /></PageTransition></AppPage>} />
        <Route path="/support" element={<AppPage><PageTransition><EmergencyChatPage /></PageTransition></AppPage>} />
        <Route path="/treatments" element={<AppPage><PageTransition><TreatmentsPage /></PageTransition></AppPage>} />
        <Route path="/prescriptions" element={<AppPage><PageTransition><PrescriptionsPage /></PageTransition></AppPage>} />
        <Route path="/notifications" element={<AppPage><PageTransition><NotificationsPage /></PageTransition></AppPage>} />
        <Route path="/settings" element={<AppPage><PageTransition><SettingsPage /></PageTransition></AppPage>} />

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

/* ================= MAIN APP ================= */
const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <ScrollRevealProvider>
        <TooltipProvider>

          {/* 🌌 GLOBAL BACKGROUND */}
          <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">

            {/* 🔵 Animated Glow Blobs */}
            <div className="absolute top-[-80px] left-[-80px] w-96 h-96 bg-blue-400 opacity-30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 bg-purple-400 opacity-30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 opacity-20 rounded-full blur-3xl animate-pulse -translate-x-1/2 -translate-y-1/2" />

            {/* 🧠 GRID OVERLAY */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* 🌐 CONTENT */}
            <div className="relative z-10">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </div>

          </div>

        </TooltipProvider>
      </ScrollRevealProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
