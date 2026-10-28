import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Stethoscope,
  CalendarPlus,
  Calendar,
  FileText,
  Pill,
  Bell,
  User,
  Settings,
  LogOut,
  HeartPulse,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Upload,
  Download,
  Printer,
  Trash2,
  Calendar as CalendarIcon,
  Video,
  Building2,
  Award,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Plus,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
  Check,
  Eye,
  Activity,
  FileCheck2,
  Clock3,
  CalendarDays,
  RefreshCw,
  SlidersHorizontal,
  FileDown
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
  createAppointment,
  updateAppointment,
  fetchDoctors,
  fetchDoctorAvailability,
  fetchPrescriptions,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchMedicalRecords,
  createMedicalRecord,
  deleteMedicalRecord,
  fetchPatientProfile,
  updatePatientProfile
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────
type TabType =
  | "overview"
  | "doctors"
  | "book"
  | "appointments"
  | "records"
  | "prescriptions"
  | "notifications"
  | "profile"
  | "settings";

interface DoctorUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  doctorProfile?: {
    id: string;
    specialization: string;
    qualifications: string;
    experienceYears: number;
    hospitalAffiliation?: string | null;
    medicalLicenseNumber: string;
    consultationFee: number;
    verificationStatus: string;
  } | null;
}

interface AppointmentItem {
  id: string;
  patient: string;
  patientId: string;
  doctorId?: string | null;
  doctor?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    specialization: string;
    qualifications: string;
    hospitalAffiliation: string;
    consultationFee: number;
  } | null;
  therapy: string;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  cancelReason?: string | null;
  amount?: number;
  createdAt?: string;
}

interface PrescriptionItem {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  medicines: string; // JSON string or text
  status: string;
  createdAt?: string;
}

interface MedicalRecordItem {
  id: string;
  patientId: string;
  doctorId?: string | null;
  recordType: string;
  title: string;
  description: string;
  diagnosis?: string | null;
  attachments?: string | null;
  recordDate: string;
  createdAt: string;
  doctor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// ── Available Time Slots ──────────────────────────────────────────
const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:30 AM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
];

