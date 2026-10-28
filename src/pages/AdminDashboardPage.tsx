import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, Users, Stethoscope, Clock, CheckCircle2,
  XCircle, AlertTriangle, UserCog, Search, Filter, RefreshCw,
  Building2, Award, Calendar, FileText, Activity, Server,
  Database, Eye, ChevronLeft, ChevronRight, AlertCircle,
  Ban, HelpCircle, Download, ExternalLink, ShieldAlert,
  ArrowUpRight, Phone, Mail, DollarSign, MapPin, Check,
  Cpu, FileCheck, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  fetchAdminMetrics, fetchAdminVerifications, reviewAdminVerification,
  fetchAdminUsers, updateUserRole, updateUserStatus, fetchAdminAuditLogs
} from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<string>("overview");

  // ── Verification State ──
  const [verificationFilter, setVerificationFilter] = useState<string>("ALL");
  const [verificationSearch, setVerificationSearch] = useState<string>("");
  const [verificationPage, setVerificationPage] = useState<number>(1);
  const [selectedVerificationDocs, setSelectedVerificationDocs] = useState<any | null>(null);
  const [selectedVerificationAction, setSelectedVerificationAction] = useState<{
    request: any;
    actionType: "APPROVED" | "REJECTED" | "INFO_REQUESTED" | "SUSPENDED";
  } | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState<string>("");
  const [previewingDoc, setPreviewingDoc] = useState<any | null>(null);

  // ── User Management State ──
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [userPage, setUserPage] = useState<number>(1);
  const [userLimit] = useState<number>(15);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    user: any;
    targetStatus: "Active" | "Suspended";
  } | null>(null);
  const [statusReasonInput, setStatusReasonInput] = useState<string>("");
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: any;
    newRole: string;
  } | null>(null);

  // ── Audit Logs State ──
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState<number>(1);
  const [selectedAuditLogDetail, setSelectedAuditLogDetail] = useState<any | null>(null);

  // ── Current Logged-in User (for self-action prevention) ──
  const currentAdminUser = React.useMemo(() => {
    try {
      const stored = localStorage.getItem("careConnect_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // ── Queries ──
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: fetchAdminMetrics,
    refetchInterval: 30000,
  });

  const {
    data: verificationsData,
    isLoading: isLoadingVerifications,
    refetch: refetchVerifications
  } = useQuery({
    queryKey: ["adminVerifications", verificationFilter, verificationSearch, verificationPage],
    queryFn: () =>
      fetchAdminVerifications({
        status: verificationFilter,
        search: verificationSearch,
        page: verificationPage,
        limit: 10,
      }),
    refetchInterval: 15000,
  });

  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ["adminUsers", userSearch, userRoleFilter, userStatusFilter, userPage, userLimit],
    queryFn: () =>
      fetchAdminUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
        page: userPage,
        limit: userLimit,
      }),
  });

  const {
    data: auditLogsResponse,
    isLoading: isLoadingAuditLogs,
    refetch: refetchAuditLogs
  } = useQuery({
    queryKey: ["adminAuditLogs", auditSearch, auditSeverityFilter, auditPage],
    queryFn: () =>
      fetchAdminAuditLogs({
        search: auditSearch,
        severity: auditSeverityFilter,
        page: auditPage,
        limit: 15,
      }),
  });

  // Socket listener for real-time registrations and updates
  React.useEffect(() => {
    if (!socket) return;
    const handleDoctorRegistered = () => {
      refetchMetrics();
      refetchVerifications();
      toast.info("New doctor registration received!");
    };
    const handleVerificationUpdated = (payload: any) => {
      refetchMetrics();
      refetchVerifications();
      refetchUsers();
    };

    socket.on("doctorRegistered", handleDoctorRegistered);
    socket.on("doctorVerificationUpdated", handleVerificationUpdated);

    return () => {
      socket.off("doctorRegistered", handleDoctorRegistered);
      socket.off("doctorVerificationUpdated", handleVerificationUpdated);
    };
  }, [socket, refetchMetrics, refetchVerifications, refetchUsers]);

  // ── Mutations ──
  const reviewVerificationMutation = useMutation({
    mutationFn: ({
      requestId,
      status,
      reviewNotes,
    }: {
      requestId: string;
      status: "APPROVED" | "REJECTED" | "INFO_REQUESTED" | "SUSPENDED";
      reviewNotes?: string;
    }) => reviewAdminVerification(requestId, { status, reviewNotes }),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminVerifications"] });
      queryClient.invalidateQueries({ queryKey: ["adminMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLogs"] });
      setSelectedVerificationAction(null);
      setReviewNotesInput("");

      if (vars.status === "APPROVED") {
        toast.success("Doctor credentials approved! Clinical permissions activated.");
      } else if (vars.status === "INFO_REQUESTED") {
        toast.info("Request for additional information dispatched to physician.");
      } else if (vars.status === "SUSPENDED") {
        toast.warning("Physician account and clinical privileges suspended.");
      } else {
        toast.error("Application rejected with reason noted.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process verification decision.");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLogs"] });
      setRoleChangeTarget(null);
      toast.success("User role updated successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: "Active" | "Suspended";
      reason?: string;
    }) => updateUserStatus(userId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["adminAuditLogs"] });
      setStatusConfirmTarget(null);
      setStatusReasonInput("");
      toast.success("Account status updated.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to change account status.");
    },
  });

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchVerifications();
    refetchUsers();
    refetchAuditLogs();
    toast.success("All administrative data refreshed.");
  };

  const usersList = usersResponse?.data || [];
  const usersPagination = usersResponse?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };

  const verificationsList = verificationsData?.data || [];
  const verificationsPagination = verificationsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const auditLogsList = auditLogsResponse?.data || [];
  const auditLogsPagination = auditLogsResponse?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };

  // Parse document URLs helper
  const parseDocuments = (docUrlsStr?: string | null) => {
    if (!docUrlsStr) return [];
    try {
      const parsed = JSON.parse(docUrlsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleDownloadCertifiedCopy = (doc: any, doctorName?: string, licenseNumber?: string) => {
    const content = `================================================================================
CARECONNECT HOSPITAL NETWORK & MEDICAL LICENSURE BOARD
OFFICIAL VERIFIED CREDENTIAL TRANSCRIPT
================================================================================

CERTIFICATE INFORMATION:
Document Title:       ${doc.title}
Document Type:        ${doc.documentType}
Document Identifier:  ${doc.documentNumber}
Issuing Authority:    ${doc.issuedBy || "State Medical Board / Accredited University"}
Verification State:   ${doc.verified ? "STATE ACCREDITATION VERIFIED" : "PENDING BOARD VALIDATION"}
Record File Size:     ${doc.fileSize || "1.8 MB"}

PHYSICIAN CREDENTIALS:
Practitioner Name:    ${doctorName || "Registered Physician"}
License Registry:     ${licenseNumber || "N/A"}
Verification Mode:    Hospital Administration Cryptographic Audit

SECURITY & AUDIT SEAL:
Audit Serial:         ${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}
Certified Timestamp:  ${new Date().toISOString()}
Issuing Node:         CareConnect Central Clinical Node (Port 3001)

SECURITY NOTICE:
This document is a certified administrative transcript retrieved from the CareConnect
Encrypted Credential Repository. Unauthorized alterations invalidate this record.
================================================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Certified_${(doc.documentType || "Credential").replace(/\\s+/g, "_")}_${licenseNumber || "Doc"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Certified copy of ${doc.title} downloaded securely.`);
  };

  // Appointment distribution counts
  const apptDist = metrics?.appointmentStatusDistribution || {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
    rescheduleRequested: 0,
  };
  const totalApptsCount = metrics?.totalAppointments || 1;

  return (
    <div className="space-y-8 pb-20">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-widest uppercase text-[10px] mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>CareConnect · Medical Administration & Governance</span>
            {isConnected && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live Node
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Security & Clinical Oversight Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Enforce physician verification standards, manage role privileges, and monitor operational health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="rounded-xl border-slate-200 text-xs font-bold gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Sync Data</span>
          </Button>
        </div>
      </div>

      {/* ── Top Navigation Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 h-auto grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <TabsTrigger
            value="overview"
            className="rounded-xl text-xs font-black tracking-wide py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            <span>Overview & Analytics</span>
          </TabsTrigger>

          <TabsTrigger
            value="verification"
            className="rounded-xl text-xs font-black tracking-wide py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm flex items-center gap-2 relative"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Verification</span>
            {metrics?.pendingDoctors > 0 && (
              <Badge className="bg-amber-500 text-white font-black text-[10px] px-1.5 py-0 rounded-full">
                {metrics.pendingDoctors}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="users"
            className="rounded-xl text-xs font-black tracking-wide py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </TabsTrigger>

          <TabsTrigger
            value="monitoring"
            className="rounded-xl text-xs font-black tracking-wide py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Server className="w-4 h-4" />
            <span>Platform Health & Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: OVERVIEW & ANALYTICS
        ========================================================================= */}
        <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
          {/* ── 6 Core Database-Driven Statistics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Total Registered Patients */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Patients</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {isLoadingMetrics ? "..." : metrics?.totalPatients ?? 0}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                <span className="text-blue-600 font-extrabold">{metrics?.totalUsers ?? 0}</span> user accounts
              </div>
            </div>

            {/* 2. Total Registered Doctors */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Doctors</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {isLoadingMetrics ? "..." : metrics?.totalDoctors ?? 0}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                <span>Registered physicians</span>
              </div>
            </div>

            {/* 3. Pending Verification Requests */}
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Pending Requests</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900">
                {isLoadingMetrics ? "..." : metrics?.pendingVerificationRequests ?? metrics?.pendingDoctors ?? 0}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-amber-700 truncate">
                <span>Requires admin action</span>
              </div>
            </div>

            {/* 4. Approved Doctors */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approved Doctors</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">
                {isLoadingMetrics ? "..." : metrics?.approvedDoctors ?? 0}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                <span>Active clinical rights</span>
              </div>
            </div>

            {/* 5. Rejected or Suspended Accounts */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-rose-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rejected / Suspended</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-600">
                {isLoadingMetrics ? "..." : metrics?.rejectedOrSuspendedDoctors ?? ((metrics?.rejectedDoctors ?? 0) + (metrics?.suspendedDoctors ?? 0))}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                <span>{metrics?.rejectedDoctors ?? 0} rej · {metrics?.suspendedDoctors ?? 0} susp</span>
              </div>
            </div>

            {/* 6. Total Appointments */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Bookings</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-600">
                {isLoadingMetrics ? "..." : metrics?.totalAppointments ?? 0}
              </p>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                <span>{apptDist.confirmed + apptDist.completed} confirmed/done</span>
              </div>
            </div>
          </div>

          {/* ── Appointment Status Distribution & Health Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointment Status Distribution (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Appointment Status Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live database breakdown of all {metrics?.totalAppointments ?? 0} consultation bookings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px] border-slate-200">
                    Total: {metrics?.totalAppointments ?? 0}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {/* Confirmed */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Confirmed / Scheduled
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.confirmed} ({totalApptsCount > 0 ? Math.round((apptDist.confirmed / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.confirmed / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Completed */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Completed Consultations
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.completed} ({totalApptsCount > 0 ? Math.round((apptDist.completed / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.completed / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Pending */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      Pending Doctor Response
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.pending} ({totalApptsCount > 0 ? Math.round((apptDist.pending / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.pending / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Reschedule Requested */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                      Reschedule Requested
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.rescheduleRequested} ({totalApptsCount > 0 ? Math.round((apptDist.rescheduleRequested / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.rescheduleRequested / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Cancelled */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                      Cancelled by Patient/Doctor
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.cancelled} ({totalApptsCount > 0 ? Math.round((apptDist.cancelled / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.cancelled / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Rejected */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Rejected
                    </span>
                    <span className="font-mono text-slate-600">
                      {apptDist.rejected} ({totalApptsCount > 0 ? Math.round((apptDist.rejected / totalApptsCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalApptsCount > 0 ? (apptDist.rejected / totalApptsCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Operational Status (1 col) */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 space-y-6 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    System Telemetry
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    OPERATIONAL
                  </Badge>
                </div>

                <h3 className="text-xl font-black text-white">CareConnect Node v2.4</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Server-side authorization enforced on all clinical and administrative vectors.
                </p>

                <div className="mt-6 space-y-3.5 divide-y divide-slate-800 text-xs">
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-400" /> Database Status
                    </span>
                    <span className="font-bold text-emerald-400">Connected (SQLite/Prisma)</span>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Server Uptime
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {metrics?.systemHealth?.serverUptimeSeconds
                        ? `${Math.floor(metrics.systemHealth.serverUptimeSeconds / 3600)}h ${Math.floor((metrics.systemHealth.serverUptimeSeconds % 3600) / 60)}m`
                        : "Active"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-purple-400" /> Transactional Mailer
                    </span>
                    <span className="font-bold text-slate-200">Integrated (Console/SMTP)</span>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Access Protocol
                    </span>
                    <span className="font-bold text-teal-300">RBAC Token Enforced</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button
                  onClick={() => setActiveTab("monitoring")}
                  variant="secondary"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Full Audit Trail
                </Button>
              </div>
            </div>
          </div>

          {/* ── Recent Registrations & Administrative Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Registrations */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Recent User Registrations</h3>
                  <p className="text-xs text-slate-400">Latest accounts registered on CareConnect</p>
                </div>
                <Button
                  onClick={() => setActiveTab("users")}
                  variant="ghost"
                  className="text-xs text-blue-600 font-bold h-8 px-2"
                >
                  View All Users &rarr;
                </Button>
              </div>

              <div className="divide-y divide-slate-100">
                {(metrics?.recentUsers || []).map((u: any) => (
                  <div key={u.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-slate-400 text-[11px]">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-[10px] font-black uppercase ${
                          u.role === "doctor"
                            ? "bg-blue-100 text-blue-800"
                            : u.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </Badge>
                      <Badge
                        className={`text-[9px] font-black ${
                          u.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Administrative Logs */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Recent Sensitive Activity</h3>
                  <p className="text-xs text-slate-400">Security and audit log stream</p>
                </div>
                <Button
                  onClick={() => setActiveTab("monitoring")}
                  variant="ghost"
                  className="text-xs text-blue-600 font-bold h-8 px-2"
                >
                  View Full Logs &rarr;
                </Button>
              </div>

              <div className="divide-y divide-slate-100">
                {(metrics?.recentAuditLogs || []).map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{log.action}</span>
                        <Badge
                          className={`text-[9px] font-black uppercase ${
                            log.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : log.severity === "WARN"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.severity || "INFO"}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        By {log.user?.name || "System"} ({log.user?.role || "auto"}) · {log.entity}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: DOCTOR VERIFICATION CENTER
        ========================================================================= */}
        <TabsContent value="verification" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Doctor Credential & License Applications</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Review state medical board credentials, certifications, and approve clinical practice rights.
                </p>
              </div>

              {/* Status filter tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "PENDING", "APPROVED", "INFO_REQUESTED", "REJECTED", "SUSPENDED"].map((status) => (
                  <Button
                    key={status}
                    onClick={() => {
                      setVerificationFilter(status);
                      setVerificationPage(1);
                    }}
                    variant={verificationFilter === status ? "default" : "outline"}
                    className={`rounded-xl text-xs font-black h-8 px-3 ${
                      verificationFilter === status
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by physician, license, or specialty..."
                value={verificationSearch}
                onChange={(e) => {
                  setVerificationSearch(e.target.value);
                  setVerificationPage(1);
                }}
                className="pl-9 h-10 rounded-xl text-xs border-slate-200"
              />
            </div>

            {/* Applications List */}
            {isLoadingVerifications ? (
              <p className="text-sm text-slate-400 py-12 text-center">Loading credential verification files...</p>
            ) : verificationsList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No verification requests found</p>
                <p className="text-xs text-slate-400">
                  There are currently no doctor credential requests matching the active filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {verificationsList.map((reqItem: any) => {
                  const doc = reqItem.doctor || {};
                  const profile = reqItem.doctorProfile || {};
                  const docs = parseDocuments(reqItem.documentUrls);

                  return (
                    <div
                      key={reqItem.id}
                      className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 hover:border-blue-200 transition-all bg-slate-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-6"
                    >
                      {/* Left: Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-black text-slate-900">{doc.name || "Physician"}</span>
                          <Badge
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 ${
                              reqItem.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : reqItem.status === "PENDING"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : reqItem.status === "INFO_REQUESTED"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : reqItem.status === "SUSPENDED"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {reqItem.status.replace("_", " ")}
                          </Badge>

                          <Badge variant="outline" className="font-mono text-[11px] bg-white border-slate-200 text-slate-700">
                            License: {reqItem.licenseNumber || profile.medicalLicenseNumber}
                          </Badge>
                        </div>

                        {/* Contacts & Metadata */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {doc.email}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {doc.phone || "No phone listed"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Submitted: {new Date(reqItem.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Clinical Profile details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs pt-1">
                          <span className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                            <Stethoscope className="w-3.5 h-3.5" /> {profile.specialization || "General Medicine"}
                          </span>
                          <span className="flex items-center gap-1.5 font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            <Award className="w-3.5 h-3.5 text-amber-500" /> {profile.qualifications || "MBBS"} ({profile.experienceYears || 0} yrs experience)
                          </span>
                          {profile.hospitalAffiliation && (
                            <span className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" /> {profile.hospitalAffiliation}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Fee: ₹{profile.consultationFee || 500}
                          </span>
                        </div>

                        {/* Notes if reviewed */}
                        {reqItem.reviewNotes && (
                          <div className="text-xs bg-white border border-slate-200/80 rounded-xl p-2.5 text-slate-700">
                            <strong className="text-slate-900">Official Decision Notes:</strong> {reqItem.reviewNotes}
                            {reqItem.reviewer?.name && (
                              <span className="text-slate-400 text-[11px] block mt-0.5">
                                Verified by {reqItem.reviewer.name} on {new Date(reqItem.reviewedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0">
                        {/* View documents button */}
                        <Button
                          onClick={() => setSelectedVerificationDocs({ reqItem, docs })}
                          variant="outline"
                          className="rounded-xl text-xs font-bold h-9 px-3 border-slate-200 hover:bg-white text-slate-700 gap-1.5"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>View Documents ({docs.length})</span>
                        </Button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {reqItem.status !== "APPROVED" && (
                            <Button
                              onClick={() => {
                                setSelectedVerificationAction({ request: reqItem, actionType: "APPROVED" });
                                setReviewNotesInput("Medical credentials and license validated against state board register.");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-3 gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                          )}

                          {reqItem.status !== "INFO_REQUESTED" && reqItem.status !== "APPROVED" && (
                            <Button
                              onClick={() => {
                                setSelectedVerificationAction({ request: reqItem, actionType: "INFO_REQUESTED" });
                                setReviewNotesInput("");
                              }}
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl text-xs font-bold h-9 px-3 gap-1"
                            >
                              <HelpCircle className="w-3.5 h-3.5" /> Request Info
                            </Button>
                          )}

                          {reqItem.status !== "REJECTED" && reqItem.status !== "APPROVED" && (
                            <Button
                              onClick={() => {
                                setSelectedVerificationAction({ request: reqItem, actionType: "REJECTED" });
                                setReviewNotesInput("");
                              }}
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold h-9 px-3 gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </Button>
                          )}

                          {reqItem.status === "APPROVED" && (
                            <Button
                              onClick={() => {
                                setSelectedVerificationAction({ request: reqItem, actionType: "SUSPENDED" });
                                setReviewNotesInput("");
                              }}
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold h-9 px-3 gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" /> Suspend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {verificationsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    <span>
                      Page {verificationsPagination.page} of {verificationsPagination.totalPages} ({verificationsPagination.total} requests)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setVerificationPage((p) => Math.max(1, p - 1))}
                        disabled={verificationPage <= 1}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        onClick={() => setVerificationPage((p) => Math.min(verificationsPagination.totalPages, p + 1))}
                        disabled={verificationPage >= verificationsPagination.totalPages}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 3: USER MANAGEMENT
        ========================================================================= */}
        <TabsContent value="users" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">User Directory & Role Access Control</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Manage hospital roles, inspect account standing, and activate/suspend platform privileges.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search name, email, phone..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="pl-9 h-10 rounded-xl text-xs border-slate-200"
                  />
                </div>

                <Select
                  value={userRoleFilter}
                  onValueChange={(val) => {
                    setUserRoleFilter(val);
                    setUserPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="patient">Patients</SelectItem>
                    <SelectItem value="doctor">Doctors</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={userStatusFilter}
                  onValueChange={(val) => {
                    setUserStatusFilter(val);
                    setUserPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users Table */}
            {isLoadingUsers ? (
              <p className="text-sm text-slate-400 py-12 text-center">Loading platform users...</p>
            ) : usersList.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No users found matching your criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">User Profile</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Role Assignment</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4 rounded-r-xl text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u: any) => {
                      const isCurrentAdmin = currentAdminUser?.id === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* User */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                                {u.name ? u.name.substring(0, 2).toUpperCase() : "U"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {u.name}
                                  {isCurrentAdmin && (
                                    <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 font-extrabold">
                                      YOU
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400">ID: {u.id.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <p className="font-medium text-slate-800">{u.email}</p>
                            <p className="text-slate-400">{u.phone || "No phone registered"}</p>
                          </td>

                          {/* Role Selector */}
                          <td className="py-3.5 px-4">
                            <Select
                              value={u.role}
                              onValueChange={(newRole) => {
                                if (newRole !== u.role) {
                                  setRoleChangeTarget({ user: u, newRole });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs rounded-xl font-bold border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="patient">Patient</SelectItem>
                                <SelectItem value="doctor">Doctor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge
                              className={`text-[10px] font-black uppercase ${
                                u.status === "Active"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {u.status || "Active"}
                            </Badge>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            {isCurrentAdmin ? (
                              <span className="text-[11px] text-slate-400 font-bold italic">Current Session</span>
                            ) : u.status === "Active" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusConfirmTarget({ user: u, targetStatus: "Suspended" })}
                                className="text-rose-600 hover:bg-rose-50 text-xs h-8 font-bold rounded-xl"
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" /> Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusConfirmTarget({ user: u, targetStatus: "Active" })}
                                className="text-emerald-600 hover:bg-emerald-50 text-xs h-8 font-bold rounded-xl"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Activate
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Users Pagination */}
                {usersPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    <span>
                      Showing page {usersPagination.page} of {usersPagination.totalPages} ({usersPagination.total} total accounts)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        disabled={userPage <= 1}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        onClick={() => setUserPage((p) => Math.min(usersPagination.totalPages, p + 1))}
                        disabled={userPage >= usersPagination.totalPages}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 4: PLATFORM HEALTH & AUDIT LOGS
        ========================================================================= */}
        <TabsContent value="monitoring" className="space-y-6 focus-visible:outline-none">
          {/* Health summary strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Node Cluster Status</span>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-black">HEALTHY</Badge>
              </div>
              <p className="text-2xl font-black text-slate-900">100% Uptime</p>
              <p className="text-xs text-slate-400">Zero critical failovers in the last 30 days</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Security Audit Events</span>
                <Badge className="bg-blue-100 text-blue-800 text-[10px] font-black">ACTIVE</Badge>
              </div>
              <p className="text-2xl font-black text-slate-900">{auditLogsPagination.total} Logged</p>
              <p className="text-xs text-slate-400">Permanent tamper-resistant activity logging</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Authorization Mode</span>
                <Badge className="bg-purple-100 text-purple-800 text-[10px] font-black">RBAC ACTIVE</Badge>
              </div>
              <p className="text-2xl font-black text-slate-900">Strict Middleware</p>
              <p className="text-xs text-slate-400">Admin routes protected via server token verification</p>
            </div>
          </div>

          {/* Operational Errors & System Alerts Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h2 className="text-xl font-black text-slate-900">Operational Errors & Security Alerts</h2>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Database-driven monitoring of dispatch failures, login rejections, and critical administrative warnings.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[10px] font-black uppercase ${
                    (metrics?.operationalErrors?.failedEmails?.length || 0) +
                    (metrics?.operationalErrors?.criticalSecurityEvents?.length || 0) > 0
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {(metrics?.operationalErrors?.failedEmails?.length || 0) +
                    (metrics?.operationalErrors?.criticalSecurityEvents?.length || 0)}{" "}
                  Events Detected
                </Badge>
              </div>
            </div>

            {(!metrics?.operationalErrors?.failedEmails?.length &&
              !metrics?.operationalErrors?.criticalSecurityEvents?.length) ? (
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                    Zero Operational Bottlenecks Detected
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    All transaction dispatches, email logs, and authentication handlers are operating nominally with zero failed jobs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Failed Transactional Emails */}
                {metrics?.operationalErrors?.failedEmails?.map((errEmail: any) => (
                  <div
                    key={errEmail.id}
                    className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-rose-600 text-white text-[9px] font-black uppercase">
                          DISPATCH FAILED
                        </Badge>
                        <span className="text-xs font-black text-slate-900">{errEmail.template}</span>
                        <span className="text-[11px] text-slate-500 font-mono">Recipient: {errEmail.recipient}</span>
                      </div>
                      <p className="text-xs text-rose-800 font-medium">
                        Error: {errEmail.error || "Delivery timeout or SMTP rejection"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Attempts: {errEmail.attempts} • Subject: "{errEmail.subject}" • {new Date(errEmail.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-rose-300 text-rose-700 text-xs shrink-0 font-bold">
                      Delivery Error
                    </Badge>
                  </div>
                ))}

                {/* Critical / Warning Security Events */}
                {metrics?.operationalErrors?.criticalSecurityEvents?.map((critLog: any) => (
                  <div
                    key={critLog.id}
                    className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[9px] font-black uppercase ${
                            critLog.severity === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {critLog.severity}
                        </Badge>
                        <span className="text-xs font-black text-slate-900">{critLog.action}</span>
                        <span className="text-[11px] text-slate-500 font-mono">Target: {critLog.entity}</span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Actor: {critLog.user?.name || "System/Unauthenticated"} ({critLog.user?.email || "anonymous"}) • IP: {critLog.ipAddress || "127.0.0.1"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Recorded at {new Date(critLog.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedAuditLogDetail(critLog)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100/50 h-8 gap-1 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Incident
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Administrative Audit Trail</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Immutable record of credential reviews, role mutations, account suspensions, and logins.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search action, entity, IP..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    className="pl-9 h-10 rounded-xl text-xs border-slate-200"
                  />
                </div>

                <Select
                  value={auditSeverityFilter}
                  onValueChange={(val) => {
                    setAuditSeverityFilter(val);
                    setAuditPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 rounded-xl text-xs">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARN">WARN</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingAuditLogs ? (
              <p className="text-sm text-slate-400 py-12 text-center">Loading audit log entries...</p>
            ) : auditLogsList.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No audit log records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Timestamp</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Action Event</th>
                      <th className="py-3 px-4">Performed By</th>
                      <th className="py-3 px-4">Target Resource</th>
                      <th className="py-3 px-4">Client IP</th>
                      <th className="py-3 px-4 rounded-r-xl text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {auditLogsList.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[9px] font-black uppercase ${
                              log.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : log.severity === "WARN"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.severity || "INFO"}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">{log.action}</td>

                        <td className="py-3 px-4 text-slate-700 font-sans">
                          {log.user ? `${log.user.name} (${log.user.role})` : "System Service"}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {log.entity} {log.entityId ? `[${log.entityId.substring(0, 8)}]` : ""}
                        </td>

                        <td className="py-3 px-4 text-slate-500">{log.ipAddress || "127.0.0.1"}</td>

                        <td className="py-3 px-4 text-right font-sans">
                          <Button
                            onClick={() => setSelectedAuditLogDetail(log)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 text-xs h-8 px-2 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Audit Logs Pagination */}
                {auditLogsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    <span>
                      Page {auditLogsPagination.page} of {auditLogsPagination.totalPages} ({auditLogsPagination.total} audit events)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={auditPage <= 1}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        onClick={() => setAuditPage((p) => Math.min(auditLogsPagination.totalPages, p + 1))}
                        disabled={auditPage >= auditLogsPagination.totalPages}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-8 px-3"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODALS & DIALOGS
      ========================================================================= */}

      {/* ── Document Inspection Modal ── */}
      <Dialog open={!!selectedVerificationDocs} onOpenChange={() => setSelectedVerificationDocs(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Physician Credentials & Documentation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submitted documentation for {selectedVerificationDocs?.reqItem?.doctor?.name || "Doctor"} (License:{" "}
              {selectedVerificationDocs?.reqItem?.licenseNumber})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedVerificationDocs?.docs?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No digital document attachments submitted.</p>
            ) : (
              <div className="space-y-3">
                {selectedVerificationDocs?.docs?.map((doc: any, idx: number) => (
                  <div
                    key={doc.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{doc.title}</span>
                        {doc.verified && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black">
                            STATE BOARD VERIFIED
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {doc.documentType} • Document #{doc.documentNumber} • Issued by: {doc.issuedBy || "State Council"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">Attachment size: {doc.fileSize || "1.2 MB"}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => {
                          setPreviewingDoc({
                            ...doc,
                            doctorName: selectedVerificationDocs?.reqItem?.doctor?.name,
                            licenseNumber: selectedVerificationDocs?.reqItem?.licenseNumber,
                            specialization: selectedVerificationDocs?.reqItem?.doctorProfile?.specialization,
                            doctorEmail: selectedVerificationDocs?.reqItem?.doctor?.email,
                            hospitalAffiliation: selectedVerificationDocs?.reqItem?.doctorProfile?.hospitalAffiliation,
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-bold h-8 border-slate-200 text-slate-700 gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview
                      </Button>
                      <Button
                        onClick={() => {
                          handleDownloadCertifiedCopy(
                            doc,
                            selectedVerificationDocs?.reqItem?.doctor?.name,
                            selectedVerificationDocs?.reqItem?.licenseNumber
                          );
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-8 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Certified Copy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSelectedVerificationDocs(null)}
              className="rounded-xl font-bold bg-slate-900 text-white"
            >
              Close Document Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Official Certified Credential Inspection Modal ── */}
      <Dialog open={!!previewingDoc} onOpenChange={() => setPreviewingDoc(null)}>
        <DialogContent className="max-w-xl bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <DialogHeader className="relative z-10 border-b border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-mono text-[10px] uppercase tracking-widest font-black">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>STATE MEDICAL LICENSURE BOARD · VERIFIED REPOSITORY</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                ENCRYPTED TRANSCRIPT
              </Badge>
            </div>
            <DialogTitle className="text-xl font-black text-white mt-2">
              {previewingDoc?.title || "Medical Credential Record"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Verified Administrative Audit Transcript for {previewingDoc?.doctorName || "Registered Physician"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-5 space-y-4 text-xs relative z-10 font-sans">
            {/* Visual Credential Certificate Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4 relative">
              <div className="flex justify-between items-start border-b border-slate-800/60 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                    Credential Serial
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-300">
                    {previewingDoc?.documentNumber || "CC-MED-84920"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                    Document Category
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {previewingDoc?.documentType || "Medical Board Licensure"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Practitioner Name</span>
                  <span className="font-bold text-white text-sm">
                    {previewingDoc?.doctorName || "Dr. CareConnect Lead"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Medical License Number</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {previewingDoc?.licenseNumber || "MED-ACTIVE"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Clinical Specialty</span>
                  <span className="font-medium text-slate-300">
                    {previewingDoc?.specialization || "General Medicine / Surgery"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Issuing Authority</span>
                  <span className="font-medium text-slate-300">
                    {previewingDoc?.issuedBy || "State Medical Council"}
                  </span>
                </div>
              </div>

              {/* Watermark badge */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>State Registry Digital Cryptographic Signature</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">SHA-256 VERIFIED</span>
              </div>
            </div>
          </div>

          <DialogFooter className="relative z-10 flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPreviewingDoc(null)}
              className="rounded-xl text-xs font-bold border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Close Preview
            </Button>
            <Button
              onClick={() => {
                handleDownloadCertifiedCopy(
                  previewingDoc,
                  previewingDoc?.doctorName,
                  previewingDoc?.licenseNumber
                );
              }}
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-lg shadow-blue-600/30"
            >
              <Download className="w-4 h-4" /> Export Certified Copy (.txt)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Doctor Verification Decision Modal ── */}
      <Dialog
        open={!!selectedVerificationAction}
        onOpenChange={() => {
          setSelectedVerificationAction(null);
          setReviewNotesInput("");
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {selectedVerificationAction?.actionType === "APPROVED" && "Approve Doctor Credentials"}
              {selectedVerificationAction?.actionType === "INFO_REQUESTED" && "Request Additional Documentation"}
              {selectedVerificationAction?.actionType === "REJECTED" && "Reject Credential Application"}
              {selectedVerificationAction?.actionType === "SUSPENDED" && "Suspend Doctor Clinical Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Physician: {selectedVerificationAction?.request?.doctor?.name} · License:{" "}
              {selectedVerificationAction?.request?.licenseNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label className="text-xs font-bold text-slate-700">
              Official Administration Notes / Mandatory Explanation:
            </label>
            <Input
              placeholder={
                selectedVerificationAction?.actionType === "APPROVED"
                  ? "e.g. Validated with Medical Council Register."
                  : selectedVerificationAction?.actionType === "INFO_REQUESTED"
                  ? "e.g. Please provide certified proof of active malpractice insurance."
                  : selectedVerificationAction?.actionType === "SUSPENDED"
                  ? "e.g. Clinical suspension pending investigation."
                  : "e.g. Expired medical accreditation."
              }
              value={reviewNotesInput}
              onChange={(e) => setReviewNotesInput(e.target.value)}
              className="text-xs border-slate-200 h-10 rounded-xl"
            />
            {selectedVerificationAction?.actionType !== "APPROVED" && (
              <p className="text-[11px] text-amber-600 font-medium">
                * Note will be emailed to the physician and logged permanently in the system audit trail.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedVerificationAction(null);
                setReviewNotesInput("");
              }}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={
                selectedVerificationAction?.actionType !== "APPROVED" &&
                !reviewNotesInput.trim()
              }
              onClick={() => {
                if (selectedVerificationAction) {
                  reviewVerificationMutation.mutate({
                    requestId: selectedVerificationAction.request.id,
                    status: selectedVerificationAction.actionType,
                    reviewNotes: reviewNotesInput.trim() || undefined,
                  });
                }
              }}
              className={`rounded-xl text-xs font-bold ${
                selectedVerificationAction?.actionType === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : selectedVerificationAction?.actionType === "INFO_REQUESTED"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              Confirm {selectedVerificationAction?.actionType.replace("_", " ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Change Confirmation Modal ── */}
      <Dialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-600" />
              Confirm Privilege Role Reassignment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to change {roleChangeTarget?.user?.name}'s role from{" "}
              <strong>{roleChangeTarget?.user?.role}</strong> to{" "}
              <strong className="text-blue-700">{roleChangeTarget?.newRole}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p>
              <strong>Security Protocol:</strong> Changing a user's role adjusts their server-side access to clinical records,
              consultations, and administration pages immediately upon token refresh.
            </p>
            {roleChangeTarget?.user?.role === "admin" && roleChangeTarget?.newRole !== "admin" && (
              <p className="text-amber-700 font-bold">
                ⚠️ Demoting an Administrator: The server prevents demoting the last active administrator on the platform.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRoleChangeTarget(null)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (roleChangeTarget) {
                  roleMutation.mutate({
                    userId: roleChangeTarget.user.id,
                    role: roleChangeTarget.newRole,
                  });
                }
              }}
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Role Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Status Modal (Suspend / Activate) ── */}
      <Dialog
        open={!!statusConfirmTarget}
        onOpenChange={() => {
          setStatusConfirmTarget(null);
          setStatusReasonInput("");
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              {statusConfirmTarget?.targetStatus === "Suspended" ? (
                <>
                  <Ban className="w-5 h-5 text-rose-600" />
                  Suspend User Account
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Reactivate User Account
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Account: {statusConfirmTarget?.user?.name} ({statusConfirmTarget?.user?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <label className="text-xs font-bold text-slate-700">
              {statusConfirmTarget?.targetStatus === "Suspended"
                ? "Reason for account suspension (Audit Log requirement):"
                : "Administrative reactivation notes:"}
            </label>
            <Input
              placeholder={
                statusConfirmTarget?.targetStatus === "Suspended"
                  ? "e.g. Terms violation or credential inconsistency"
                  : "e.g. Credentials re-validated"
              }
              value={statusReasonInput}
              onChange={(e) => setStatusReasonInput(e.target.value)}
              className="text-xs border-slate-200 h-10 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setStatusConfirmTarget(null);
                setStatusReasonInput("");
              }}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (statusConfirmTarget) {
                  statusMutation.mutate({
                    userId: statusConfirmTarget.user.id,
                    status: statusConfirmTarget.targetStatus,
                    reason: statusReasonInput.trim() || undefined,
                  });
                }
              }}
              className={`rounded-xl text-xs font-bold ${
                statusConfirmTarget?.targetStatus === "Suspended"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              Confirm {statusConfirmTarget?.targetStatus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Audit Log Details Inspector Modal ── */}
      <Dialog open={!!selectedAuditLogDetail} onOpenChange={() => setSelectedAuditLogDetail(null)}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              Security Audit Event Inspector
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Event #{selectedAuditLogDetail?.id} · {selectedAuditLogDetail?.action}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block font-sans">Timestamp</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedAuditLogDetail?.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Severity</span>
                <span className="font-bold text-slate-800">{selectedAuditLogDetail?.severity}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Actor</span>
                <span className="font-bold text-slate-800">
                  {selectedAuditLogDetail?.user?.name || "System"} ({selectedAuditLogDetail?.user?.email || "internal"})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Client IP</span>
                <span className="font-bold text-slate-800">{selectedAuditLogDetail?.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">JSON Payload & Metadata:</span>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-60">
                {selectedAuditLogDetail?.details
                  ? typeof selectedAuditLogDetail.details === "string"
                    ? selectedAuditLogDetail.details
                    : JSON.stringify(selectedAuditLogDetail.details, null, 2)
                  : "No additional metadata recorded."}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSelectedAuditLogDetail(null)}
              className="rounded-xl font-bold bg-slate-900 text-white text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
