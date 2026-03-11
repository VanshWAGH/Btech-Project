import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BookOpen, FileText, Calendar, CheckCheck, Loader2, BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const NOTIF_ICONS: Record<string, any> = {
  new_note: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/20" },
  new_course: { icon: BookOpen, color: "text-violet-400", bg: "bg-violet-500/20" },
  new_event: { icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  assignment_deadline: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/20" },
  announcement: { icon: Bell, color: "text-amber-400", bg: "bg-amber-500/20" },
};

export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <AppLayout>
      <div className="space-y-6 pb-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-primary/20 text-primary border-primary/30">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Stay up to date with your academic updates</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="bg-white/5 border-white/10 gap-2"
            >
              {markAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl opacity-60">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif: any, i: number) => {
              const iconConfig = NOTIF_ICONS[notif.type] || NOTIF_ICONS.announcement;
              const IconComponent = iconConfig.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass rounded-2xl p-4 border transition-all cursor-pointer hover:border-white/15 ${!notif.isRead ? "border-primary/20 bg-primary/5" : "border-white/5"}`}
                  onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${iconConfig.bg} flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!notif.isRead ? "text-white" : "text-gray-300"}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 opacity-60">
                        {format(new Date(notif.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
