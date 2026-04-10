import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Stethoscope, Phone, KeyRound, ArrowRight, User, ShieldCheck, HeartPulse, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { requestOtp, verifyOtp } from "@/lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Invalid phone number", { description: "Please enter a valid 10-digit number." });
      return;
    }
    setIsLoading(true);
    try {
      await requestOtp(phone, role);
      toast.success("OTP Sent!", { description: "Please check your mobile device." });
      setStep("otp");
    } catch (err: any) {
      toast.error("Failed to send OTP", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Invalid OTP", { description: "Please enter a valid 6-digit OTP." });
      return;
    }
    setIsLoading(true);
    try {
      const data = await verifyOtp(phone, otp, role);
      if (data.success && data.user) {
        login(data.user);
        toast.success("Successfully logged in", {
          description: `Welcome to your ${role === "doctor" ? "dashboard" : "patient portal"}.`,
        });
        if (role === "doctor") {
          navigate("/dashboard");
        } else {
          navigate("/patient-dashboard");
        }
      }
    } catch (err: any) {
      toast.error("Verification failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-blue-50 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 120, ease: "linear" }}
          className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-100/60 blur-3xl opacity-50"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 150, ease: "linear" }}
          className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-teal-100/60 blur-3xl opacity-50"
        />
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-12 relative z-10 grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
        {/* Left Side: Form */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="w-full max-w-md mx-auto md:mx-0 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 transition-all duration-300">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">
                CareConnect
              </span>
            </Link>
          </motion.div>

          {/* Role Tabs */}
          {step === "phone" && (
            <motion.div variants={itemVariants} className="flex bg-gray-100 p-1 rounded-xl mb-8">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  role === "patient" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setRole("patient")}
              >
                Patient
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  role === "doctor" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
                onClick={() => setRole("doctor")}
              >
                Doctor
              </button>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="font-display text-3xl font-bold text-gray-900 leading-tight mb-2">
              {role === "patient" ? "Book your care" : "Manage your clinic"}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === "phone" 
                ? "Secure access via mobile OTP." 
                : "Enter the verification code sent to your device."}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.form 
                key="phone-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRequestOtp} 
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <Label className="text-gray-700 font-semibold text-sm">Mobile Number</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12 bg-white border-gray-200 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200/50 group text-base font-medium relative overflow-hidden transition-all"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request OTP"}
                    {!isLoading && (
                      <motion.span
                        animate={{ x: isHovering ? 5 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.span>
                    )}
                  </span>
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="otp-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyOtp} 
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700 font-semibold text-sm">One Time Password</Label>
                    <button 
                      type="button" 
                      onClick={() => { setStep("phone"); setOtp(""); }}
                      className="flex-shrink-0 text-xs text-blue-600 font-medium hover:text-blue-700"
                    >
                      Change Number?
                    </button>
                  </div>
                  <div className="relative group">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      type="text"
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="pl-10 h-12 bg-white border-gray-200 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all rounded-xl tracking-[0.5em] font-medium"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200/50 group text-base font-medium relative overflow-hidden transition-all"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
                    {!isLoading && (
                      <motion.span
                        animate={{ x: isHovering ? 5 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.span>
                    )}
                  </span>
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Side: Imagery and Features */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden md:flex relative justify-center items-center h-[70vh]"
        >
          {/* Main Visual Card */}
          <div className="relative w-full h-full max-h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-white/40 group bg-gradient-to-br from-blue-600 to-teal-500 p-1">
            <div className="absolute inset-0 z-10 bg-black/10" />
            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900 relative">
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?auto=format&fit=crop&q=80"
                alt="Modern Clinic"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 mix-blend-overlay"
              />
              
              {/* Glassmorphic Overlay Features overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-8 pt-24 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-medium mb-4">
                    <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Compliant Data
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-2 shadow-sm">
                    Modern Care Ecosystem
                  </h3>
                  <p className="text-white/80 text-sm font-light max-w-sm">
                    Connecting patients to their clinical records, appointments, and care teams natively.
                  </p>
                </motion.div>
              </div>
            </div>
            
            {/* Floating Badges */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-10 right-10 z-20 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Digital Health</div>
                <div className="text-xs text-gray-500">24/7 Availability</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute top-40 left-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Direct Patient App</div>
                <div className="text-xs text-gray-500">Zero Wait Time Booking</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
