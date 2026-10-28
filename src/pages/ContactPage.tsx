import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldAlert,
  Send,
  CheckCircle2,
  HelpCircle,
  Building2,
  Calendar,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { toast } from "sonner";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "General Inquiries",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    // Simulate accessible submit
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Message Sent", {
        description: "Our patient care coordinator will contact you within 1 business day."
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "General Inquiries",
        message: ""
      });
    }, 600);
  };

  const campuses = [
    {
      name: "CareConnect Main Hospital & Emergency Center",
      type: "Main Clinical Campus",
      address: "450 Healthcare Boulevard, Suite 100, Medical District",
      phone: "+1 (800) 273-8255",
      hours: "Outpatient: Mon–Sat 8:00 AM – 8:00 PM | Emergency: 24/7",
      features: ["Emergency Pavilion", "Diagnostic Pathology Labs", "Specialty Surgical Suites", "Valet & Ramp Parking"]
    },
    {
      name: "Downtown Outpatient & Telehealth Pavilion",
      type: "Outpatient Clinic",
      address: "128 Commerce Way, 4th Floor, Metro Center",
      phone: "+1 (800) 427-3266",
      hours: "Mon–Fri: 8:00 AM – 6:00 PM | Sat: 9:00 AM – 2:00 PM",
      features: ["Primary Family Medicine", "Pediatrics Clinic", "Telehealth Studio", "Subway Accessible"]
    }
  ];

  const faqs = [
    {
      q: "How do I schedule an appointment with a specialist?",
      a: "You can find and book appointments directly through our 'Find Doctors' page or by logging into your Patient Portal. No referral is required for most outpatient departments."
    },
    {
      q: "What should I do if I am experiencing an acute emergency?",
      a: "If you have severe chest pain, breathing difficulty, or uncontrolled bleeding, please call 911 (or 112) immediately, or proceed directly to our Main Emergency Pavilion open 24/7."
    },
    {
      q: "How can I access my digital prescriptions and lab records?",
      a: "All active prescriptions, dosage guidelines, physician consultation summaries, and laboratory test reports are automatically saved to your secure Patient Portal under 'Prescriptions' and 'Medical Records'."
    },
    {
      q: "Do you support telehealth consultations?",
      a: "Yes. Our board-certified physicians provide secure, HIPAA-compliant video consultations for follow-up care, prescription renewals, and non-emergency health evaluations."
    },
    {
      q: "Which insurance plans and payment methods are accepted?",
      a: "We accept most major commercial insurance providers, Medicare, and flexible spending accounts (HSA/FSA). For uninsured patients, transparent self-pay rates are clearly listed per specialist."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1">
        {/* ── Page Header ── */}
        <section className="bg-white border-b border-slate-200/80 py-12 lg:py-16">
          <div className="section-container">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                Patient Services & Campus Directory
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                We're here to help you get the care you need.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                Connect with our patient navigation team, locate our medical centers, or send an inquiry regarding clinical appointments and hospital services.
              </p>
            </div>
          </div>
        </section>

        {/* ── Emergency Callout Banner ── */}
        <section className="bg-rose-50 border-b border-rose-200 py-4">
          <div className="section-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold">
                Medical Emergency? If you are having severe symptoms, call 911 immediately or visit our 24/7 Emergency Pavilion.
              </p>
            </div>
            <a
              href="tel:18002738255"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-xs"
            >
              Emergency Helpline: 1-800-CARE-911
            </a>
          </div>
        </section>

        {/* ── Contact Form & Campus Information ── */}
        <section className="py-12 sm:py-16">
          <div className="section-container">
            <div className="grid lg:grid-cols-12 gap-12">
              {/* Left Column: Interactive Contact Form */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xs">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Send Us an Inquiry
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Fill out the form below. For urgent clinical concerns, please call our outpatient desk directly.
                  </p>
                </div>

                {isSubmitted ? (
                  <div className="p-8 text-center bg-teal-50 border border-teal-200 rounded-2xl space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
                    <h3 className="text-lg font-bold text-teal-900">Inquiry Received</h3>
                    <p className="text-xs text-teal-700 max-w-sm mx-auto">
                      Thank you for contacting CareConnect. A patient service coordinator will review your request and reach out shortly.
                    </p>
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                      className="mt-4 border-teal-300 text-teal-800 text-xs font-semibold rounded-xl"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact-name" className="text-xs font-bold text-slate-700">
                          Full Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="contact-name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Jane Doe"
                          className="mt-1.5 h-11 text-sm rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email" className="text-xs font-bold text-slate-700">
                          Email Address <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. jane@example.com"
                          className="mt-1.5 h-11 text-sm rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact-phone" className="text-xs font-bold text-slate-700">
                          Phone Number (Optional)
                        </Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="mt-1.5 h-11 text-sm rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-dept" className="text-xs font-bold text-slate-700">
                          Department
                        </Label>
                        <select
                          id="contact-dept"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="mt-1.5 w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="General Inquiries">General Inquiries</option>
                          <option value="Appointments & Scheduling">Appointments & Scheduling</option>
                          <option value="Cardiology Department">Cardiology Department</option>
                          <option value="Primary Care & Pediatrics">Primary Care & Pediatrics</option>
                          <option value="Billing & Insurance">Billing & Insurance</option>
                          <option value="Medical Records">Medical Records</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-message" className="text-xs font-bold text-slate-700">
                        How can we help? <span className="text-rose-500">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Please describe your clinical question, appointment preference, or administrative inquiry..."
                        className="mt-1.5 text-sm rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      {isSubmitting ? (
                        "Sending Inquiry..."
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" /> Send Message
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>

              {/* Right Column: Campus Details & Direct Lines */}
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-xl font-bold text-slate-900">
                  CareConnect Medical Campuses
                </h2>

                {campuses.map((campus, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {campus.name}
                      </h3>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] shrink-0 font-semibold">
                        {campus.type}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{campus.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <a href={`tel:${campus.phone.replace(/[^0-9]/g, "")}`} className="hover:text-blue-600 font-semibold">
                          {campus.phone}
                        </a>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{campus.hours}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {campus.features.map((feat, fidx) => (
                        <span
                          key={fidx}
                          className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[11px] border border-slate-200"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Direct quick call card */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-400" />
                    Dedicated Patient Service Phone Lines
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="flex justify-between">
                      <span>General Appointments:</span>
                      <strong className="text-white">+1 (800) 273-8255</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Prescriptions & Pharmacy:</span>
                      <strong className="text-white">+1 (800) 427-3266</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Billing & Records Desk:</span>
                      <strong className="text-white">+1 (800) 334-9110</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Patient FAQ Accordion Section ── */}
        <section className="py-12 sm:py-16 bg-white border-t border-slate-200/80" aria-labelledby="faq-heading">
          <div className="section-container max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold mb-2">
                Common Questions
              </Badge>
              <h2 id="faq-heading" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Answers to common inquiries regarding visits, medical records, and platform access.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-1"
                >
                  <AccordionTrigger className="text-sm font-bold text-slate-900 hover:text-blue-700 text-left py-3">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

