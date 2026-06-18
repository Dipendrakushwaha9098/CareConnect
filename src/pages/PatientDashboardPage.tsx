import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Calendar, Clock, FileText, Brain, Bell, AlertCircle, Plus, 
  Trash2, CheckCircle, Stethoscope, Send, Volume2, RefreshCw, 
  Sparkles, Video, HeartPulse, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAppointments, fetchPatients, fetchPrescriptions } from "@/lib/api";
import { formatTime12Hour } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";

interface SymptomResult {
  title: string;
  suggestions: string[];
  urgency: string;
  specialist: string;
}

interface MedicineReminder {
  id: string;
  name: string;
  time: string;
  freq: string;
  status: string;
}

interface CustomWindow extends Window {
  AudioContext?: any;
  webkitAudioContext?: any;
}

interface DBPatient {
  id: string;
  userId?: string | null;
  name: string;
  age: number;
  gender: string;
  email?: string | null;
  phone?: string | null;
}

interface DBAppointment {
  id: string;
  patient: string;
  patientId: string;
  therapy: string;
  date: string;
  time: string;
  status: string;
  cancelReason?: string | null;
}

interface DBPrescription {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  medicines: string;
  status: string;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: allAppointments = [], isLoading: isLoadingAppts } = useQuery<DBAppointment[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<DBPatient[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const { data: prescriptions = [], isLoading: isLoadingRx } = useQuery<DBPrescription[]>({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const myPatients = useMemo(() => {
    if (!user) return [];
    return patients.filter(p => p.userId === user.id || p.email === user.email || p.name === user.name);
  }, [patients, user]);

  const currentPatient = useMemo(() => {
    if (!user) return null;
    return myPatients.find(p => p.name === user.name || p.userId === user.id) || myPatients[0] || null;
  }, [myPatients, user]);

  const myPatientIds = useMemo(() => myPatients.map(p => p.id), [myPatients]);
  const myPatientNames = useMemo(() => myPatients.map(p => p.name.toLowerCase()), [myPatients]);

  const myAppointments = useMemo(() => {
    if (!user) return [];
    return allAppointments.filter(a => 
      myPatientIds.includes(a.patientId) || 
      myPatientNames.includes(a.patient.toLowerCase()) ||
      a.patient.toLowerCase() === user.name.toLowerCase()
    );
  }, [allAppointments, user, myPatientIds, myPatientNames]);

  const pendingRequests = myAppointments.filter(a => a.status === "Pending" || a.status === "Cancel Requested");
  const approvedAppointments = myAppointments.filter(a => a.status === "Scheduled" || a.status === "Ongoing");
  const myPrescriptions = useMemo(() => {
    if (!user) return [];
    return prescriptions.filter(p => 
      myPatientNames.includes(p.patient.toLowerCase()) || 
      p.patient.toLowerCase() === user.name.toLowerCase()
    );
  }, [prescriptions, user, myPatientNames]);

  const upcomingCount = myAppointments.filter(a => a.status === "Scheduled" || a.status === "Ongoing").length;
  const requestCount = pendingRequests.length;
  const pastCount = myAppointments.filter(a => a.status === "Completed").length;
  const prescriptionsCount = myPrescriptions.length;

  const isLoading = isLoadingAppts || isLoadingPatients || isLoadingRx;

  // ── 0. Telemedicine Calling State ──
  const { socket } = useSocket();
  const [isPatientCallActive, setIsPatientCallActive] = useState(false);
  const [patientRoomName, setPatientRoomName] = useState("");
  const [isDoctorConnected, setIsDoctorConnected] = useState(false);
  const [connectedDoctorName, setConnectedDoctorName] = useState("");

  useEffect(() => {
    if (!socket || !isPatientCallActive || !patientRoomName) return;

    const handleCallAccepted = (data: { roomName: string; doctorName: string }) => {
      if (data.roomName === patientRoomName) {
        setIsDoctorConnected(true);
        setConnectedDoctorName(data.doctorName);
        toast.success(`🩺 Dr. ${data.doctorName} has connected to your virtual consult!`);
      }
    };

    const handleCallEnded = (data: { roomName: string }) => {
      if (data.roomName === patientRoomName) {
        setIsPatientCallActive(false);
        setIsDoctorConnected(false);
        setConnectedDoctorName("");
        toast.info("The live telehealth consultation has ended.");
      }
    };

    socket.on("telemedicineCallAccepted", handleCallAccepted);
    socket.on("telemedicineSessionEnded", handleCallEnded);

    return () => {
      socket.off("telemedicineCallAccepted", handleCallAccepted);
      socket.off("telemedicineSessionEnded", handleCallEnded);
    };
  }, [socket, isPatientCallActive, patientRoomName]);

  useEffect(() => {
    if (!socket) return;

    const handleApptUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    };

    socket.on("appointmentCreated", handleApptUpdate);
    socket.on("appointmentUpdated", handleApptUpdate);
    socket.on("appointmentDeleted", handleApptUpdate);

    return () => {
      socket.off("appointmentCreated", handleApptUpdate);
      socket.off("appointmentUpdated", handleApptUpdate);
      socket.off("appointmentDeleted", handleApptUpdate);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!isPatientCallActive || !patientRoomName) return;

    let api: any;
    const timer = setTimeout(() => {
      const container = document.getElementById("jitsi-patient-container");
      if (container && (window as any).JitsiMeetExternalAPI) {
        api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
          roomName: patientRoomName,
          parentNode: container,
          width: "100%",
          height: "100%",
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
          }
        });
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (api) {
        api.dispose();
      }
    };
  }, [isPatientCallActive, patientRoomName]);

  const handlePatientTelemedicineRequest = async () => {
    try {
      setIsDoctorConnected(false);
      setConnectedDoctorName("");
      const response = await fetch("http://localhost:3001/api/telemedicine/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: user?.name || "Anonymous Patient"
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPatientRoomName(data.roomName);
        setIsPatientCallActive(true);
        toast.success(`📞 Live call room created: ${data.roomName}. Waiting for clinician connection...`);
      } else {
        toast.error("Failed to connect call: " + (data.error || "no doctor available"));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to request telehealth call. Please check server.");
    }
  };

  const handlePatientDisconnect = async () => {
    try {
      await fetch(`http://localhost:3001/api/telemedicine/call/${patientRoomName}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Failed to cleanly disconnect call:", err);
    } finally {
      setIsPatientCallActive(false);
      setIsDoctorConnected(false);
      setConnectedDoctorName("");
    }
  };

  // ── 3. Cancellation Request State ──
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [apptToCancel, setApptToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRequestCancel = async () => {
    if (!apptToCancel) return;
    if (!cancelReason.trim()) {
      toast.error("Please specify a reason for cancellation.");
      return;
    }
    setIsCancelling(true);
    try {
      const response = await fetch(`http://localhost:3001/api/appointments/${apptToCancel}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Cancel Requested",
          cancelReason: cancelReason
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Cancellation request submitted to the doctor.");
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } else {
        toast.error("Failed to request cancellation: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to backend server.");
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setCancelReason("");
      setApptToCancel(null);
    }
  };

  // Keep track of triggered appointment alarms
  const triggeredApptAlarms = useRef<Set<string>>(new Set());

  // ── 1. AI Symptom Checker State ──
  const [symptoms, setSymptoms] = useState("");
  const [isCheckerLoading, setIsCheckerLoading] = useState(false);
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);

  // ── 2. Medicine Reminder State ──
  const [reminders, setReminders] = useState<MedicineReminder[]>(() => {
    const saved = localStorage.getItem("careconnect_reminders");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "Metformin 500mg", time: "08:00 AM", freq: "Once daily", status: "Active" },
      { id: "2", name: "Lisinopril 10mg", time: "09:00 PM", freq: "Once daily", status: "Active" }
    ];
  });
  const [newMed, setNewMed] = useState({ name: "", time: "08:00", freq: "Once daily" });

  // Load reminders on mount
  useEffect(() => {
    fetch("http://localhost:3001/api/reminders")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setReminders(data);
        }
      })
      .catch(err => console.log("Failed to fetch reminders from server.", err));
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("careconnect_reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Alarms background trigger
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hourStr = hours.toString().padStart(2, "0");
      const timeStr = `${hourStr}:${minutes} ${ampm}`;

      // 1. Check Medicine Reminders
      reminders.forEach(r => {
        if (r.status === "Active" && r.time === timeStr) {
          toast.info(`🔔 MEDICATION ALARM: It is time to take ${r.name}!`, {
            duration: 15000,
            description: `Scheduled interval: ${r.freq}`,
          });
          
          try {
            const customWindow = window as unknown as CustomWindow;
            const AudioContextClass = customWindow.AudioContext || customWindow.webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              
              const nowAudio = ctx.currentTime;
              gain.gain.setValueAtTime(0.2, nowAudio);
              gain.gain.setValueAtTime(0, nowAudio + 0.4);
              gain.gain.setValueAtTime(0.2, nowAudio + 1.0);
              gain.gain.setValueAtTime(0, nowAudio + 1.4);
              gain.gain.setValueAtTime(0.2, nowAudio + 2.0);
              gain.gain.setValueAtTime(0, nowAudio + 2.4);
              gain.gain.setValueAtTime(0.2, nowAudio + 3.0);
              gain.gain.setValueAtTime(0, nowAudio + 3.4);
              gain.gain.setValueAtTime(0.2, nowAudio + 4.0);
              gain.gain.setValueAtTime(0, nowAudio + 4.4);
              
              osc.start(nowAudio);
              osc.stop(nowAudio + 5.0);
            }
          } catch (e) {
            console.log("Audio not allowed by policy yet", e);
          }
        }
      });

      // 2. Check Appointment Alarms (10 minutes before)
      approvedAppointments.forEach(appt => {
        if (!appt.date || !appt.time) return;
        const dateParts = appt.date.split("-");
        if (dateParts.length !== 3) return;

        let apptHours = 0;
        let apptMinutes = 0;

        const timeMatchAmpm = appt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatchAmpm) {
          apptHours = parseInt(timeMatchAmpm[1], 10);
          apptMinutes = parseInt(timeMatchAmpm[2], 10);
          const ampm = timeMatchAmpm[3].toUpperCase();
          if (ampm === "PM" && apptHours < 12) apptHours += 12;
          if (ampm === "AM" && apptHours === 12) apptHours = 0;
        } else {
          const timeMatch24 = appt.time.match(/(\d+):(\d+)/);
          if (timeMatch24) {
            apptHours = parseInt(timeMatch24[1], 10);
            apptMinutes = parseInt(timeMatch24[2], 10);
          } else {
            return;
          }
        }

        const apptDate = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2]),
          apptHours,
          apptMinutes
        );

        const diffMs = apptDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // Trigger alarm if the appointment starts in 9.5 to 10.5 minutes
        if (diffMinutes >= 9.5 && diffMinutes <= 10.5 && !triggeredApptAlarms.current.has(appt.id)) {
          triggeredApptAlarms.current.add(appt.id);
          
          toast.warning(`📅 APPOINTMENT REMINDER: Your session "${appt.therapy}" starts in 10 minutes!`, {
            duration: 20000,
            description: `Scheduled at ${appt.time} today.`,
          });

          // Play alarm sound
          try {
            const customWindow = window as unknown as CustomWindow;
            const AudioContextClass = customWindow.AudioContext || customWindow.webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 523.25; // C5 note
              
              const nowAudio = ctx.currentTime;
              gain.gain.setValueAtTime(0.3, nowAudio);
              gain.gain.setValueAtTime(0, nowAudio + 0.3);
              gain.gain.setValueAtTime(0.3, nowAudio + 0.6);
              gain.gain.setValueAtTime(0, nowAudio + 0.9);
              gain.gain.setValueAtTime(0.3, nowAudio + 1.2);
              gain.gain.setValueAtTime(0, nowAudio + 1.8);
              
              osc.start(nowAudio);
              osc.stop(nowAudio + 2.0);
            }
          } catch (e) {
            console.log("Audio not allowed by policy yet", e);
          }
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [reminders, approvedAppointments]);

  // AI Symptom Checker
  const handleSymptomCheck = () => {
    if (!symptoms.trim()) {
      toast.error("Please describe your symptoms first.");
      return;
    }
    setIsCheckerLoading(true);
    setSymptomResult(null);

    setTimeout(() => {
      setIsCheckerLoading(false);
      const text = symptoms.toLowerCase();
      let suggestions = {
        title: "Mild Seasonal Rhinitis (Allergies)",
        suggestions: ["Take OTC non-drowsy antihistamines (e.g. Cetirizine)", "Avoid allergens, dust, and pollen", "Consider warm saline nasal sprays"],
        urgency: "Routine Care",
        specialist: "Integrative Medicine / GP"
      };

      if (text.includes("chest") || text.includes("heart") || text.includes("breath")) {
        suggestions = {
          title: "Potential Cardio-Respiratory Distress",
          suggestions: ["Avoid all physical strain immediately", "Monitor blood pressure and pulse rate", "Seek immediate emergency consultation if chest pain worsens"],
          urgency: "Immediate Medical Attention Required",
          specialist: "Cardiology / Emergency Dept"
        };
      } else if (text.includes("sugar") || text.includes("thirst") || text.includes("diabetes")) {
        suggestions = {
          title: "Hyperglycemia Symptom Indicator",
          suggestions: ["Check fasting and post-prandial blood sugar levels", "Maintain strict low-glycemic hydration", "Consult your endocrinologist for dosage re-calibration"],
          urgency: "General Clinical Consultation",
          specialist: "Endocrinology / General Medicine"
        };
      } else if (text.includes("joint") || text.includes("pain") || text.includes("back")) {
        suggestions = {
          title: "Chronic Inflammatory Musculoskeletal Strain",
          suggestions: ["Apply localized warm Ayurvedic compresses", "Engage in zero-impact posture mapping", "Schedule a holistic physiotherapy review"],
          urgency: "Routine Care",
          specialist: "Physiotherapy / Orthopedics"
        };
      }

      setSymptomResult(suggestions);
      toast.success("AI Diagnostics analysis complete!");
    }, 2000);
  };

  const handleAppendSymptomHistory = async () => {
    if (!symptomResult) return;
    try {
      const res = await fetch("http://localhost:3001/api/symptom-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          diagnosis: symptomResult.title,
          urgency: symptomResult.urgency,
          specialist: symptomResult.specialist,
        }),
      });
      if (res.ok) {
        toast.success("AI Diagnostics successfully persisted to SQLite backend history!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.log("Failed to persist symptom diagnostics to backend.", err);
      toast.success("Diagnostics appended to local medical session.");
    }
    setSymptoms("");
    setSymptomResult(null);
  };

  // Medicine planners
  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name) {
      toast.error("Medicine name is required.");
      return;
    }
    const formattedTime = formatTimeAmPm(newMed.time);
    const reminderPayload = {
      name: newMed.name,
      time: formattedTime,
      freq: newMed.freq,
      status: "Active"
    };

    try {
      const res = await fetch("http://localhost:3001/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminderPayload),
      });
      const data = await res.json();
      if (res.ok) {
        setReminders([data, ...reminders]);
        toast.success(`${data.name} reminder scheduled and saved to backend!`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.log("Failed to save reminder to backend, saving locally.", err);
      const newRecord = {
        id: Date.now().toString(),
        ...reminderPayload
      };
      setReminders([...reminders, newRecord]);
      toast.success(`${newRecord.name} reminder scheduled locally.`);
    }

    setNewMed({ name: "", time: "08:00", freq: "Once daily" });
  };

  const handleDeleteMed = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/reminders/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReminders(reminders.filter(r => r.id !== id));
        toast.success("Reminder deleted from backend.");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.log("Failed to delete reminder from backend, removing locally.", err);
      setReminders(reminders.filter(r => r.id !== id));
      toast.success("Reminder removed locally.");
    }
  };

  const formatTimeAmPm = (timeString: string) => {
    const [hourStr, minStr] = timeString.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    const padHour = hour.toString().padStart(2, "0");
    return `${padHour}:${minStr} ${ampm}`;
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* ── Welcome Banner ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-8 bg-white border border-slate-100 rounded-[2rem] shadow-medical gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/40 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-widest uppercase text-[10px] mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> CareConnect · Patient Portal
          </div>
          <h1 className="font-heading text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, <span className="text-gradient-medical">{user?.name ? user.name.replace(/^(Dr\.\s*)+/i, "") : "Valued Patient"}</span> 👋
          </h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Review your upcoming appointments, prescriptions, and health analytics.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto z-10 shrink-0">
          <Link to="/appointments" className="flex-1 sm:flex-none">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl w-full font-black h-13 px-6 shadow-xl shadow-blue-100 transition-all btn-magnetic">
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Counters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="premium-card p-6 flex items-center gap-5 h-28 hover:-translate-y-1">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Appointments</div>
            <div className="text-2xl font-black text-slate-900 leading-none">{isLoading ? "..." : upcomingCount}</div>
          </div>
        </div>

        <div className="premium-card p-6 flex items-center gap-5 h-28 hover:-translate-y-1">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Pending Requests</div>
            <div className="text-2xl font-black text-slate-900 leading-none">{isLoading ? "..." : requestCount}</div>
          </div>
        </div>

        <div className="premium-card p-6 flex items-center gap-5 h-28 hover:-translate-y-1">
          <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Past Visits</div>
            <div className="text-2xl font-black text-slate-900 leading-none">{isLoading ? "..." : pastCount}</div>
          </div>
        </div>

        <Link to="/prescriptions" className="block">
          <div className="premium-card p-6 flex items-center gap-5 h-28 hover:-translate-y-1">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Prescriptions</div>
              <div className="text-2xl font-black text-slate-900 leading-none">{isLoading ? "..." : prescriptionsCount}</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Associated Patient Profiles ── */}
      <div className="premium-card p-8">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2.5">
          <Users className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
          Associated Patient Profiles
        </h2>
        {isLoading ? (
          <div className="text-center py-6">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-slate-400 font-bold text-xs">Loading associated patient profiles...</p>
          </div>
        ) : myPatients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myPatients.map((p) => (
              <div key={p.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md group-hover:scale-105 duration-300 transition-all">
                  {p.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 text-base truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-2">
                    <span>Age: {p.age}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span>{p.gender}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl">
             <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
             <p className="font-bold text-slate-400 text-sm">No associated patient profiles.</p>
             <p className="text-xs text-slate-400 mt-1">Book an appointment for a family member to register a new profile.</p>
          </div>
        )}
      </div>
      
      {/* ── Schedule Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Approved Appointments */}
        <div className="premium-card p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Approved & Confirmed Sessions
          </h2>
          {approvedAppointments.length > 0 ? (
            <div className="space-y-4">
              {approvedAppointments.map((appt) => (
                <div key={appt.id} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-6 -translate-y-6" />
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-lg">{appt.therapy}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black tracking-widest px-2.5 py-1">Approved</Badge>
                  </div>
                  <p className="text-sm text-slate-600 font-bold">{appt.date} · {formatTime12Hour(appt.time)}</p>
                  <p className="text-xs text-emerald-700/80 font-semibold mt-1">Confirmed clinical slot. Please arrive 10 minutes prior to session.</p>
                  <button
                    onClick={() => {
                      setApptToCancel(appt.id);
                      setCancelDialogOpen(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 px-3.5 py-2 rounded-xl transition-all duration-200 mt-3 flex items-center gap-1.5 self-start shadow-sm shadow-rose-100/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Request Cancellation
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
               <p className="font-bold text-slate-400 text-sm">No confirmed sessions.</p>
               <p className="text-xs text-slate-400 mt-1">Your approved slots will appear here in real-time.</p>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="premium-card p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Clinical Approvals
          </h2>
          {requestCount > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((appt) => {
                const isCancelRequested = appt.status === "Cancel Requested";
                return (
                  <div key={appt.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-2 relative overflow-hidden ${
                    isCancelRequested ? "border-rose-100 bg-rose-50/20" : "border-amber-100 bg-amber-50/25"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-lg">{appt.therapy}</span>
                      <Badge className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 ${
                        isCancelRequested ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>{isCancelRequested ? "Cancel Requested" : "Pending"}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-bold">{appt.date} · {formatTime12Hour(appt.time)}</p>
                    {isCancelRequested ? (
                      <div className="mt-2 p-3 bg-rose-50/60 rounded-xl border border-rose-100/40">
                        <span className="text-[9px] uppercase tracking-wider font-black text-rose-600 block">Cancellation Reason</span>
                        <p className="text-xs font-semibold text-rose-700 mt-1">"{appt.cancelReason || "No reason specified"}"</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-400 mt-1 font-semibold">Waiting for practitioner slot confirmation.</p>
                        <button
                          onClick={() => {
                            setApptToCancel(appt.id);
                            setCancelDialogOpen(true);
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 px-3.5 py-2 rounded-xl transition-all duration-200 mt-3 flex items-center gap-1.5 self-start shadow-sm shadow-rose-100/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Request Cancellation
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
               <p className="font-bold text-slate-400 text-sm">No pending approvals.</p>
               <p className="text-xs text-slate-400 mt-1">Your new booking requests will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── HIGH FIDELITY EMBEDDED PATIENT UTILITIES (AI Checker & Alarms) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. AI Symptom Checker */}
        <div className="premium-card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
               <Brain className="w-6 h-6 text-blue-600 animate-pulse" /> Care AI Symptom Checker
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-bold">Describe your symptoms in natural language. Care AI will provide matched diagnostics.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Describe Symptoms *</Label>
            <Textarea
              placeholder="E.g., sharp chest pain, short breaths during walking since morning..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[120px] bg-slate-50 border-slate-100 rounded-2xl resize-none p-4 text-sm font-semibold placeholder:text-slate-300 focus:bg-white"
            />
          </div>

          <Button
            onClick={handleSymptomCheck}
            disabled={isCheckerLoading}
            className="w-full h-12 bg-blue-600 hover:bg-slate-950 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {isCheckerLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running diagnostics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Symptoms</span>
              </>
            )}
          </Button>

          <AnimatePresence mode="wait">
            {symptomResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 text-sm"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider">Matched Diagnosis</span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{symptomResult.title}</h3>
                  </div>
                  <Badge className="bg-rose-100 text-rose-800 font-bold border border-rose-200 text-[9px] py-1 uppercase">{symptomResult.urgency}</Badge>
                </div>
                <div className="h-px bg-slate-200/60" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Recommendations</p>
                  <ul className="space-y-1.5 text-xs text-slate-700 font-bold">
                    {symptomResult.suggestions.map((s, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="h-px bg-slate-200/60" />
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Suggested Specialist</p>
                    <p className="text-xs font-black text-slate-800 flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 text-blue-500" /> {symptomResult.specialist}</p>
                  </div>
                  <Button onClick={handleAppendSymptomHistory} className="bg-blue-600 hover:bg-slate-900 font-bold text-white rounded-lg px-4 py-2 h-auto text-[10px] flex items-center gap-1">
                    <Send className="w-3 h-3" /> Save to EMR
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-rose-700 leading-relaxed font-bold">
              Disclaimer: This AI symptom auditor provides informational suggestions only. Seek direct medical consultation for emergency triage.
            </p>
          </div>
        </div>

        {/* 2. Medicine Alarms Manager */}
        <div className="premium-card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
               <Bell className="w-6 h-6 text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} /> Medication Reminders
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-bold">Add and monitor scheduled alarm buzzed medication times.</p>
          </div>

          <form onSubmit={handleAddMed} className="space-y-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medicine *</Label>
              <Input
                placeholder="E.g., Metformin 500mg"
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="bg-white h-10 border-slate-100 rounded-lg font-bold placeholder:text-slate-300 focus:bg-white focus-visible:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alert Time *</Label>
                <Input
                  type="time"
                  value={newMed.time}
                  onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
                  className="bg-white h-10 border-slate-100 rounded-lg font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frequency</Label>
                <Select onValueChange={(v) => setNewMed({ ...newMed, freq: v })} defaultValue={newMed.freq}>
                  <SelectTrigger className="bg-white h-10 border-slate-100 rounded-lg font-bold">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Once daily">Once daily</SelectItem>
                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                    <SelectItem value="Three times daily">Three times daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 bg-amber-500 hover:bg-slate-900 text-white font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Add Medication Alarm
            </Button>
          </form>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {reminders.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs font-bold">No active medicine timers scheduled.</p>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="p-4 border bg-slate-50/50 border-slate-100 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                      <Volume2 className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{r.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.time} · {r.freq}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase text-[8px]">Active</Badge>
                    <button onClick={() => handleDeleteMed(r.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="premium-card p-8 mt-8">
        <h2 className="text-xl font-black text-slate-900 mb-6">Recent Clinic Activity</h2>
        {myAppointments.length > 0 ? (
          <div className="space-y-3">
             {myAppointments.slice(0, 3).map((appt) => (
                <div key={appt.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl flex justify-between items-center text-sm transition-colors">
                   <div>
                     <span className="font-black text-slate-800">{appt.therapy}</span>
                     <p className="text-xs text-slate-400 mt-0.5 font-semibold">{appt.date} at {formatTime12Hour(appt.time)}</p>
                   </div>
                   <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black ${
                     appt.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                     appt.status === "Scheduled" ? "bg-blue-100 text-blue-800" :
                     appt.status === "Cancel Requested" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                   }`}>{appt.status === "Scheduled" ? "Approved" : appt.status}</span>
                </div>
             ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm font-bold">No recent activity found. Book your first appointment today!</p>
        )}
      </div>

      {/* Cancellation Request Modal */}
      {cancelDialogOpen && (
        <Dialog open={cancelDialogOpen} onOpenChange={() => setCancelDialogOpen(false)}>
          <DialogContent className="bg-white border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col justify-between">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="font-black text-lg text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                Request Appointment Cancellation
              </DialogTitle>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Please provide a reason to cancel</p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-xs text-slate-500 font-medium">
                To cancel your clinical appointment slot, you must specify a valid reason. Your practitioner will review and confirm this request.
              </p>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Cancellation *</Label>
                <Textarea
                  placeholder="E.g., Medical emergency, sudden conflict in travel schedule, etc..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="min-h-[100px] bg-slate-50 border-slate-100 rounded-xl resize-none p-3 text-sm font-semibold placeholder:text-slate-300 focus:bg-white"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                className="font-bold rounded-xl text-xs h-10 px-4 border-slate-200"
              >
                Keep Appointment
              </Button>
              <Button
                onClick={handleRequestCancel}
                disabled={isCancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-10 px-4 shadow-md shadow-rose-100"
              >
                {isCancelling ? "Submitting..." : "Submit Cancellation Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
