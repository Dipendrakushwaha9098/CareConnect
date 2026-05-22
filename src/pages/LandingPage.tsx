import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import {
  HeartPulse,
  Calendar,
  ShieldCheck,
  Stethoscope,
  Activity,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Brain,
  Dna,
  Microscope,
  Baby,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedImage3D } from "@/components/AnimatedImage3D";

const specialties = [
  { icon: HeartPulse, title: "Cardiology", desc: "Advanced heart care and vascular diagnostics.", color: "text-red-500", bg: "bg-red-50" },
  { icon: Brain, title: "Neurology", desc: "Expert treatment for complex neurological conditions.", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Baby, title: "Pediatrics", desc: "Specialized care for children and adolescents.", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: Dna, title: "Genetics", desc: "Cutting-edge genetic screening and counseling.", color: "text-teal-500", bg: "bg-teal-50" },
  { icon: Microscope, title: "Diagnostics", desc: "Precise lab results with next-gen technology.", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: Stethoscope, title: "Primary Care", desc: "Comprehensive health services for the whole family.", color: "text-emerald-500", bg: "bg-emerald-50" }
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.4,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
    },
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col font-body selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out px-4 py-4 md:px-8 ${
          scrolled ? "pt-4" : "pt-8"
        }`}
      >
        <div 
          className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-700 px-8 py-3 rounded-full ${
            scrolled 
              ? "medical-glass shadow-premium border-white/60 translate-y-0" 
              : "bg-transparent translate-y-0"
          }`}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8 }}
              className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200 group-hover:scale-110 transition-all"
            >
              <HeartPulse className="w-7 h-7 text-white" />
            </motion.div>
            <span className="font-heading text-2xl font-black text-slate-900 tracking-tight">CareConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-12 font-bold text-slate-600">
            {["Services", "About", "Centers", "Support"].map((item) => (
               <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className="hover:text-blue-600 transition-all relative group py-2"
              >
                {item}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full rounded-full" />
              </a>
            ))}
            <Link to="/login" className="btn-magnetic">
              <Button className="bg-slate-900 hover:bg-black text-white rounded-full px-10 h-14 shadow-2xl shadow-slate-200 transition-all font-bold text-base">
                Portal Access <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden text-slate-800 p-3 hover:bg-slate-100 rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-40 bg-white pt-32 px-8 md:hidden flex flex-col gap-8"
          >
            {["Services", "About", "Centers", "Support"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                onClick={() => setMobileMenuOpen(false)} 
                className="text-3xl font-black text-slate-900 py-4 border-b border-slate-50 flex items-center justify-between"
              >
                {item} <ChevronRight className="w-6 h-6 text-slate-300" />
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white text-xl h-16 rounded-3xl shadow-2xl shadow-blue-100 font-black">
                Portal Login
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative pt-52 pb-24 md:pt-64 md:pb-40 min-h-screen flex items-center overflow-visible">
        {/* Animated Orbs */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[70vw] h-[70vw] bg-blue-100/30 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" 
        />
        <motion.div 
          animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-[60vw] h-[60vw] bg-teal-50/40 blur-[150px] rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" 
        />

        <div className="section-container relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div 
              style={{ y: heroY, opacity: heroOpacity }}
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              variants={containerVariants}
              className="max-w-xl"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-black mb-10 shadow-sm uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> Leading the Medical Revolution
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="font-heading text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[0.95] mb-10">
                The Future of <br />
                <span className="text-gradient-medical">Healthcare.</span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-2xl text-slate-500 mb-12 leading-relaxed font-medium">
                CareConnect unifies your medical journey. Experience a platform where specialists, technology, and patient care converge for a healthier tomorrow.
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-8">
                <Link to="/login" className="btn-magnetic">
                  <Button className="h-20 px-12 text-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all font-black">
                    Get Started Now
                  </Button>
                </Link>
                <div className="flex flex-col gap-3">
                  <div className="flex -space-x-4 items-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -8, zIndex: 30, scale: 1.1 }}
                        className="w-14 h-14 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-slate-100"
                      >
                          <img src={`https://i.pravatar.cc/100?img=${i+40}`} alt="User" className="w-full h-full object-cover" />
                      </motion.div>
                    ))}
                    <div className="w-14 h-14 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-white text-xs font-black shadow-xl ring-1 ring-slate-100">+25k</div>
                  </div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                    Certified Medical Excellence
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
               style={{ scale: heroScale, opacity: heroOpacity }}
                initial={{ opacity: 0, x: 100, rotate: 5 }}
                whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative hidden lg:block"
            >
              <div className="relative rounded-[3.5rem] overflow-visible aspect-[10/12] z-10">
                <AnimatedImage3D 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
                  alt="Realistic Medical Professional" 
                  className="rounded-[3.5rem]"
                />
              </div>
              
              {/* Floating Pulse Widget */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                className="absolute -top-12 -right-12 medical-glass p-8 rounded-[2.5rem] border-white/80 z-20 flex flex-col gap-4 min-w-[200px]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Activity className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Status</div>
                    <div className="font-black text-slate-900 text-xl leading-none">Operational</div>
                  </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Server Latency</span>
                      <span>12ms</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: ["0%", "92%"] }}
                      transition={{ duration: 2, delay: 1 }}
                      className="bg-emerald-500 h-full rounded-full" 
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-12 -left-12 medical-glass p-8 rounded-[2.5rem] border-white/80 z-20 flex items-center gap-5"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 border-4 border-white">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-2xl leading-none mb-1">HIPAA Verified</div>
                  <div className="text-sm text-slate-500 font-bold tracking-tight">Encrypted Healthcare Vaults</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Specialties Section ── */}
      <section id="services" className="py-32 md:py-48 bg-white relative">
        <div className="section-container">
          <div className="text-center max-w-4xl mx-auto mb-24">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-blue-600 font-black tracking-[0.3em] uppercase text-sm mb-6"
            >
              Our Expertise
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading text-5xl md:text-7xl font-black text-slate-900 mb-10"
            >
              Specialized care for <span className="text-gradient-medical">every life.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-2xl text-slate-500 font-medium leading-relaxed"
            >
              We've brought together world-class specialists and cutting-edge diagnostic technology to provide a seamless health ecosystem.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {specialties.map((spec, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -15 }}
                className="premium-card p-12 group cursor-pointer"
              >
                <div className={`w-20 h-20 rounded-3xl ${spec.bg} flex items-center justify-center mb-10 transition-all group-hover:rotate-6 duration-500 group-hover:scale-110 shadow-sm`}>
                  <spec.icon className={`w-10 h-10 ${spec.color}`} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-5 tracking-tight">{spec.title}</h3>
                <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">{spec.desc}</p>
                <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-xs tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Explore Department <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global Impact / Stats ── */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=2070')] opacity-10 bg-fixed bg-cover pointer-events-none" />
          <div className="section-container relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                 {[
                   { label: "Patients Served", val: "1.2M+" },
                   { label: "Expert Doctors", val: "450+" },
                   { label: "Successful Surgeries", val: "12K+" },
                   { label: "Global Centers", val: "15" }
                 ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="text-center"
                    >
                       <div className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">{stat.val}</div>
                       <div className="text-sm font-black text-blue-400 uppercase tracking-[0.3em]">{stat.label}</div>
                    </motion.div>
                 ))}
              </div>
          </div>
      </section>

      {/* ── Realistic Center Section ── */}
      <section id="centers" className="py-32 md:py-48 bg-[#fafbfc]">
        <div className="section-container">
           <div className="grid lg:grid-cols-2 gap-24 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                 <div className="aspect-[4/5] rounded-[3.5rem] overflow-hidden shadow-premium relative group">
                    <img 
                      src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2070" 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                      alt="Modern Medical Center" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-12 left-12 right-12">
                       <h4 className="text-3xl font-black text-white mb-4">CareConnect Oslo Center</h4>
                       <div className="flex items-center gap-2 text-blue-200 font-bold mb-6">
                          <MapPin className="w-5 h-5" /> Aker brygge 12, Oslo, Norway
                       </div>
                       <Button className="bg-white text-slate-900 hover:bg-white/90 rounded-full h-12 px-8 font-black">
                         Schedule a Visit
                       </Button>
                    </div>
                 </div>
                 {/* Floating Card */}
                 <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="absolute -top-10 -right-10 medical-glass p-10 rounded-[3rem] shadow-premium hidden md:block max-w-[280px]"
                 >
                    <div className="text-blue-600 font-black uppercase text-xs tracking-widest mb-4">Patient Review</div>
                    <p className="text-slate-600 font-bold italic mb-6">"The level of care and technological precision at CareConnect is truly unmatched."</p>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-200" />
                       <div>
                          <p className="font-black text-slate-900 text-sm">Erik Janssen</p>
                          <p className="text-xs text-slate-400 font-bold">Patient since 2024</p>
                       </div>
                    </div>
                 </motion.div>
              </motion.div>

              <div className="space-y-12">
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                 >
                    <h2 className="font-heading text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
                       Elegance meets <br /> <span className="text-gradient-medical">medical precision.</span>
                    </h2>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed">
                       Our medical centers are designed to be serene, clinical yet welcoming spaces where patients can feel at ease. We integrate advanced AI diagnostic tools with human compassion to ensure the best possible outcomes.
                    </p>
                 </motion.div>

                 <div className="space-y-8">
                    {[
                      { icon: ShieldCheck, t: "Zero-Trust Security", d: "Your data is protected by the most advanced medical-grade encryption systems." },
                      { icon: Stethoscope, t: "Expert Triage", d: "AI-assisted triage that ensures you see the right specialist within minutes of arrival." }
                    ].map((feat, i) => (
                       <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.2 }}
                        className="flex gap-6 items-start"
                       >
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                             <feat.icon className="w-7 h-7 text-blue-600" />
                          </div>
                          <div>
                             <h4 className="text-xl font-black text-slate-900 mb-2 tracking-tight">{feat.t}</h4>
                             <p className="text-slate-500 font-medium">{feat.d}</p>
                          </div>
                       </motion.div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* ── Advanced CTA ── */}
      <section className="py-24 md:py-48 relative overflow-hidden bg-white">
        <div className="section-container">
           <div className="relative rounded-[4rem] overflow-hidden bg-slate-900 px-8 py-24 md:px-24 md:py-40">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/60 via-transparent to-teal-500/20 pointer-events-none" />
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069')] mix-blend-overlay opacity-40 object-cover" />
              
              <div className="relative z-10 text-center max-w-4xl mx-auto">
                <motion.h2 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-heading text-5xl md:text-7xl font-black text-white mb-12 tracking-tight leading-[0.95]"
                >
                  Join the elite <br /> healthcare network.
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl text-blue-100/70 mb-16 font-medium leading-relaxed"
                >
                  Whether you're a patient seeking care or a practitioner looking to innovate, CareConnect is your gateway to excellence.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap justify-center gap-8"
                >
                  <Link to="/login" className="btn-magnetic">
                    <Button className="h-20 px-16 text-xl bg-white text-slate-900 hover:bg-blue-50 rounded-full font-black shadow-2xl transition-all">
                      Patient Portal
                    </Button>
                  </Link>
                  <Link to="/login" className="btn-magnetic">
                    <Button className="h-20 px-16 text-xl bg-transparent border-2 border-white/30 text-white hover:bg-white/10 rounded-full font-black backdrop-blur-md transition-all">
                      Doctor Suite
                    </Button>
                  </Link>
                </motion.div>
              </div>
           </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-[#fafbfc] py-32 border-t border-slate-100">
        <div className="section-container grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <span className="font-heading text-3xl font-black text-slate-900 tracking-tight">CareConnect</span>
            </Link>
            <p className="text-slate-500 font-medium text-xl max-w-sm mb-12 leading-relaxed">
              Pioneering the intersection of artificial intelligence and professional medical care.
            </p>
            <div className="flex gap-6">
                {[MapPin, Phone, Mail].map((Icon, i) => (
                  <motion.a 
                    key={i}
                    href="#" 
                    whileHover={{ scale: 1.1, backgroundColor: "#2563eb", color: "#fff" }}
                    className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 transition-all shadow-medical"
                  >
                    <Icon className="w-7 h-7" />
                  </motion.a>
                ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 md:col-span-2">
            <div>
              <h4 className="font-black text-slate-900 mb-10 uppercase tracking-[0.2em] text-xs">Healthcare</h4>
              <ul className="flex flex-col gap-6 text-slate-500 font-bold text-lg">
                <li><Link to="/login" className="hover:text-blue-600 transition-colors">Patient Portal</Link></li>
                <li><Link to="/login" className="hover:text-blue-600 transition-colors">Doctor Suite</Link></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Telehealth</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Emergency Hub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-10 uppercase tracking-[0.2em] text-xs">Resources</h4>
              <ul className="flex flex-col gap-6 text-slate-500 font-bold text-lg">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy & Data</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">HIPAA Standards</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">API Docs</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="section-container mt-32 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-slate-400 font-bold text-base">
            &copy; {new Date().getFullYear()} CareConnect Health Systems. All rights reserved.
          </div>
          <div className="flex gap-10 text-slate-400 font-bold text-base">
            <a href="#" className="hover:text-slate-900 transition-colors tracking-tight">LinkedIn</a>
            <a href="#" className="hover:text-slate-900 transition-colors tracking-tight">Twitter</a>
            <a href="#" className="hover:text-slate-900 transition-colors tracking-tight">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

