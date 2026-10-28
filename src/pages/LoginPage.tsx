import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Stethoscope,
  Building2,
  Award,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Phone,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  loginUser,
  registerPatient,
  registerDoctor,
  requestPasswordReset,
  confirmPasswordReset,
  requestOtp,
  verifyOtp
} from "@/lib/api";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

type AuthMode = "login" | "patient-register" | "doctor-register" | "forgot-password" | "otp-login";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Primary mode state
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<"patient" | "doctor" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Patient Register state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [patientAge, setPatientAge] = useState("30");
  const [patientGender, setPatientGender] = useState("Not specified");
  const [patientBloodGroup, setPatientBloodGroup] = useState("O+");

  // Doctor Application state
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docSpecialization, setDocSpecialization] = useState("Cardiology");
  const [docQualifications, setDocQualifications] = useState("MBBS, MD");
  const [docExperience, setDocExperience] = useState("5");
  const [docHospital, setDocHospital] = useState("CareConnect Central Hospital");
  const [docLicense, setDocLicense] = useState("");

  // Forgot Password state
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  // OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");

  const handleAuthRedirect = (user: any) => {
    if (user.role === "patient") {
      navigate("/patient/dashboard", { replace: true });
    } else if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (user.role === "doctor") {
      if (user.verificationStatus === "VERIFIED") {
        navigate("/doctor/dashboard", { replace: true });
      } else {
        navigate("/doctor/pending", { replace: true });
      }
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  // 1. Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const resolvedEmail = loginEmail.trim();
    const resolvedPassword = loginPassword;

    if (!resolvedEmail || !resolvedPassword) {
      toast.error("Validation Error", { description: "Please enter your email and password." });
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginUser({
        email: resolvedEmail,
        password: resolvedPassword,
        role: loginRole,
      });

      if (data.success && data.user) {
        login(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        handleAuthRedirect(data.user);
      }
    } catch (err: any) {
      toast.error("Authentication Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Patient Registration Handler
  const handlePatientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Name Required", { description: "Please provide your full legal name." });
      return;
    }
    if (!patientEmail.includes("@")) {
      toast.error("Invalid Email", { description: "Please enter a valid email address." });
      return;
    }
    if (patientPassword.length < 6) {
      toast.error("Weak Password", { description: "Password must be at least 6 characters long." });
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerPatient({
        name: patientName.trim(),
        email: patientEmail.trim().toLowerCase(),
        phone: patientPhone.trim(),
        password: patientPassword,
        age: parseInt(patientAge, 10) || 30,
        gender: patientGender,
        bloodGroup: patientBloodGroup,
      });

      if (data.success && data.user) {
        login(data.user);
        toast.success("Account Created!", {
          description: "Welcome to CareConnect. Your health dashboard is ready.",
        });
        navigate("/patient/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast.error("Registration Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Doctor Registration Handler
  const handleDoctorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      toast.error("Full Name Required", { description: "Please enter your professional name." });
      return;
    }
    if (!docEmail.includes("@")) {
      toast.error("Professional Email Required", { description: "Please enter a valid medical email." });
      return;
    }
    if (!docLicense.trim()) {
      toast.error("Medical License Required", { description: "Medical registration number is mandatory." });
      return;
    }
    if (docPassword.length < 6) {
      toast.error("Password Length", { description: "Password must be at least 6 characters." });
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerDoctor({
        name: docName.trim(),
        email: docEmail.trim().toLowerCase(),
        phone: docPhone.trim(),
        password: docPassword,
        specialization: docSpecialization,
        qualifications: docQualifications,
        experienceYears: parseInt(docExperience, 10) || 1,
        hospitalAffiliation: docHospital,
        medicalLicenseNumber: docLicense.trim(),
      });

      if (data.success && data.user) {
        login(data.user);
        toast.success("Credentials Submitted!", {
          description: "Your application is under administrative review.",
        });
        navigate("/doctor/pending", { replace: true });
      }
    } catch (err: any) {
      toast.error("Application Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Forgot Password Handlers
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      toast.error("Email Required", { description: "Please enter a valid email address." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(resetEmail.trim());
      toast.success("Code Sent", {
        description: res.devResetToken
          ? `Code: ${res.devResetToken} (Auto-filled)`
          : "Please check your email for the reset code.",
      });
      if (res.devResetToken) {
        setResetCode(res.devResetToken);
      }
      setResetStep("verify");
    } catch (err: any) {
      toast.error("Request Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || resetCode.length < 6) {
      toast.error("Code Required", { description: "Enter the 6-digit verification code." });
      return;
    }
    if (resetNewPassword.length < 6) {
      toast.error("Password Length", { description: "New password must be at least 6 characters." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await confirmPasswordReset({
        email: resetEmail.trim(),
        resetToken: resetCode.trim(),
        newPassword: resetNewPassword,
      });
      toast.success("Password Updated!", { description: res.message });
      setAuthMode("login");
      setLoginEmail(resetEmail);
      setResetStep("request");
    } catch (err: any) {
      toast.error("Reset Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 5. OTP Handlers
  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail || !otpEmail.includes("@")) {
      toast.error("Valid Email Required", { description: "Enter your registered email address." });
      return;
    }
    setIsLoading(true);
    try {
      const data = await requestOtp(otpEmail, loginRole);
      toast.success("OTP Sent", {
        description: data.otp ? `Code: ${data.otp} (Auto-filled)` : "Check your email for the 6-digit code.",
      });
      if (data.otp) setOtpCode(data.otp);
      setOtpStep("verify");
    } catch (err: any) {
      toast.error("Transmission Error", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Invalid Code", { description: "Enter 6-digit code." });
      return;
    }
    setIsLoading(true);
    try {
      const data = await verifyOtp(otpEmail, otpCode, loginRole);
      if (data.success && data.user) {
        login(data.user);
        toast.success("Logged in successfully");
        handleAuthRedirect(data.user);
      }
    } catch (err: any) {
      toast.error("Verification Refused", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-body">
      <PublicNavbar />

      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Side: Main Auth Card ── */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm">
            {/* Top Navigation between modes */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <span className="font-heading font-black text-lg text-slate-900 tracking-tight">CareConnect Portal</span>
              </div>

              {authMode !== "login" && (
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              )}
            </div>

            {/* ══════════ 1. SIGN IN VIEW ══════════ */}
            {authMode === "login" && (
              <div className="space-y-6">
                {/* Role Switcher */}
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Select Your Portal
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    {(["patient", "doctor", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLoginRole(r)}
                        className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                          loginRole === r
                            ? "bg-white text-blue-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {r === "patient" ? "Patient" : r === "doctor" ? "Doctor" : "Administrator"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {loginRole === "patient"
                      ? "Patient Portal Login"
                      : loginRole === "doctor"
                      ? "Doctor & Clinician Suite"
                      : "Hospital Administration"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your authorized credentials to access appointments, prescriptions, and health records.
                  </p>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-4 pt-1">
                  <div>
                    <Label htmlFor="login-email" className="text-xs font-bold text-slate-700">
                      Email Address
                    </Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="login-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={
                          loginRole === "admin"
                            ? "admin@careconnect.com"
                            : loginRole === "doctor"
                            ? "dr.alexander@careconnect.com"
                            : "patient@example.com"
                        }
                        className="pl-10 h-11 text-sm rounded-xl border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs font-bold text-slate-700">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setAuthMode("forgot-password")}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 text-sm rounded-xl border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                      </span>
                    ) : (
                      "Sign In to Portal"
                    )}
                  </Button>
                </form>

                {/* Additional Access Links */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("otp-login");
                      setOtpEmail(loginEmail);
                      setOtpStep("request");
                    }}
                    className="text-slate-600 hover:text-blue-700 font-semibold"
                  >
                    Sign in with One-Time Email Code
                  </button>

                  <div className="flex items-center gap-2">
                    {loginRole === "doctor" ? (
                      <button
                        type="button"
                        onClick={() => setAuthMode("doctor-register")}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        Apply for Doctor Credentials
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAuthMode("patient-register")}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        New Patient? Register here
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ 2. PATIENT REGISTRATION VIEW ══════════ */}
            {authMode === "patient-register" && (
              <div className="space-y-6">
                <div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold mb-2">
                    New Patient Account
                  </Badge>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Create Your CareConnect Account
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Book visits with board-certified doctors and access digital prescriptions anytime.
                  </p>
                </div>

                <form onSubmit={handlePatientRegister} className="space-y-3.5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Full Legal Name *</Label>
                      <Input
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
                      <Input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="e.g. eleanor@example.com"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                      <Input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Password (Min. 6 chars) *</Label>
                      <Input
                        type="password"
                        required
                        value={patientPassword}
                        onChange={(e) => setPatientPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Age</Label>
                      <Input
                        type="number"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Gender</Label>
                      <Select value={patientGender} onValueChange={setPatientGender}>
                        <SelectTrigger className="mt-1 h-10 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Non-binary">Non-binary</SelectItem>
                          <SelectItem value="Not specified">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Blood Group</Label>
                      <Select value={patientBloodGroup} onValueChange={setPatientBloodGroup}>
                        <SelectTrigger className="mt-1 h-10 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs mt-2"
                  >
                    {isLoading ? "Creating Account..." : "Register Patient Account"}
                  </Button>
                </form>

                <p className="text-center text-xs text-slate-500">
                  Already have an account?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-blue-600 font-bold hover:underline">
                    Sign in here
                  </button>
                </p>
              </div>
            )}

            {/* ══════════ 3. DOCTOR REGISTRATION VIEW ══════════ */}
            {authMode === "doctor-register" && (
              <div className="space-y-6">
                <div>
                  <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-semibold mb-2">
                    Practitioner Credentialing
                  </Badge>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Doctor Credential Application
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Join our verified clinical network. Credentials are board-reviewed before activation.
                  </p>
                </div>

                <form onSubmit={handleDoctorRegister} className="space-y-3.5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Doctor Legal Name *</Label>
                      <Input
                        required
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Dr. Arthur Pendelton"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Medical Email *</Label>
                      <Input
                        type="email"
                        required
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        placeholder="e.g. arthur@hospital.org"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Password *</Label>
                      <Input
                        type="password"
                        required
                        value={docPassword}
                        onChange={(e) => setDocPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Medical License Number *</Label>
                      <Input
                        required
                        value={docLicense}
                        onChange={(e) => setDocLicense(e.target.value)}
                        placeholder="e.g. LIC-984210"
                        className="mt-1 h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Specialization *</Label>
                      <Select value={docSpecialization} onValueChange={setDocSpecialization}>
                        <SelectTrigger className="mt-1 h-10 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cardiology">Cardiology</SelectItem>
                          <SelectItem value="Primary Care">Primary Care</SelectItem>
                          <SelectItem value="Neurology">Neurology</SelectItem>
                          <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="Integrative Medicine">Integrative Medicine</SelectItem>
                          <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Qualifications *</Label>
                      <Input
                        required
                        value={docQualifications}
                        onChange={(e) => setDocQualifications(e.target.value)}
                        placeholder="e.g. MBBS, MD, FACC"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Years of Experience</Label>
                      <Input
                        type="number"
                        value={docExperience}
                        onChange={(e) => setDocExperience(e.target.value)}
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Hospital / Clinic Affiliation</Label>
                      <Input
                        value={docHospital}
                        onChange={(e) => setDocHospital(e.target.value)}
                        placeholder="e.g. CareConnect Central Hospital"
                        className="mt-1 h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs mt-2"
                  >
                    {isLoading ? "Submitting Application..." : "Submit Doctor Credentials for Review"}
                  </Button>
                </form>

                <p className="text-center text-xs text-slate-500">
                  Already registered?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-blue-600 font-bold hover:underline">
                    Sign in here
                  </button>
                </p>
              </div>
            )}

            {/* ══════════ 4. FORGOT PASSWORD VIEW ══════════ */}
            {authMode === "forgot-password" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Reset Your Password
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {resetStep === "request"
                      ? "Enter your account email to receive a secure recovery code."
                      : "Enter the 6-digit code sent to your email and your new password."}
                  </p>
                </div>

                {resetStep === "request" ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Account Email Address</Label>
                      <Input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-1 h-11 text-sm rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                    >
                      {isLoading ? "Sending Code..." : "Send Reset Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">6-Digit Verification Code</Label>
                      <Input
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="mt-1 h-11 text-center font-mono tracking-widest text-base rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">New Password (Min. 6 chars)</Label>
                      <Input
                        type="password"
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 h-11 text-sm rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                    >
                      {isLoading ? "Saving Password..." : "Update Password & Return to Sign In"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* ══════════ 5. OTP LOGIN VIEW ══════════ */}
            {authMode === "otp-login" && (
              <div className="space-y-6">
                <div>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold mb-2">
                    Passwordless Verification
                  </Badge>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    One-Time Code Sign In
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {otpStep === "request"
                      ? "We will dispatch a secure 6-digit access code to your registered email."
                      : "Enter the 6-digit code received in your inbox."}
                  </p>
                </div>

                {otpStep === "request" ? (
                  <form onSubmit={handleOtpRequest} className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                      <Input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-1 h-11 text-sm rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                    >
                      {isLoading ? "Sending Code..." : "Send Access Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">6-Digit Code</Label>
                      <Input
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="mt-1 h-11 text-center font-mono tracking-widest text-base rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                    >
                      {isLoading ? "Verifying..." : "Verify Code & Sign In"}
                    </Button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="text-xs text-blue-600 hover:underline font-semibold block text-center w-full"
                >
                  Return to Standard Password Login
                </button>
              </div>
            )}
          </div>

          {/* ── Right Side: Clinical Trust & Assurance Panel ── */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Secure Healthcare Infrastructure
            </div>

            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              Protected health records and verified clinical workflows.
            </h2>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">End-to-End Encryption</strong>
                  Patient medical charts, prescriptions, and telehealth calls are encrypted per HIPAA and SOC2 Type II standards.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Verified Provider Directory</strong>
                  All doctors undergo primary source license verification and hospital credentialing.
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Unified Digital Health Record</strong>
                  Follow-up treatment notes, digital dosage instructions, and lab reports are organized in one place.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Need help signing in?</span>
              <Link to="/contact" className="font-semibold text-blue-600 hover:text-blue-800">
                Contact Support Desk
              </Link>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
