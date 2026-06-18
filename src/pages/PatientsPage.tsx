import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Phone,
  Mail,
  Eye,
  X,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPatients, createPatient, deletePatient } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { AnimatedGrid3D } from "@/components/AnimatedGrid3D";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  dosha: "Vata" | "Pitta" | "Kapha" | "Tridosha";
  phone: string;
  bloodGroup?: string;
  address?: string;
  medicalHistory?: string;
  lastVisit: string;
  status: "Active" | "Completed" | "Follow-up";
};

const doshaColor: Record<string, string> = {
  Vata: "bg-blue-100 text-blue-800",
  Pitta: "bg-orange-100 text-orange-800",
  Kapha: "bg-green-100 text-green-800",
  Tridosha: "bg-purple-100 text-purple-800",
};

const statusColor: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Completed: "bg-muted text-muted-foreground",
  "Follow-up": "bg-amber-100 text-amber-800",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setForm({ name: "", age: "", gender: "Male", dosha: "Vata" as Patient["dosha"], phone: "", bloodGroup: "O+", address: "", medicalHistory: "" });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setDeleteConfirm(null);
    },
  });

  useEffect(() => {
    if (!socket) return;
    socket.on("patientCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    });
    socket.on("patientDeleted", () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    });
    return () => {
      socket.off("patientCreated");
      socket.off("patientDeleted");
    };
  }, [socket, queryClient]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "Active" | "Completed" | "Follow-up">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", age: "", gender: "Male", dosha: "Vata" as Patient["dosha"], phone: "", bloodGroup: "O+", address: "", medicalHistory: "" });

  const filtered = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.phone.includes(search);
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Total Patients", value: patients.length, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Active", value: patients.filter((p) => p.status === "Active").length, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
    { label: "Follow-up", value: patients.filter((p) => p.status === "Follow-up").length, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Completed", value: patients.filter((p) => p.status === "Completed").length, icon: AlertCircle, color: "bg-gray-50 text-gray-600" },
  ];

  const handleAdd = () => {
    if (!form.name || !form.age || !form.phone) return;
    createMutation.mutate({
      name: form.name,
      age: Number(form.age),
      gender: form.gender,
      dosha: form.dosha,
      phone: form.phone,
      bloodGroup: form.bloodGroup,
      address: form.address,
      medicalHistory: form.medicalHistory,
      lastVisit: new Date().toISOString().split("T")[0],
      status: "Active",
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 3D Animated Background */}
      <div className="fixed top-0 left-0 w-screen h-screen opacity-10 pointer-events-none z-0">
        <AnimatedGrid3D />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Patients</h1>
            <p className="text-sm text-muted-foreground mt-1">{patients.length} total patients</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="gradient-sage text-primary-foreground border-0 btn-ripple w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Add Patient
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="bg-card border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Register New Patient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground text-sm font-semibold">Full Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Enter full name"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm font-semibold">Age *</Label>
                    <Input
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      placeholder="Age"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-foreground text-sm font-semibold">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground text-sm font-semibold">Phone Number *</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm font-semibold">Blood Group</Label>
                    <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                           <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground text-sm font-semibold">Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Residential address"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-foreground text-sm font-semibold">Medical History / Allergies</Label>
                  <Input
                    value={form.medicalHistory}
                    onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                    placeholder="e.g. Asthma, Peanuts allergy..."
                    className="mt-1.5"
                  />
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleAdd}
                    disabled={createMutation.isPending}
                    className="w-full gradient-sage text-primary-foreground border-0 btn-ripple"
                  >
                    {createMutation.isPending ? "Adding Patient..." : "Add Patient"}
                  </Button>
                </motion.div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="premium-card p-6 flex flex-col justify-between h-36 relative group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color} shadow-sm`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <Badge className="bg-slate-50 text-slate-400 border border-slate-100/80 text-[8px] uppercase tracking-widest font-black">Verified</Badge>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 leading-none mb-1">{stat.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-2 sm:gap-3"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Completed">Completed</option>
        </select>
      </motion.div>

      {/* Patient List */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent mx-auto mb-3"
          />
          <p className="text-muted-foreground">Loading patients...</p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 text-center"
        >
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">{search || filterStatus !== "all" ? "No patients match your search" : "No patients yet. Add one to get started."}</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3"
        >
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                variants={itemVariants}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card-hover p-5 hover:shadow-md transition-all duration-300 group border-l-4 border-l-blue-600/30 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-md shadow-blue-100"
                  >
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <p className="font-black text-slate-900 text-base sm:text-lg tracking-tight leading-none">{p.name}</p>
                      <Badge className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border ${doshaColor[p.dosha]}`}>
                        {p.dosha}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-bold flex flex-wrap gap-2.5 items-center">
                      <span>Age: {p.age}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{p.gender}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-slate-400 font-semibold">{p.phone}</span>
                    </p>
                  </div>

                  {/* Status and Actions - Desktop */}
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 ${statusColor[p.status]}`}>
                        {p.status}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Last Visit: {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : "N/A"}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedPatient(p)}
                        className="p-2.5 rounded-xl hover:bg-blue-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="View details"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDeleteConfirm(p.id)}
                        className="p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Delete patient"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Status - Mobile */}
                  <div className="sm:hidden">
                    <Badge className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 ${statusColor[p.status]}`}>
                      {p.status}
                    </Badge>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="sm:hidden flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPatient(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDeleteConfirm(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Patient Details Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPatient(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl border border-border p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">Patient Details</h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setSelectedPatient(null)}
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-sage flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {selectedPatient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">{selectedPatient.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPatient.age} years old</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">GENDER</p>
                    <p className="text-foreground font-medium">{selectedPatient.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">DOSHA</p>
                    <Badge className={doshaColor[selectedPatient.dosha]}>{selectedPatient.dosha}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">BLOOD GROUP</p>
                    <p className="text-foreground font-medium text-sm">{selectedPatient.bloodGroup || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">LAST VISIT</p>
                    <p className="text-foreground font-medium text-sm">
                      {selectedPatient.lastVisit ? new Date(selectedPatient.lastVisit).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 py-2 border-b border-border">
                  {selectedPatient.address && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold">ADDRESS</p>
                      <p className="text-foreground text-sm">{selectedPatient.address}</p>
                    </div>
                  )}
                  {selectedPatient.medicalHistory && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold">MEDICAL HISTORY</p>
                      <p className="text-foreground text-sm bg-muted p-2 rounded-md">{selectedPatient.medicalHistory}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">CONTACT</p>
                  <motion.button
                    whileHover={{ x: 5 }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4" /> {selectedPatient.phone}
                  </motion.button>
                </div>

                <div className="pt-4 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPatient(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setDeleteConfirm(selectedPatient.id);
                      setSelectedPatient(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    Delete Patient
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl border border-border p-6 max-w-sm w-full shadow-xl"
            >
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>

              <h2 className="font-display text-lg font-bold text-foreground text-center mb-2">Delete Patient?</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                This action cannot be undone. All patient data will be permanently deleted.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
