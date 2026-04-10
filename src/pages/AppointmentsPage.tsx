import { useState, createElement, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Plus, Clock, CheckCircle2, AlertCircle, Calendar,
  Search, Phone, MessageSquare, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCubes3D } from "@/components/AnimatedCubes3D";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchAppointments, createAppointment, deleteAppointment, fetchPatients, fetchTreatments } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type AppointmentStatus = "Scheduled" | "Ongoing" | "Completed";

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
  Scheduled: "bg-blue-100 text-blue-800",
  Ongoing: "bg-green-100 text-green-800",
  Completed: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<AppointmentStatus, React.ElementType> = {
  Scheduled: Clock,
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
      setDialogOpen(false);
      setNewForm({ patientId: "", therapy: "", date: "", time: "", notes: "" });
      toast.success("Appointment created successfully!");
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
    return () => {
      socket.off("appointmentCreated");
      socket.off("appointmentDeleted");
    };
  }, [socket, queryClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All");
  const [dateFilter, setDateFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newForm, setNewForm] = useState({
    patientId: "",
    therapy: "",
    date: "",
    time: "",
    notes: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    const finalPatientId = isPatient ? currentPatient?.id : newForm.patientId;
    
    if (!finalPatientId || !newForm.therapy || !newForm.date || !newForm.time) {
      toast.error("Please fill all fields before creating an appointment.");
      return;
    }
    createMutation.mutate({
      patientId: finalPatientId,
      therapy: newForm.therapy,
      date: newForm.date,
      time: newForm.time,
      status: "Scheduled",
      notes: newForm.notes,
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
      {/* Background */}
      <div className="fixed inset-0 opacity-10">
        <AnimatedCubes3D />
      </div>

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

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Appointment</DialogTitle>
                <DialogDescription>
                  Fill out the details below to book a new appointment.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {!isPatient && (
                  <Select onValueChange={(v) => setNewForm({ ...newForm, patientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select onValueChange={(v) => setNewForm({ ...newForm, therapy: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Therapy/Service" /></SelectTrigger>
                  <SelectContent>
                    {treatments.map((t: any) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input type="date"
                  value={newForm.date}
                  onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                />

                <Input type="time"
                  value={newForm.time}
                  onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                />

                <Button onClick={handleCreate} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* List */}
        {dates.length === 0 ? (
          <p>No appointments match your criteria.</p>
        ) : (
          dates.map((date) => (
            <div key={date}>
              <h2 className="font-bold mb-3">{date}</h2>

              <div className="space-y-3">
              {grouped[date].map((appt) => {
                const Icon = STATUS_ICONS[appt.status];

                return (
                  <div key={appt.id} className="p-4 border rounded-xl flex flex-col sm:flex-row justify-between gap-4 sm:gap-0 bg-white">
                    <div>
                      <p className="font-medium">{appt.patient}</p>
                      <p className="text-sm text-muted-foreground">{appt.therapy}</p>
                      <p className="text-xs text-muted-foreground mt-1 sm:hidden">{appt.time}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <p className="text-sm text-muted-foreground hidden sm:block mr-2">{appt.time}</p>
                      <Badge className={STATUS_COLORS[appt.status]}>
                        {createElement(Icon, { className: "w-3 h-3 mr-1" })}
                        {appt.status}
                      </Badge>

                      <button onClick={() => setDeleteConfirm(appt.id)} className="p-2 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-4 rounded">
              <p>Delete this appointment?</p>
              <div className="flex gap-2 mt-2">
                <Button onClick={() => handleDelete(deleteConfirm)}>Yes</Button>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>No</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}