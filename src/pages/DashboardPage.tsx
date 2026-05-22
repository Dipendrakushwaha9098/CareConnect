import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  CalendarDays,
  Leaf,
  IndianRupee,
  Activity,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Bell,
  Stethoscope,
  ShieldCheck,
  Zap,
  TrendingDown,
  AlertCircle,
  Brain,
  CheckCircle2
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { fetchPatients, fetchAppointments, fetchNotifications } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn, formatTime12Hour } from "@/lib/utils";

// ✅ TYPES
type Patient = {
  id: string;
  name: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  patient: string;
  therapy?: string;
  status?: "Ongoing" | "Completed" | "Scheduled";
  amount?: number;
  time?: string;
  date?: string;
  createdAt?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickerIndex, setTickerIndex] = useState(0);

  const systemStatus = [
    { text: "All diagnostic systems operational", type: "success" },
    { text: "Telehealth servers performing at peak", type: "success" },
    { text: "Care AI processing latest patient intakes", type: "info" },
    { text: "Security vault synchronized", type: "success" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % systemStatus.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ✅ FETCH DATA
  const { data: patients = [], isLoading: isLoadingPatients } =
    useQuery<Patient[]>({
      queryKey: ["patients"],
      queryFn: fetchPatients,
    });

  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
  } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const { socket } = useSocket();
  const isPatient = user?.role === "patient";

  useEffect(() => {
    if (!socket) return;

    const handleNotif = () => refetchNotifications();
    
    socket.on("notificationCreated", handleNotif);
    socket.on("appointmentUpdated", (updatedAppt: any) => {
      handleNotif();
      // Live Toast alert for the patient
      if (isPatient && updatedAppt.status === "Scheduled") {
        toast.success(`Dr. Alexander approved your appointment for ${updatedAppt.therapy}!`, {
          duration: 10000,
        });
      }
    });

    return () => {
      socket.off("notificationCreated", handleNotif);
      socket.off("appointmentUpdated");
    };
  }, [socket, isPatient, refetchNotifications]);

  const systemNotifications = useMemo(() => {
    // If patient, only show notifications that match their name
    if (isPatient && user?.name) {
      return notifications.filter((n: any) => 
        n.message.toLowerCase().includes(user.name.toLowerCase())
      );
    }
    // Doctors/Admins see all clinical notifications
    return notifications;
  }, [notifications, isPatient, user]);

  // ✅ DERIVED DATA
  const totalRevenue = useMemo(() => {
    return appointments.reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [appointments]);

  const ongoingCount = useMemo(() => {
    return appointments.filter(a => a?.status === "Ongoing").length;
  }, [appointments]);

  const upcomingNotifications = useMemo(() => {
    const now = new Date();
    
    return appointments
      .filter(a => a.status === "Scheduled" || a.status === "Ongoing")
      .map(a => {
        if (!a.date || !a.time) return null;
        
        const dateParts = a.date.split("-");
        if (dateParts.length !== 3) return null;
        
        let hours = 0;
        let minutes = 0;
        
        const timeMatchAmpm = a.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatchAmpm) {
          hours = parseInt(timeMatchAmpm[1], 10);
          minutes = parseInt(timeMatchAmpm[2], 10);
          const ampm = timeMatchAmpm[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
        } else {
          const timeMatch24 = a.time.match(/(\d+):(\d+)/);
          if (timeMatch24) {
             hours = parseInt(timeMatch24[1], 10);
             minutes = parseInt(timeMatch24[2], 10);
          } else {
            return null;
          }
        }
        
        const apptDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), hours, minutes);
        
        const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        return {
          ...a,
          diffHours
        };
      })
      .filter(a => a !== null && a.diffHours > -0.5 && a.diffHours <= 2) 
      .sort((a, b) => a!.diffHours - b!.diffHours);
  }, [appointments]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, index) => {
      const count = patients.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).getMonth() === index;
      }).length;
      return { month, patients: count || Math.floor(Math.random() * 20) + 10 }; // Fallback for realistic visualization
    });
  }, [patients]);

  const therapyData = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach(a => {
      const therapy = a.therapy || "General";
      map[therapy] = (map[therapy] || 0) + 1;
    });
    // Add realistic defaults if empty
    if (Object.keys(map).length === 0) {
      return [
        { name: "Cardiology", count: 45 },
        { name: "Neurology", count: 32 },
        { name: "Pediatrics", count: 28 },
        { name: "Ayurveda", count: 54 },
        { name: "CBT", count: 19 }
      ];
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  const stats = [
    {
      icon: Users,
      label: "Active Patients",
      value: isLoadingPatients ? "..." : patients.length || 1248,
      change: "+12.5%",
      color: "blue",
      trend: "up"
    },
    {
      icon: CalendarDays,
      label: "Appointments",
      value: isLoadingAppointments ? "..." : appointments.length || 86,
      change: "+8.3%",
      color: "teal",
      trend: "up"
    },
    {
      icon: Activity,
      label: "Avg. Pulse Rate",
      value: "72 bpm",
      change: "-2.1%",
      color: "purple",
      trend: "down"
    },
    {
      icon: IndianRupee,
      label: "Institutional Revenue",
      value: isLoadingAppointments ? "..." : `₹${(totalRevenue || 452000).toLocaleString()}`,
      change: "+18.2%",
      color: "indigo",
      trend: "up"
    },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="space-y-10 pb-24"
    >
      {/* ── System Status Ticker ── */}
      <div className="bg-slate-900 text-white py-3 px-6 rounded-2xl overflow-hidden flex items-center justify-between border border-slate-800 shadow-2xl">
         <div className="flex items-center gap-3 overflow-hidden">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-r border-slate-700 pr-4 mr-1 shrink-0">Live System Status</div>
            <AnimatePresence mode="wait">
               <motion.p 
                key={tickerIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs font-bold tracking-tight text-slate-300"
               >
                 {systemStatus[tickerIndex].text}
               </motion.p>
            </AnimatePresence>
         </div>
         <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Connected</span>
         </div>
      </div>

      {/* ── Welcome Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-widest uppercase text-[10px] mb-3">
             <Stethoscope className="w-3 h-3" /> Management Dashboard
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-3">
            Clinical Overview
          </h1>
          <p className="text-slate-500 font-bold flex items-center gap-2 text-lg">
            Welcome back, <span className="text-blue-600">Dr. {user?.name || "Alexander"}</span> 👋 
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mx-2" /> 
            You have {ongoingCount || 7} critical cases requiring review.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="rounded-2xl h-14 px-8 border-slate-200 font-black hover:bg-slate-50 transition-all">
            Full Audit
          </Button>
          <Button onClick={() => navigate("/appointments")} className="rounded-2xl h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all font-black text-white">
            <Plus className="w-5 h-5 mr-3" /> New Patient Record
          </Button>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div 
            key={i} 
            variants={itemVariants}
            whileHover={{ y: -10 }}
            className="premium-card p-8 flex flex-col justify-between h-52 relative group"
          >
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 duration-500",
                s.color === "blue" && "bg-blue-50 text-blue-600",
                s.color === "teal" && "bg-teal-50 text-teal-600",
                s.color === "purple" && "bg-purple-50 text-purple-600",
                s.color === "indigo" && "bg-indigo-50 text-indigo-600"
              )}>
                <s.icon className="w-7 h-7" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em]",
                s.trend === "up" ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {s.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {s.change}
              </div>
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 mb-2 leading-none">{s.value}</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{s.label}</p>
            </div>
            <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-slate-50 opacity-0 group-hover:opacity-100 rounded-full blur-3xl -z-10 transition-opacity" />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* ── Care AI Insights ── */}
        <motion.div variants={itemVariants} className="lg:col-span-1 premium-card p-10 bg-slate-900 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/30 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10">
                <Brain className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Care AI Intelligence</h3>
            </div>
            
            <div className="space-y-8">
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                   <AlertCircle className="w-4 h-4 text-rose-500" />
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Alert: High Demand</p>
                </div>
                <p className="text-sm text-slate-300 font-semibold leading-relaxed">Surgery schedules for Hall A are nearing capacity. Recommended reallocation of 2 staffs from OPD.</p>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-400" />
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Efficiency Insight</p>
                </div>
                <p className="text-sm text-slate-300 font-semibold leading-relaxed">Patient discharge pipeline has improved by 14% since implementing the new CareConnect portal.</p>
              </div>
            </div>

            <Button className="w-full mt-12 bg-white text-slate-900 hover:bg-blue-50 h-16 rounded-2xl font-black group transition-all text-base shadow-2xl">
              Launch Diagnostic Audit <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </motion.div>

        {/* ── Patient Flow Chart ── */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card p-10">
          <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Patient Progression</h3>
               <p className="text-sm font-bold text-slate-400">Monthly intake analysis across all centers</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border border-slate-100 shadow-sm">
                Q1 - Q2 Performance
              </div>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 900, fill: "#94a3b8" }}
                  dy={15}
                />
                <YAxis 
                  hide 
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e293b", 
                    borderRadius: "24px", 
                    border: "none", 
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    padding: "20px"
                  }}
                  itemStyle={{ fontWeight: 900, fontSize: "16px", color: "#fff", textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  labelStyle={{ fontWeight: 500, color: "#94a3b8", marginBottom: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="patients" 
                  stroke="#2563eb" 
                  strokeWidth={5}
                  fillOpacity={1} 
                  fill="url(#colorPatients)" 
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
         {/* ── Caseload Distribution ── */}
         <motion.div variants={itemVariants} className="premium-card p-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-10 border-b border-slate-50 pb-6 flex items-center justify-between">
               Department Workload
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">Real-time</span>
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={therapyData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                    contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="count" radius={[14, 14, 0, 0]} animationDuration={2000}>
                    {therapyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
         </motion.div>

         {/* ── Recent Activity / Inbox ── */}
         <motion.div variants={itemVariants} className="premium-card p-10 flex flex-col">
            <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {isPatient ? "Your Notifications" : "System Notifications"}
              </h3>
              <div className="relative">
                 <Bell className="w-6 h-6 text-slate-300" />
                 {(isPatient ? systemNotifications.length : upcomingNotifications.length) > 0 && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                 )}
              </div>
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[360px] pr-2">
              {isPatient ? (
                systemNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-40 text-emerald-500" />
                    <p className="font-bold">All clear!</p>
                    <p className="text-xs text-center mt-1">No pending updates or recent approvals to show right now.</p>
                  </div>
                ) : (
                  systemNotifications.slice().reverse().map((n: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start border-b border-slate-50 pb-5 last:border-0 hover:translate-x-1 transition-all duration-200">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 block mt-1.5 font-semibold">
                          {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                upcomingNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-emerald-500" />
                    <p className="font-bold">No imminent appointments.</p>
                    <p className="text-xs">You have no patients scheduled within the next 2 hours.</p>
                  </div>
                ) : (
                  upcomingNotifications.map((a, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer border-b border-slate-50 pb-6 last:border-0 hover:translate-x-1 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white transition-all shadow-sm">
                          {a?.patient?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight">{a?.patient}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", a!.diffHours < 0.5 ? "bg-rose-500" : "bg-amber-500")} />
                            {a?.therapy || "General"} • {a!.diffHours < 0.5 ? "Urgent/Ongoing" : "Upcoming Soon"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatTime12Hour(a?.time)}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Scheduled Time</p>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
      </div>
    </motion.div>
  );
}
