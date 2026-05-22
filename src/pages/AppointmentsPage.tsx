import { useState, createElement, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Plus, Clock, CheckCircle2, AlertCircle, Calendar,
  Search, Phone, MessageSquare, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchAppointments, createAppointment, deleteAppointment, fetchPatients, fetchTreatments, updateAppointment } from "@/lib/api";
import { formatTime12Hour } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CalendarDays, AlertTriangle } from "lucide-react"; // Import extra icons needed for approvals & busy slots

type AppointmentStatus = "Pending" | "Scheduled" | "Ongoing" | "Completed";

type Appointment = {
  id: string;
  patient: string;
  patientId: string;
  therapy: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Scheduled: "bg-blue-100 text-blue-800 border border-blue-200",
  Ongoing: "bg-green-100 text-green-800 border border-green-200",
  Completed: "bg-gray-100 text-gray-800 border border-gray-200",
};

const STATUS_ICONS: Record<AppointmentStatus, React.ElementType> = {
  Pending: Clock,
  Scheduled: CheckCircle2,
  Ongoing: AlertCircle,
  Completed: CheckCircle2,
};

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const isPatient = user?.role === "patient";

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const { data: treatments = [] } = useQuery<any[]>({
    queryKey: ["treatments"],
    queryFn: fetchTreatments,
  });
  
  const currentPatient = isPatient ? patients.find(p => p.name === user?.name || p.userId === user?.id) : null;

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setDialogOpen(false);
      setNewForm({ patientId: "", patientName: "", patientPhone: "", therapy: "", date: "", time: "", notes: "" });
      if (isPatient) {
        toast.success("Booking request submitted successfully!");
      } else {
        toast.success("Appointment created successfully!");
      }
    },
    onError: () => {
      toast.error("Failed to create appointment.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setDeleteConfirm(null);
    },
  });

  useEffect(() => {
    if (!socket) return;
    socket.on("appointmentCreated", () => queryClient.invalidateQueries({ queryKey: ["appointments"] }));
    socket.on("appointmentDeleted", () => queryClient.invalidateQueries({ queryKey: ["appointments"] }));
    socket.on("appointmentUpdated", () => queryClient.invalidateQueries({ queryKey: ["appointments"] }));
    return () => {
      socket.off("appointmentCreated");
      socket.off("appointmentDeleted");
      socket.off("appointmentUpdated");
    };
  }, [socket, queryClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All");
  const [dateFilter, setDateFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Doctor state for patient type
  const [patientType, setPatientType] = useState<"existing" | "new">("existing");

  const [newForm, setNewForm] = useState({
    patientId: "",
    patientName: "",
    patientPhone: "",
    therapy: "",
    date: "",
    time: "",
    notes: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Approval State
  const [approvalDialog, setApprovalDialog] = useState<Appointment | null>(null);
  const [approvalForm, setApprovalForm] = useState({ date: "", time: "" });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setApprovalDialog(null);
      toast.success("Appointment updated and approved!");
    },
    onError: () => {
      toast.error("Failed to update appointment.");
    }
  });

  const handleCreate = () => {
    const finalPatientId = isPatient ? currentPatient?.id : newForm.patientId;
    
    if (!isPatient && patientType === "new") {
      if (!newForm.patientName || !newForm.date || !newForm.time) {
        toast.error("Please fill patient name, phone, and preferred schedule.");
        return;
      }
    } else if (!isPatient && patientType === "existing") {
      if (!finalPatientId || !newForm.date || !newForm.time) {
        toast.error("Please fill all required fields before creating an appointment.");
        return;
      }
    } else {
      // isPatient
      const formName = newForm.patientName || user?.name;
      const formPhone = newForm.patientPhone || user?.phone;
      if (!formName || !formPhone || !newForm.date || !newForm.time) {
        toast.error("Please fill your name, phone number, and preferred schedule.");
        return;
      }
    }

    createMutation.mutate({
      patientId: patientType === "new" ? undefined : finalPatientId,
      patientName: isPatient ? (newForm.patientName || user?.name) : (patientType === "new" ? newForm.patientName : undefined),
      patientPhone: isPatient ? (newForm.patientPhone || user?.phone) : (patientType === "new" ? newForm.patientPhone : undefined),
      therapy: newForm.therapy || "General Appointment",
      date: newForm.date,
      time: newForm.time,
      status: isPatient ? "Pending" : "Scheduled",
      notes: newForm.notes,
    });
  };

  const handleApprove = () => {
    if (!approvalDialog) return;
    updateMutation.mutate({
      id: approvalDialog.id,
      data: {
        date: approvalForm.date,
        time: approvalForm.time,
        status: "Scheduled" // Update status to Scheduled (Approved)
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // ✅ Filtering
  const filtered = appointments.filter((appt) => {
    if (isPatient && appt.patient !== user?.name && appt.patientId !== user?.id) return false;
    
    return (
      (appt.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appt.therapy.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "All" || appt.status === statusFilter) &&
      (!dateFilter || appt.date === dateFilter)
    );
  });

  const grouped: Record<string, Appointment[]> = {};
  filtered.forEach((a) => {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });

  const dates = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Appointments</h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Add Appointment
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[480px] bg-card border border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-display text-foreground">New Appointment Request</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  {isPatient
                    ? "Fill out the details below to request a booking slot. Your request will be reviewed by the clinical team."
                    : "Schedule a patient's treatment session. If they are a new patient, select 'New Patient'."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {!isPatient && (
                  <div className="space-y-3">
                    <div className="flex gap-2 p-1 bg-muted rounded-lg">
                      <Button
                        type="button"
                        variant={patientType === "existing" ? "default" : "ghost"}
                        className="flex-1 text-xs py-1.5 h-auto"
                        onClick={() => setPatientType("existing")}
                      >
                        Existing Patient
                      </Button>
                      <Button
                        type="button"
                        variant={patientType === "new" ? "default" : "ghost"}
                        className="flex-1 text-xs py-1.5 h-auto"
                        onClick={() => setPatientType("new")}
                      >
                        New Patient
                      </Button>
                    </div>

                    {patientType === "existing" ? (
                      <Select onValueChange={(v) => setNewForm({ ...newForm, patientId: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Patient" /></SelectTrigger>
                        <SelectContent>
                          {patients.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2 border border-dashed border-border p-3 rounded-lg bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">New Patient Details</p>
                        <Input
                          placeholder="Full Name *"
                          value={newForm.patientName}
                          onChange={(e) => setNewForm({ ...newForm, patientName: e.target.value })}
                        />
                        <Input
                          placeholder="Phone Number *"
                          value={newForm.patientPhone}
                          onChange={(e) => setNewForm({ ...newForm, patientPhone: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {isPatient && (
                  <div className="grid grid-cols-2 gap-3 pb-2 mb-2 border-b border-border/30">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Patient Name *</label>
                      <Input
                        placeholder="Full Name"
                        value={newForm.patientName ?? user?.name ?? ""}
                        onChange={(e) => setNewForm({ ...newForm, patientName: e.target.value })}
                        className="bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Phone Number *</label>
                      <Input
                        placeholder="Phone Number"
                        value={newForm.patientPhone ?? user?.phone ?? ""}
                        onChange={(e) => setNewForm({ ...newForm, patientPhone: e.target.value })}
                        className="bg-slate-50"
                      />
                    </div>
                  </div>
                )}                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Preferred Date *</label>
                    <Input type="date"
                      value={newForm.date}
                      onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Preferred Time *</label>
                    <Input type="time"
                      value={newForm.time}
                      onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                      className="bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Reason for Visit / Notes</label>
                  <Textarea
                    placeholder="Please describe any specific symptoms or requests..."
                    value={newForm.notes || ""}
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                    className="bg-slate-50 resize-none min-h-[80px]"
                  />
                </div>

                {isPatient && (
                  <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl space-y-1.5 shadow-sm mt-2">
                    <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                      <CalendarDays className="w-4 h-4" />
                      <span>Avoid Conflicting Schedules</span>
                    </div>
                    <p className="text-[11px] text-blue-600/90 leading-relaxed">
                      To ensure faster approval, please cross-reference the <strong className="font-bold">Doctor Busy Slots</strong> guide to choose a free slot.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <Button onClick={handleCreate} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all rounded-xl">
                    {isPatient ? "Submit Booking Request" : "Schedule Appointment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Input
          placeholder="Search appointments by patient name or therapy..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-card border border-border shadow-sm rounded-xl py-5"
        />

        {/* Doctor View: Pending Approvals Panel */}
        {!isPatient && appointments.filter(a => a.status === "Pending").length > 0 && (
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold text-lg font-display">Pending Booking Requests ({appointments.filter(a => a.status === "Pending").length})</h2>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed -mt-2">
              Patients have requested the following booking slots. Please review, edit the final schedule if necessary to avoid conflicts, and click **Review & Approve**.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 mt-1">
              {appointments.filter(a => a.status === "Pending").map((appt) => (
                <div key={appt.id} className="p-4 rounded-xl border border-amber-200/60 bg-white shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{appt.patient}</p>
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold tracking-wider">Pending Approval</Badge>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mt-1">{appt.therapy}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{appt.date} at {formatTime12Hour(appt.time)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setApprovalDialog(appt);
                      setApprovalForm({ date: appt.date, time: appt.time });
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 h-auto rounded-lg shadow-sm"
                  >
                    Review & Approve
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient View: Busy Slots Guide */}
        {isPatient && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-base font-display">Doctor Availability (Conflicting Busy Hours)</h2>
            </div>
            <p className="text-xs text-slate-500">
              To guarantee your appointment is approved immediately, please choose a slot that **does not** overlap with any of the following confirmed bookings:
            </p>
            {appointments.filter(a => a.status === "Scheduled" || a.status === "Ongoing").length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium">All times and days are completely open! Feel free to book any slot.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {appointments
                  .filter(a => a.status === "Scheduled" || a.status === "Ongoing")
                  .map((a, i) => (
                    <Badge key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-xs px-2.5 py-1">
                      {a.date} @ {formatTime12Hour(a.time)} ({a.therapy})
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* List */}
        {dates.length === 0 ? (
          <div className="p-12 border border-dashed rounded-2xl text-center bg-card">
            <p className="text-muted-foreground">No appointments match your criteria.</p>
          </div>
        ) : (
          dates.map((date) => (
            <div key={date} className="space-y-3">
              <h2 className="font-bold font-display text-slate-500 text-sm uppercase tracking-wider mt-4">{date}</h2>

              <div className="grid gap-3">
              {grouped[date].map((appt) => {
                const Icon = STATUS_ICONS[appt.status];

                return (
                  <div key={appt.id} className="p-4 border rounded-2xl flex flex-col sm:flex-row justify-between gap-4 sm:gap-0 bg-card hover:shadow-md transition-all duration-200">
                    <div>
                      <p className="font-bold text-slate-900">{appt.patient}</p>
                      <p className="text-sm text-slate-500">{appt.therapy}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 sm:hidden flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTime12Hour(appt.time)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <p className="text-sm text-slate-600 font-medium hidden sm:block mr-2">{formatTime12Hour(appt.time)}</p>
                      <Badge className={STATUS_COLORS[appt.status]}>
                        {createElement(Icon, { className: "w-3 h-3 mr-1" })}
                        {appt.status}
                      </Badge>

                      <button onClick={() => setDeleteConfirm(appt.id)} className="p-2 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ))
        )}

        {/* Delete Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 bg-white">
              <p className="font-bold text-slate-900 text-lg">Delete this appointment?</p>
              <p className="text-slate-500 text-sm">This action will cancel the treatment schedule and remove all related notification reminders.</p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</Button>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Approval / Reschedule Modal */}
        {approvalDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 bg-white">
              <div className="flex items-center gap-2 text-amber-600">
                <CalendarDays className="w-6 h-6" />
                <h2 className="font-bold text-lg font-display">Approve & Confirm Booking</h2>
              </div>
              <p className="text-sm text-slate-500">
                Review and finalize the appointment schedule for <strong className="text-slate-800">{approvalDialog.patient}</strong> (Therapy: {approvalDialog.therapy}).
              </p>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Confirm Date</label>
                  <Input
                    type="date"
                    value={approvalForm.date}
                    onChange={(e) => setApprovalForm({ ...approvalForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Confirm Time</label>
                  <Input
                    type="time"
                    value={approvalForm.time}
                    onChange={(e) => setApprovalForm({ ...approvalForm, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setApprovalDialog(null)}
                  className="flex-1 border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={updateMutation.isPending}
                  className="flex-1 gradient-sage text-white font-semibold"
                >
                  {updateMutation.isPending ? "Confirming..." : "Approve Schedule"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}