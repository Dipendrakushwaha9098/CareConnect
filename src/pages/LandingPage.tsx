import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Calendar,
  Clock,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  ArrowRight,
  Activity,
  Menu,
  X,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedImage3D } from "@/components/AnimatedImage3D";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-body selection:bg-blue-200">
      
      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">CareConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
            <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-lg shadow-blue-200 transition-all duration-300 hover:scale-105">
                Portal Login <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden text-gray-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-4 md:hidden flex flex-col gap-4 text-lg">
          <a href="#services" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b">Services</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b">About</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b">Contact</a>
          <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-lg h-12 rounded-xl">
              Portal Login
            </Button>
          </Link>
        </div>
      )}

      {/* ── Hero Section ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-100/40 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-blue-100/50 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={fadeIn}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-6">
                <Activity className="w-4 h-4" /> Leading Healthcare Platform
              </div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6">
                Simplify your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">clinic visits.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
                Connect with top-tier medical professionals instantly. Book appointments, manage records, and track treatments seamlessly within our unified portal.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/login">
                  <Button className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-200 transition-all hover:-translate-y-1">
                    Book an Appointment
                  </Button>
                </Link>
                <div className="flex -space-x-3 items-center ml-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden z-[${10-i}]`}>
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                    </div>
                  ))}
                  <div className="pl-6 text-sm font-semibold text-gray-700">
                    Trusted by 10k+ Patients
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden md:block"
            >
              <div className="relative rounded-3xl overflow-visible aspect-[4/3] z-10 hidden md:block">
                <AnimatedImage3D 
                  src="https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&q=80&w=1600" 
                  alt="Modern Clinic" 
                />
              </div>
              
              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Zero Wait Time</div>
                  <div className="text-xs text-gray-500">Instant Confirmations</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">Comprehensive Care</h2>
            <p className="text-gray-600">Everything you need to manage your health journey natively tailored inside a secure platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: "Smart Scheduling", desc: "Book, reschedule, or cancel appointments dynamically 24/7 without making a single phone call.", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: ShieldCheck, title: "Secure Records", desc: "HIPAA compliant storage of all your medical history, prescriptions, and test results.", color: "text-teal-600", bg: "bg-teal-50" },
              { icon: Stethoscope, title: "Expert Doctors", desc: "Direct access to certified specialists dedicated to personalized and effective patient care.", color: "text-purple-600", bg: "bg-purple-50" }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed max-w-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80')] mix-blend-overlay opacity-20 object-cover" />
        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Ready to prioritize your health?</h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of patients who have already streamlined their healthcare experience.
          </p>
          <Link to="/login">
             <Button className="h-14 px-10 text-lg bg-blue-500 hover:bg-blue-400 text-white rounded-full transition-all">
                Access Patient Portal
             </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-gray-900 tracking-tight">CareConnect</span>
            </Link>
            <p className="text-gray-500 max-w-sm mb-6">Modernizing clinic operations and prioritizing seamless patient experiences globally.</p>
            <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-600 transition-all"><MapPin className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-600 transition-all"><Phone className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-600 transition-all"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Platform</h4>
            <ul className="space-y-3 text-gray-500">
              <li><Link to="/login" className="hover:text-blue-600">Patient Login</Link></li>
              <li><Link to="/login" className="hover:text-blue-600">Doctor Portal</Link></li>
              <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-3 text-gray-500">
              <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-600">HIPAA Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} CareConnect Health Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
