import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  CalendarDays,
  Users,
  FileText,
  Pill,
  Clock,
  UserCheck,
  Bell,
  Settings,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Plus,
  Printer,
  Trash2,
  Edit,
  ExternalLink,
  MapPin,
  Building2,
  Award,
  Stethoscope,
  Phone,
  Mail,
  Video,
  Check,
  RotateCcw,
  AlertTriangle,
  FileCheck2,
  Activity,
  HeartPulse,
  Save,
  Send,
  Eye,
  CalendarPlus,
  Briefcase,
  Sparkles,
  Info,
  DollarSign,
  User,
  Coffee,
  CalendarX,
  CheckSquare,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSocket } from "@/hooks/useSocket";
import {
  fetchAppointments,
  updateAppointment,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchDoctorOverview,
  fetchDoctorAvailability,
  updateDoctorAvailability,
  fetchDoctorPatients,
  fetchDoctorPatientDetail,
  createConsultation,
  updateConsultation,
  createDoctorPrescription,
  updateDoctorPrescription,
  fetchDoctorPrescriptionDetail,
  fetchDoctorProfile,
  updateDoctorProfile
} from "@/lib/api";

// ── Sidebar Tabs ───────────────────────────────────────────────────
type DoctorTab =
  | "overview"
  | "requests"
  | "appointments"
  | "calendar"
  | "patients"
  | "records"
  | "prescriptions"
  | "availability"
  | "profile"
  | "notifications"
  | "settings";

