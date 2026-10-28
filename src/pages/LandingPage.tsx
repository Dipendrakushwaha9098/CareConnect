import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Calendar,
  ShieldCheck,
  Stethoscope,
  Activity,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  PhoneCall,
  Video,
  FileText,
  UserCheck,
  Award,
  ChevronRight,
  Sparkles,
  Building2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("search", searchQuery.trim());
    if (selectedSpecialty && selectedSpecialty !== "all") params.append("specialty", selectedSpecialty);
    navigate(`/doctors?${params.toString()}`);
  };

  const specialties = [
    {
      title: "Cardiology",
      desc: "Comprehensive heart health, diagnostic ECGs, preventive cardiology, and vascular care.",
      icon: HeartPulse,
      slug: "cardiology"
    },
    {
      title: "Primary Care & Family",
      desc: "Annual checkups, preventive screenings, chronic disease management, and urgent care.",
      icon: Stethoscope,
      slug: "primary-care"
    },
    {
      title: "Neurology",
      desc: "Specialized diagnostics and therapy for neurological disorders, migraines, and cognitive health.",
      icon: Activity,
      slug: "neurology"
    },
    {
      title: "Pediatrics",
      desc: "Compassionate, gentle healthcare for infants, children, and adolescents.",
      icon: Users,
      slug: "pediatrics"
    },
    {
      title: "Diagnostics & Labs",
      desc: "Rapid, accurate lab testing, pathology screening, and digital radiology reports.",
      icon: FileText,
      slug: "diagnostics"
    },
    {
      title: "Integrative Wellness",
      desc: "Evidence-based Panchkarma and lifestyle medicine complementing clinical therapies.",
      icon: Sparkles,
      slug: "integrative"
    }
  ];

  const trustHighlights = [
    {
      icon: ShieldCheck,
      title: "Board-Certified Specialists",
      desc: "Every practitioner is independently verified for clinical credentials and active licensing."
    },
    {
      icon: Video,
      title: "In-Person & Telehealth Visits",
      desc: "Consult your doctor at our modern clinics or from the comfort and privacy of your home."
    },
    {
      icon: FileText,
      title: "Connected Medical Records",
      desc: "Instant access to digital prescriptions, doctor clinical notes, and diagnostic lab reports."
    },
    {
      icon: Clock,
      title: "Same-Day Appointments",
      desc: "Quick scheduling for acute concerns, prescription refills, and follow-up consultations."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Find Your Specialist",
      desc: "Search by specialty, condition, language, hospital affiliation, or consultation availability."
    },
    {
      number: "02",
      title: "Choose Time & Format",
      desc: "Select a convenient time slot for either an in-clinic outpatient visit or a secure video consultation."
    },
    {
      number: "03",
      title: "Receive Coordinated Care",
      desc: "Get digital prescriptions, clinician follow-up notes, and care instructions directly in your portal."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1">
        {/* ── Hero Section ── */}
        <section className="bg-white border-b border-slate-200/80 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="section-container">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Value Prop & Actions */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Verified Healthcare Excellence • HIPAA Compliant</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  Compassionate care,{" "}
                  <span className="text-gradient-medical">connected to your life.</span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                  CareConnect unifies your medical experience. Book appointments with top doctors, access digital prescriptions, and securely track your health history in one calm, accessible place.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link to="/doctors">
                    <Button className="h-12 px-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors">
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Find a Doctor
                    </Button>
                  </Link>

                  <Link to="/login">
                    <Button
                      variant="outline"
                      className="h-12 px-7 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl"
                    >
                      Patient Portal Login
                    </Button>
                  </Link>
                </div>

                {/* Quick Doctor Finder Widget */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mt-6">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600" />
                    Quick Specialist Search
                  </p>
                  <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search doctor by name, specialty, or condition..."
                        className="bg-white border-slate-300 h-11 text-sm rounded-xl pl-3 focus-visible:ring-blue-600"
                        aria-label="Doctor or specialty search"
                      />
                    </div>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      aria-label="Filter by department"
                    >
                      <option value="all">All Specialties</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Primary Care">Primary Care</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Diagnostics">Diagnostics</option>
                      <option value="Integrative Medicine">Integrative Medicine</option>
                    </select>
                    <Button
                      type="submit"
                      className="h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shrink-0"
                    >
                      Search
                    </Button>
                  </form>
                </div>
              </div>

              {/* Right Column: Visual Healthcare Summary Card */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 leading-tight">
                          CareConnect Clinical Center
                        </h2>
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Open & Accepting Patients
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                      Outpatient Active
                    </Badge>
                  </div>

                  {/* Highlights feature list */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Rapid Clinical Scheduling
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Directly reserve appointments with certified specialists without referral friction.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Clear Digital Health Records
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Prescription notes, follow-up dosage guidelines, and billing receipts available anytime.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        3
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          24/7 Clinical Support
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Emergency helpline and triage assistance for urgent questions and care guidance.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Urgent hotline callout */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Need immediate advice?</span>
                    <a
                      href="tel:18002738255"
                      className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call 1-800-CARE-911
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Clinical Metrics ── */}
        <section className="bg-slate-900 text-white py-12 border-b border-slate-800" aria-label="CareConnect Statistics">
          <div className="section-container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">450+</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Verified Physicians
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-teal-400">120,000+</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Consultations Completed
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">99.4%</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Patient Satisfaction
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-teal-400">24 / 7</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Emergency Readiness
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Clinical Specialties Section ── */}
        <section className="py-16 sm:py-24 bg-white" aria-labelledby="specialties-heading">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold mb-3">
                Clinical Departments
              </Badge>
              <h2 id="specialties-heading" className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Comprehensive care for every stage of health.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                From preventive family wellness to advanced cardiac diagnostics and integrative therapies, our specialized teams work together for your outcomes.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {specialties.map((spec) => {
                const IconComponent = spec.icon;
                return (
                  <div
                    key={spec.slug}
                    className="premium-card p-6 sm:p-8 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {spec.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        {spec.desc}
                      </p>
                    </div>

                    <Link
                      to={`/doctors?specialty=${encodeURIComponent(spec.title)}`}
                      className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors pt-2 border-t border-slate-100"
                    >
                      Find {spec.title} Specialists
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Link to="/services">
                <Button variant="outline" className="border-slate-300 text-slate-700 font-semibold rounded-xl px-6 h-11">
                  View All Clinical Services & Specialties
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust & Clinical Quality Pillars ── */}
        <section className="py-16 sm:py-24 bg-slate-100/70 border-y border-slate-200/80" aria-labelledby="trust-heading">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 font-semibold mb-3">
                Quality & Safety
              </Badge>
              <h2 id="trust-heading" className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Healthcare designed around clinical trust.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-3">
                We combine rigorous medical governance with an intuitive digital experience to make healthcare accessible and transparent.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {trustHighlights.map((pillar, i) => {
                const PillarIcon = pillar.icon;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                      <PillarIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works (Guided 3 Steps) ── */}
        <section className="py-16 sm:py-24 bg-white" aria-labelledby="how-it-works-heading">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold mb-3">
                Patient Journey
              </Badge>
              <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Simple, guided healthcare access in 3 steps.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-3">
                No complex phone queues or confusing paperwork. CareConnect simplifies your journey from discovery to recovery.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((st) => (
                <div
                  key={st.number}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 relative flex flex-col justify-between"
                >
                  <div>
                    <span className="text-3xl font-black text-blue-600/40 block mb-4">
                      {st.number}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {st.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link to="/doctors">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-8 h-12 shadow-sm">
                  Schedule Your Consultation Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Testimonials & Clinical Feedback ── */}
        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200/80" aria-label="Patient Testimonials">
          <div className="section-container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Trusted by thousands of patients & practitioners
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Real feedback from patients receiving care across our hospital departments.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "Booking an urgent cardiology consultation was effortless. My digital prescription and follow-up tests were in my portal before I even left the clinic.",
                  patient: "David R.",
                  detail: "Patient • Cardiology"
                },
                {
                  quote:
                    "As a physician, having my daily schedule, consultation notes, and patient history in one clean interface saves me hours each week and lets me focus on patients.",
                  patient: "Dr. Amara Patel",
                  detail: "Lead Internist • 12 Yrs Experience"
                },
                {
                  quote:
                    "The telehealth connection was crystal clear, and the prescription was sent straight to my neighborhood pharmacy. Modern healthcare the way it should be.",
                  patient: "Maria S.",
                  detail: "Patient • Family Medicine"
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
                >
                  <p className="text-sm text-slate-700 italic leading-relaxed mb-6">
                    "{item.quote}"
                  </p>
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.patient}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final Call to Action ── */}
        <section className="py-16 sm:py-20 bg-blue-700 text-white" aria-label="Join CareConnect">
          <div className="section-container text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to experience modern healthcare?
            </h2>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              Create your patient account in minutes, or explore our verified specialists and book your consultation today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link to="/doctors">
                <Button className="h-12 px-8 bg-white hover:bg-slate-100 text-blue-900 font-bold rounded-xl shadow-sm text-sm">
                  Find Doctors & Book
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  className="h-12 px-8 bg-transparent border-2 border-white/60 text-white hover:bg-white/10 font-bold rounded-xl text-sm"
                >
                  Sign in to Portal
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
