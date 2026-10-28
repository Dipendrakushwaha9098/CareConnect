import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Pill,
  ShieldCheck,
  CheckCircle2,
  Check,
  RotateCcw,
  Trash2,
  ExternalLink,
  Filter,
  Clock,
  Sparkles,
  Inbox,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Info,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
  triggerUpcomingReminders,
  NotificationFilterParams
} from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/context/AuthContext";
import { AnimatedGrid3D } from "@/components/AnimatedGrid3D";
import { toast } from "sonner";

type CategoryFilter = "all" | "appointment" | "prescription" | "account" | "general";
type StatusFilter = "all" | "unread" | "read";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
}

function getCategoryIcon(category?: string, type?: string) {
  if (category === "appointment" || type === "appointment") return CalendarDays;
  if (category === "prescription" || type === "prescription") return Pill;
  if (category === "account" || type === "account") return ShieldCheck;
  if (type === "warning") return AlertCircle;
  return Bell;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Query notifications with filters & pagination
  const {
    data: responseData,
    isLoading,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ["notifications", { category, status, page, limit }],
    queryFn: () => fetchNotifications({ category, status, page, limit }),
    placeholderData: (prev) => prev,
  });

  const notifications: any[] = Array.isArray(responseData)
    ? responseData
    : responseData?.data || [];
  const pagination = responseData?.pagination || {
    total: notifications.length,
    unreadCount: notifications.filter((n: any) => !n.read).length,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const handleUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const handleDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const handleAllRead = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notificationCreated", handleCreated);
    socket.on("notificationUpdated", handleUpdated);
    socket.on("notificationDeleted", handleDeleted);
    socket.on("notificationsAllRead", handleAllRead);

    return () => {
      socket.off("notificationCreated", handleCreated);
      socket.off("notificationUpdated", handleUpdated);
      socket.off("notificationDeleted", handleDeleted);
      socket.off("notificationsAllRead", handleAllRead);
    };
  }, [socket, queryClient]);

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Failed to mark notification as read.")
  });

  const markUnreadMutation = useMutation({
    mutationFn: markNotificationUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked as unread");
    },
    onError: () => toast.error("Failed to mark notification as unread.")
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all notifications as read.")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification removed");
    },
    onError: () => toast.error("Failed to delete notification.")
  });

  const triggerRemindersMutation = useMutation({
    mutationFn: triggerUpcomingReminders,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(data?.message || "24-Hour reminders dispatched successfully!");
    },
    onError: () => toast.error("Failed to trigger reminders.")
  });

  const handleActionClick = (link?: string, notifId?: string, isRead?: boolean) => {
    if (!isRead && notifId) {
      markReadMutation.mutate(notifId);
    }
    if (link) {
      navigate(link);
    }
  };

  const categories = [
    { id: "all", label: "All Updates", icon: Inbox },
    { id: "appointment", label: "Appointments", icon: CalendarDays },
    { id: "prescription", label: "Prescriptions", icon: Pill },
    { id: "account", label: "Account & Access", icon: ShieldCheck },
    { id: "general", label: "General", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-screen h-screen opacity-5 pointer-events-none z-0">
        <AnimatedGrid3D />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                  Notification Center
                  {pagination.unreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      {pagination.unreadCount} unread
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500">
                  Stay informed on appointments, clinical prescriptions, schedule updates, and care activity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {pagination.unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-teal-700 hover:text-teal-800 bg-teal-50/50 hover:bg-teal-100/50 border-teal-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Mark all as read
              </Button>
            )}

            {(user?.role === "doctor" || user?.role === "admin") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerRemindersMutation.mutate()}
                disabled={triggerRemindersMutation.isPending}
                className="text-xs text-blue-700 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100/50 border-blue-200"
                title="Send upcoming 24-hour appointment reminders to scheduled patients and doctors"
              >
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Check Reminders
              </Button>
            )}
          </div>
        </div>

        {/* FILTERS & CATEGORY TABS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id as CategoryFilter);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            {(["all", "unread", "read"] as StatusFilter[]).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  status === st
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st === "all" ? "All" : st === "unread" ? "Unread" : "Read"}
              </button>
            ))}
          </div>
        </div>

        {/* NOTIFICATIONS LIST CONTAINER */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            /* EMPTY STATE */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-16 border border-slate-200/80 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                {status === "unread" ? (
                  <Sparkles className="w-8 h-8 text-amber-500" />
                ) : (
                  <Inbox className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {status === "unread"
                    ? "You're all caught up!"
                    : "No notifications found"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {status === "unread"
                    ? "There are no unread notifications right now. Check back later or switch filters to view past history."
                    : category !== "all"
                    ? `No notifications in the "${category}" category. New updates will automatically appear here in real-time.`
                    : "Important appointment updates, prescriptions, reminders, and alerts will appear in your notification feed."}
                </p>
              </div>
              {(status !== "all" || category !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategory("all");
                    setStatus("all");
                    setPage(1);
                  }}
                  className="text-xs text-slate-600 border-slate-200 mt-2"
                >
                  Reset Filters
                </Button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications.map((notif: any, index: number) => {
                const Icon = getCategoryIcon(notif.category, notif.type);
                const isUnread = !notif.read;
                const isWarning = notif.type === "warning";
                const isSuccess = notif.type === "success";

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.03 }}
                    className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isUnread
                        ? "border-teal-200 bg-teal-50/20 shadow-xs hover:border-teal-300"
                        : "border-slate-200/80 hover:border-slate-300 opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Unread Left Border Highlight Indicator */}
                    {isUnread && (
                      <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-teal-500 to-blue-600 rounded-r-md" />
                    )}

                    {/* Main Content Area */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0 pl-1">
                      {/* Icon Avatar */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isUnread
                            ? isWarning
                              ? "bg-amber-100/80 text-amber-800 border-amber-200"
                              : isSuccess
                              ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                              : "bg-teal-100/80 text-teal-800 border-teal-200 shadow-xs"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Text info */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-sm tracking-tight ${
                              isUnread ? "font-bold text-slate-900" : "font-medium text-slate-800"
                            }`}
                          >
                            {notif.title}
                          </h4>

                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                          )}

                          {notif.category && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                              {notif.category}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Navigation */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                      {/* Navigation Deep Link */}
                      {notif.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActionClick(notif.link, notif.id, notif.read)}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 h-8 px-3 rounded-xl"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          View Details
                        </Button>
                      )}

                      {/* Read / Unread Toggle */}
                      {isUnread ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate(notif.id)}
                          disabled={markReadMutation.isPending}
                          className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8 px-2.5 rounded-xl"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Read
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markUnreadMutation.mutate(notif.id)}
                          disabled={markUnreadMutation.isPending}
                          className="text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8 px-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as unread"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Unread
                        </Button>
                      )}

                      {/* Delete / Dismiss */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(notif.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500">
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{" "}
              <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} notifications)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="text-xs h-8 px-3 rounded-xl border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || isLoading}
                className="text-xs h-8 px-3 rounded-xl border-slate-200"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
