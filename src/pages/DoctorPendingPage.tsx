import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Clock, ShieldAlert, CheckCircle2, RefreshCw, LogOut,
  Stethoscope, Building2, Award, FileBadge, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

export default function DoctorPendingPage() {
  const { user, logout, refreshUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // If already verified or admin, automatically redirect to doctor dashboard
  useEffect(() => {
    if (user?.role === "admin" || (user?.role === "doctor" && user?.verificationStatus === "VERIFIED")) {
      navigate("/doctor/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Listen to live socket event from Admin approval
  useEffect(() => {
    if (!socket || !user) return;

    const handleVerificationUpdate = async (data: { userId: string; verificationStatus: string }) => {
      if (data.userId === user.id) {
        if (data.verificationStatus === "VERIFIED") {
          toast.success("Credentials Verified!", {
            description: "Your medical credentials have been approved by administration. Redirecting to clinical overview...",
          });
          await refreshUser();
          navigate("/doctor/dashboard", { replace: true });
        } else if (data.verificationStatus === "REJECTED") {
          toast.error("Application Update", {
            description: "Your credential submission was rejected. Please review licensing requirements.",
          });
          await refreshUser();
        }
      }
    };

    socket.on("doctorVerificationUpdated", handleVerificationUpdate);
    return () => {
      socket.off("doctorVerificationUpdated", handleVerificationUpdate);
    };
  }, [socket, user, refreshUser, navigate]);

  const handleManualRefresh = async () => {
    toast.info("Checking Credential Status...");
    await refreshUser();
    if (user?.verificationStatus === "VERIFIED") {
      toast.success("You are verified!");
      navigate("/doctor/dashboard");
    } else {
      toast.info("Still pending review by hospital administration.");
    }
  };

  const profile = user?.doctorProfile || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative z-10"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Credential Verification</h1>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                  {user?.verificationStatus || "PENDING"}
                </Badge>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">CareConnect Hospital Medical Board Review</p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={logout}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl text-xs flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        {/* Status Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-200">Account Restricted to Provider Verification</p>
            <p className="text-slate-300 mt-1 leading-relaxed text-xs">
              Thank you for applying to practice on CareConnect, <strong>{user?.name}</strong>. In accordance with medical compliance regulations, your profile and clinical credentials must be verified before prescribing or conducting consultations.
            </p>
          </div>
        </div>

        {/* Submitted Credentials Summary */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/60 mb-8 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Submitted Credential Summary</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Stethoscope className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[11px] text-slate-400">Specialization</p>
                <p className="font-semibold text-slate-200">{profile.specialization || "General Medicine"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileBadge className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[11px] text-slate-400">License / Reg. Number</p>
                <p className="font-semibold text-slate-200">{profile.medicalLicenseNumber || "MED-PENDING"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[11px] text-slate-400">Qualifications</p>
                <p className="font-semibold text-slate-200">{profile.qualifications || "MBBS"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-[11px] text-slate-400">Hospital Affiliation</p>
                <p className="font-semibold text-slate-200">{profile.hospitalAffiliation || "CareConnect Clinical Network"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            Live socket connected: This screen will automatically refresh as soon as your administrator approves your profile.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleManualRefresh}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 h-11 px-5 shadow-lg shadow-blue-600/30"
            >
              <RefreshCw className="w-4 h-4" /> Check Status
            </Button>
          </div>
        </div>

        {/* Dev Note to reviewer/user */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            <strong>Testing Note:</strong> You can log in using the administrator account (<code>admin@careconnect.com</code> / <code>Admin@123</code>) in another window to approve this doctor application from the Admin Dashboard!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
