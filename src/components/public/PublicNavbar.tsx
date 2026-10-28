import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HeartPulse,
  Menu,
  X,
  PhoneCall,
  Calendar,
  User,
  Stethoscope,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Find Doctors", path: "/doctors" },
    { name: "Services", path: "/services" },
    { name: "Contact", path: "/contact" },
  ];

  const getDashboardPath = () => {
    if (!user) return "/login";
    if (user.role === "doctor") {
      return user.verificationStatus === "VERIFIED" ? "/doctor/dashboard" : "/doctor/pending";
    }
    if (user.role === "admin") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-200">
      {/* Top Clinical Utility Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Board-Certified Clinical Network & HIPAA Compliant
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              Emergency Care Available 24/7
            </span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <a
              href="tel:18002738255"
              className="flex items-center gap-1.5 text-teal-300 hover:text-white transition-colors"
              aria-label="Emergency line 1-800-273-8255"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
              <span>Emergency Hotline: 1-800-CARE-911</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Public Navigation Bar */}
      <nav
        role="navigation"
        aria-label="Main Navigation"
        className={`w-full transition-all duration-200 ${isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3"
          : "bg-white border-b border-slate-100 py-4"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
            aria-label="CareConnect Health Home"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="font-heading text-xl font-extrabold text-slate-900 tracking-tight block leading-tight">
                CareConnect
              </span>
              <span className="text-[10px] font-semibold text-teal-700 tracking-wider uppercase block">
                Healthcare System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-semibold transition-colors relative py-1 focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1.5 ${isActive
                    ? "text-blue-700 font-bold"
                    : "text-slate-600 hover:text-blue-600"
                    }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/doctors">
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-300 h-10 text-xs font-semibold px-4 rounded-xl"
              >
                <Stethoscope className="w-4 h-4 mr-1.5 text-blue-600" />
                Find a Doctor
              </Button>
            </Link>

            {isAuthenticated ? (
              <Link to={getDashboardPath()}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-5 rounded-xl shadow-sm">
                  <User className="w-4 h-4 mr-1.5" />
                  My Portal
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white h-10 text-xs font-semibold px-5 rounded-xl shadow-sm">
                  Portal Login
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/login" className="sm:hidden">
              <Button size="sm" className="bg-blue-600 text-white text-xs h-9 px-3 rounded-lg">
                Login
              </Button>
            </Link>
            <button
              type="button"
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-slate-200 bg-white px-4 pt-4 pb-6 space-y-3 shadow-lg"
            id="mobile-navigation"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-xl text-base font-medium flex items-center justify-between ${isActive
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                      }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{link.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                to="/doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="outline"
                  className="w-full justify-center h-11 text-slate-700 border-slate-300 font-semibold rounded-xl"
                >
                  <Stethoscope className="w-4 h-4 mr-2 text-blue-600" />
                  Find Doctors
                </Button>
              </Link>
              <Link
                to={isAuthenticated ? getDashboardPath() : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button className="w-full justify-center h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm">
                  {isAuthenticated ? "Go to My Dashboard" : "Sign in to Patient / Doctor Portal"}
                </Button>
              </Link>
              <a
                href="tel:18002738255"
                className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-600 py-2"
              >
                <PhoneCall className="w-4 h-4" />
                Emergency Hotline: 1-800-CARE-911
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

