import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  Phone, KeyRound, ArrowRight, Smartphone, Mail,
  User, ShieldCheck, HeartPulse, Loader2, ChevronLeft, ChevronRight,
  Brain, Activity, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { requestOtp, verifyOtp } from "@/lib/api";
 
// ── Gallery images (Optimized with &w=800) ──────────────────────────────────
const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?auto=format&fit=crop&q=80&w=800",
    thumb: "https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?auto=format&fit=crop&q=60&w=150",
    label: "Modern clinical center",
  },
  {
    src: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&q=80&w=800",
    thumb: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&q=60&w=150",
    label: "Advanced consultation",
  },
  {
    src: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800",
    thumb: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=60&w=150",
    label: "Specialized care teams",
  },
  {
    src: "https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&q=80&w=800",
    thumb: "https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&q=60&w=150",
    label: "Emergency readiness",
  },
];
 
// ── 3D tilt card (Optimized with raf throttling) ─────────────────────────────
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const scale = useSpring(useMotionValue(1), { stiffness: 150, damping: 20 });
 
  // Throttle mouse moves to avoid excessive calculations
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const dx = (clientX - r.left - r.width  / 2) / r.width;
      const dy = (clientY - r.top  - r.height / 2) / r.height;
      rotY.set(dx * 12);
      rotX.set(-dy * 8);
      scale.set(1.02);
    });
  }, [rotX, rotY, scale]);
 
  const onLeave = useCallback(() => {
    rotX.set(0);
    rotY.set(0);
    scale.set(1);
  }, [rotX, rotY, scale]);
 
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rotX, rotateY: rotY, scale, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
 
// ── 3D image slide transition ─────────────────────────────────────────────────
const imageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 100 : -100,
    z: -100,
    rotateY: dir > 0 ? -20 : 20,
    opacity: 0,
  }),
  center: {
    x: 0,
    z: 0,
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -100 : 100,
    z: -100,
    rotateY: dir > 0 ? 20 : -20,
    opacity: 0,
    transition: { duration: 0.5, ease: [0.55, 0, 0.45, 1] },
  }),
};

