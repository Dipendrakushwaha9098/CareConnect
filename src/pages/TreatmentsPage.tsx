import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Clock, CheckCircle2, Plus, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTreatments, createTreatment } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export default function TreatmentsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    category: "",
    desc: "",
    duration: "30 mins",
    type: "",
    sessions: 1
  });

  const { data: therapies = [], isLoading } = useQuery<any[]>({
    queryKey: ["treatments"],
    queryFn: fetchTreatments,
  });

  const createMutation = useMutation({
    mutationFn: createTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      setIsDialogOpen(false);
      setNewService({ name: "", category: "", desc: "", duration: "30 mins", type: "", sessions: 1 });
      toast.success("Service added successfully!");
    },
    onError: () => {
      toast.error("Failed to add service.");
    }
  });

  const handleCreate = () => {
    if (!newService.desc || !newService.category) {
      toast.error("Please fill all required fields.");
      return;
    }
    const derivedName = `${newService.category} ${newService.type || "Service"}`.trim();
    createMutation.mutate({ ...newService, name: derivedName });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Services & Treatments</h1>
            <p className="text-sm text-muted-foreground mt-1">Medical services, therapies, and consultation types</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto flex gradient-sage text-primary-foreground border-0 btn-ripple">
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Clinical Service</DialogTitle>
                <DialogDescription>
                  Create a new treatment, service, or therapy program.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Category *</label>
                    <Select onValueChange={(v) => setNewService({ ...newService, category: v })}>
                      <SelectTrigger className="w-full bg-slate-50"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Medicine">General Medicine</SelectItem>
                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                        <SelectItem value="Dentistry">Dentistry</SelectItem>
                        <SelectItem value="Dermatology">Dermatology</SelectItem>
                        <SelectItem value="Neurology">Neurology</SelectItem>
                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                        <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                        <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Duration</label>
                    <Input 
                      placeholder="e.g. 45 mins" 
                      value={newService.duration}
                      onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Total Sessions</label>
                    <Input 
                      type="number"
                      min={1}
                      value={newService.sessions}
                      onChange={(e) => setNewService({ ...newService, sessions: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Type / Tag</label>
                    <Select onValueChange={(v) => setNewService({ ...newService, type: v })}>
                      <SelectTrigger className="w-full bg-slate-50"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Checkup">Checkup</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                        <SelectItem value="Screening">Screening</SelectItem>
                        <SelectItem value="Surgery">Surgery</SelectItem>
                        <SelectItem value="Therapy">Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider font-bold text-slate-500">Description *</label>
                  <Textarea 
                    placeholder="Brief description of the service..." 
                    className="resize-none"
                    value={newService.desc}
                    onChange={(e) => setNewService({ ...newService, desc: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">
                  Save Service
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading services...</div>
        ) : therapies.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No services available.</div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 gap-5"
          >
          {therapies.map((t) => {
            const progress = Math.round((t.completed / t.sessions) * 100);
            return (
              <motion.div
                key={t.id}
                variants={itemVariants}
                whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                className="glass-card-hover p-6 flex flex-col rounded-2xl transition-all duration-300 bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl gradient-sage flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{t.name}</h3>
                      <span className="text-xs text-muted-foreground font-medium">{t.category || "General"}</span>
                    </div>
                  </div>
                  {t.type && (
                    <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                      {t.type}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{t.desc}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t.duration}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t.completed}/{t.sessions} sessions</span>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Activity Configured</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </motion.div>
            );
          })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
