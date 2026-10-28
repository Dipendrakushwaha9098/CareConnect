import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  Stethoscope,
  Activity,
  Users,
  Sparkles,
  FileText,
  Video,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Clock,
  Calendar,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const services = [
    {
      id: "cardiology",
      title: "Cardiology & Vascular Medicine",
      category: "specialty",
      icon: HeartPulse,
      summary: "Comprehensive diagnostics, preventive cardiology, and management of heart and vascular conditions.",
      treats: ["Hypertension", "Coronary Artery Disease", "Arrhythmias", "Heart Failure", "Cholesterol Management"],
      capabilities: ["12-Lead Digital ECG", "Echocardiography", "Holter Monitoring", "Stress Testing", "Post-Surgical Follow-up"],
      hours: "Mon–Fri: 8:00 AM – 6:00 PM"
    },
    {
      id: "primary-care",
      title: "Primary Care & Family Medicine",
      category: "outpatient",
      icon: Stethoscope,
      summary: "Continuous whole-person healthcare for individuals and families across all stages of life.",
      treats: ["Annual Physicals", "Diabetes Care", "Respiratory Infections", "Asthma & Allergies", "Preventive Screenings"],
      capabilities: ["Routine Health Checks", "Vaccinations & Immunizations", "Chronic Care Plans", "Prescription Refills"],
      hours: "Mon–Sat: 8:00 AM – 8:00 PM"
    },
    {
      id: "neurology",
      title: "Neurology & Brain Health",
      category: "specialty",
      icon: Activity,
      summary: "Specialized clinical evaluation and personalized therapies for neurological disorders.",
      treats: ["Migraines & Headaches", "Neuropathy", "Epilepsy", "Movement Disorders", "Memory & Cognitive Decline"],
      capabilities: ["Neurological Examinations", "EEG Analysis", "Concussion Assessments", "Rehabilitation Oversight"],
      hours: "Mon–Fri: 9:00 AM – 5:00 PM"
    },
    {
      id: "pediatrics",
      title: "Pediatrics & Adolescent Care",
      category: "outpatient",
      icon: Users,
      summary: "Gentle, compassionate medical care for infants, children, and teenagers in a welcoming environment.",
      treats: ["Well-Child Checkups", "Childhood Illnesses", "Growth & Nutrition", "Developmental Milestones", "School Physicals"],
      capabilities: ["Newborn Screening", "Pediatric Vaccines", "Asthma Action Plans", "Urgent Pediatric Triage"],
      hours: "Mon–Sat: 8:30 AM – 7:00 PM"
    },
    {
      id: "integrative",
      title: "Integrative Medicine & Panchkarma",
      category: "wellness",
      icon: Sparkles,
      summary: "Evidence-based complementary therapies combining traditional wellness wisdom with modern medical oversight.",
      treats: ["Chronic Stress", "Digestive Health", "Metabolic Imbalance", "Sleep Disturbances", "Joint Stiffness"],
      capabilities: ["Panchkarma Therapy", "Dietary Consultation", "Herbal Formulations", "Lifestyle Modification Programs"],
      hours: "Mon–Sat: 9:00 AM – 6:00 PM"
    },
    {
      id: "diagnostics",
      title: "Diagnostic Pathology & Imaging",
      category: "diagnostics",
      icon: FileText,
      summary: "Fast, accurate laboratory testing and medical radiology integrated with electronic health records.",
      treats: ["Blood Chemistry", "Lipid Panels", "Biopsy Analysis", "Urinalysis", "Hormone Profiling"],
      capabilities: ["Fully Automated Lab", "Digital X-Ray & Ultrasound", "Rapid Result Delivery", "Electronic Portal Sync"],
      hours: "Mon–Sat: 7:00 AM – 8:00 PM"
    },
    {
      id: "telehealth",
      title: "Digital Telehealth & Remote Care",
      category: "digital",
      icon: Video,
      summary: "Secure HD video consultations with licensed clinicians from the comfort and privacy of your home.",
      treats: ["Follow-Up Consults", "Minor Acute Symptoms", "Prescription Renewals", "Lab Result Reviews", "Mental Wellness"],
      capabilities: ["HIPAA-Compliant Video", "In-Chat File Sharing", "Instant E-Prescriptions", "Cross-Platform Access"],
      hours: "Available Daily: 7:00 AM – 10:00 PM"
    },
    {
      id: "emergency",
      title: "Emergency Triage & Urgent Care",
      category: "acute",
      icon: ShieldAlert,
      summary: "Rapid response medical stabilization, acute diagnostics, and immediate clinical intervention.",
      treats: ["Acute Chest Pain", "Severe Lacerations & Fractures", "Respiratory Distress", "High Fever", "Sudden Allergic Reactions"],
      capabilities: ["Trauma Resuscitation", "Immediate Lab Screening", "Critical Care Transport", "On-Call Surgical Teams"],
      hours: "Open 24 Hours / 7 Days / 365 Days"
    }
  ];

  const filteredServices = services.filter((s) => {
    if (activeCategory === "all") return true;
    return s.category === activeCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1">
        {/* ── Page Header ── */}
        <section className="bg-white border-b border-slate-200/80 py-12 lg:py-16">
          <div className="section-container">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
                <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                Clinical Departments & Services
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Specialized medical care, coordinated around your needs.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                Explore our comprehensive array of outpatient specialties, diagnostic facilities, and digital telehealth services.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-100">
              {[
                { label: "All Services", value: "all" },
                { label: "Specialty Medicine", value: "specialty" },
                { label: "Primary & Family", value: "outpatient" },
                { label: "Integrative Wellness", value: "wellness" },
                { label: "Diagnostics & Labs", value: "diagnostics" },
                { label: "Digital Telehealth", value: "digital" },
                { label: "Emergency & Urgent", value: "acute" }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${activeCategory === tab.value
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services Directory ── */}
        <section className="py-12 sm:py-16">
          <div className="section-container">
            <div className="grid md:grid-cols-2 gap-8">
              {filteredServices.map((service) => {
                const Icon = service.icon;
                return (
                  <article
                    key={service.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Service Header */}
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            {service.title}
                          </h2>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            {service.hours}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        {service.summary}
                      </p>

                      {/* Conditions Treated */}
                      <div className="mb-5">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                          Common Conditions Managed:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {service.treats.map((cond, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                            >
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Capabilities */}
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                          Clinical Diagnostics & Facilities:
                        </p>
                        <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                          {service.capabilities.map((cap, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        to={`/doctors?specialty=${encodeURIComponent(service.title.split("&")[0].trim())}`}
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Find Specialists in {service.title.split("&")[0].trim()}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>

                      <Link to="/doctors">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold h-9 px-4">
                          Schedule Visit
                        </Button>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Emergency Notice ── */}
        <section className="py-12 bg-rose-50/70 border-t border-rose-100">
          <div className="section-container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white border border-rose-200 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Emergency Clinical Care (24/7/365)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    For life-threatening symptoms, chest pain, or trauma, call emergency services immediately or visit our Emergency Pavilion.
                  </p>
                </div>
              </div>
              <a
                href="tel:18002738255"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
              >
                <PhoneCall className="w-4 h-4" />
                Call 1-800-CARE-911
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