// ── Memoized Clinical Showcase (Prevents re-renders when typing in form) ──────
const ClinicalShowcase = memo(function ClinicalShowcase() {
  const [imgIndex, setImgIndex] = useState(0);
  const [direction, setDirection] = useState(1);
 
  const changeImg = useCallback((newIdx: number) => {
    setDirection(newIdx > imgIndex ? 1 : -1);
    setImgIndex((newIdx + GALLERY.length) % GALLERY.length);
  }, [imgIndex]);
 
  useEffect(() => {
    const t = setInterval(() => changeImg(imgIndex + 1), 5000);
    return () => clearInterval(t);
  }, [imgIndex, changeImg]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex relative justify-center items-center h-[75vh]"
      style={{ perspective: "2000px" }}
    >
      <TiltCard>
        <div className="relative w-full h-full max-h-[700px] rounded-[4rem] overflow-hidden shadow-premium border-4 border-white ring-1 ring-slate-100"
             style={{ transformStyle: "preserve-3d" }}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={imgIndex}
              src={GALLERY[imgIndex].src}
              alt={GALLERY[imgIndex].label}
              custom={direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full object-cover rounded-[3.8rem] bg-slate-100"
              style={{ transformStyle: "preserve-3d" }}
            />
          </AnimatePresence>
 
          {/* Overlay with glass effect */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-12 pt-32 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none">
            <motion.div
              key={imgIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black uppercase tracking-widest mb-6">
                <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Secured Node
              </div>
              <h3 className="text-4xl font-black text-white mb-4 tracking-tight leading-none uppercase">Future-Ready <br /> Healthcare</h3>
              <p className="text-white/70 font-medium max-w-sm leading-relaxed">
                Unlocking clinical potential through data-driven insights and AI assistance.
              </p>
            </motion.div>
          </div>
 
          {/* Pagination indicators */}
          <div className="absolute bottom-10 left-12 z-30 flex items-center gap-4">
            {GALLERY.map((_, i) => (
              <button
                key={i}
                onClick={() => changeImg(i)}
                className={`transition-all duration-500 rounded-full h-2 ${
                  i === imgIndex ? "w-12 bg-white" : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
 
          {/* Thumbnail strip on far right */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 24 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4"
          >
            {GALLERY.map((img, i) => (
              <button
                key={i}
                onClick={() => changeImg(i)}
                className={`w-16 h-16 rounded-2xl overflow-hidden border-4 transition-all shadow-xl hover:scale-110 hover:-translate-x-2 ${
                  i === imgIndex
                    ? "border-blue-500 scale-110 -translate-x-2"
                    : "border-white/40 hover:border-white/80"
                }`}
              >
                <img src={img.thumb} alt="" className="w-full h-full object-cover bg-slate-100" loading="lazy" />
              </button>
            ))}
          </motion.div>
        </div>
      </TiltCard>
 
      {/* Floating UI Elements */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 220, damping: 22 }}
        className="absolute -top-12 -right-8 z-40"
      >
        <motion.div
          className="medical-glass p-6 rounded-[2.5rem] border-white/80 shadow-premium flex items-center gap-4 bg-white/70 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time stats</div>
            <div className="text-lg font-black text-slate-900 leading-none">99.9% Healthy</div>
          </div>
        </motion.div>
      </motion.div>
 
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 220, damping: 22 }}
        className="absolute -bottom-16 -left-8 z-40"
      >
        <motion.div
          className="medical-glass p-6 rounded-[2.5rem] border-white/80 shadow-premium flex items-center gap-4 bg-white/70 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Assistance</div>
            <div className="text-lg font-black text-slate-900 leading-none">Diagnostics Online</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
 
  const [role, setRole] = useState<"patient" | "doctor" | "admin">("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
 
  // ── Form handlers ────────────────────────────────────────────────────────
 
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Format Error", { description: "Identify yourself with a valid medical credentials (email)." });
      return;
    }
    setIsLoading(true);
    try {
      const data = await requestOtp(email, role);
      const description = data.otp
        ? `Verification code: ${data.otp} (Console auto-fill active for local dev)`
        : "Encryption-locked OTP sent to your secure email.";
      
      toast.success("Identity Verified", { description });
      if (data.otp) {
        setOtp(data.otp);
      }
      setStep("otp");
    } catch (err: any) {
      toast.error("Transmission Error", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Decryption Error", { description: "Internal code must be exactly 6 characters." });
      return;
    }
    setIsLoading(true);
    try {
      const data = await verifyOtp(email, otp, role, name);
      if (data.success && data.user) {
        login(data.user);
        
        let roleDesc = "Valued Patient";
        if (role === "doctor") roleDesc = "Clinical Lead";
        else if (role === "admin") roleDesc = "Medical Admin";

        toast.success("Security Cleared", {
          description: `Establishing session for ${roleDesc}.`,
        });
        navigate(role === "patient" ? "/patient-dashboard" : "/dashboard");
      }
    } catch (err: any) {
      toast.error("Verification Refused", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };
 
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };
 
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#fafbfc] overflow-hidden font-body selection:bg-blue-100 selection:text-blue-900 border-t-8 border-blue-600">
 
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-16 relative z-10 grid lg:grid-cols-2 gap-16 lg:gap-32 items-center">
 
        {/* ── LEFT: AUTH PORTAL ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="w-full max-w-md mx-auto lg:mx-0 p-12 bg-white rounded-[3rem] shadow-premium border border-white/60 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-teal-400" />
          
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-12">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <span className="font-heading text-2xl font-black text-slate-900 tracking-tighter">
                CareConnect
              </span>
            </Link>
          </motion.div>
 
          {step === "email" && (
            <motion.div variants={itemVariants} className="flex bg-slate-50 p-1.5 rounded-2xl mb-12 border border-slate-100 shadow-inner">
              {(["patient", "doctor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${
                    role === r ? "bg-white text-blue-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                  }`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </motion.div>
          )}
 
          <motion.div variants={itemVariants} className="mb-12">
            <h1 className="font-heading text-4xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
              {role === "patient" ? "Connect with care." : role === "doctor" ? "Lead your clinic." : "Administer CareConnect."}
            </h1>
            <p className="text-slate-500 font-bold leading-relaxed">
              {step === "email"
                ? "Establishing a secure medical session via identity verification."
                : "A unique verification code has been dispatched to your email record."}
            </p>
          </motion.div>
 
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleRequestOtp}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-slate-500 font-black uppercase tracking-widest text-[10px] pl-1">Full Name (If registering)</Label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                         <User className="w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-14 h-18 text-lg font-black bg-slate-50 border-slate-100 focus:bg-white focus-visible:ring-blue-100 focus-visible:border-blue-400 rounded-2xl transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-slate-500 font-black uppercase tracking-widest text-[10px] pl-1">Clinical Identification (Email)</Label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                         <Mail className="w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <Input
                        type="email"
                        placeholder="hello@careconnect.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-14 h-18 text-lg font-black bg-slate-50 border-slate-100 focus:bg-white focus-visible:ring-blue-100 focus-visible:border-blue-400 rounded-2xl transition-all placeholder:text-slate-300"
                        required
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-18 bg-blue-600 hover:bg-black text-white rounded-2xl shadow-2xl shadow-blue-200/60 text-lg font-black transition-all group"
                >
                  <span className="flex items-center justify-center gap-3">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Initiate Verification"}
                    {!isLoading && (
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    )}
                  </span>
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleVerifyOtp}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Medical Access Code</Label>
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setOtp(""); }}
                      className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:text-blue-700"
                    >
                      Wait, Change ID?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                       <KeyRound className="w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <Input
                      type="text"
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="pl-14 h-18 text-2xl font-black bg-slate-50 border-slate-100 focus:bg-white focus-visible:ring-blue-100 focus-visible:border-blue-400 rounded-2xl tracking-[0.6em] transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-18 bg-blue-600 hover:bg-black text-white rounded-2xl shadow-2xl shadow-blue-200/60 text-lg font-black transition-all group"
                >
                  <span className="flex items-center justify-center gap-3">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify Identity"}
                    {!isLoading && (
                      <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                  </span>
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
 
          <motion.div variants={itemVariants} className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                 <Sparkles className="w-4 h-4 text-blue-400" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powering {role === "patient" ? "your health" : role === "doctor" ? "clinical excellence" : "administrative control"}</span>
              </div>
          </motion.div>
        </motion.div>
 
        {/* ── RIGHT: 3D CLINICAL SHOWCASE ── */}
        <ClinicalShowcase />
 
      </div>
    </div>
  );
}