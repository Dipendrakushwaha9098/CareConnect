import { motion } from "framer-motion";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, Leaf, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchNotifications, markNotificationRead } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { AnimatedGrid3D } from "@/components/AnimatedGrid3D";

const iconMap: Record<string, typeof Bell> = {
  appointment: CalendarDays,
  therapy: Leaf,
  reminder: Bell,
  message: MessageSquare,
  info: Bell,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });


  useEffect(() => {
    if (!socket) return;
    socket.on("notificationCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    socket.on("notificationUpdated", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return () => {
      socket.off("notificationCreated");
      socket.off("notificationUpdated");
    };
  }, [socket, queryClient]);

  const handleMarkRead = (id: string) => {
    mutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    notifications.filter(n => !n.read).forEach(n => {
      mutation.mutate(n.id);
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* 3D Animated Background */}
      <div className="fixed top-0 left-0 w-screen h-screen opacity-10 pointer-events-none z-0">
        <AnimatedGrid3D />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
        </div>
        <Button onClick={handleMarkAllRead} variant="ghost" size="sm" className="text-muted-foreground text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading notifications...</div>
      ) : (
        <div className="grid gap-3">
          {notifications.length === 0 && (
             <p className="text-sm text-muted-foreground py-4 text-center">No notifications</p>
          )}
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`glass-card-hover p-4 flex items-start gap-4 ${!n.read ? "border-l-2 border-l-primary cursor-pointer" : ""}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${!n.read ? "gradient-sage" : "bg-muted"}`}>
                  <Icon className={`w-4 h-4 ${!n.read ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
