import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  ShieldAlert,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  LogOut,
  Menu,
  Activity,
  HeartPulse,
  X,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", path: "/patients", icon: Users },
  { name: "Schedule", path: "/appointments", icon: Calendar },
  { name: "Clinical Dept", path: "/treatments", icon: Activity },
  { name: "E-Prescriptions", path: "/prescriptions", icon: FileText },
  { name: "Emergency", path: "/support", icon: ShieldAlert },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();

  const NavLink = ({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) => {
    const isActive = location.pathname === item.path;

    return (
      <Link to={item.path}>
        <motion.div
          whileHover={{ x: 8, backgroundColor: isActive ? "" : "rgba(255,255,255,0.05)" }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all mb-2",
            isActive
              ? "bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] font-black"
              : "text-slate-400 font-bold hover:text-white"
          )}
        >
          <item.icon className={cn("w-6 h-6", isActive ? "text-white" : "text-slate-500")} />
          {!isCollapsed && <span className="text-base tracking-tight">{item.name}</span>}
          {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#fafbfc] font-body">

      {/* SIDEBAR */}
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 90 : 300 }}
        className="hidden md:flex flex-col bg-slate-900 border-r border-slate-800 relative z-30"
      >
        <div className="p-8 flex justify-between items-center mb-6">
          {!isSidebarCollapsed && (
            <Link to="/" className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900">
                  <HeartPulse className="w-6 h-6 text-white" />
               </div>
               <span className="font-heading text-xl font-black text-white tracking-tighter">CareConnect</span>
            </Link>
          )}

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", isSidebarCollapsed && "rotate-180")} />
          </button>
        </div>

        <div className="flex-1 px-4">
          <div className="mb-8 px-4">
             <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", isSidebarCollapsed && "hidden")}>Main Menu</p>
          </div>
          {mainNavItems.map((item) => (
            <NavLink key={item.path} item={item} isCollapsed={isSidebarCollapsed} />
          ))}
          
          <div className="mt-12 mb-6 px-4">
             <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", isSidebarCollapsed && "hidden")}>System Account</p>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-rose-400 font-bold hover:bg-rose-500/10 transition-all">
            <LogOut className="w-6 h-6" />
            {!isSidebarCollapsed && <span className="text-base">Logout System</span>}
          </button>
        </div>

        {/* PROMO CARD IN SIDEBAR */}
        {!isSidebarCollapsed && (
           <div className="p-6 m-4 mt-auto rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <Brain className="w-8 h-8 text-blue-200 mb-4" />
              <p className="text-sm font-black text-white mb-1">Care AI Pro</p>
              <p className="text-xs text-blue-100 font-medium mb-4 leading-relaxed">Upgrade to unlock predictive analytics.</p>
              <Button className="w-full h-10 bg-white text-blue-600 hover:bg-blue-50 text-xs font-black rounded-xl">
                 Upgrade Now
              </Button>
           </div>
        )}
      </motion.aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">

        {/* TOPBAR */}
        <header className="h-24 flex items-center justify-between px-10 bg-white border-b border-slate-100 relative z-20">
          
          <div className="flex items-center gap-8 flex-1">
             <button className="md:hidden w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center" onClick={() => setIsMobileOpen(true)}>
               <Menu className="w-6 h-6 text-slate-900" />
             </button>

             <div className="relative w-full max-w-md hidden md:block">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
               <input
                 className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 font-medium transition-all"
                 placeholder="Search medical records, patients..."
               />
             </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center relative hover:bg-slate-100 transition-colors">
               <Bell className="w-6 h-6 text-slate-500" />
               <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            
            <div className="h-10 w-px bg-slate-100 mx-2" />

            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <p className="font-black text-slate-900 text-sm">{user?.name || "Dr. Alexander"}</p>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Medical Admin</p>
               </div>
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-100 ring-4 ring-blue-50/50">
                 {user?.name?.[0] || "A"}
               </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#fafbfc]">
           <div className="max-w-7xl mx-auto">
              {children}
           </div>
        </main>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-slate-900 z-50 p-8 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-12">
                 <div className="flex items-center gap-3">
                    <HeartPulse className="w-8 h-8 text-blue-500" />
                    <span className="font-heading text-2xl font-black text-white tracking-tight">CareConnect</span>
                 </div>
                 <button 
                  onClick={() => setIsMobileOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1">
                {mainNavItems.map((item) => (
                  <NavLink key={item.path} item={item} isCollapsed={false} />
                ))}
              </div>

              <div className="mt-auto border-t border-slate-800 pt-8">
                 <button onClick={logout} className="flex items-center gap-4 text-rose-400 font-black text-lg">
                   <LogOut className="w-7 h-7" /> Logout System
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppLayout;