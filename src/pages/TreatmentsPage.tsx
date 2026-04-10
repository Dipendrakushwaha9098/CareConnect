import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Clock, CheckCircle2, Plus, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatedTorii3D } from "@/components/AnimatedTorii3D";
import { useQuery } from "@tanstack/react-query";
import { fetchTreatments } from "@/lib/api";

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
  const { data: therapies = [], isLoading } = useQuery<any[]>({
    queryKey: ["treatments"],
    queryFn: fetchTreatments,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* 3D Animated Background */}
      <div className="fixed top-0 left-0 w-screen h-screen opacity-12 pointer-events-none z-0">
        <AnimatedTorii3D />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Services & Treatments</h1>
            <p className="text-sm text-muted-foreground mt-1">Medical services, therapies, and consultation types</p>
          </div>
          <Button className="w-full sm:w-auto flex gradient-sage text-primary-foreground border-0 btn-ripple">
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
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