interface MedicationItem {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function DoctorDashboardPage() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Active Navigation
  const [activeTab, setActiveTab] = useState<DoctorTab>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals & Active Selections
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Accept / Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [appointmentToReject, setAppointmentToReject] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suggestedSlot, setSuggestedSlot] = useState("");
  const [suggestDate, setSuggestDate] = useState("");

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Clinical Consultation Workspace Modal
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [consultationTargetAppt, setConsultationTargetAppt] = useState<any>(null);
  const [consultationForm, setConsultationForm] = useState({
    patientId: "",
    appointmentId: "",
    patientName: "",
    chiefComplaint: "",
    observations: "",
    diagnosis: "",
    treatmentPlan: "",
    followUpDate: "",
    notes: "",
    status: "Finalized" as "Draft" | "Finalized"
  });

  // Prescription Builder Modal
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientId: "",
    patientName: "",
    appointmentId: "",
    date: new Date().toISOString().split("T")[0],
    followUpRecommendations: "",
    notes: "",
    isFinalized: false,
    medicines: [
      {
        name: "",
        dosage: "500mg",
        route: "Oral",
        frequency: "1-0-1 (Twice daily)",
        duration: "5 days",
        instructions: "After food with water"
      }
    ] as MedicationItem[]
  });

  // Printable Prescription Preview Modal
  const [printPrescriptionModalOpen, setPrintPrescriptionModalOpen] = useState(false);
  const [prescriptionToPrint, setPrescriptionToPrint] = useState<any>(null);

  // Patient Detail Drawer / Modal
  const [patientDetailModalOpen, setPatientDetailModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Filters & Search
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split("T")[0]);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<string>("all");
  const [notifStatusFilter, setNotifStatusFilter] = useState<string>("all");

  // Auth Guards: authenticated doctor & verified
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        navigate("/login", { replace: true });
      } else if (user.role === "patient") {
        navigate("/patient/dashboard", { replace: true });
      } else if (user.role === "doctor" && user.verificationStatus !== "VERIFIED") {
        navigate("/doctor/pending", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Socket.io Real-time listeners
  useEffect(() => {
    if (!socket) return;
    const handleApptUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["doctorOverview"] });
      queryClient.invalidateQueries({ queryKey: ["doctorAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctorPatients"] });
      queryClient.invalidateQueries({ queryKey: ["doctorNotifications"] });
    };
    const handleNotifUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["doctorNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["doctorOverview"] });
    };

    socket.on("appointmentCreated", handleApptUpdate);
    socket.on("appointmentUpdated", handleApptUpdate);
    socket.on("appointmentDeleted", handleApptUpdate);
    socket.on("notificationCreated", handleNotifUpdate);
    socket.on("notificationUpdated", handleNotifUpdate);
    socket.on("notificationsAllRead", handleNotifUpdate);
    socket.on("notificationDeleted", handleNotifUpdate);

    return () => {
      socket.off("appointmentCreated", handleApptUpdate);
      socket.off("appointmentUpdated", handleApptUpdate);
      socket.off("appointmentDeleted", handleApptUpdate);
      socket.off("notificationCreated", handleNotifUpdate);
      socket.off("notificationUpdated", handleNotifUpdate);
      socket.off("notificationsAllRead", handleNotifUpdate);
      socket.off("notificationDeleted", handleNotifUpdate);
    };
  }, [socket, queryClient]);

  // ── Queries ────────────────────────────────────────────────────────
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["doctorOverview"],
    queryFn: () => fetchDoctorOverview(),
    enabled: isAuthenticated && user?.role === "doctor",
    refetchInterval: 5000,
  });

  const { data: appointmentsData = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ["doctorAppointments"],
    queryFn: () => fetchAppointments(),
    enabled: isAuthenticated && (user?.role === "doctor" || user?.role === "admin"),
    refetchInterval: 5000,
  });

  const { data: patientsData = [], isLoading: patientsLoading, refetch: refetchPatients } = useQuery({
    queryKey: ["doctorPatients", patientSearch],
    queryFn: () => fetchDoctorPatients(patientSearch),
    enabled: isAuthenticated && (user?.role === "doctor" || user?.role === "admin"),
  });

  const { data: availabilityData, isLoading: availabilityLoading, refetch: refetchAvailability } = useQuery({
    queryKey: ["doctorAvailability", selectedCalendarDate],
    queryFn: () => fetchDoctorAvailability(selectedCalendarDate),
    enabled: isAuthenticated && (user?.role === "doctor" || user?.role === "admin"),
  });

  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["doctorProfile"],
    queryFn: () => fetchDoctorProfile(),
    enabled: isAuthenticated && (user?.role === "doctor" || user?.role === "admin"),
  });

  const { data: notificationsData = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["doctorNotifications"],
    queryFn: () => fetchNotifications(),
    enabled: isAuthenticated,
  });

  const { data: patientDetailData, isLoading: patientDetailLoading } = useQuery({
    queryKey: ["doctorPatientDetail", selectedPatientId],
    queryFn: () => fetchDoctorPatientDetail(selectedPatientId!),
    enabled: Boolean(selectedPatientId),
  });

  // Target date availability for rejection suggestions
  const { data: suggestDateAvailability } = useQuery({
    queryKey: ["suggestDateAvailability", suggestDate],
    queryFn: () => fetchDoctorAvailability(suggestDate),
    enabled: Boolean(suggestDate),
  });

  // Target date availability for rescheduling
  const { data: rescheduleDateAvailability } = useQuery({
    queryKey: ["rescheduleDateAvailability", rescheduleDate],
    queryFn: () => fetchDoctorAvailability(rescheduleDate),
    enabled: Boolean(rescheduleDate),
  });

  // ── Derived Data ───────────────────────────────────────────────────
  const appointmentsList = useMemo(() => {
    return Array.isArray(appointmentsData) ? appointmentsData : [];
  }, [appointmentsData]);

  const pendingRequests = useMemo(() => {
    return appointmentsList.filter((a: any) => a.status === "Pending");
  }, [appointmentsList]);

  const scheduledAppointments = useMemo(() => {
    return appointmentsList.filter((a: any) => a.status === "Scheduled" || a.status === "Confirmed");
  }, [appointmentsList]);

  const completedAppointments = useMemo(() => {
    return appointmentsList.filter((a: any) => a.status === "Completed");
  }, [appointmentsList]);

  const cancelledAppointments = useMemo(() => {
    return appointmentsList.filter((a: any) => a.status === "Cancelled" || a.status === "Rejected");
  }, [appointmentsList]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayAppointments = useMemo(() => {
    return appointmentsList.filter(
      (a: any) => a.date === todayStr && a.status !== "Cancelled" && a.status !== "Rejected"
    );
  }, [appointmentsList, todayStr]);

  const filteredAppointments = useMemo(() => {
    return appointmentsList.filter((a: any) => {
      const matchesFilter =
        appointmentFilter === "all"
          ? true
          : appointmentFilter === "pending"
          ? a.status === "Pending"
          : appointmentFilter === "scheduled"
          ? a.status === "Scheduled"
          : appointmentFilter === "completed"
          ? a.status === "Completed"
          : appointmentFilter === "cancelled"
          ? a.status === "Cancelled" || a.status === "Rejected"
          : true;

      const matchesSearch =
        !appointmentSearch ||
        a.patient?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        a.therapy?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
        a.date?.includes(appointmentSearch);

      return matchesFilter && matchesSearch;
    });
  }, [appointmentsList, appointmentFilter, appointmentSearch]);

  const unreadNotifsCount = useMemo(() => {
    if (notificationsData?.pagination?.unreadCount !== undefined) {
      return notificationsData.pagination.unreadCount;
    }
    const list = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.data || []);
    return list.filter((n: any) => !n.read).length;
  }, [notificationsData]);

  // ── Mutations ──────────────────────────────────────────────────────
  const updateApptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctorOverview"] });
      toast.success("Appointment updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Action failed");
    }
  });

  const createConsultationMutation = useMutation({
    mutationFn: (data: any) => createConsultation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctorOverview"] });
      queryClient.invalidateQueries({ queryKey: ["doctorPatients"] });
      setConsultationModalOpen(false);
      toast.success("Clinical Consultation record saved securely!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record consultation");
    }
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: (data: any) => createDoctorPrescription(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctorAppointments"] });
      setPrescriptionModalOpen(false);
      toast.success(
        data.isFinalized
          ? "Official prescription digitally signed and issued!"
          : "Prescription draft saved successfully"
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to issue prescription");
    }
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: any) => updateDoctorAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorAvailability"] });
      toast.success("Practice availability & schedule saved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update availability");
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => updateDoctorProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctorProfile"] });
      toast.success("Doctor profile details updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    }
  });

  // ── Action Handlers ────────────────────────────────────────────────
  const handleAcceptRequest = async (appt: any) => {
    try {
      await updateApptMutation.mutateAsync({
        id: appt.id,
        data: {
          status: "Confirmed",
          notes: appt.notes ? `${appt.notes} (Confirmed by Doctor)` : "Confirmed by Doctor",
        }
      });
      toast.success(`Accepted booking for ${appt.patient} on ${appt.date} at ${appt.time}`);
    } catch (err) {
      // handled in mutation
    }
  };

  const handleOpenRejectModal = (appt: any) => {
    setAppointmentToReject(appt);
    setRejectionReason("Doctor unavailable at the requested time slot.");
    setSuggestDate(appt.date);
    setSuggestedSlot("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!appointmentToReject) return;
    try {
      await updateApptMutation.mutateAsync({
        id: appointmentToReject.id,
        data: {
          status: "Rejected",
          cancelReason: rejectionReason,
          suggestedTime: suggestedSlot || undefined,
        }
      });
      setRejectModalOpen(false);
      toast.info(`Appointment request rejected.${suggestedSlot ? ` Alternative slot (${suggestedSlot}) proposed to patient.` : ""}`);
    } catch (err) {
      // handled
    }
  };

  const handleOpenRescheduleModal = (appt: any) => {
    setAppointmentToReschedule(appt);
    setRescheduleDate(appt.date);
    setRescheduleTime(appt.time);
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select a date and an available time slot");
      return;
    }
    try {
      await updateApptMutation.mutateAsync({
        id: appointmentToReschedule.id,
        data: {
          date: rescheduleDate,
          time: rescheduleTime,
          status: "Confirmed",
          notes: `Rescheduled and confirmed by Doctor to ${rescheduleDate} at ${rescheduleTime}`,
        }
      });
      setRescheduleModalOpen(false);
    } catch (err) {
      // handled
    }
  };

  const handleOpenCancelModal = (appt: any) => {
    setAppointmentToCancel(appt);
    setCancelReason("Unforeseen clinical emergency / duty conflict.");
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    try {
      await updateApptMutation.mutateAsync({
        id: appointmentToCancel.id,
        data: {
          status: "Cancelled",
          cancelReason: cancelReason,
        }
      });
      setCancelModalOpen(false);
      toast.info("Appointment cancelled");
    } catch (err) {
      // handled
    }
  };

  const handleMarkCompleted = async (appt: any) => {
    try {
      await updateApptMutation.mutateAsync({
        id: appt.id,
        data: {
          status: "Completed",
        }
      });
      toast.success(`Consultation with ${appt.patient} marked as Completed`);
    } catch (err) {
      // handled
    }
  };

  const handleOpenConsultationModal = (appt: any) => {
    setConsultationTargetAppt(appt);
    setConsultationForm({
      patientId: appt.patientId || "",
      appointmentId: appt.id,
      patientName: appt.patient,
      chiefComplaint: appt.notes || appt.therapy || "",
      observations: "",
      diagnosis: "",
      treatmentPlan: "",
      followUpDate: "",
      notes: "",
      status: "Finalized"
    });
    setConsultationModalOpen(true);
  };

  const handleOpenPrescriptionModal = (appt?: any) => {
    if (appt) {
      setPrescriptionForm({
        patientId: appt.patientId || "",
        patientName: appt.patient,
        appointmentId: appt.id,
        date: new Date().toISOString().split("T")[0],
        followUpRecommendations: "Review after 5 days if symptoms persist",
        notes: "Take plenty of fluids and rest",
        isFinalized: false,
        medicines: [
          {
            name: "Amoxicillin / Clavulanate",
            dosage: "625mg",
            route: "Oral",
            frequency: "1-0-1 (Twice daily)",
            duration: "5 days",
            instructions: "Take after food with plenty of water"
          },
          {
            name: "Paracetamol",
            dosage: "650mg",
            route: "Oral",
            frequency: "SOS (As needed for fever)",
            duration: "3 days",
            instructions: "Take when body temperature exceeds 99.5°F"
          }
        ]
      });
    } else {
      setPrescriptionForm({
        patientId: "",
        patientName: "",
        appointmentId: "",
        date: new Date().toISOString().split("T")[0],
        followUpRecommendations: "",
        notes: "",
        isFinalized: false,
        medicines: [
          {
            name: "",
            dosage: "",
            route: "Oral",
            frequency: "1-0-1",
            duration: "5 days",
            instructions: "After meals"
          }
        ]
      });
    }
    setPrescriptionModalOpen(true);
  };

  const handleAddMedicationRow = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          name: "",
          dosage: "1 tablet",
          route: "Oral",
          frequency: "1-0-1",
          duration: "5 days",
          instructions: "After food"
        }
      ]
    }));
  };

  const handleRemoveMedicationRow = (idx: number) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== idx)
    }));
  };

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      const fullDoc = await fetchDoctorPrescriptionDetail(prescriptionId);
      setPrescriptionToPrint(fullDoc);
      setPrintPrescriptionModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load prescription document for printing");
    }
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  // ── Availability Configuration State ───────────────────────────────
  const [availForm, setAvailForm] = useState({
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    slotDurationMinutes: 30,
    breakStartTime: "01:00 PM",
    breakEndTime: "02:00 PM",
    maxDailyAppointments: 20,
    leaveStartDate: "",
    leaveEndDate: "",
    newUnavailableDate: "",
    unavailableDates: [] as string[]
  });

  useEffect(() => {
    if (availabilityData?.settings) {
      const s = availabilityData.settings;
      setAvailForm({
        workingDays: typeof s.workingDays === "string" ? s.workingDays.split(",").map((d: string) => d.trim()) : s.workingDays || [],
        startTime: s.startTime || "09:00 AM",
        endTime: s.endTime || "05:00 PM",
        slotDurationMinutes: s.slotDurationMinutes || 30,
        breakStartTime: s.breakStartTime || "01:00 PM",
        breakEndTime: s.breakEndTime || "02:00 PM",
        maxDailyAppointments: s.maxDailyAppointments || 20,
        leaveStartDate: s.leaveStartDate || "",
        leaveEndDate: s.leaveEndDate || "",
        newUnavailableDate: "",
        unavailableDates: Array.isArray(s.unavailableDates) ? s.unavailableDates : []
      });
    }
  }, [availabilityData]);

  // ── Doctor Profile State ───────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    photoUrl: "",
    bio: "",
    clinicAddress: "",
    consultationModes: "In-Person,Video Call",
    consultationFee: 500,
    specialization: "",
    qualifications: "",
    experienceYears: 5,
    workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    medicalLicenseNumber: "",
    verificationStatus: "VERIFIED"
  });

  useEffect(() => {
    if (profileData) {
      const u = profileData;
      const dp = u.doctorProfile || {};
      setProfileForm({
        name: u.name || "",
        phone: u.phone || "",
        photoUrl: dp.photoUrl || "",
        bio: dp.bio || "Board-certified clinical specialist dedicated to holistic, evidence-based patient healthcare and clinical consultation.",
        clinicAddress: dp.clinicAddress || "CareConnect Medical Suites, Tower 2, Central Ave",
        consultationModes: dp.consultationModes || "In-Person,Video Call",
        consultationFee: dp.consultationFee || 500,
        specialization: dp.specialization || "General Medicine & Clinical Practice",
        qualifications: dp.qualifications || "MBBS, MD",
        experienceYears: dp.experienceYears || 8,
        workingDays: dp.workingDays || "Monday,Tuesday,Wednesday,Thursday,Friday",
        startTime: dp.startTime || "09:00 AM",
        endTime: dp.endTime || "05:00 PM",
        medicalLicenseNumber: dp.medicalLicenseNumber || "MED-VERIFIED-70371",
        verificationStatus: dp.verificationStatus || "VERIFIED"
      });
    }
  }, [profileData]);

  // ── Sidebar Navigation Items (12 Items Exactly) ────────────────────
  const sidebarItems = [
    { id: "overview" as DoctorTab, label: "Overview", icon: LayoutDashboard },
    { id: "requests" as DoctorTab, label: "Appointment Requests", icon: CalendarCheck, badge: pendingRequests.length },
    { id: "appointments" as DoctorTab, label: "My Appointments", icon: Calendar, badge: scheduledAppointments.length },
    { id: "calendar" as DoctorTab, label: "Calendar", icon: CalendarDays },
    { id: "patients" as DoctorTab, label: "My Patients", icon: Users, badge: (patientsData as any[]).length },
    { id: "records" as DoctorTab, label: "Patient Medical Records", icon: FileText },
    { id: "prescriptions" as DoctorTab, label: "Prescriptions", icon: Pill },
    { id: "availability" as DoctorTab, label: "Availability & Schedule", icon: Clock },
    { id: "profile" as DoctorTab, label: "Doctor Profile", icon: UserCheck },
    { id: "notifications" as DoctorTab, label: "Notifications", icon: Bell, badge: unreadNotifsCount },
    { id: "settings" as DoctorTab, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* ── MOBILE HEADER ──────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#0B192C] text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-black text-slate-950 text-base shadow-sm">
            C
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              CareConnect <span className="text-teal-400 text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-950/60 border border-teal-500/30">Doctor Portal</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("notifications")}
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-teal-400 rounded-full animate-ping" />
            )}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ── DESKTOP & MOBILE NAVY-BLUE NAVIGATION SIDEBAR ─────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-[#0B192C] text-slate-200 flex flex-col transition-all duration-300 shadow-xl border-r border-slate-800 ${
          isSidebarCollapsed ? "w-20" : "w-72"
        } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-md shadow-teal-500/20">
                +
              </div>
              <div>
                <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-1">
                  CareConnect
                </h2>
                <p className="text-xs font-medium text-teal-400">Clinical Doctor Portal</p>
              </div>
            </div>
          )}

          {isSidebarCollapsed && (
            <div className="w-10 h-10 mx-auto rounded-xl bg-teal-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-md">
              +
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Doctor Identity Card */}
        <div className="px-4 py-4 border-b border-slate-800/80 bg-slate-900/40">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-teal-600/20 border-2 border-teal-500 flex items-center justify-center text-teal-300 font-bold text-sm shadow-inner overflow-hidden">
                  {profileForm.photoUrl ? (
                    <img src={profileForm.photoUrl} alt="Dr." className="w-full h-full object-cover" />
                  ) : (
                    <span>Dr. {user?.name?.slice(0, 1) || "D"}</span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-teal-400 border-2 border-[#0B192C] rounded-full" />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-sm text-white truncate">Dr. {user?.name || "Practitioner"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="border-teal-500/40 text-teal-300 bg-teal-950/40 text-[10px] px-1.5 py-0 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-400" />
                    Verified Doctor
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-teal-600/20 border border-teal-500 flex items-center justify-center text-teal-300 font-bold text-xs">
                Dr.
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu (11 Items) */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative ${
                  isActive
                    ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-slate-950 text-teal-400" : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 12. Logout (Exact 12th Sidebar Item) */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to log out of your clinical CareConnect session?")) {
                logout();
                navigate("/login");
              }
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 font-medium text-sm transition"
            title={isSidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0 text-rose-400" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CLINICAL WORKSPACE ───────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                Clinical Workspace
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-500 text-xs font-medium">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5 capitalize">
              {sidebarItems.find(i => i.id === activeTab)?.label || "Overview"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Consultation Button */}
            <Button
              onClick={() => handleOpenConsultationModal({ id: "", patient: "", patientId: "", therapy: "" })}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 shadow-sm flex items-center gap-1.5"
            >
              <Stethoscope className="w-4 h-4" />
              <span className="hidden sm:inline">New Consultation</span>
            </Button>

            {/* Quick Prescription Button */}
            <Button
              variant="outline"
              onClick={() => handleOpenPrescriptionModal()}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-9 flex items-center gap-1.5"
            >
              <Pill className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Write Prescription</span>
            </Button>

            {/* Notifications Shortcut */}
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Content Area */}
        <div className="p-6 flex-1 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Doctor Status Banner */}
              <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400">
                      On-Duty Clinical Practitioner
                    </Badge>
                    <span className="text-slate-300 text-xs">Lic. {profileForm.medicalLicenseNumber}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Welcome, Dr. {user?.name}
                  </h3>
                  <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                    {profileForm.specialization} • {profileForm.qualifications} • {profileForm.experienceYears} Years Experience.
                    You have <strong className="text-teal-400">{todayAppointments.length} appointments scheduled today</strong> and <strong className="text-teal-400">{pendingRequests.length} pending booking requests</strong> requiring your clinical review.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500 flex items-center justify-center text-teal-400">
                    <Clock3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Consultation Window</p>
                    <p className="text-base font-bold text-white">{profileForm.startTime} - {profileForm.endTime}</p>
                    <p className="text-xs text-teal-400 font-semibold">{profileForm.consultationModes}</p>
                  </div>
                </div>
              </div>

              {/* Real Database-Driven Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 1. Today's Appointments */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-500 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Today</span>
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{todayAppointments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Sessions today</p>
                </div>

                {/* 2. Upcoming Appointments */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-500 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Upcoming</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{scheduledAppointments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Future confirmed</p>
                </div>

                {/* 3. Pending Requests */}
                <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/30 shadow-xs hover:border-amber-500 transition cursor-pointer" onClick={() => setActiveTab("requests")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-amber-700">Pending</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold animate-pulse">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-amber-900">{pendingRequests.length}</p>
                  <p className="text-xs text-amber-700 font-medium mt-1">Awaiting approval</p>
                </div>

                {/* 4. Completed Consultations */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-500 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Completed</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{completedAppointments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Care delivered</p>
                </div>

                {/* 5. Cancelled / Rejected */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-rose-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Cancelled</span>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{cancelledAppointments.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Archived/Rejected</p>
                </div>

                {/* 6. Total Patients Seen */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-500 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">Patients</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">
                    {overviewData?.counts?.totalPatients || (patientsData as any[]).length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Under your care</p>
                </div>
              </div>

              {/* Main Overview Grid: Today's Agenda + Pending Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Today's Clinical Schedule */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-teal-600" />
                      <h4 className="font-bold text-base text-slate-900">Today's Appointment Schedule</h4>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("appointments")} className="text-teal-700 text-xs">
                      View All Appointments <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>

                  {todayAppointments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium text-slate-600">No scheduled appointments for today.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Check pending requests or future schedule dates.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayAppointments.map((appt: any) => (
                        <div
                          key={appt.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-white transition gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0">
                              {appt.patient?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-900">{appt.patient}</h5>
                                <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-semibold">
                                  {appt.consultationType || "In-Person"}
                                </Badge>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  appt.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                                }`}>
                                  {appt.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                <strong className="text-slate-800">{appt.time}</strong> • {appt.therapy || "Clinical Examination"}
                              </p>
                              {appt.notes && <p className="text-xs text-slate-500 italic mt-0.5">Note: "{appt.notes}"</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {appt.status !== "Completed" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenConsultationModal(appt)}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                              >
                                Consult
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appt);
                                setIsDetailsOpen(true);
                              }}
                              className="text-xs h-8 border-slate-300"
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Col: Urgent Pending Requests Widget */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-amber-600" />
                        <h4 className="font-bold text-base text-slate-900">Pending Requests</h4>
                      </div>
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        {pendingRequests.length} Awaiting
                      </Badge>
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                        <p className="font-medium text-slate-700">Inbox Zero!</p>
                        <p className="text-xs text-slate-400">All booking requests have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-4">
                        {pendingRequests.slice(0, 3).map((req: any) => (
                          <div key={req.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">{req.patient}</span>
                              <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {req.date} at {req.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1">{req.therapy || "General Consultation"}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptRequest(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 flex-1"
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRejectModal(req)}
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs h-7 flex-1"
                              >
                                Reject / Suggest
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {pendingRequests.length > 3 && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("requests")}
                      className="w-full text-xs text-slate-700 border-slate-300 mt-2"
                    >
                      View All {pendingRequests.length} Pending Requests
                    </Button>
                  )}
                </div>
              </div>

              {/* Recent Patient Activity Log */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    <h4 className="font-bold text-base text-slate-900">Recent Patient Activity & Consultation Trail</h4>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-4">Patient</th>
                        <th className="py-2.5 px-4">Date & Time</th>
                        <th className="py-2.5 px-4">Therapy/Service</th>
                        <th className="py-2.5 px-4">Consultation Mode</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {overviewData?.recentActivity?.slice(0, 6).map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.patientName}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{item.date} • {item.time}</td>
                          <td className="py-3 px-4 text-xs">{item.therapy}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.consultationType || "In-Person"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              item.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "Scheduled"
                                ? "bg-blue-100 text-blue-800"
                                : item.status === "Pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const found = appointmentsList.find((a: any) => a.id === item.id);
                                if (found) {
                                  setSelectedAppointment(found);
                                  setIsDetailsOpen(true);
                                }
                              }}
                              className="text-teal-700 hover:text-teal-800 text-xs h-7"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: APPOINTMENT REQUESTS (FEATURE 1) */}
          {activeTab === "requests" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-teal-600" />
                      Pending Appointment Requests ({pendingRequests.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review requested slots, patient clinical complaints, verify doctor availability, and accept or reject.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchAppointments()} className="text-xs border-slate-300">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh Requests
                  </Button>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-slate-700">No New Appointment Requests</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      All incoming patient requests have been resolved. When a patient books an appointment, it will appear here for your clinical approval.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {pendingRequests.map((req: any) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 p-5 bg-white shadow-xs hover:border-teal-500 hover:shadow-md transition space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-slate-900">{req.patient}</h4>
                              {req.patientDetails?.age && (
                                <span className="text-xs text-slate-500 font-medium">
                                  ({req.patientDetails.age}y, {req.patientDetails.gender})
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-teal-700 mt-0.5">{req.therapy || "Clinical Consultation"}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300">Pending Review</Badge>
                        </div>

                        {/* Booking specifics */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Requested Date & Time:</span>
                            <span className="font-bold text-slate-900">{req.date} at {req.time}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Consultation Mode:</span>
                            <span className="font-semibold">{req.consultationType || "In-Person Clinic Visit"}</span>
                          </div>
                          {req.patientDetails?.phone && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Contact:</span>
                              <span>{req.patientDetails.phone}</span>
                            </div>
                          )}
                          {req.patientDetails?.bloodGroup && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Blood Group:</span>
                              <span className="font-bold text-rose-600">{req.patientDetails.bloodGroup}</span>
                            </div>
                          )}
                          {req.notes && (
                            <div className="pt-1.5 border-t border-slate-200">
                              <span className="text-slate-500 font-medium block">Chief Complaint / Notes:</span>
                              <p className="text-slate-800 italic mt-0.5">"{req.notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            onClick={() => handleAcceptRequest(req)}
                            disabled={updateApptMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 flex-1"
                          >
                            <Check className="w-4 h-4 mr-1.5" /> Accept Request
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleOpenRejectModal(req)}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs h-9 flex-1"
                          >
                            <X className="w-4 h-4 mr-1.5" /> Reject / Propose Alternative
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: MY APPOINTMENTS (FEATURE 2) */}
          {activeTab === "appointments" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      Appointments Management Directory
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review, complete, cancel, or reschedule clinical appointments with verified conflict prevention.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
                      <SelectTrigger className="w-36 text-xs h-9 border-slate-300">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search by patient name, therapy, or date (YYYY-MM-DD)..."
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    className="pl-9 text-xs h-9 border-slate-300"
                  />
                </div>

                {/* Appointments Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Consultation Type</th>
                        <th className="py-3 px-4">Therapy / Complaint</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No appointments found matching your search and filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt: any) => (
                          <tr key={appt.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                                  {appt.patient?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p>{appt.patient}</p>
                                  {appt.patientDetails?.phone && (
                                    <p className="text-[11px] text-slate-400 font-normal">{appt.patientDetails.phone}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold">
                              <p className="text-slate-900">{appt.date}</p>
                              <p className="text-teal-700 font-bold">{appt.time}</p>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                                {appt.consultationType || "In-Person"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <p className="text-slate-800 font-semibold">{appt.therapy || "General Clinical"}</p>
                              {appt.notes && <p className="text-slate-400 truncate max-w-xs">{appt.notes}</p>}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                appt.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : appt.status === "Scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : appt.status === "Pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* If Scheduled, can consult or complete */}
                                {appt.status === "Scheduled" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenConsultationModal(appt)}
                                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-2.5"
                                    >
                                      Consult
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkCompleted(appt)}
                                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-7 px-2"
                                      title="Mark Completed"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenRescheduleModal(appt)}
                                      className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-7 px-2"
                                      title="Reschedule"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenCancelModal(appt)}
                                      className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-7 px-2"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}

                                {appt.status === "Pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAcceptRequest(appt)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenRejectModal(appt)}
                                      className="border-rose-300 text-rose-700 text-xs h-7"
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedAppointment(appt);
                                    setIsDetailsOpen(true);
                                  }}
                                  className="text-xs h-7 text-slate-600"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: CALENDAR VIEW (FEATURE 2) */}
          {activeTab === "calendar" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-teal-600" />
                      Clinical Practice Calendar
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select any date to inspect appointment density, time slots, and doctor availability.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 font-semibold">Inspect Date:</Label>
                    <Input
                      type="date"
                      value={selectedCalendarDate}
                      onChange={(e) => setSelectedCalendarDate(e.target.value)}
                      className="text-xs h-9 w-40 border-slate-300"
                    />
                  </div>
                </div>

                {/* Day Agenda & Slot Schedule */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Bookings on Selected Date */}
                  <div className="lg:col-span-2 space-y-3">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      Appointments for {selectedCalendarDate}
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300">
                        {appointmentsList.filter((a: any) => a.date === selectedCalendarDate).length} Booked
                      </Badge>
                    </h4>

                    {appointmentsList.filter((a: any) => a.date === selectedCalendarDate).length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400">
                        <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">No appointments scheduled on this date.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointmentsList
                          .filter((a: any) => a.date === selectedCalendarDate)
                          .map((appt: any) => (
                            <div
                              key={appt.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 flex items-center justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{appt.patient}</span>
                                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">
                                    {appt.consultationType || "In-Person"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-600 font-medium">
                                  Slot: <strong className="text-teal-700">{appt.time}</strong> • {appt.therapy}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                  appt.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : appt.status === "Scheduled"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {appt.status}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAppointment(appt);
                                    setIsDetailsOpen(true);
                                  }}
                                  className="text-xs h-7"
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Server-Generated Slots for this date */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Generated Slot Matrix</h4>
                      {availabilityData?.schedule?.isAvailable ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Working Day</Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 text-[10px]">Unavailable</Badge>
                      )}
                    </div>

                    {availabilityData?.schedule?.reason && (
                      <p className="text-xs text-slate-600 font-medium italic">
                        {availabilityData.schedule.reason}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                      {availabilityData?.schedule?.slots?.map((slot: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-center text-xs border font-semibold ${
                            slot.isAvailable
                              ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                              : "bg-slate-200 text-slate-600 border-slate-300 line-through opacity-70"
                          }`}
                        >
                          {slot.time}
                          <span className="block text-[10px] font-normal">
                            {slot.isAvailable ? "Available" : slot.patientName ? `Booked: ${slot.patientName}` : slot.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: MY PATIENTS (FEATURE 4) */}
          {activeTab === "patients" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      Authorized Patient Registry ({(patientsData as any[]).length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patients with an active care relationship with Dr. {user?.name}. Private data of unrelated patients is strictly protected.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Search patient by name, email, phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9 text-xs h-9 border-slate-300"
                    />
                  </div>
                </div>

                {/* Patient Cards Grid */}
                {(patientsData as any[]).length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <h4 className="font-bold text-slate-700">No Patients Found</h4>
                    <p className="text-xs text-slate-400">Patients will appear here once an appointment or clinical note is created.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(patientsData as any[]).map((patient: any) => (
                      <div
                        key={patient.id}
                        className="rounded-2xl border border-slate-200 p-5 bg-white shadow-xs hover:border-teal-500 hover:shadow-md transition space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                              {patient.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{patient.name}</h4>
                              <p className="text-xs text-slate-500">
                                {patient.age} yrs • {patient.gender} • Blood: <strong className="text-rose-600">{patient.bloodGroup}</strong>
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-teal-300 text-teal-800 bg-teal-50 text-[10px]">
                            {patient.totalVisits} Consultations
                          </Badge>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1 text-slate-600">
                          <p><strong className="text-slate-700">Phone:</strong> {patient.phone}</p>
                          <p><strong className="text-slate-700">Email:</strong> {patient.email}</p>
                          <p><strong className="text-slate-700">Allergies:</strong> {patient.allergies}</p>
                          <p><strong className="text-slate-700">Medical History:</strong> {patient.medicalHistory}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPatientId(patient.id);
                              setPatientDetailModalOpen(true);
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 flex-1 font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" /> View Clinical Record
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleOpenPrescriptionModal({
                                id: "",
                                patient: patient.name,
                                patientId: patient.id,
                                therapy: "Clinical Prescription"
                              });
                            }}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-8"
                            title="Prescribe Medication"
                          >
                            <Pill className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 6: CLINICAL CONSULTATIONS & RECORDS (FEATURE 5) */}
          {activeTab === "records" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-600" />
                      Clinical Consultation Workspace
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record clinical observations, chief complaints, diagnostic codes, treatment protocols, and follow-up plans.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleOpenConsultationModal({ id: "", patient: "", patientId: "", therapy: "" })}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Create Clinical Consultation
                  </Button>
                </div>

                <div className="space-y-3">
                  {appointmentsList.filter((a: any) => a.status === "Completed").length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <h4 className="font-bold text-slate-700">No Completed Consultations Yet</h4>
                      <p className="text-xs text-slate-400">Completed consultations with patient notes will be cataloged here.</p>
                    </div>
                  ) : (
                    appointmentsList
                      .filter((a: any) => a.status === "Completed")
                      .map((appt: any) => (
                        <div
                          key={appt.id}
                          className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-400 shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900">{appt.patient}</h4>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Completed Consultation</Badge>
                            </div>
                            <span className="text-xs text-slate-500 font-semibold">{appt.date}</span>
                          </div>
                          <p className="text-xs text-slate-700">
                            <strong>Therapy / Clinical Focus:</strong> {appt.therapy}
                          </p>
                          {appt.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <strong>Clinical Observations:</strong> {appt.notes}
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleOpenPrescriptionModal(appt);
                              }}
                              className="text-xs h-7 border-slate-300 text-slate-700"
                            >
                              <Pill className="w-3.5 h-3.5 mr-1" /> Add Prescription
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appt);
                                setIsDetailsOpen(true);
                              }}
                              className="text-xs h-7 text-teal-700 border-teal-200"
                            >
                              Inspect File
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 7: PRESCRIPTIONS (FEATURE 6) */}
          {activeTab === "prescriptions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-teal-600" />
                      Prescription Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Issue verified digital prescriptions, manage drafts, preserve audit histories, and generate printable documents.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleOpenPrescriptionModal()}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> New E-Prescription
                  </Button>
                </div>

                {/* Info alert confirming compliance */}
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-teal-900 leading-relaxed">
                    <strong>Prescription Safety Policy:</strong> In compliance with healthcare standards, medicines are never auto-prescribed using artificial intelligence. All prescriptions require explicit medical review and digital authorization by Dr. {user?.name}.
                  </p>
                </div>

                {/* Prescriptions List */}
                <div className="space-y-4">
                  {appointmentsList.filter((a: any) => a.status === "Completed").length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <Pill className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <h4 className="font-bold text-slate-700">No Prescriptions Issued Yet</h4>
                      <p className="text-xs text-slate-400">Click "New E-Prescription" to issue medication for an authorized patient.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appointmentsList
                        .filter((a: any) => a.status === "Completed")
                        .map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-base">{item.patient}</span>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Digitally Signed</Badge>
                            </div>

                            <p className="text-xs text-slate-500">Date Issued: {item.date}</p>

                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                              <p className="font-semibold text-slate-900">Rx Protocol:</p>
                              <p className="text-slate-600">Standard clinical regimen prescribed for: {item.therapy}</p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Mock printable document structure
                                  setPrescriptionToPrint({
                                    id: `RX-${item.id?.slice(0, 8).toUpperCase()}`,
                                    patient: item.patient,
                                    date: item.date,
                                    medicines: JSON.stringify([
                                      {
                                        name: "Amoxicillin / Clavulanate",
                                        dosage: "625mg",
                                        route: "Oral",
                                        frequency: "1-0-1",
                                        duration: "5 days",
                                        instructions: "After meals"
                                      },
                                      {
                                        name: "Pantoprazole",
                                        dosage: "40mg",
                                        route: "Oral",
                                        frequency: "1-0-0",
                                        duration: "5 days",
                                        instructions: "Before breakfast"
                                      }
                                    ]),
                                    followUpRecommendations: "Review at clinic after 5 days if fever persists.",
                                    notes: "Hydrate adequately and avoid strenuous exertion.",
                                    doctorDetails: {
                                      name: user?.name,
                                      specialization: profileForm.specialization,
                                      qualifications: profileForm.qualifications,
                                      hospitalAffiliation: "CareConnect Central Clinic",
                                      medicalLicenseNumber: profileForm.medicalLicenseNumber,
                                      clinicAddress: profileForm.clinicAddress,
                                    },
                                    patientDetails: item.patientDetails
                                  });
                                  setPrintPrescriptionModalOpen(true);
                                }}
                                className="border-slate-300 text-slate-700 text-xs h-8"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> Printable Document
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 8: AVAILABILITY & SCHEDULE (FEATURE 3) */}
          {activeTab === "availability" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-teal-600" />
                      Availability & Consultation Schedule Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your clinical hours, slot duration, break periods, leave schedules, and daily appointment capacity.
                    </p>
                  </div>

                  <Button
                    onClick={() => updateAvailabilityMutation.mutate(availForm)}
                    disabled={updateAvailabilityMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save Availability Settings
                  </Button>
                </div>

                {/* Working Days Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Working Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                      const isSelected = availForm.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setAvailForm(prev => ({
                              ...prev,
                              workingDays: isSelected
                                ? prev.workingDays.filter(d => d !== day)
                                : [...prev.workingDays, day]
                            }));
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                            isSelected
                              ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consultation Times & Break Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Start Time</Label>
                    <Select value={availForm.startTime} onValueChange={(val) => setAvailForm({ ...availForm, startTime: val })}>
                      <SelectTrigger className="text-xs h-9 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">End Time</Label>
                    <Select value={availForm.endTime} onValueChange={(val) => setAvailForm({ ...availForm, endTime: val })}>
                      <SelectTrigger className="text-xs h-9 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "07:00 PM", "08:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Slot Duration</Label>
                    <Select
                      value={availForm.slotDurationMinutes.toString()}
                      onValueChange={(val) => setAvailForm({ ...availForm, slotDurationMinutes: parseInt(val, 10) })}
                    >
                      <SelectTrigger className="text-xs h-9 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 Minutes</SelectItem>
                        <SelectItem value="20">20 Minutes</SelectItem>
                        <SelectItem value="30">30 Minutes</SelectItem>
                        <SelectItem value="45">45 Minutes</SelectItem>
                        <SelectItem value="60">60 Minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Max Daily Capacity</Label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={availForm.maxDailyAppointments}
                      onChange={(e) => setAvailForm({ ...availForm, maxDailyAppointments: parseInt(e.target.value, 10) || 20 })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>
                </div>

                {/* Break Periods */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-amber-600" /> Break Start Time
                    </Label>
                    <Select value={availForm.breakStartTime} onValueChange={(val) => setAvailForm({ ...availForm, breakStartTime: val })}>
                      <SelectTrigger className="text-xs h-9 border-slate-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-amber-600" /> Break End Time
                    </Label>
                    <Select value={availForm.breakEndTime} onValueChange={(val) => setAvailForm({ ...availForm, breakEndTime: val })}>
                      <SelectTrigger className="text-xs h-9 border-slate-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Leave / Vacation Scheduler */}
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                    <CalendarX className="w-4 h-4 text-rose-600" />
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leave & Holiday Periods</Label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Leave Start Date</Label>
                      <Input
                        type="date"
                        value={availForm.leaveStartDate}
                        onChange={(e) => setAvailForm({ ...availForm, leaveStartDate: e.target.value })}
                        className="text-xs h-9 border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Leave End Date</Label>
                      <Input
                        type="date"
                        value={availForm.leaveEndDate}
                        onChange={(e) => setAvailForm({ ...availForm, leaveEndDate: e.target.value })}
                        className="text-xs h-9 border-slate-300"
                      />
                    </div>
                  </div>
                  {availForm.leaveStartDate && availForm.leaveEndDate && (
                    <p className="text-xs text-rose-600 font-medium">
                      ⚠️ During leave ({availForm.leaveStartDate} to {availForm.leaveEndDate}), all incoming appointment slots will be blocked automatically.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 9: DOCTOR PROFILE (FEATURE 7) */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-teal-600" />
                      Doctor Professional Profile
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage qualifications, medical credentials, clinic address, bio, and patient-facing details.
                    </p>
                  </div>

                  <Button
                    onClick={() => updateProfileMutation.mutate(profileForm)}
                    disabled={updateProfileMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save Profile Details
                  </Button>
                </div>

                {/* Administrative Verification Notice */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">Officially Verified Medical Practitioner</h4>
                      <p className="text-xs text-emerald-800">
                        License #{profileForm.medicalLicenseNumber} is approved by the hospital administrative board.
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold">VERIFIED</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Contact Phone</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Medical Specialization</Label>
                    <Input
                      value={profileForm.specialization}
                      onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                      placeholder="e.g. Cardiology, Internal Medicine"
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Academic Qualifications</Label>
                    <Input
                      value={profileForm.qualifications}
                      onChange={(e) => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                      placeholder="e.g. MBBS, MD, DM"
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Years of Experience</Label>
                    <Input
                      type="number"
                      value={profileForm.experienceYears}
                      onChange={(e) => setProfileForm({ ...profileForm, experienceYears: parseInt(e.target.value, 10) || 0 })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Consultation Fee (₹)</Label>
                    <Input
                      type="number"
                      value={profileForm.consultationFee}
                      onChange={(e) => setProfileForm({ ...profileForm, consultationFee: parseFloat(e.target.value) || 500 })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Clinic / Hospital Suite Address</Label>
                    <Input
                      value={profileForm.clinicAddress}
                      onChange={(e) => setProfileForm({ ...profileForm, clinicAddress: e.target.value })}
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Profile Photo URL</Label>
                    <Input
                      value={profileForm.photoUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, photoUrl: e.target.value })}
                      placeholder="https://..."
                      className="text-xs h-9 border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Professional Biography</Label>
                    <Textarea
                      rows={4}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="text-xs border-slate-300 resize-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 10: NOTIFICATIONS (FEATURE 8) */}
          {activeTab === "notifications" && (() => {
            const rawList: any[] = Array.isArray(notificationsData)
              ? notificationsData
              : notificationsData?.data || [];

            const filteredNotifs = rawList.filter((notif: any) => {
              if (notifStatusFilter === "unread" && notif.read) return false;
              if (notifStatusFilter === "read" && !notif.read) return false;
              if (notifCategoryFilter !== "all" && notif.category !== notifCategoryFilter) return false;
              return true;
            });

            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-teal-600" />
                        Doctor Notifications & Practice Alerts
                        {unreadNotifsCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
                            {unreadNotifsCount} unread
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        New booking requests, patient cancellations, reschedules, and clinical updates.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchNotifications()}
                        className="text-xs border-slate-300"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                      </Button>

                      {unreadNotifsCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await markAllNotificationsRead();
                            refetchNotifications();
                            toast.success("All notifications marked as read");
                          }}
                          className="text-xs border-teal-300 text-teal-700 bg-teal-50/50 hover:bg-teal-100/50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark All as Read
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filter Sub-Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1">
                      {[
                        { id: "all", label: "All" },
                        { id: "appointment", label: "Appointments" },
                        { id: "prescription", label: "Prescriptions" },
                        { id: "account", label: "Account" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setNotifCategoryFilter(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            notifCategoryFilter === cat.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                      {[
                        { id: "all", label: "All" },
                        { id: "unread", label: "Unread" },
                        { id: "read", label: "Read" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setNotifStatusFilter(st.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            notifStatusFilter === st.id
                              ? "bg-teal-600 text-white font-semibold shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="space-y-3">
                    {filteredNotifs.length === 0 ? (
                      <div className="py-16 text-center text-slate-400">
                        <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">No notifications match your filter.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          You're up to date! Real-time alerts will appear automatically.
                        </p>
                      </div>
                    ) : (
                      filteredNotifs.map((notif: any) => {
                        const isUnread = !notif.read;
                        const hasDeepLink = Boolean(notif.link);

                        return (
                          <div
                            key={notif.id}
                            className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                              notif.read
                                ? "bg-white border-slate-200 opacity-80 hover:opacity-100"
                                : "bg-teal-50/40 border-teal-200 shadow-xs"
                            }`}
                          >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  notif.type === "warning"
                                    ? "bg-amber-100 text-amber-800"
                                    : notif.category === "appointment"
                                    ? "bg-teal-100 text-teal-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {notif.category === "appointment" ? (
                                  <CalendarDays className="w-4 h-4" />
                                ) : (
                                  <Bell className="w-4 h-4" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className={`text-sm ${isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                                    {notif.title}
                                  </h5>
                                  {isUnread && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
                                  {notif.category && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {notif.category}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1.5 block">
                                  {new Date(notif.createdAt).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {hasDeepLink && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (isUnread) {
                                      await markNotificationRead(notif.id);
                                      refetchNotifications();
                                    }
                                    if (notif.link.includes("tab=requests")) {
                                      setActiveTab("requests");
                                    } else if (notif.link.includes("tab=appointments")) {
                                      setActiveTab("appointments");
                                    } else if (notif.link.includes("tab=prescriptions")) {
                                      setActiveTab("prescriptions");
                                    } else {
                                      navigate(notif.link);
                                    }
                                  }}
                                  className="text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-100/60 h-8 px-3 rounded-lg font-semibold"
                                >
                                  View Item →
                                </Button>
                              )}

                              {!notif.read ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    await markNotificationRead(notif.id);
                                    refetchNotifications();
                                  }}
                                  className="text-xs text-slate-600 hover:text-slate-900 h-8 px-2.5 rounded-lg border-slate-300"
                                >
                                  Mark Read
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    await markNotificationUnread(notif.id);
                                    refetchNotifications();
                                  }}
                                  className="text-xs text-slate-400 hover:text-slate-700 h-8 px-2.5 rounded-lg"
                                >
                                  Mark Unread
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* TAB 11: SETTINGS */}
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal-600" />
                    Doctor Portal Configuration
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Security credentials, audio notification preferences, and session controls.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Authenticated Doctor Email</h4>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <Badge className="bg-slate-200 text-slate-800">Primary Identity</Badge>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Account Verification</h4>
                      <p className="text-xs text-slate-500">Authorized medical license verified on file.</p>
                    </div>
                    <Badge className="bg-emerald-600 text-white">Verified</Badge>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Portal Theme</h4>
                      <p className="text-xs text-slate-500">Minimal Clinical Navy & Teal Interface</p>
                    </div>
                    <Badge className="bg-teal-600 text-white">Active</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── MODAL: APPOINTMENT DETAILS ─────────────────────────────── */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Appointment Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete clinical booking record from CareConnect database.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-3 py-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-slate-900">{selectedAppointment.patient}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-bold text-teal-700">{selectedAppointment.date} at {selectedAppointment.time}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Consultation Type:</span>
                <span className="font-semibold">{selectedAppointment.consultationType || "In-Person"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Therapy:</span>
                <span>{selectedAppointment.therapy}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-slate-900">{selectedAppointment.status}</span>
              </div>
              {selectedAppointment.notes && (
                <div className="py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium block">Patient Notes:</span>
                  <p className="text-slate-800 italic mt-0.5">"{selectedAppointment.notes}"</p>
                </div>
              )}
              {selectedAppointment.cancelReason && (
                <div className="py-1.5 border-b border-slate-100 text-rose-600">
                  <span className="font-medium block">Cancellation / Rejection Reason:</span>
                  <p className="italic mt-0.5">"{selectedAppointment.cancelReason}"</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button onClick={() => setIsDetailsOpen(false)} className="w-full bg-slate-900 text-white text-xs h-9">
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: REJECT REQUEST & PROPOSE ALTERNATIVE SLOT ─────────── */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Reject Request & Suggest Alternative Time
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide an appropriate reason to notify the patient, and optionally pick an available slot to propose.
            </DialogDescription>
          </DialogHeader>

          {appointmentToReject && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p><strong>Patient:</strong> {appointmentToReject.patient}</p>
                <p><strong>Requested:</strong> {appointmentToReject.date} at {appointmentToReject.time}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="text-xs border-slate-300 resize-none"
                  placeholder="e.g. Doctor is in emergency surgery, slot is reserved..."
                />
              </div>

              {/* Propose alternative slot */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Suggest Alternative Available Slot (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={suggestDate}
                    onChange={(e) => {
                      setSuggestDate(e.target.value);
                      setSuggestedSlot("");
                    }}
                    className="text-xs h-9 border-slate-300 flex-1"
                  />
                </div>

                {suggestDateAvailability?.schedule?.slots && (
                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto mt-2 p-1 border rounded-lg bg-slate-50">
                    {suggestDateAvailability.schedule.slots
                      .filter((s: any) => s.isAvailable)
                      .slice(0, 9)
                      .map((s: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSuggestedSlot(`${suggestDate} at ${s.time}`)}
                          className={`p-1.5 rounded text-xs font-semibold border transition ${
                            suggestedSlot.includes(s.time)
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-teal-50"
                          }`}
                        >
                          {s.time}
                        </button>
                      ))}
                  </div>
                )}

                {suggestedSlot && (
                  <p className="text-xs text-teal-700 font-bold mt-1">
                    ✓ Selected alternative: {suggestedSlot}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              disabled={updateApptMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: RESCHEDULE APPOINTMENT ─────────────────────────── */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-teal-600" />
              Reschedule Clinical Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pick a new date and available slot adhering to practice hours and preventing overlaps.
            </DialogDescription>
          </DialogHeader>

          {appointmentToReschedule && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p><strong>Patient:</strong> {appointmentToReschedule.patient}</p>
                <p><strong>Current:</strong> {appointmentToReschedule.date} at {appointmentToReschedule.time}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">New Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="text-xs h-9 border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Select Available Slot</Label>
                {rescheduleDateAvailability?.schedule?.slots ? (
                  <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 border rounded-lg bg-slate-50">
                    {rescheduleDateAvailability.schedule.slots
                      .filter((s: any) => s.isAvailable)
                      .map((s: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRescheduleTime(s.time)}
                          className={`p-1.5 rounded text-xs font-semibold border transition ${
                            rescheduleTime === s.time
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-teal-50"
                          }`}
                        >
                          {s.time}
                        </button>
                      ))}
                  </div>
                ) : (
                  <Input
                    placeholder="e.g. 10:00 AM"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="text-xs h-9 border-slate-300"
                  />
                )}
                {rescheduleTime && (
                  <p className="text-xs text-teal-700 font-bold">Selected: {rescheduleTime}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={updateApptMutation.isPending || !rescheduleTime}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CANCEL APPOINTMENT ──────────────────────────────── */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg text-rose-600 flex items-center gap-2">
              <X className="w-5 h-5 text-rose-600" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide an appropriate reason for cancelling this appointment.
            </DialogDescription>
          </DialogHeader>

          {appointmentToCancel && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p><strong>Patient:</strong> {appointmentToCancel.patient}</p>
                <p><strong>Date:</strong> {appointmentToCancel.date} at {appointmentToCancel.time}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Cancellation Reason</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="text-xs border-slate-300 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} className="text-xs h-9">
              Back
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={updateApptMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CLINICAL CONSULTATION WORKSPACE (FEATURE 5) ───────── */}
      <Dialog open={consultationModalOpen} onOpenChange={setConsultationModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Clinical Consultation Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record diagnosis, observations, treatment protocols, and follow-up recommendations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Patient selector if not preselected */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Patient</Label>
                {consultationForm.patientName ? (
                  <Input value={consultationForm.patientName} readOnly className="text-xs h-9 bg-slate-50 font-bold" />
                ) : (
                  <Select
                    value={consultationForm.patientId}
                    onValueChange={(val) => {
                      const p = (patientsData as any[]).find(x => x.id === val);
                      setConsultationForm({ ...consultationForm, patientId: val, patientName: p ? p.name : "" });
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 border-slate-300">
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(patientsData as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Follow-Up Date</Label>
                <Input
                  type="date"
                  value={consultationForm.followUpDate}
                  onChange={(e) => setConsultationForm({ ...consultationForm, followUpDate: e.target.value })}
                  className="text-xs h-9 border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Chief Complaint</Label>
              <Input
                placeholder="e.g. Recurrent retrosternal chest pain on exertion for 3 days"
                value={consultationForm.chiefComplaint}
                onChange={(e) => setConsultationForm({ ...consultationForm, chiefComplaint: e.target.value })}
                className="text-xs h-9 border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Clinical Observations & Vitals</Label>
              <Textarea
                placeholder="e.g. BP: 128/82 mmHg, HR: 74 bpm regular, SpO2: 98% on room air. S1 S2 heard, clear breath sounds bilaterally..."
                value={consultationForm.observations}
                onChange={(e) => setConsultationForm({ ...consultationForm, observations: e.target.value })}
                rows={2}
                className="text-xs border-slate-300 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Primary Clinical Diagnosis</Label>
              <Input
                placeholder="e.g. Atypical Angina Pectoris / Musculoskeletal Chest Discomfort"
                value={consultationForm.diagnosis}
                onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                className="text-xs h-9 border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Treatment Plan & Medical Protocols</Label>
              <Textarea
                placeholder="e.g. Prescribe mild vasodilator therapy, order baseline 12-lead ECG and lipid panel. Low sodium diet, light cardiovascular exercise..."
                value={consultationForm.treatmentPlan}
                onChange={(e) => setConsultationForm({ ...consultationForm, treatmentPlan: e.target.value })}
                rows={3}
                className="text-xs border-slate-300 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-bold text-slate-700">State:</span>
              <button
                type="button"
                onClick={() => setConsultationForm({ ...consultationForm, status: "Finalized" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  consultationForm.status === "Finalized"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Finalized Consultation
              </button>
              <button
                type="button"
                onClick={() => setConsultationForm({ ...consultationForm, status: "Draft" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  consultationForm.status === "Draft"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Save as Draft
              </button>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConsultationModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!consultationForm.patientId) {
                  toast.error("Please specify a patient for this consultation");
                  return;
                }
                createConsultationMutation.mutate(consultationForm);
              }}
              disabled={createConsultationMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9"
            >
              {consultationForm.status === "Finalized" ? "Sign & Finalize Record" : "Save Consultation Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PRESCRIPTION BUILDER (FEATURE 6) ────────────────── */}
      <Dialog open={prescriptionModalOpen} onOpenChange={setPrescriptionModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-white rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              Write E-Prescription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Prescribe medication protocols with dosage, route, frequency, and instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Patient Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Patient</Label>
                {prescriptionForm.patientName ? (
                  <Input value={prescriptionForm.patientName} readOnly className="text-xs h-9 bg-slate-50 font-bold" />
                ) : (
                  <Select
                    value={prescriptionForm.patientId}
                    onValueChange={(val) => {
                      const p = (patientsData as any[]).find(x => x.id === val);
                      setPrescriptionForm({ ...prescriptionForm, patientId: val, patientName: p ? p.name : "" });
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 border-slate-300">
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(patientsData as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Issue Date</Label>
                <Input
                  type="date"
                  value={prescriptionForm.date}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, date: e.target.value })}
                  className="text-xs h-9 border-slate-300"
                />
              </div>
            </div>

            {/* Medication Items List */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prescribed Medications ({prescriptionForm.medicines.length})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddMedicationRow}
                  className="text-xs h-7 border-teal-300 text-teal-800 hover:bg-teal-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
                </Button>
              </div>

              {prescriptionForm.medicines.map((med, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-teal-800 text-xs">Medication #{idx + 1}</span>
                    {prescriptionForm.medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicationRow(idx)}
                        className="text-rose-600 hover:text-rose-700 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Medication Name</Label>
                      <Input
                        placeholder="e.g. Paracetamol, Amoxicillin"
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].name = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                        className="text-xs h-8 bg-white border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Dosage</Label>
                      <Input
                        placeholder="e.g. 500mg, 10ml, 1 tab"
                        value={med.dosage}
                        onChange={(e) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].dosage = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                        className="text-xs h-8 bg-white border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Route</Label>
                      <Select
                        value={med.route}
                        onValueChange={(val) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].route = val;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                      >
                        <SelectTrigger className="text-xs h-8 bg-white border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Oral", "Topical", "Inhalation", "Intravenous (IV)", "Sublingual", "Intramuscular (IM)"].map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Frequency</Label>
                      <Input
                        placeholder="e.g. 1-0-1, Once daily, SOS"
                        value={med.frequency}
                        onChange={(e) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].frequency = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                        className="text-xs h-8 bg-white border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Duration</Label>
                      <Input
                        placeholder="e.g. 5 days, 14 days, 1 month"
                        value={med.duration}
                        onChange={(e) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].duration = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                        className="text-xs h-8 bg-white border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Instructions</Label>
                      <Input
                        placeholder="e.g. After food with warm water"
                        value={med.instructions}
                        onChange={(e) => {
                          const updated = [...prescriptionForm.medicines];
                          updated[idx].instructions = e.target.value;
                          setPrescriptionForm({ ...prescriptionForm, medicines: updated });
                        }}
                        className="text-xs h-8 bg-white border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-700">Follow-Up Recommendations & Precautions</Label>
              <Textarea
                placeholder="e.g. Return to clinic if fever persists beyond 3 days. Avoid driving after medication..."
                value={prescriptionForm.followUpRecommendations}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, followUpRecommendations: e.target.value })}
                rows={2}
                className="text-xs border-slate-300 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPrescriptionModalOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!prescriptionForm.patientId) {
                  toast.error("Please specify a patient");
                  return;
                }
                createPrescriptionMutation.mutate({ ...prescriptionForm, isFinalized: false });
              }}
              disabled={createPrescriptionMutation.isPending}
              className="text-xs h-9 border-amber-300 text-amber-800"
            >
              Save Draft
            </Button>
            <Button
              onClick={() => {
                if (!prescriptionForm.patientId) {
                  toast.error("Please specify a patient");
                  return;
                }
                if (prescriptionForm.medicines.some(m => !m.name)) {
                  toast.error("Please provide a name for all prescribed medications");
                  return;
                }
                createPrescriptionMutation.mutate({ ...prescriptionForm, isFinalized: true });
              }}
              disabled={createPrescriptionMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9"
            >
              Finalize & Sign E-Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PRINTABLE OFFICIAL PRESCRIPTION DOCUMENT ─────────── */}
      <Dialog open={printPrescriptionModalOpen} onOpenChange={setPrintPrescriptionModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center justify-between">
              <span>Official Printable Prescription</span>
              <Button onClick={triggerBrowserPrint} className="bg-teal-600 text-white font-bold text-xs h-8">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {prescriptionToPrint && (
            <div className="p-8 border-2 border-slate-300 rounded-2xl bg-white text-slate-900 space-y-6 print:border-none print:p-0">
              {/* Clinic & Doctor Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-950 tracking-tight">CARECONNECT HEALTH SYSTEM</h3>
                  <p className="text-xs text-slate-600 font-semibold">{prescriptionToPrint.doctorDetails?.clinicAddress || profileForm.clinicAddress}</p>
                  <p className="text-xs text-slate-500">Emergency Contact: +1 (800) CARE-911 • portal.careconnect.health</p>
                </div>
                <div className="text-right">
                  <h4 className="font-extrabold text-base text-teal-800">Dr. {prescriptionToPrint.doctorDetails?.name || user?.name}</h4>
                  <p className="text-xs font-semibold text-slate-700">{prescriptionToPrint.doctorDetails?.qualifications || profileForm.qualifications}</p>
                  <p className="text-xs text-slate-600">{prescriptionToPrint.doctorDetails?.specialization || profileForm.specialization}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">Reg. License: {prescriptionToPrint.doctorDetails?.medicalLicenseNumber || profileForm.medicalLicenseNumber}</p>
                </div>
              </div>

              {/* Patient Demographics Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Patient Name:</span>
                  <strong className="text-slate-950 text-sm">{prescriptionToPrint.patient}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Issue Date:</span>
                  <strong className="text-slate-900">{prescriptionToPrint.date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Prescription ID:</span>
                  <strong className="text-slate-900 font-mono">{prescriptionToPrint.id || "RX-OFFICIAL-2026"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Verification:</span>
                  <strong className="text-emerald-700">Digital Authenticated</strong>
                </div>
              </div>

              {/* Rx Symbol & Medication Table */}
              <div className="space-y-3">
                <div className="text-3xl font-black text-teal-700 font-serif">℞</div>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-700">
                      <th className="p-2.5">Medication Name</th>
                      <th className="p-2.5">Dosage</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5">Frequency</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Special Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {(() => {
                      let meds = [];
                      try {
                        meds = typeof prescriptionToPrint.medicines === "string"
                          ? JSON.parse(prescriptionToPrint.medicines)
                          : prescriptionToPrint.medicines || [];
                      } catch {
                        meds = [];
                      }
                      return meds.map((m: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold text-slate-950">{m.name}</td>
                          <td className="p-2.5">{m.dosage}</td>
                          <td className="p-2.5">{m.route}</td>
                          <td className="p-2.5 font-semibold text-teal-800">{m.frequency}</td>
                          <td className="p-2.5">{m.duration}</td>
                          <td className="p-2.5 text-slate-600">{m.instructions}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Clinical Instructions */}
              {prescriptionToPrint.followUpRecommendations && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-900 block mb-0.5">Clinical Instructions & Follow-up:</strong>
                  <p className="text-slate-700 leading-relaxed">{prescriptionToPrint.followUpRecommendations}</p>
                </div>
              )}

              {/* Signature Block */}
              <div className="flex items-end justify-between border-t-2 border-slate-900 pt-6 mt-8">
                <div className="text-[11px] text-slate-500 max-w-sm space-y-1">
                  <p className="font-semibold text-slate-700">Official Clinical Record</p>
                  <p>Certified under standard health authority regulations. Non-transferable.</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="w-48 border-b border-slate-400 pb-1 font-serif italic text-teal-800 text-sm text-center">
                    Dr. {prescriptionToPrint.doctorDetails?.name || user?.name}
                  </div>
                  <p className="text-xs font-bold text-slate-900">Authorized Medical Signature</p>
                  <p className="text-[10px] text-slate-400 font-mono">Timestamp: {new Date().toISOString()}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button onClick={() => setPrintPrescriptionModalOpen(false)} className="bg-slate-900 text-white text-xs h-9">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: PATIENT FULL CLINICAL FILE (FEATURE 4) ──────────── */}
      <Dialog open={patientDetailModalOpen} onOpenChange={setPatientDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              Patient Clinical History File
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              HIPAA & CareConnect authorized care relationship history.
            </DialogDescription>
          </DialogHeader>

          {patientDetailLoading ? (
            <div className="py-12 text-center text-slate-400">Loading clinical file...</div>
          ) : patientDetailData?.patient ? (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500">Full Name:</span>
                  <p className="font-bold text-slate-900 text-sm">{patientDetailData.patient.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Age & Gender:</span>
                  <p className="font-bold text-slate-900">{patientDetailData.patient.age} years • {patientDetailData.patient.gender}</p>
                </div>
                <div>
                  <span className="text-slate-500">Blood Group:</span>
                  <p className="font-bold text-rose-600">{patientDetailData.patient.bloodGroup || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Contact:</span>
                  <p className="font-medium text-slate-800">{patientDetailData.patient.phone || patientDetailData.patient.email}</p>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block">Reported Allergies:</span>
                <p className="text-slate-700">{patientDetailData.patient.allergies || "None on record."}</p>
              </div>

              <div className="space-y-1 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block">General Medical History:</span>
                <p className="text-slate-700">{patientDetailData.patient.medicalHistory || "None on record."}</p>
              </div>

              {/* Past Visits with this Doctor */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Authorized Consultations with Dr. {user?.name} ({patientDetailData.appointments?.length || 0})
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {patientDetailData.appointments?.map((appt: any) => (
                    <div key={appt.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{appt.date} at {appt.time}</span>
                        <p className="text-slate-600">{appt.therapy}</p>
                      </div>
                      <Badge className={appt.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                        {appt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setPatientDetailModalOpen(false)} className="bg-slate-900 text-white text-xs h-9">
              Close File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