export default function PatientDashboardPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // ── 1. Backend Data Queries ──────────────────────────────────────
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments
  } = useQuery<AppointmentItem[]>({
    queryKey: ["patientAppointments"],
    queryFn: fetchAppointments,
    refetchInterval: 5000,
  });

  const {
    data: doctors = [],
    isLoading: isLoadingDoctors
  } = useQuery<DoctorUser[]>({
    queryKey: ["verifiedDoctors"],
    queryFn: fetchDoctors,
  });

  const {
    data: prescriptions = [],
    isLoading: isLoadingPrescriptions
  } = useQuery<PrescriptionItem[]>({
    queryKey: ["patientPrescriptions"],
    queryFn: fetchPrescriptions,
  });

  const {
    data: records = [],
    isLoading: isLoadingRecords,
    refetch: refetchRecords
  } = useQuery<MedicalRecordItem[]>({
    queryKey: ["patientMedicalRecords"],
    queryFn: () => fetchMedicalRecords(),
  });

  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications
  } = useQuery<NotificationItem[]>({
    queryKey: ["patientNotifications"],
    queryFn: fetchNotifications,
  });

  const {
    data: profileData,
    isLoading: isLoadingProfile,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ["patientProfile"],
    queryFn: fetchPatientProfile,
  });

  // ── Real-time Socket Event Handlers ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleApptUpdate = () => {
      refetchAppointments();
      refetchNotifications();
    };

    socket.on("appointmentCreated", handleApptUpdate);
    socket.on("appointmentUpdated", handleApptUpdate);
    socket.on("appointmentDeleted", handleApptUpdate);
    socket.on("notificationCreated", () => refetchNotifications());
    socket.on("notificationsAllRead", () => refetchNotifications());

    return () => {
      socket.off("appointmentCreated", handleApptUpdate);
      socket.off("appointmentUpdated", handleApptUpdate);
      socket.off("appointmentDeleted", handleApptUpdate);
      socket.off("notificationCreated");
      socket.off("notificationsAllRead");
    };
  }, [socket, refetchAppointments, refetchNotifications]);

  // ── Derived Filtered Data ────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const upcomingAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return appointments
      .filter((a) => (a.status === "Scheduled" || a.status === "Rescheduled") && a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0] || null;

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === "Pending" || a.status === "Cancel Requested"),
    [appointments]
  );

  // ── FEATURE 1: FIND DOCTORS STATE ────────────────────────────────
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("all");
  const [selectedConsultationType, setSelectedConsultationType] = useState<string>("all");
  const [viewingDoctorProfile, setViewingDoctorProfile] = useState<DoctorUser | null>(null);

  const specializationsList = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.doctorProfile?.specialization) {
        set.add(d.doctorProfile.specialization);
      }
    });
    return Array.from(set);
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const nameMatch = doc.name.toLowerCase().includes(doctorSearch.toLowerCase());
      const specMatch = doc.doctorProfile?.specialization
        ?.toLowerCase()
        .includes(doctorSearch.toLowerCase());
      const queryMatch = nameMatch || specMatch;

      const specFilter =
        selectedSpecialization === "all" ||
        doc.doctorProfile?.specialization === selectedSpecialization;

      return queryMatch && specFilter;
    });
  }, [doctors, doctorSearch, selectedSpecialization]);

  // ── FEATURE 2: BOOKING WORKFLOW STATE ────────────────────────────
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [bookingDoctorId, setBookingDoctorId] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingConsultType, setBookingConsultType] = useState<"In-Person Clinic Visit" | "Online Video Consult">("In-Person Clinic Visit");
  const [bookingReason, setBookingReason] = useState<string>("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Auto-init minimum date to today
  const minBookingDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Pre-select doctor when redirected from Find Doctors
  const handleSelectDoctorForBooking = (doc: DoctorUser) => {
    setBookingDoctorId(doc.id);
    setBookingStep(2);
    setActiveTab("book");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedBookingDoctor = useMemo(() => {
    return doctors.find((d) => d.id === bookingDoctorId) || null;
  }, [doctors, bookingDoctorId]);

  // Retrieve the doctor's actual availability from server
  const {
    data: doctorAvailabilityData,
    isLoading: isLoadingDoctorAvailability,
    refetch: refetchDoctorAvailability
  } = useQuery({
    queryKey: ["patientBookingDoctorAvailability", bookingDoctorId, bookingDate],
    queryFn: () => fetchDoctorAvailability(bookingDate, bookingDoctorId),
    enabled: Boolean(bookingDoctorId && bookingDate),
  });

  // Calculate unavailable time slots for the chosen doctor & date
  const bookedSlotsForSelectedDay = useMemo(() => {
    if (doctorAvailabilityData?.schedule?.slots) {
      return doctorAvailabilityData.schedule.slots
        .filter((s: any) => !s.isAvailable)
        .map((s: any) => s.time);
    }
    if (!bookingDoctorId || !bookingDate) return [];
    return appointments
      .filter(
        (a) =>
          a.doctorId === bookingDoctorId &&
          a.date === bookingDate &&
          a.status !== "Cancelled" &&
          a.status !== "Rejected"
      )
      .map((a) => a.time);
  }, [doctorAvailabilityData, appointments, bookingDoctorId, bookingDate]);

  const handleConfirmBooking = async () => {
    if (!bookingDoctorId) {
      toast.error("Please select a doctor.");
      setBookingStep(1);
      return;
    }
    if (!bookingDate) {
      toast.error("Please select an appointment date.");
      setBookingStep(2);
      return;
    }
    if (!bookingTime) {
      toast.error("Please select an appointment time slot.");
      setBookingStep(3);
      return;
    }
    if (!bookingReason.trim()) {
      toast.error("Please describe your consultation reason or symptoms.");
      setBookingStep(5);
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const therapyTitle = `${bookingConsultType}: ${bookingReason.slice(0, 45)}`;
      await createAppointment({
        doctorId: bookingDoctorId,
        patientName: user?.name || "CareConnect Patient",
        patientPhone: user?.phone || profileData?.patient?.phone || "",
        patientAge: profileData?.patient?.age || 30,
        patientGender: profileData?.patient?.gender || "Not specified",
        therapy: therapyTitle,
        date: bookingDate,
        time: bookingTime,
        notes: bookingReason,
        amount: selectedBookingDoctor?.doctorProfile?.consultationFee || 500,
        status: "Pending",
      });

      toast.success("Appointment Request Submitted!", {
        description: `Your request with ${selectedBookingDoctor?.name || "the doctor"} on ${bookingDate} at ${bookingTime} is pending confirmation.`,
      });

      // Reset booking wizard
      setBookingStep(1);
      setBookingDoctorId("");
      setBookingDate("");
      setBookingTime("");
      setBookingReason("");
      queryClient.invalidateQueries({ queryKey: ["patientAppointments"] });
      setActiveTab("appointments");
    } catch (err: any) {
      toast.error("Booking Error", { description: err.message });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // ── FEATURE 3: MY APPOINTMENTS STATE ─────────────────────────────
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "pending" | "completed" | "cancelled">("all");
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<AppointmentItem | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentItem | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [reschedulingAppointment, setReschedulingAppointment] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return appointments.filter((a) => {
      if (appointmentFilter === "upcoming") {
        return (a.status === "Scheduled" || a.status === "Rescheduled") && a.date >= todayStr;
      }
      if (appointmentFilter === "pending") {
        return a.status === "Pending" || a.status === "Cancel Requested";
      }
      if (appointmentFilter === "completed") {
        return a.status === "Completed";
      }
      if (appointmentFilter === "cancelled") {
        return a.status === "Cancelled" || a.status === "Rejected";
      }
      return true;
    });
  }, [appointments, appointmentFilter]);

  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;
    setIsSubmittingCancel(true);
    try {
      await updateAppointment(cancellingAppointment.id, {
        status: "Cancelled",
        cancelReason: cancelReasonInput.trim() || "Patient requested cancellation",
      });
      toast.success("Appointment Cancelled", {
        description: "Your appointment has been cancelled successfully.",
      });
      setCancellingAppointment(null);
      setCancelReasonInput("");
      refetchAppointments();
    } catch (err: any) {
      toast.error("Cancellation Failed", { description: err.message });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingAppointment) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Please select a new date and time.");
      return;
    }
    setIsSubmittingReschedule(true);
    try {
      await updateAppointment(reschedulingAppointment.id, {
        date: rescheduleDate,
        time: rescheduleTime,
        status: "Rescheduled",
        notes: `Rescheduled by patient on ${new Date().toLocaleDateString()}`,
      });
      toast.success("Appointment Rescheduled!", {
        description: `Updated to ${rescheduleDate} at ${rescheduleTime}.`,
      });
      setReschedulingAppointment(null);
      setRescheduleDate("");
      setRescheduleTime("");
      refetchAppointments();
    } catch (err: any) {
      toast.error("Reschedule Failed", { description: err.message });
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // ── FEATURE 4: MEDICAL RECORDS STATE ─────────────────────────────
  const [recordCategoryFilter, setRecordCategoryFilter] = useState<string>("all");
  const [showUploadRecordModal, setShowUploadRecordModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("Lab Report");
  const [uploadDiagnosis, setUploadDiagnosis] = useState("");
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploadFile, setUploadFile] = useState<{ name: string; size: string; dataUrl: string } | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecordItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRecords = useMemo(() => {
    if (recordCategoryFilter === "all") return records;
    return records.filter((r) => r.recordType.toLowerCase() === recordCategoryFilter.toLowerCase());
  }, [records, recordCategoryFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeded", { description: "Maximum document size allowed is 10 MB." });
      return;
    }

    // Validate extension
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type", { description: "Please upload a PDF document or JPG/PNG image." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: reader.result as string,
      });
      toast.success("Document attached ready for secure upload.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    setIsSavingRecord(true);
    try {
      await createMedicalRecord({
        title: uploadTitle.trim(),
        recordType: uploadType,
        diagnosis: uploadDiagnosis.trim() || undefined,
        recordDate: uploadDate,
        attachments: uploadFile ? [uploadFile] : null,
      });

      toast.success("Medical Record Uploaded", {
        description: "Your document is saved securely in your clinical chart.",
      });

      setShowUploadRecordModal(false);
      setUploadTitle("");
      setUploadDiagnosis("");
      setUploadFile(null);
      refetchRecords();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteMedicalRecord(id);
      toast.success("Medical document removed.");
      refetchRecords();
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  const downloadFileUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || "CareConnect_Medical_Record";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded: ${filename}`);
  };

  // ── FEATURE 5: PRESCRIPTIONS STATE ───────────────────────────────
  const [viewingPrescription, setViewingPrescription] = useState<PrescriptionItem | null>(null);

  const parsePrescriptionMedicines = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [{ name: raw, dosage: "As advised", freq: "Daily", duration: "7 days" }];
    } catch {
      return [{ name: raw, dosage: "As advised", freq: "Daily", duration: "7 days" }];
    }
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  // ── FEATURE 6: PATIENT PROFILE STATE ─────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAge, setProfileAge] = useState("30");
  const [profileGender, setProfileGender] = useState("Male");
  const [profileBloodGroup, setProfileBloodGroup] = useState("O+");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileEmergency, setProfileEmergency] = useState("");
  const [profileAllergies, setProfileAllergies] = useState("");
  const [profileHistory, setProfileHistory] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (profileData?.patient) {
      const p = profileData.patient;
      setProfileName(p.name || user?.name || "");
      setProfilePhone(p.phone || user?.phone || "");
      setProfileAge(p.age?.toString() || "30");
      setProfileGender(p.gender || "Not specified");
      setProfileBloodGroup(p.bloodGroup || "O+");
      setProfileAddress(p.address || "");
      setProfileEmergency(p.emergencyContact || "");
      setProfileAllergies(p.allergies || "");
      setProfileHistory(p.medicalHistory || "");
    } else if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
    }
  }, [profileData, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    setIsSavingProfile(true);
    try {
      await updatePatientProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        age: parseInt(profileAge, 10) || 30,
        gender: profileGender,
        bloodGroup: profileBloodGroup,
        address: profileAddress.trim(),
        emergencyContact: profileEmergency.trim(),
        allergies: profileAllergies.trim(),
        medicalHistory: profileHistory.trim(),
      });

      toast.success("Profile Updated Successfully", {
        description: "Your personal and health profile records are up to date.",
      });
      refetchProfile();
    } catch (err: any) {
      toast.error("Profile update error", { description: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── FEATURE 7: NOTIFICATIONS STATE ───────────────────────────────
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, notificationFilter]);

  const handleMarkNotification = async (id: string) => {
    try {
      await markNotificationRead(id);
      refetchNotifications();
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await markAllNotificationsRead();
      toast.success("All notifications marked as read.");
      refetchNotifications();
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  // ── FEATURE 9: SETTINGS PREFERENCES STATE ────────────────────────
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [telehealthAutoAccept, setTelehealthAutoAccept] = useState(true);

  // ── Navigation Items List (Exact 10 items) ────────────────────────
  const NAV_ITEMS = [
    { id: "overview" as TabType, label: "Overview", icon: LayoutDashboard },
    { id: "doctors" as TabType, label: "Find Doctors", icon: Stethoscope },
    { id: "book" as TabType, label: "Book Appointment", icon: CalendarPlus },
    {
      id: "appointments" as TabType,
      label: "My Appointments",
      icon: Calendar,
      badge: upcomingAppointments.length ? upcomingAppointments.length : undefined,
    },
    { id: "records" as TabType, label: "Medical Records", icon: FileText },
    { id: "prescriptions" as TabType, label: "Prescriptions", icon: Pill },
    {
      id: "notifications" as TabType,
      label: "Notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: "profile" as TabType, label: "My Profile", icon: User },
    { id: "settings" as TabType, label: "Settings", icon: Settings },
  ];

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row font-body selection:bg-blue-100 selection:text-blue-900">

      {/* ════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (Clean Blue-and-White theme)
      ════════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200/80 p-6 sticky top-0 h-screen z-30 shadow-[1px_0_12px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-8 pb-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-xl text-slate-900 tracking-tight">CareConnect</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patient Care Portal</p>
          </div>
        </div>

        {/* 10 Sidebar Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100/80"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <Badge
                    className={`text-[10px] px-2 py-0.5 font-black rounded-full ${
                      isActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* 10. Logout Button */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50/70 transition-all mt-4 pt-3 border-t border-slate-100"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </nav>

        {/* Sidebar Patient Profile Snippet */}
        <div className="pt-4 mt-auto border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                {user?.name?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{user?.name || "Patient"}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">{user?.email || "patient@careconnect.com"}</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-1.5 py-0.5 shrink-0">
              Active
            </Badge>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE TOPBAR & DRAWER NAVIGATION
      ════════════════════════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-black text-lg text-slate-900 tracking-tight leading-none">CareConnect</span>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mt-0.5">Patient Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("notifications")}
            className="relative w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 flex flex-col shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <span className="font-heading font-black text-lg text-slate-900">CareConnect</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowLogoutDialog(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">

        {/* Top Header Bar for Desktop */}
        <div className="hidden md:flex items-center justify-between px-10 py-5 bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight capitalize">
              {activeTab === "overview"
                ? "Patient Health Hub"
                : activeTab === "doctors"
                ? "Find Accredited Clinicians"
                : activeTab === "book"
                ? "Book a Consultation"
                : activeTab === "appointments"
                ? "My Appointments"
                : activeTab === "records"
                ? "Medical & Lab Records"
                : activeTab === "prescriptions"
                ? "Doctor Prescriptions"
                : activeTab === "notifications"
                ? "Health Notifications"
                : activeTab === "profile"
                ? "Patient Profile"
                : "Portal Preferences"}
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Secure HIPAA Compliant • ID #{user?.id?.slice(0, 8).toUpperCase() || "PATIENT"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick emergency indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold">
              <Phone className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Emergency 24/7: <strong>911 / 108</strong></span>
            </div>

            {/* Notifications Shortcut */}
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Quick Action: Book Appointment Button */}
            {activeTab !== "book" && (
              <Button
                onClick={() => {
                  setBookingStep(1);
                  setActiveTab("book");
                }}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Book Appointment</span>
              </Button>
            )}
          </div>
        </div>

        {/* Container for Active Views */}
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8">

          {/* ════════════════════════════════════════════════════════════
              VIEW 1: PATIENT DASHBOARD OVERVIEW
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Personalized Greeting Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 p-8 sm:p-10 text-white shadow-xl shadow-blue-600/10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10 max-w-2xl">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 text-[10px] font-black uppercase tracking-wider mb-3">
                    CareConnect Patient Hub
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                    {greeting}, {user?.name || "Patient"}! 👋
                  </h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-2 font-medium leading-relaxed">
                    Your health dashboard is active. You have{" "}
                    <strong>{upcomingAppointments.length} upcoming consultation{upcomingAppointments.length === 1 ? "" : "s"}</strong> and{" "}
                    <strong>{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</strong>.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <Button
                      onClick={() => setActiveTab("book")}
                      className="bg-white text-blue-700 hover:bg-blue-50 font-black text-xs rounded-xl h-11 px-5 shadow-lg shadow-black/10 flex items-center gap-2"
                    >
                      <CalendarPlus className="w-4 h-4" /> Schedule Visit
                    </Button>
                    <Button
                      onClick={() => setActiveTab("doctors")}
                      variant="outline"
                      className="border-white/30 text-black hover:bg-white/10 font-bold text-xs rounded-xl h-11 px-5 backdrop-blur-sm"
                    >
                      <Stethoscope className="w-4 h-4 mr-2" /> Find a Doctor
                    </Button>
                  </div>
                </div>
              </div>

              {/* Patient Profile Summary Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                    {user?.name?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-black text-lg text-slate-900">{profileData?.patient?.name || user?.name || "Patient"}</h3>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase">
                        Verified Patient
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {profileData?.patient?.gender || "Not specified"} • {profileData?.patient?.age || 30} Years Old
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                    <p className="text-base font-black text-rose-600 mt-0.5 flex items-center justify-center gap-1">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      {profileData?.patient?.bloodGroup || "O+"}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                    <p className="text-xs font-black text-slate-700 mt-1 truncate max-w-[120px]">
                      {profileData?.patient?.phone || user?.phone || "Not set"}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Contact</p>
                    <p className="text-xs font-black text-slate-700 mt-1 truncate max-w-[120px]">
                      {profileData?.patient?.emergencyContact || "None"}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Known Allergies</p>
                    <p className="text-xs font-black text-amber-600 mt-1 truncate max-w-[120px]">
                      {profileData?.patient?.allergies || "None logged"}
                    </p>
                  </div>
                </div>
              </div>

              {/* KPI Statistics Row (Real Data) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div
                  onClick={() => setActiveTab("appointments")}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <Badge className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase">Upcoming</Badge>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-4">{upcomingAppointments.length}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Confirmed Consultations</p>
                </div>

                <div
                  onClick={() => setActiveTab("appointments")}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                    <Badge className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase">Pending</Badge>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-4">{pendingAppointments.length}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Pending Confirmation</p>
                </div>

                <div
                  onClick={() => setActiveTab("prescriptions")}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Pill className="w-5 h-5" />
                    </div>
                    <Badge className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase">Rx Ready</Badge>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-4">{prescriptions.length}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Active Prescriptions</p>
                </div>

                <div
                  onClick={() => setActiveTab("records")}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">EMR</Badge>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-4">{records.length}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Medical Documents</p>
                </div>
              </div>

              {/* Spotlight: Next Upcoming Appointment */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-lg text-slate-900">Next Upcoming Appointment</h3>
                      <p className="text-xs font-bold text-slate-400">Closest scheduled clinical consultation</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setActiveTab("appointments")}
                    variant="ghost"
                    className="text-blue-600 font-bold text-xs hover:bg-blue-50"
                  >
                    View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                {nextAppointment ? (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border border-blue-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0 font-black">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-black text-base text-slate-900">
                            {nextAppointment.doctor?.name || "CareConnect Clinician"}
                          </h4>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                            {nextAppointment.status}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                          {nextAppointment.doctor?.specialization || "General Medicine"} • {nextAppointment.doctor?.hospitalAffiliation || "CareConnect Clinic"}
                        </p>
                        <p className="text-xs font-medium text-slate-600 mt-2 bg-white/80 rounded-xl px-3 py-1.5 inline-block border border-blue-100">
                          <strong>Reason:</strong> {nextAppointment.notes || nextAppointment.therapy}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                      <div className="bg-white rounded-2xl px-5 py-3 border border-blue-100 text-left sm:text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date & Slot</p>
                        <p className="text-sm font-black text-slate-900">{nextAppointment.date}</p>
                        <p className="text-xs font-bold text-blue-600">{nextAppointment.time}</p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => {
                            setSelectedAppointmentDetails(nextAppointment);
                          }}
                          variant="outline"
                          className="flex-1 sm:flex-none rounded-xl text-xs font-bold h-11"
                        >
                          Details
                        </Button>
                        <Button
                          onClick={() => {
                            setReschedulingAppointment(nextAppointment);
                            setRescheduleDate(nextAppointment.date);
                            setRescheduleTime(nextAppointment.time);
                          }}
                          className="flex-1 sm:flex-none rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-11"
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No upcoming appointments scheduled</p>
                    <p className="text-xs text-slate-400 mt-0.5">Need a checkup or medical advice? Book a slot with our accredited specialists.</p>
                    <Button
                      onClick={() => setActiveTab("book")}
                      className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Book an Appointment
                    </Button>
                  </div>
                )}
              </div>

              {/* Two Column Grid: Recent Prescriptions & Recent Medical Records */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Prescriptions */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-black text-lg text-slate-900">Recent Prescriptions</h3>
                        <p className="text-xs font-bold text-slate-400">Doctor-issued medication charts</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setActiveTab("prescriptions")}
                      variant="ghost"
                      className="text-teal-600 font-bold text-xs hover:bg-teal-50"
                    >
                      View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-3">
                      {prescriptions.slice(0, 3).map((rx) => (
                        <div
                          key={rx.id}
                          className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/40 border border-slate-100 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-800">{rx.doctor}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Issued on {rx.date}
                            </p>
                          </div>
                          <Button
                            onClick={() => setViewingPrescription(rx)}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-bold text-teal-700 hover:bg-teal-100/50 border-teal-200"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No prescriptions on file yet.
                    </div>
                  )}
                </div>

                {/* Recent Medical Records */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-black text-lg text-slate-900">Medical Records</h3>
                        <p className="text-xs font-bold text-slate-400">Diagnostic reports and visit summaries</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setActiveTab("records")}
                      variant="ghost"
                      className="text-indigo-600 font-bold text-xs hover:bg-indigo-50"
                    >
                      View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>

                  {records.length > 0 ? (
                    <div className="space-y-3">
                      {records.slice(0, 3).map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-100 transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-800 truncate">{rec.title}</p>
                              <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                                {rec.recordType}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {rec.recordDate}
                            </p>
                          </div>
                          <Button
                            onClick={() => setViewingRecord(rec)}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100/50 border-indigo-200 shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No clinical records uploaded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="bg-gradient-to-br from-blue-50/60 to-teal-50/40 rounded-3xl p-6 sm:p-8 border border-blue-100/80">
                <h3 className="font-heading font-black text-base text-slate-900 mb-4">Quick Patient Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab("book")}
                    className="p-4 rounded-2xl bg-white border border-blue-100 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <CalendarPlus className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-black text-slate-900">Book Visit</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select doctor & slot</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("doctors")}
                    className="p-4 rounded-2xl bg-white border border-blue-100 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <Stethoscope className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-black text-slate-900">Find Specialist</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Verified clinicians</p>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("records");
                      setShowUploadRecordModal(true);
                    }}
                    className="p-4 rounded-2xl bg-white border border-blue-100 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <Upload className="w-6 h-6 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-black text-slate-900">Upload Report</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF or Lab image</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("profile")}
                    className="p-4 rounded-2xl bg-white border border-blue-100 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <User className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-black text-slate-900">Update Profile</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Emergency & phone</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 2: FIND DOCTORS (FEATURE 1)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "doctors" && (
            <div className="space-y-6">
              {/* Header & Filter Controls */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Accredited Clinical Providers</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Every provider displayed here is verified by hospital administration and licensed for consultation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search by name or spec */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search doctor name or specialty..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      className="pl-10 h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Specialization Filter */}
                  <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                    <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="All Specializations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specialties</SelectItem>
                      {specializationsList.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Consultation Type Filter */}
                  <Select value={selectedConsultationType} onValueChange={setSelectedConsultationType}>
                    <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Consultation Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Consultation Modes</SelectItem>
                      <SelectItem value="in-person">In-Person Clinic Visit</SelectItem>
                      <SelectItem value="video">Online HD Telehealth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Doctors Grid */}
              {isLoadingDoctors ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading verified medical practitioners...</p>
                </div>
              ) : filteredDoctors.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/10">
                            {doc.name.replace("Dr. ", "")[0] || "D"}
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified MD
                          </Badge>
                        </div>

                        <h3 className="font-heading font-black text-lg text-slate-900 leading-tight">
                          {doc.name}
                        </h3>
                        <p className="text-xs font-black text-blue-600 mt-1">
                          {doc.doctorProfile?.specialization || "General Medicine"}
                        </p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">
                          {doc.doctorProfile?.qualifications || "MBBS, MD"}
                        </p>

                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.doctorProfile?.hospitalAffiliation || "CareConnect Clinical Network"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{doc.doctorProfile?.experienceYears || 5}+ Years Clinical Experience</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-slate-400 font-bold">Standard Consultation:</span>
                            <span className="font-black text-slate-900 text-sm">
                              ${doc.doctorProfile?.consultationFee || 500}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100">
                        <Button
                          onClick={() => setViewingDoctorProfile(doc)}
                          variant="outline"
                          className="rounded-xl text-xs font-bold h-10 border-slate-200"
                        >
                          View Bio
                        </Button>
                        <Button
                          onClick={() => handleSelectDoctorForBooking(doc)}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-10 shadow-sm"
                        >
                          Book Visit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700 text-sm">No Doctors Match Your Search</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try adjusting your specialization filter or search query.
                  </p>
                  <Button
                    onClick={() => {
                      setDoctorSearch("");
                      setSelectedSpecialization("all");
                      setSelectedConsultationType("all");
                    }}
                    variant="outline"
                    className="mt-4 rounded-xl text-xs font-bold"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 3: BOOK APPOINTMENT WIZARD (FEATURE 2)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "book" && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Stepper Header */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Schedule an Appointment</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Step {bookingStep} of 6: Follow the clinical workflow to reserve your consultation.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-6 gap-2 mt-6">
                  {[
                    "Doctor",
                    "Date",
                    "Time Slot",
                    "Consult Mode",
                    "Reason",
                    "Review",
                  ].map((stepName, i) => (
                    <div key={stepName} className="text-center">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          bookingStep > i + 1
                            ? "bg-emerald-500"
                            : bookingStep === i + 1
                            ? "bg-blue-600"
                            : "bg-slate-100"
                        }`}
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:block mt-1">
                        {stepName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard Content Cards */}
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm">
                {/* STEP 1: SELECT DOCTOR */}
                {bookingStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-900">Step 1: Choose Your Doctor</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {doctors.map((doc) => {
                        const isSelected = bookingDoctorId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setBookingDoctorId(doc.id)}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/40 shadow-sm"
                                : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                              {doc.name.replace("Dr. ", "")[0] || "D"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-sm text-slate-900">{doc.name}</p>
                              <p className="text-xs font-bold text-blue-600">{doc.doctorProfile?.specialization}</p>
                              <p className="text-[11px] text-slate-400 mt-1">{doc.doctorProfile?.hospitalAffiliation}</p>
                              <p className="text-xs font-black text-slate-700 mt-2">
                                Fee: ${doc.doctorProfile?.consultationFee || 500}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        disabled={!bookingDoctorId}
                        onClick={() => setBookingStep(2)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6"
                      >
                        Continue to Date <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECT DATE */}
                {bookingStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Step 2: Choose Consultation Date</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Select an upcoming date for your consultation.</p>
                    </div>

                    <div className="max-w-md">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                        Select Appointment Date *
                      </Label>
                      <Input
                        type="date"
                        min={minBookingDate}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="h-12 rounded-xl text-sm bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => setBookingStep(1)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={!bookingDate}
                        onClick={() => setBookingStep(3)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6"
                      >
                        Continue to Time Slot <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SELECT TIME SLOT (With Conflict Prevention) */}
                {bookingStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Step 3: Select Available Time Slot</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          Slots are generated from Dr. {selectedBookingDoctor?.name || "Doctor"}'s schedule and locked dynamically.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchDoctorAvailability()}
                        className="text-xs font-bold text-blue-600 gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                      </Button>
                    </div>

                    {isLoadingDoctorAvailability ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <Clock className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                        <p className="text-xs font-bold text-slate-600">Retrieving real-time clinical slots for {bookingDate}...</p>
                      </div>
                    ) : doctorAvailabilityData?.schedule && !doctorAvailabilityData.schedule.isAvailable ? (
                      <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-center space-y-2">
                        <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                        <p className="font-bold text-sm">Doctor Unavailable on {bookingDate}</p>
                        <p className="text-xs text-amber-700">{doctorAvailabilityData.schedule.reason}</p>
                        <Button
                          onClick={() => setBookingStep(2)}
                          variant="outline"
                          className="text-xs font-bold rounded-xl mt-2 bg-white border-amber-300"
                        >
                          Choose Another Date
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                        {(doctorAvailabilityData?.schedule?.slots || TIME_SLOTS.map(t => ({
                          time: t,
                          isAvailable: !bookedSlotsForSelectedDay.includes(t),
                          status: bookedSlotsForSelectedDay.includes(t) ? "Booked" : "Available"
                        }))).map((slot: any) => {
                          const isBooked = !slot.isAvailable;
                          const isSelected = bookingTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              disabled={isBooked}
                              onClick={() => setBookingTime(slot.time)}
                              className={`p-3.5 rounded-2xl border text-center transition-all ${
                                isBooked
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 font-black"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-bold"
                              }`}
                            >
                              <span className="text-sm block">{slot.time}</span>
                              {isBooked ? (
                                <span className="text-[10px] font-black uppercase text-rose-500 block mt-1">
                                  {slot.status || "Booked"}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium opacity-80 block mt-1">Available</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => setBookingStep(2)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={!bookingTime}
                        onClick={() => setBookingStep(4)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6"
                      >
                        Continue to Mode <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: CONSULTATION TYPE */}
                {bookingStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Step 4: Select Consultation Mode</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Choose between in-person clinic attendance or secure WebRTC telemedicine.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div
                        onClick={() => setBookingConsultType("In-Person Clinic Visit")}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          bookingConsultType === "In-Person Clinic Visit"
                            ? "border-blue-600 bg-blue-50/40 shadow-sm"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <Building2 className="w-8 h-8 text-blue-600 mb-3" />
                        <h4 className="font-black text-base text-slate-900">In-Person Clinic Visit</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Visit {selectedBookingDoctor?.doctorProfile?.hospitalAffiliation || "CareConnect Clinic"} in person for clinical examination.
                        </p>
                      </div>

                      <div
                        onClick={() => setBookingConsultType("Online Video Consult")}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          bookingConsultType === "Online Video Consult"
                            ? "border-teal-600 bg-teal-50/40 shadow-sm"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <Video className="w-8 h-8 text-teal-600 mb-3" />
                        <h4 className="font-black text-base text-slate-900">Online HD Telehealth</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Encrypted live audio/video session from any desktop or mobile device.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => setBookingStep(3)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setBookingStep(5)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6"
                      >
                        Continue to Reason <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 5: REASON FOR VISIT */}
                {bookingStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Step 5: Reason for Visit</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Help Dr. {selectedBookingDoctor?.name} prepare by describing symptoms or reason for visit.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Symptoms or Clinical Concern *
                      </Label>
                      <Textarea
                        rows={4}
                        placeholder="e.g. Experiencing mild shortness of breath during morning jogs and persistent chest tightness for 3 days..."
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        className="rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => setBookingStep(4)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={!bookingReason.trim()}
                        onClick={() => setBookingStep(6)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6"
                      >
                        Review Booking <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW & CONFIRM */}
                {bookingStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Step 6: Review & Confirm Appointment</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">Review your consultation details before finalizing.</p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Provider:</span>
                        <span className="text-sm font-black text-slate-900">{selectedBookingDoctor?.name}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Specialization:</span>
                        <span className="text-xs font-black text-blue-600">{selectedBookingDoctor?.doctorProfile?.specialization}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Date & Time:</span>
                        <span className="text-xs font-black text-slate-900">{bookingDate} at {bookingTime}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Consultation Mode:</span>
                        <span className="text-xs font-black text-teal-700">{bookingConsultType}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Hospital Affiliation:</span>
                        <span className="text-xs font-medium text-slate-700">{selectedBookingDoctor?.doctorProfile?.hospitalAffiliation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">Consultation Fee:</span>
                        <span className="text-lg font-black text-slate-900">${selectedBookingDoctor?.doctorProfile?.consultationFee || 500}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => setBookingStep(5)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={isSubmittingBooking}
                        onClick={handleConfirmBooking}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black px-8 h-12 shadow-md shadow-blue-500/20"
                      >
                        {isSubmittingBooking ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Confirm & Submit Booking"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 4: MY APPOINTMENTS (FEATURE 3)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "appointments" && (
            <div className="space-y-6">
              {/* Header & Tabs */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Consultations</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Manage upcoming appointments, view doctor feedback, cancel or reschedule visits.
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                  {[
                    { id: "all", label: "All" },
                    { id: "upcoming", label: "Upcoming" },
                    { id: "pending", label: "Pending" },
                    { id: "completed", label: "Completed" },
                    { id: "cancelled", label: "Cancelled" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAppointmentFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        appointmentFilter === tab.id
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Appointments List */}
              {isLoadingAppointments ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading your appointments...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                <div className="grid gap-4">
                  {filteredAppointments.map((appt) => {
                    const isUpcoming = appt.status === "Scheduled" || appt.status === "Rescheduled";
                    const isPending = appt.status === "Pending" || appt.status === "Cancel Requested";
                    const isCancelled = appt.status === "Cancelled" || appt.status === "Rejected";

                    return (
                      <div
                        key={appt.id}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                            <Stethoscope className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h4 className="font-heading font-black text-base text-slate-900">
                                {appt.doctor?.name || "CareConnect Doctor"}
                              </h4>
                              <Badge
                                className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                                  isUpcoming
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : isPending
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : isCancelled
                                    ? "bg-rose-100 text-rose-800 border-rose-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                }`}
                              >
                                {appt.status}
                              </Badge>
                            </div>

                            <p className="text-xs font-bold text-slate-500 mt-1">
                              {appt.doctor?.specialization || "General Medicine"} • {appt.doctor?.hospitalAffiliation || "CareConnect Hospital"}
                            </p>

                            <p className="text-xs font-medium text-slate-600 mt-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">
                              <strong>Clinical Reason:</strong> {appt.notes || appt.therapy}
                            </p>

                            {appt.cancelReason && (
                              <p className="text-xs text-rose-600 font-bold mt-1">
                                Cancellation Note: {appt.cancelReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                          <div className="bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100 text-left sm:text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Consultation Slot</p>
                            <p className="text-sm font-black text-slate-900">{appt.date}</p>
                            <p className="text-xs font-bold text-blue-600">{appt.time}</p>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              onClick={() => setSelectedAppointmentDetails(appt)}
                              variant="outline"
                              className="rounded-xl text-xs font-bold h-10"
                            >
                              Details
                            </Button>

                            {/* Reschedule Button (for scheduled/pending) */}
                            {!isCancelled && appt.status !== "Completed" && (
                              <Button
                                onClick={() => {
                                  setReschedulingAppointment(appt);
                                  setRescheduleDate(appt.date);
                                  setRescheduleTime(appt.time);
                                }}
                                variant="outline"
                                className="rounded-xl text-xs font-bold h-10 text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                Reschedule
                              </Button>
                            )}

                            {/* Cancel Button */}
                            {!isCancelled && appt.status !== "Completed" && (
                              <Button
                                onClick={() => {
                                  setCancellingAppointment(appt);
                                  setCancelReasonInput("");
                                }}
                                variant="ghost"
                                className="rounded-xl text-xs font-bold h-10 text-rose-500 hover:bg-rose-50"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No Appointments in this category</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ready to schedule a health visit?</p>
                  <Button
                    onClick={() => setActiveTab("book")}
                    className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10"
                  >
                    Schedule New Visit
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 5: MEDICAL RECORDS (FEATURE 4)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "records" && (
            <div className="space-y-6">
              {/* Header & Upload Action */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Medical Records & Reports</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Upload and securely manage lab documents, discharge summaries, and radiology charts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Select value={recordCategoryFilter} onValueChange={setRecordCategoryFilter}>
                    <SelectTrigger className="w-44 h-10 rounded-xl text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="lab report">Lab Reports</SelectItem>
                      <SelectItem value="diagnosis">Diagnoses</SelectItem>
                      <SelectItem value="clinical note">Clinical Notes</SelectItem>
                      <SelectItem value="discharge summary">Discharge Summaries</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => setShowUploadRecordModal(true)}
                    className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shrink-0 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Record</span>
                  </Button>
                </div>
              </div>

              {/* Records List */}
              {isLoadingRecords ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading medical documents...</p>
                </div>
              ) : filteredRecords.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase">
                            {rec.recordType}
                          </Badge>
                        </div>

                        <h4 className="font-heading font-black text-base text-slate-900 leading-tight">
                          {rec.title}
                        </h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          Date: {rec.recordDate}
                        </p>

                        {rec.diagnosis && (
                          <p className="text-xs text-slate-600 font-medium mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <strong>Summary:</strong> {rec.diagnosis}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100">
                        <Button
                          onClick={() => setViewingRecord(rec)}
                          variant="outline"
                          className="rounded-xl text-xs font-bold h-9 border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button
                          onClick={() => handleDeleteRecord(rec.id)}
                          variant="ghost"
                          className="rounded-xl text-xs font-bold h-9 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No Medical Records Found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Upload authorized blood test reports, scans, or discharge notes.</p>
                  <Button
                    onClick={() => setShowUploadRecordModal(true)}
                    className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload First Document
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 6: PRESCRIPTIONS (FEATURE 5)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "prescriptions" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Clinical E-Prescriptions</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Doctor-signed medication charts and dosage schedules. Prescriptions are read-only to preserve clinical integrity.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Cryptographically Signed</span>
                  </div>
                </div>
              </div>

              {/* Prescriptions List */}
              {isLoadingPrescriptions ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading prescriptions...</p>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="grid gap-6">
                  {prescriptions.map((rx) => {
                    const medicines = parsePrescriptionMedicines(rx.medicines);
                    return (
                      <div
                        key={rx.id}
                        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading font-black text-lg text-slate-900">{rx.doctor}</h3>
                              <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-black uppercase">
                                {rx.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                              Issued: {rx.date} • Patient: {rx.patient}
                            </p>
                          </div>

                          <Button
                            onClick={() => setViewingPrescription(rx)}
                            variant="outline"
                            className="rounded-xl text-xs font-bold h-10 border-slate-200 text-slate-700 flex items-center gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            <span>View & Print Slip</span>
                          </Button>
                        </div>

                        {/* Medication Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="p-3">Medication Name</th>
                                <th className="p-3">Dosage</th>
                                <th className="p-3">Frequency</th>
                                <th className="p-3">Duration</th>
                                <th className="p-3">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {medicines.map((m: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-black text-slate-900">{m.name || "Medicine"}</td>
                                  <td className="p-3">{m.dosage || "As directed"}</td>
                                  <td className="p-3">{m.freq || m.frequency || "Daily"}</td>
                                  <td className="p-3">{m.duration || "7 days"}</td>
                                  <td className="p-3 text-slate-500">{m.instructions || "Take with water after meals"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No Prescriptions On File</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prescriptions issued by your doctor during consultations will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 7: NOTIFICATIONS (FEATURE 7)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              {/* Header & Filter Controls */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Health Notifications</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Stay updated on appointment approvals, schedule changes, and clinic alerts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setNotificationFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        notificationFilter === "all"
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotificationFilter("unread")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        notificationFilter === "unread"
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <Button
                      onClick={handleMarkAllNotifications}
                      variant="outline"
                      className="rounded-xl text-xs font-bold h-9"
                    >
                      Mark All as Read
                    </Button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              {isLoadingNotifications ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading alerts...</p>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.read && handleMarkNotification(notif.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                        notif.read
                          ? "bg-white border-slate-100 hover:border-slate-200"
                          : "bg-blue-50/50 border-blue-200 shadow-sm"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          notif.type === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : notif.type === "error"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-heading font-black text-sm text-slate-900 truncate">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {!notif.read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No Notifications</p>
                  <p className="text-xs text-slate-400 mt-0.5">You're completely caught up with your clinical updates.</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 8: PROFILE MANAGEMENT (FEATURE 6)
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient Profile & Health Info</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Manage permitted demographic and emergency information. Unnecessary sensitive data is never demanded.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6 mt-8">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Legal Full Name *</Label>
                      <Input
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address (Read-only)</Label>
                      <Input
                        disabled
                        value={user?.email || ""}
                        className="h-11 rounded-xl text-xs bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number</Label>
                      <Input
                        placeholder="+1 555-0123"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Age (Years)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={profileAge}
                        onChange={(e) => setProfileAge(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gender</Label>
                      <Select value={profileGender} onValueChange={setProfileGender}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Not specified">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Blood Group</Label>
                      <Select value={profileBloodGroup} onValueChange={setProfileBloodGroup}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Emergency Contact (Name & Phone)</Label>
                      <Input
                        placeholder="e.g. Sarah Doe (+1 555-0999)"
                        value={profileEmergency}
                        onChange={(e) => setProfileEmergency(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Residential Address</Label>
                    <Input
                      placeholder="e.g. 742 Evergreen Terrace, Springfield"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Known Allergies</Label>
                      <Textarea
                        rows={3}
                        placeholder="e.g. Penicillin, Peanuts, Latex..."
                        value={profileAllergies}
                        onChange={(e) => setProfileAllergies(e.target.value)}
                        className="rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Relevant Medical History</Label>
                      <Textarea
                        rows={3}
                        placeholder="e.g. Mild asthma, Appendectomy in 2021..."
                        value={profileHistory}
                        onChange={(e) => setProfileHistory(e.target.value)}
                        className="rounded-xl text-xs bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20"
                    >
                      {isSavingProfile ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save Profile Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VIEW 9: SETTINGS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Portal Preferences & Privacy</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Manage alerts, notifications, and accessibility controls.
                  </p>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-400 font-medium">Receive automated confirmations when doctor approves your visits.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">SMS Reminders</p>
                      <p className="text-xs text-slate-400 font-medium">Get appointment slot reminders via SMS before your consult.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">High-Contrast Accessible Mode</p>
                      <p className="text-xs text-slate-400 font-medium">Enhance text borders and contrast for easier reading.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => {
                        setHighContrast(e.target.checked);
                        toast.info(e.target.checked ? "High contrast enabled" : "Standard mode active");
                      }}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">Telehealth Auto-Join Link</p>
                      <p className="text-xs text-slate-400 font-medium">Allow immediate WebRTC connection when doctor calls you.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={telehealthAutoAccept}
                      onChange={(e) => setTelehealthAutoAccept(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3 mt-6">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-blue-900">HIPAA Compliant Data Guarantee</h5>
                    <p className="text-[11px] text-blue-800 font-medium leading-relaxed mt-0.5">
                      Your medical documents, prescriptions, and consultation history are strictly confidential and encrypted at rest.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE BOTTOM QUICK NAVIGATION BAR
      ════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-black ${
            activeTab === "overview" ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab("doctors")}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-black ${
            activeTab === "doctors" ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctors</span>
        </button>

        <button
          onClick={() => setActiveTab("book")}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-black ${
            activeTab === "book" ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center -mt-2 shadow-md shadow-blue-500/30">
            <CalendarPlus className="w-3.5 h-3.5" />
          </div>
          <span>Book</span>
        </button>

        <button
          onClick={() => setActiveTab("appointments")}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-black ${
            activeTab === "appointments" ? "text-blue-600" : "text-slate-400"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Visits</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-black text-slate-400"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 1: VIEW DOCTOR PROFILE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewingDoctorProfile} onOpenChange={() => setViewingDoctorProfile(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                {viewingDoctorProfile?.name.replace("Dr. ", "")[0] || "D"}
              </div>
              <div>
                <DialogTitle className="font-heading font-black text-xl text-slate-900">
                  {viewingDoctorProfile?.name}
                </DialogTitle>
                <DialogDescription className="text-xs font-black text-blue-600">
                  {viewingDoctorProfile?.doctorProfile?.specialization}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {viewingDoctorProfile && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Medical Registration:</span>
                  <span className="font-mono font-black text-slate-800">
                    {viewingDoctorProfile.doctorProfile?.medicalLicenseNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Qualifications:</span>
                  <span className="font-black text-slate-800">
                    {viewingDoctorProfile.doctorProfile?.qualifications}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Experience:</span>
                  <span className="font-black text-slate-800">
                    {viewingDoctorProfile.doctorProfile?.experienceYears}+ Years
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Clinic / Hospital:</span>
                  <span className="font-black text-slate-800">
                    {viewingDoctorProfile.doctorProfile?.hospitalAffiliation}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-400">Consultation Fee:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    ${viewingDoctorProfile.doctorProfile?.consultationFee || 500}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-blue-800 text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Practitioner credentials verified & authenticated by CareConnect Medical Board.</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewingDoctorProfile(null)}
              className="rounded-xl flex-1 text-xs"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                const doc = viewingDoctorProfile;
                setViewingDoctorProfile(null);
                if (doc) handleSelectDoctorForBooking(doc);
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex-1 text-xs"
            >
              Book Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 2: APPOINTMENT DETAILS MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedAppointmentDetails} onOpenChange={() => setSelectedAppointmentDetails(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              Appointment Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              ID #{selectedAppointmentDetails?.id?.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointmentDetails && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Doctor:</span>
                  <span className="font-black text-slate-900">{selectedAppointmentDetails.doctor?.name || "CareConnect Clinician"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Specialty:</span>
                  <span className="font-black text-blue-600">{selectedAppointmentDetails.doctor?.specialization || "General Medicine"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Date & Time:</span>
                  <span className="font-black text-slate-900">{selectedAppointmentDetails.date} at {selectedAppointmentDetails.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Status:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 font-black text-[10px]">
                    {selectedAppointmentDetails.status}
                  </Badge>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">Reason for Visit:</span>
                  <p className="font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    {selectedAppointmentDetails.notes || selectedAppointmentDetails.therapy}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              onClick={() => setSelectedAppointmentDetails(null)}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 3: RESCHEDULE APPOINTMENT MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!reschedulingAppointment} onOpenChange={() => setReschedulingAppointment(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Pick a new date and available time slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">New Date *</Label>
              <Input
                type="date"
                min={minBookingDate}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">New Time Slot *</Label>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select Time Slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReschedulingAppointment(null)}
              className="rounded-xl flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmittingReschedule || !rescheduleDate || !rescheduleTime}
              onClick={handleConfirmReschedule}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex-1 text-xs"
            >
              {isSubmittingReschedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save New Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 4: CANCEL APPOINTMENT CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!cancellingAppointment} onOpenChange={() => setCancellingAppointment(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Are you sure you want to cancel your consultation with {cancellingAppointment?.doctor?.name || "the doctor"}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold text-slate-700 uppercase">Reason for cancellation (Optional)</Label>
            <Input
              placeholder="e.g. Schedule conflict, feeling better, out of town..."
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCancellingAppointment(null)}
              className="rounded-xl flex-1 text-xs"
            >
              Keep Appointment
            </Button>
            <Button
              disabled={isSubmittingCancel}
              onClick={handleConfirmCancel}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex-1 text-xs shadow-sm"
            >
              {isSubmittingCancel ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 5: UPLOAD MEDICAL RECORD MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={showUploadRecordModal} onOpenChange={setShowUploadRecordModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              Upload Medical Document
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Supported formats: PDF, JPG, PNG (Max. 10 MB)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMedicalRecord} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 uppercase">Document Title *</Label>
              <Input
                required
                placeholder="e.g. Complete Blood Count (CBC) Panel"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 uppercase">Record Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lab Report">Lab Report</SelectItem>
                    <SelectItem value="Diagnosis">Diagnosis</SelectItem>
                    <SelectItem value="Clinical Note">Clinical Note</SelectItem>
                    <SelectItem value="Discharge Summary">Discharge Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 uppercase">Record Date</Label>
                <Input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 uppercase">Clinical Summary / Doctor Notes</Label>
              <Input
                placeholder="e.g. Normal lipid levels, recommended repeat in 6 months"
                value={uploadDiagnosis}
                onChange={(e) => setUploadDiagnosis(e.target.value)}
                className="h-11 rounded-xl text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 p-6 rounded-2xl text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              {uploadFile ? (
                <div>
                  <p className="text-xs font-black text-slate-900">{uploadFile.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{uploadFile.size} ready</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-black text-slate-800">Click to choose document</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, or JPG up to 10 MB</p>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadRecordModal(false)}
                className="rounded-xl flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingRecord || !uploadTitle.trim()}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex-1 text-xs"
              >
                {isSavingRecord ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save to Chart"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 6: VIEW MEDICAL RECORD PREVIEW MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              {viewingRecord?.title}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-blue-600">
              {viewingRecord?.recordType} • Date: {viewingRecord?.recordDate}
            </DialogDescription>
          </DialogHeader>

          {viewingRecord && (
            <div className="space-y-4 pt-2 text-xs">
              {viewingRecord.diagnosis && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Clinical Findings</span>
                  <p className="font-medium text-slate-700 leading-relaxed">{viewingRecord.diagnosis}</p>
                </div>
              )}

              {/* Attachments preview */}
              {viewingRecord.attachments && (
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-2">Attached File</span>
                  {(() => {
                    try {
                      const files = JSON.parse(viewingRecord.attachments);
                      const file = Array.isArray(files) ? files[0] : null;
                      if (!file) return <p className="text-slate-400 text-xs">No attachment preview.</p>;

                      const isImage = file.dataUrl?.startsWith("data:image");
                      return (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-800 truncate">{file.name || "Medical Document"}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{file.size}</span>
                          </div>

                          {isImage && (
                            <img
                              src={file.dataUrl}
                              alt="Document preview"
                              className="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-white"
                            />
                          )}

                          <Button
                            onClick={() => downloadFileUrl(file.dataUrl, file.name)}
                            size="sm"
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-2" /> Download Document
                          </Button>
                        </div>
                      );
                    } catch {
                      return <p className="text-slate-400 text-xs">Attachment not previewable.</p>;
                    }
                  })()}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              onClick={() => setViewingRecord(null)}
              className="w-full rounded-xl bg-slate-900 text-white font-black text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 7: VIEW & PRINT PRESCRIPTION MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewingPrescription} onOpenChange={() => setViewingPrescription(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-10 bg-white font-body">
          <div className="printable-prescription space-y-6">
            {/* Hospital Header for Print */}
            <div className="flex items-center justify-between pb-6 border-b-2 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-heading font-black text-xl text-slate-900">CareConnect Central Hospital</h2>
                  <p className="text-[11px] font-bold text-slate-400">Accredited Clinical Care & Diagnostics</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-600 text-white font-black text-xs px-2.5 py-1">Rx Slip</Badge>
                <p className="text-[10px] text-slate-400 font-bold mt-1">ID #{viewingPrescription?.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Doctor & Patient Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Attending Physician</span>
                <p className="font-black text-sm text-slate-900 mt-0.5">{viewingPrescription?.doctor}</p>
                <p className="text-[11px] text-slate-500 font-medium">Verified License Holder</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Patient Name</span>
                <p className="font-black text-sm text-slate-900 mt-0.5">{viewingPrescription?.patient}</p>
                <p className="text-[11px] text-slate-500 font-medium">Issue Date: {viewingPrescription?.date}</p>
              </div>
            </div>

            {/* Rx Medicines List */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-serif font-black text-blue-600">℞</span>
                <span className="font-heading font-black text-sm text-slate-900 uppercase tracking-wider">Prescribed Medications</span>
              </div>

              {viewingPrescription && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Medication</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Frequency</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {parsePrescriptionMedicines(viewingPrescription.medicines).map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3 font-black text-slate-900">{m.name}</td>
                          <td className="p-3">{m.dosage || "500 mg"}</td>
                          <td className="p-3">{m.freq || m.frequency || "Twice daily"}</td>
                          <td className="p-3">{m.duration || "7 days"}</td>
                          <td className="p-3 text-slate-600">{m.instructions || "Take after meals"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Doctor Signature line */}
            <div className="pt-6 border-t border-slate-200 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Valid across accredited pharmacies. Prescriptions are cryptographically signed.
                </p>
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <p className="text-[11px] font-black text-slate-800">Authorized Doctor Signature</p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewingPrescription(null)}
              className="rounded-xl flex-1 text-xs"
            >
              Close
            </Button>
            <Button
              onClick={handlePrintPrescription}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black flex-1 text-xs flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════
          MODAL 8: LOGOUT CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 bg-white font-body">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-xl text-slate-900">
              Sign Out of CareConnect?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Your patient session will be securely closed on this device.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="rounded-xl flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowLogoutDialog(false);
                logout();
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black flex-1 text-xs"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
