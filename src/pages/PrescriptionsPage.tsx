import { motion } from "framer-motion";
import { FileText, Download, IndianRupee, CheckCircle2, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCubes3D } from "@/components/AnimatedCubes3D";
import { useQuery } from "@tanstack/react-query";
import { fetchPrescriptions, fetchInvoices } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export default function PrescriptionsPage() {
  const { data: prescriptions = [], isLoading: isLoadingRx } = useQuery<any[]>({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const { data: invoices = [], isLoading: isLoadingInv } = useQuery<any[]>({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* 3D Animated Background */}
      <div className="fixed top-0 left-0 w-screen h-screen opacity-10 pointer-events-none z-0">
        <AnimatedCubes3D />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Prescriptions & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Digital prescriptions and invoices</p>
        </div>
        <Button className="w-full sm:w-auto flex gradient-sage text-primary-foreground border-0 btn-ripple">
          <Plus className="w-4 h-4 mr-2" /> Create New
        </Button>
      </motion.div>

      {/* Prescriptions */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Prescriptions</h2>
        {isLoadingRx ? (
          <p className="text-muted-foreground text-sm">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No prescriptions found.</p>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
            {prescriptions.map((rx) => {
              let parsedMedicines: string[] = [];
              try {
                parsedMedicines = JSON.parse(rx.medicines);
              } catch(e) { parsedMedicines = []; }

              return (
                <motion.div
                  key={rx.id}
                  variants={itemVariants}
                  className="glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl gradient-sage flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 sm:hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground text-sm">{rx.id.substring(0,8).toUpperCase()}</span>
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${rx.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                          {rx.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{rx.patient} • {rx.date}</p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 hidden sm:block">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{rx.id.substring(0,8).toUpperCase()}</span>
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${rx.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                        {rx.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{rx.patient} • {rx.doctor} • {rx.date}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {parsedMedicines.map((m, idx) => (
                        <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">{m}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:hidden w-full gap-2">
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {parsedMedicines.map((m, idx) => (
                        <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">{m}</span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t pt-2 border-slate-100">
                      <p className="text-xs text-muted-foreground truncate">Dr. {rx.doctor}</p>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-muted h-9 w-9 p-0 items-center justify-center">
                    <Download className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Invoices */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Invoices</h2>
        {isLoadingInv ? (
           <p className="text-muted-foreground text-sm">Loading invoices...</p>
        ) : invoices.length === 0 ? (
           <p className="text-muted-foreground text-sm">No invoices found.</p>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
            {invoices.map((inv) => (
                <motion.div
                  key={inv.id}
                  variants={itemVariants}
                  className="glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0 sm:hidden">
                      <div className="font-medium text-foreground text-sm">{inv.id.substring(0,8).toUpperCase()} — {inv.patient}</div>
                      <p className="text-xs text-muted-foreground">{inv.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <div className="font-medium text-foreground text-sm">{inv.id.substring(0,8).toUpperCase()} — {inv.patient}</div>
                    <p className="text-xs text-muted-foreground">{inv.date}</p>
                  </div>

                  <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                    <span className="font-display font-semibold text-foreground">{inv.amount}</span>
                    {inv.paid ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
