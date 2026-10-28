import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import FindDoctorsPage from "./pages/FindDoctorsPage";
import ServicesPage from "./pages/ServicesPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import TreatmentsPage from "./pages/TreatmentsPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import EmergencyChatPage from "./pages/EmergencyChatPage";
import AdvancedUtilitiesPage from "./pages/AdvancedUtilitiesPage";
import DoctorPendingPage from "./pages/DoctorPendingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import NotFound from "./pages/NotFound";

import AppLayout from "./components/AppLayout";
import { ScrollRevealProvider } from "./components/ScrollReveal";
import PageTransition from "./components/PageTransition";

import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

/* ================= SMART DASHBOARD REDIRECT ================= */
const DashboardRedirect = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Resolving your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === "patient") {
    return <Navigate to="/patient/dashboard" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === "doctor") {
    if (user.verificationStatus !== "VERIFIED") {
      return <Navigate to="/doctor/pending" replace />;
    }
    return <Navigate to="/doctor/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

/* ================= SECURE PROTECTED ROUTE ================= */
const ProtectedRoute = ({
  children,
  allowedRoles,
  requireVerified = true,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireVerified?: boolean;
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Authenticating CareConnect session...</p>
        </div>
      </div>
    );

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  // Enforce unverified doctor restriction
  if (user.role === "doctor" && requireVerified && user.verificationStatus !== "VERIFIED") {
    return <Navigate to="/doctor/pending" replace />;
  }

  // Enforce role authorization
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "patient") {
      return <Navigate to="/patient/dashboard" replace />;
    }
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/doctor/dashboard" replace />;
  }

  return <>{children}</>;
};

/* ================= APP PAGE WRAPPER ================= */
const AppPage = ({
  children,
  allowedRoles,
  requireVerified = true,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireVerified?: boolean;
}) => (
  <ProtectedRoute allowedRoles={allowedRoles} requireVerified={requireVerified}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

/* ================= ROUTES WITH ANIMATION ================= */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/doctors" element={<PageTransition><FindDoctorsPage /></PageTransition>} />
        <Route path="/find-doctors" element={<Navigate to="/doctors" replace />} />
        <Route path="/services" element={<PageTransition><ServicesPage /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />

        {/* Central Smart Redirect */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/patient-dashboard" element={<Navigate to="/patient/dashboard" replace />} />

        {/* Dedicated Role-Based Dashboards */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PageTransition><PatientDashboardPage /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["doctor", "admin"]} requireVerified={true}>
              <PageTransition><DoctorDashboardPage /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/pending"
          element={
            <ProtectedRoute allowedRoles={["doctor"]} requireVerified={false}>
              <PageTransition><DoctorPendingPage /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <AppPage allowedRoles={["admin"]}>
              <PageTransition><AdminDashboardPage /></PageTransition>
            </AppPage>
          }
        />

        {/* Shared Healthcare Modules */}
        <Route
          path="/patients"
          element={
            <AppPage allowedRoles={["doctor", "admin"]} requireVerified={true}>
              <PageTransition><PatientsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/appointments"
          element={
            <AppPage>
              <PageTransition><AppointmentsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/support"
          element={
            <AppPage>
              <PageTransition><EmergencyChatPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/treatments"
          element={
            <AppPage>
              <PageTransition><TreatmentsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <AppPage>
              <PageTransition><PrescriptionsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/notifications"
          element={
            <AppPage>
              <PageTransition><NotificationsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/settings"
          element={
            <AppPage>
              <PageTransition><SettingsPage /></PageTransition>
            </AppPage>
          }
        />
        <Route
          path="/advanced-tools"
          element={
            <AppPage allowedRoles={["doctor", "admin"]} requireVerified={true}>
              <PageTransition><AdvancedUtilitiesPage /></PageTransition>
            </AppPage>
          }
        />

        {/* 404 Route */}
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
          <div className="min-h-screen relative bg-slate-50 text-slate-900 font-body selection:bg-blue-100 selection:text-blue-900">
            {/* Skip Link for Accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-md focus:outline-none font-semibold text-xs"
            >
              Skip to main content
            </a>

            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </ScrollRevealProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
