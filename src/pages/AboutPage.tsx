import React from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  ShieldCheck,
  Award,
  Users,
  Building2,
  Stethoscope,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export default function AboutPage() {
  const leadership = [
    {
      name: "Dr. Evelyn Vance, MD, FACC",
      role: "Chief Medical Officer & Chair of Cardiology",
      creds: "Harvard Medical School • 22 Years Clinical Practice",
      bio: "Oversees CareConnect's clinical governance, ensuring evidence-based medical standards and patient safety across all facilities."
    },
    {
      name: "Dr. Rajesh K. Sharma, MD, MS",
      role: "Head of Primary Care & Internal Medicine",
      creds: "Johns Hopkins University • 18 Years Experience",
      bio: "Pioneered CareConnect's continuous primary care model and chronic disease prevention pathways."
    },
    {
      name: "Dr. Sarah Lin, MD, FAAP",
      role: "Director of Pediatrics & Adolescent Health",
      creds: "Stanford University School of Medicine • 15 Years Experience",
      bio: "Specializes in developmental pediatrics, family-centered clinical care, and pediatric telehealth."
    },
    {
      name: "Dr. Marcus Thorne, PhD, MD",
      role: "Director of Diagnostic Pathology & Research",
      creds: "Oxford University • 16 Years Research & Diagnostics",
      bio: "Leads clinical laboratory precision diagnostics, genetic screening protocols, and rapid medical imaging."
    }
  ];

  const standards = [
    {
      title: "Board-Certified Specialists Only",
      desc: "100% of our physicians maintain verified medical licenses, board certifications, and periodic hospital credential reviews.",
      icon: Award
    },
    {
      title: "Zero-Trust HIPAA Security",
      desc: "All medical records, video consultations, and digital prescriptions are encrypted with healthcare-grade security.",
      icon: Lock
    },
    {
      title: "Coordinated Multispecialty Teams",
      desc: "Primary physicians, specialists, and clinical therapists collaborate directly within the shared electronic health record.",
      icon: Users
    },
    {
      title: "Continuous Quality Audits",
      desc: "Regular patient outcome evaluations, antibiotic stewardship programs, and emergency response readiness checks.",
      icon: FileCheck
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1">
        {/* ── Page Hero Header ── */}
        <section className="bg-white border-b border-slate-200/80 py-16 lg:py-20">
          <div className="section-container">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-4">
                <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                About CareConnect Health Systems
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Empathetic care, uncompromising clinical rigor.
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mt-4 leading-relaxed">
                Founded with a mission to make world-class healthcare accessible and continuous, CareConnect bridges in-person medical centers with intelligent digital health tools.
              </p>
            </div>
          </div>
        </section>

        {/* ── Our Clinical Mission & Principles ── */}
        <section className="py-16 sm:py-20 bg-slate-50" aria-labelledby="mission-heading">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                  Our Mission
                </Badge>
                <h2 id="mission-heading" className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  A healthcare system built around the whole patient.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Too often, modern medicine is fragmented across disconnected clinics, long waiting times, and inaccessible paper records. CareConnect was designed to solve this by providing a unified care continuum.
                </p>
                <p className="text-base text-slate-600 leading-relaxed">
                  Whether a patient needs a routine family checkup, emergency triage, or specialized cardiac care, our integrated platform ensures their clinical history is always available to their trusted care team.
                </p>

                <div className="pt-2 grid sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-2xl font-black text-blue-700">100%</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Verified Medical Credentials</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-2xl font-black text-teal-700">24 / 7</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Emergency Consultation Access</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Our Four Core Clinical Commitments
                </h3>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Patient Dignity & Transparency",
                      text: "Clear communication with no technical jargon, transparent consultation fees, and complete access to clinical records."
                    },
                    {
                      title: "Evidence-Based Treatment",
                      text: "Protocols aligned with international clinical guidelines and ongoing physician peer reviews."
                    },
                    {
                      title: "Timely Clinical Access",
                      text: "Minimizing wait times through smart scheduling, rapid triage, and integrated telehealth consultations."
                    },
                    {
                      title: "Comprehensive Security",
                      text: "Adherence to HIPAA, ISO 27001, and Zero-Trust data governance to protect patient confidentiality."
                    }
                  ].map((com, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{com.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{com.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Clinical Standards & Accreditations ── */}
        <section className="py-16 sm:py-20 bg-white border-y border-slate-200/80" aria-labelledby="standards-heading">
          <div className="section-container">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 font-semibold mb-3">
                Governance & Safety
              </Badge>
              <h2 id="standards-heading" className="text-3xl font-black text-slate-900 tracking-tight">
                Strict medical standards you can rely on.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Every policy and technological safeguard at CareConnect adheres to recognized healthcare accreditations.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {standards.map((st, i) => {
                const Icon = st.icon;
                return (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{st.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{st.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Medical Leadership ── */}
        <section className="py-16 sm:py-24 bg-slate-50" aria-labelledby="leadership-heading">
          <div className="section-container">
            <div className="max-w-2xl mx-auto text-center mb-16">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold mb-3">
                Physician Leadership
              </Badge>
              <h2 id="leadership-heading" className="text-3xl font-black text-slate-900 tracking-tight">
                Guided by respected medical professionals.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Our clinical directorate combines active patient care with leadership in medical education and hospital governance.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {leadership.map((leader, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xl shrink-0 border border-blue-100">
                        <Stethoscope className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{leader.name}</h3>
                        <p className="text-xs font-semibold text-teal-700">{leader.role}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{leader.creds}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {leader.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="section-container text-center max-w-3xl mx-auto space-y-5">
            <h2 className="text-3xl font-black tracking-tight text-white">
              Connect with our medical team today.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Explore our verified doctors, book your in-clinic or video consultation, or reach out to our team with any clinical inquiries.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link to="/doctors">
                <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
                  Find Doctors
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="h-11 px-6 border-slate-700 text-white hover:bg-slate-800 font-bold rounded-xl text-sm">
                  Contact Our Medical Centers
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

