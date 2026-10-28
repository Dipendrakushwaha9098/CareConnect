import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
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
  Brain,
  UserCog,
  CheckCircle2,
  CalendarDays,
  Pill,
  Clock,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Query recent notifications for bell dropdown
  const { data: notifData } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => fetchNotifications({ limit: 5 }),
    enabled: !!user,
  });

  const recentNotifications: any[] = Array.isArray(notifData)
    ? notifData
    : notifData?.data || [];
  const unreadCount = notifData?.pagination?.unreadCount ?? recentNotifications.filter((n: any) => !n.read).length;

  useEffect(() => {
    if (!socket) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    socket.on("notificationCreated", invalidate);
    socket.on("notificationUpdated", invalidate);
    socket.on("notificationsAllRead", invalidate);
    socket.on("notificationDeleted", invalidate);
    return () => {
      socket.off("notificationCreated", invalidate);
      socket.off("notificationUpdated", invalidate);
      socket.off("notificationsAllRead", invalidate);
      socket.off("notificationDeleted", invalidate);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen]);


  // Role-specific nav items
  const getNavItems = (): NavItem[] => {
    if (user?.role === "admin") {
      return [
        { name: "Hospital Admin", path: "/admin/dashboard", icon: UserCog },
        { name: "Clinical Overview", path: "/doctor/dashboard", icon: LayoutDashboard },
        { name: "Patients", path: "/patients", icon: Users },
        { name: "Clinical Schedule", path: "/appointments", icon: Calendar },
        { name: "Hospital Depts", path: "/treatments", icon: Activity },
        { name: "E-Prescriptions", path: "/prescriptions", icon: FileText },
        { name: "Advanced Tools", path: "/advanced-tools", icon: Brain },
        { name: "Emergency Hub", path: "/support", icon: ShieldAlert },
      ];
    }

    if (user?.role === "doctor") {
      return [
        { name: "Clinical Overview", path: "/doctor/dashboard", icon: LayoutDashboard },
        { name: "Patients Directory", path: "/patients", icon: Users },
        { name: "My Schedule", path: "/appointments", icon: Calendar },
        { name: "Clinical Services", path: "/treatments", icon: Activity },
        { name: "E-Prescriptions", path: "/prescriptions", icon: FileText },
        { name: "Advanced Tools", path: "/advanced-tools", icon: Brain },
        { name: "Emergency Hub", path: "/support", icon: ShieldAlert },
      ];
    }

    // Default: Patient
    return [
      { name: "My Health Hub", path: "/patient/dashboard", icon: LayoutDashboard },
      { name: "Book & Schedule", path: "/appointments", icon: Calendar },
      { name: "My Prescriptions", path: "/prescriptions", icon: FileText },
      { name: "Clinical Services", path: "/treatments", icon: Activity },
      { name: "Emergency Chat", path: "/support", icon: ShieldAlert },
    ];
  };

  const navItems = getNavItems();

  const NavLink = ({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) => {
    const isActive = location.pathname === item.path;

    return (
      <Link to={item.path}>
        <motion.div
          whileHover={{ x: 6, backgroundColor: isActive ? "" : "rgba(255,255,255,0.05)" }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all mb-1.5",
            isActive
              ? "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] font-black"
              : "text-slate-400 font-bold hover:text-white"
          )}
        >
          <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
          {!isCollapsed && <span className="text-sm tracking-tight">{item.name}</span>}
          {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
        </motion.div>
      </Link>
    );
  };

  const roleLabel =
    user?.role === "admin"
      ? "Hospital Administrator"
      : user?.role === "doctor"
      ? user.verificationStatus === "VERIFIED"
        ? "Licensed Doctor"
        : "Pending Doctor"
      : "Care Patient";

  const roleBadgeColor =
    user?.role === "admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : user?.role === "doctor"
      ? user.verificationStatus === "VERIFIED"
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-blue-100 text-blue-800 border-blue-200";

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#fafbfc] font-body">
      {/* SIDEBAR */}
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 90 : 280 }}
        className="hidden md:flex flex-col bg-slate-900 border-r border-slate-800 relative z-30"
      >
        <div className={cn("p-6 flex items-center mb-4", isSidebarCollapsed ? "justify-center flex-col gap-4 px-2" : "justify-between")}>
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900 shrink-0">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-heading text-xl font-black text-white tracking-tight">CareConnect</span>
            )}
          </Link>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", isSidebarCollapsed && "rotate-180")} />
          </button>
        </div>

        <div className="flex-1 px-4 overflow-y-auto">
          <div className="mb-4 px-2">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", isSidebarCollapsed && "hidden")}>
              {user?.role === "admin" ? "Admin Controls" : user?.role === "doctor" ? "Clinical Operations" : "Patient Services"}
            </p>
          </div>
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} isCollapsed={isSidebarCollapsed} />
          ))}

          <div className="mt-8 mb-3 px-2">
            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", isSidebarCollapsed && "hidden")}>Account</p>
          </div>
          <Link to="/settings">
            <motion.div
              whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.05)" }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-400 font-bold hover:text-white mb-1.5"
            >
              <Settings className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm">Settings</span>}
            </motion.div>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-rose-400 font-bold hover:bg-rose-500/10 transition-all text-left"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Promo / Info pill */}
        {!isSidebarCollapsed && (
          <div className="p-4 m-3 mt-auto rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-white">Active Session</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        )}
      </motion.aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* TOPBAR */}
        <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-100 relative z-20">
          <div className="flex items-center gap-6 flex-1">
            <button
              className="md:hidden w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-900" />
            </button>

            <div className="relative w-full max-w-sm hidden md:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-xs font-medium"
                placeholder="Search medical records, patients, doctors..."
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Interactive Notifications Bell & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors ${
                  isNotifOpen ? "bg-slate-200 text-slate-900" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden"
                  >
                    {/* Popover Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await markAllNotificationsRead();
                            queryClient.invalidateQueries({ queryKey: ["notifications"] });
                          }}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Popover List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {recentNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-medium text-slate-600">No notifications</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
                        </div>
                      ) : (
                        recentNotifications.map((n: any) => {
                          const isUnread = !n.read;
                          return (
                            <div
                              key={n.id}
                              onClick={async () => {
                                if (isUnread) {
                                  await markNotificationRead(n.id);
                                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                                }
                                setIsNotifOpen(false);
                                if (n.link) {
                                  navigate(n.link);
                                } else {
                                  navigate("/notifications");
                                }
                              }}
                              className={`p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-3 ${
                                isUnread ? "bg-teal-50/30" : "bg-white"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  isUnread
                                    ? n.type === "warning"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-teal-100 text-teal-800"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {n.category === "appointment" ? (
                                  <CalendarDays className="w-4 h-4" />
                                ) : n.category === "prescription" ? (
                                  <Pill className="w-4 h-4" />
                                ) : (
                                  <Bell className="w-4 h-4" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs truncate ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                    {n.title}
                                  </p>
                                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 py-1 block transition-colors"
                      >
                        View all in Notification Center →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


            <div className="h-8 w-px bg-slate-100 mx-1" />

            {/* User Profile display with Verified Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="font-black text-slate-900 text-sm leading-tight">{user?.name || "User"}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2", roleBadgeColor)}>
                    {roleLabel}
                  </Badge>
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-100">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#fafbfc]">
          <div className="max-w-7xl mx-auto">{children}</div>
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
              className="fixed left-0 top-0 h-full w-72 bg-slate-900 z-50 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <HeartPulse className="w-7 h-7 text-blue-500" />
                  <span className="font-heading text-xl font-black text-white">CareConnect</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                {navItems.map((item) => (
                  <div key={item.path} onClick={() => setIsMobileOpen(false)}>
                    <NavLink item={item} isCollapsed={false} />
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t border-slate-800 pt-6">
                <button onClick={logout} className="flex items-center gap-3 text-rose-400 font-bold text-sm">
                  <LogOut className="w-5 h-5" /> Sign Out
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