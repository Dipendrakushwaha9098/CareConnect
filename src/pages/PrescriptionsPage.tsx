import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  IndianRupee,
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  Printer,
  Calendar,
  Pill,
  Stethoscope,
  Building2,
  User,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { fetchPrescriptions, fetchInvoices, fetchPatients } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const isPatient = user?.role === "patient";

  const [selectedRx, setSelectedRx] = useState<any | null>(null);

  const { data: prescriptions = [], isLoading: isLoadingRx } = useQuery<any[]>({
    queryKey: ["prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const { data: invoices = [], isLoading: isLoadingInv } = useQuery<any[]>({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const currentPatient = isPatient ? patients.find(p => p.name === user?.name || p.userId === user?.id) : null;

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (isPatient) {
      return rx.patient === user?.name || (currentPatient && rx.patient === currentPatient.name);
    }
    return true;
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (isPatient) {
      return inv.patient === user?.name || (currentPatient && inv.patient === currentPatient.name);
    }
    return true;
  });

  const handlePrint = (rx: any) => {
    setSelectedRx(rx);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body">
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-3xl font-black text-slate-900 tracking-tight">
              Prescriptions & Medical Billing
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Access digital prescriptions, medication dosage instructions, and billing statements.
            </p>
          </div>
        </div>

        {/* ── Prescriptions Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Digital Prescriptions ({filteredPrescriptions.length})
              </h2>
            </div>
          </div>

          {isLoadingRx ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-200 rounded-3xl text-center bg-white">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No Prescriptions On File</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {isPatient
                  ? "You do not have any active or past medical prescriptions yet. When your doctor prescribes medication during a consultation, it will appear here."
                  : "No prescriptions found matching patient records."}
              </p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
              {filteredPrescriptions.map((rx) => {
                let parsedMedicines: string[] = [];
                try {
                  parsedMedicines = JSON.parse(rx.medicines);
                } catch (e) {
                  parsedMedicines = rx.medicines ? [rx.medicines] : [];
                }

                const isActive = rx.status === "Active";

                return (
                  <motion.article
                    key={rx.id}
                    variants={itemVariants}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-blue-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Rx #{rx.id.substring(0, 8).toUpperCase()}
                          </span>
                          <Badge
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 ${
                              isActive
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {rx.status || "Active"}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Patient: <strong className="text-slate-800">{rx.patient}</strong> • Prescribed by Dr. {rx.doctor} • {rx.date}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {parsedMedicines.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 font-medium"
                            >
                              💊 {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRx(rx)}
                        className="rounded-xl text-xs font-semibold h-9 border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePrint(rx)}
                        className="rounded-xl text-xs font-semibold h-9 bg-blue-600 hover:bg-blue-700 text-white"
                        title="Print prescription"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5" />
                        Print / Download
                      </Button>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ── Billing Statements Section ── */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-600" />
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Billing Statements & Receipts ({filteredInvoices.length})
            </h2>
          </div>

          {isLoadingInv ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center bg-white">
              <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">No Invoices on Record</h3>
              <p className="text-xs text-slate-500 mt-1">
                All settled and upcoming consultation fees will be listed here.
              </p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-3">
              {filteredInvoices.map((inv) => (
                <motion.article
                  key={inv.id}
                  variants={itemVariants}
                  className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        Statement #{inv.id.substring(0, 8).toUpperCase()} — {inv.patient}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{inv.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-bold text-slate-900 text-base">{inv.amount}</span>
                    {inv.paid ? (
                      <Badge className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 font-semibold px-2.5 py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-teal-600" /> Settled
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-semibold px-2.5 py-0.5">
                        <Clock className="w-3 h-3 mr-1 text-amber-600" /> Pending Payment
                      </Badge>
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Prescription Review Dialog ── */}
        <Dialog open={Boolean(selectedRx)} onOpenChange={(open) => !open && setSelectedRx(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Medical Prescription Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Authorized clinical prescription under CareConnect Health Systems.
              </DialogDescription>
            </DialogHeader>

            {selectedRx && (
              <div className="space-y-4 py-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p><strong>Prescription ID:</strong> #{selectedRx.id}</p>
                  <p><strong>Patient Name:</strong> {selectedRx.patient}</p>
                  <p><strong>Attending Physician:</strong> Dr. {selectedRx.doctor}</p>
                  <p><strong>Date Issued:</strong> {selectedRx.date}</p>
                  <p><strong>Clinical Status:</strong> {selectedRx.status || "Active"}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900 mb-2">Prescribed Medications & Dosages:</p>
                  <div className="space-y-2">
                    {(() => {
                      let meds: string[] = [];
                      try {
                        meds = JSON.parse(selectedRx.medicines);
                      } catch (e) {
                        meds = selectedRx.medicines ? [selectedRx.medicines] : [];
                      }
                      return meds.map((m, idx) => (
                        <div key={idx} className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2">
                          <Pill className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-800">{m}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 inline mr-1" />
                  Prescription transmitted electronically to patient profile. Verified under healthcare compliance protocols.
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedRx(null)}
                className="rounded-xl h-10 text-xs font-semibold"
              >
                Close
              </Button>
              <Button
                onClick={() => handlePrint(selectedRx)}
                className="rounded-xl h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Prescription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
