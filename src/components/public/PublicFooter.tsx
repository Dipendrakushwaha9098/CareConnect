import React from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowUpRight
} from "lucide-react";

export default function PublicFooter() {
  return (
    <footer
      role="contentinfo"
      className="bg-slate-900 text-slate-300 border-t border-slate-800"
    >
      {/* Top Emergency & Trust Alert Bar */}
      <div className="border-b border-slate-800 bg-slate-950/70 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                HIPAA-Compliant & Joint Commission Accredited Healthcare
              </p>
              <p className="text-xs text-slate-400">
                End-to-end encrypted medical records, board-certified clinicians, and verified patient privacy.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-400">Immediate Medical Attention:</span>
            <a
              href="tel:18002738255"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold hover:bg-rose-500/20 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              1-800-CARE-911 (24/7)
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              to="/"
              className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg"
              aria-label="CareConnect Health Systems"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="font-heading text-xl font-bold text-white tracking-tight block">
                  CareConnect
                </span>
                <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase block">
                  Healthcare System
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              CareConnect brings together board-certified doctors, modern outpatient clinics, and intelligent telehealth to deliver accessible, personalized healthcare.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span>450 Healthcare Boulevard, Suite 100, Medical District</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Outpatient Clinics: Mon–Sat 8:00 AM – 8:00 PM | ER: 24/7</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <a href="mailto:support@careconnect.health" className="hover:text-white transition-colors">
                  support@careconnect.health
                </a>
              </div>
            </div>
          </div>

          {/* Clinical Specialties */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Clinical Care
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Cardiology
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Primary Care & Family
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Neurology
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Pediatrics
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Integrative Therapies
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-teal-400 transition-colors">
                  Diagnostics & Imaging
                </Link>
              </li>
            </ul>
          </div>

          {/* Patient Portal & Resources */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Patients & Visitors
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/doctors" className="hover:text-teal-400 transition-colors">
                  Find a Doctor
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-teal-400 transition-colors">
                  Patient Portal Login
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-teal-400 transition-colors">
                  Doctor & Staff Suite
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-400 transition-colors">
                  Appointment Inquiries
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-teal-400 transition-colors">
                  Clinical Standards
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-400 transition-colors">
                  Billing & Insurance
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Support & Legal */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              About & Trust
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/about" className="hover:text-teal-400 transition-colors">
                  Our Mission & Vision
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-400 transition-colors">
                  Locations & Parking
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-teal-400 transition-colors">
                  Medical Leadership
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-teal-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Lock className="w-3 h-3 text-slate-400" />
                  HIPAA Security Safe
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} CareConnect Health Systems Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/about" className="hover:text-slate-300 transition-colors">
              Terms of Medical Service
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-slate-300 transition-colors">
              Accessibility Statement
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

