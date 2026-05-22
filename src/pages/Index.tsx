import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Shield, Zap, Heart, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";


const features = [
  {
    icon: Heart,
    title: "Patient Wellness",
    description: "Comprehensive health tracking and personalized treatment plans for optimal wellness.",
  },
  {
    icon: Leaf,
    title: "Ayurvedic Expertise",
    description: "Evidence-based Panchkarma therapies with traditional Ayurvedic wisdom.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Secure, encrypted patient data with full compliance to healthcare standards.",
  },
  {
    icon: Zap,
    title: "Smart Scheduling",
    description: "AI-powered appointment scheduling and automated reminders.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Seamless communication between doctors, therapists, and support staff.",
  },
  {
    icon: CheckCircle2,
    title: "Real-time Analytics",
    description: "Track patient outcomes and clinic performance with live dashboards.",
  },
];


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FBF7F0] to-[#F5F1EB] overflow-hidden">
      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-4 sm:px-8 py-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-[#1C1008]">vedaCare</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-[#4A3828] hover:bg-white/50">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 border border-emerald-200">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">powered by AI & Ayurveda</span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-[#1C1008] leading-tight">
                Complete Clinic<br />
                <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Management Solution
                </span>
              </h1>
              <p className="text-lg text-[#8C7060] max-w-lg leading-relaxed">
                Streamline patient care, manage appointments, and track wellness outcomes with vedaCare—the intelligent Ayurvedic clinic platform.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="group">
                <Button className="bg-emerald-700 hover:bg-emerald-600 text-white h-13 px-8 text-base font-medium shadow-lg shadow-emerald-200/50 w-full sm:w-auto flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-[#E2D8C8] text-[#4A3828] hover:bg-white/50 h-13 px-8 text-base font-medium w-full sm:w-auto"
              >
                View Demo
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3 pt-6">
              {["✓ 14-day free trial", "✓ No credit card required", "✓ Full feature access"].map((item) => (
                <p key={item} className="text-sm text-[#8C7060] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {item}
                </p>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - Stats Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 gap-4 md:gap-6"
          >
            {[
              { number: "500+", label: "Active Clinics", icon: "🏥" },
              { number: "50K+", label: "Patient Records", icon: "👥" },
              { number: "99.9%", label: "Uptime", icon: "⚡" },
              { number: "24/7", label: "Support", icon: "🤝" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="glass-card p-6 text-center rounded-2xl backdrop-blur-sm bg-white/40 border border-white/60 hover:bg-white/60 transition-all"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="font-display text-2xl font-bold text-[#1C1008]">{stat.number}</div>
                <p className="text-xs text-[#8C7060] mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-4 sm:px-8 py-20"
        >
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1C1008] mb-4">
              Powerful Features for Modern Clinics
            </h2>
            <p className="text-lg text-[#8C7060] max-w-2xl mx-auto">
              Everything you need to manage your Ayurvedic clinic with confidence and ease.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="glass-card p-8 rounded-2xl backdrop-blur-sm bg-white/40 border border-white/60 hover:bg-white/60 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1C1008] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#8C7060] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center"
        >
          <div className="glass-card p-12 rounded-3xl backdrop-blur-sm bg-gradient-to-r from-emerald-100/40 to-amber-100/40 border border-white/60">
            <h3 className="font-display text-3xl md:text-4xl font-bold text-[#1C1008] mb-4">
              Ready to Transform Your Clinic?
            </h3>
            <p className="text-lg text-[#8C7060] mb-8 max-w-2xl mx-auto">
              Join hundreds of Ayurvedic clinics using vedaCare to provide better patient care and streamline operations.
            </p>
            <Link to="/login">
              <Button className="bg-emerald-700 hover:bg-emerald-600 text-white h-13 px-8 text-base font-medium shadow-lg shadow-emerald-200/50">
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="border-t border-white/20 px-4 sm:px-8 py-8 mt-20">
          <div className="max-w-7xl mx-auto text-center text-sm text-[#8C7060]">
            <p>© 2026 vedaCare. All rights reserved. | Committed to Ayurvedic Excellence</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
