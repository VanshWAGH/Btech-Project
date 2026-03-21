import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BookOpen, FileText, Calendar, CheckCheck, Loader2, BellOff, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const NOTIF_ICONS: Record<string, any> = {
  new_note:             { icon: FileText,  color: "text-blue-600",   bg: "bg-blue-100"   },
  new_course:           { icon: BookOpen,  color: "text-violet-600", bg: "bg-violet-100" },
  new_event:            { icon: Calendar,  color: "text-emerald-600",bg: "bg-emerald-100"},
  assignment_deadline:  { icon: Calendar,  color: "text-orange-600", bg: "bg-orange-100" },
  announcement:         { icon: Bell,      color: "text-amber-600",  bg: "bg-amber-100"  },
};

export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = ["ADMIN", "UNIVERSITY_ADMIN", "TEACHER"].includes(
    user?.role?.toUpperCase() || ""
  );

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
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
    onError: () => toast({ title: "Failed to mark notification as read", variant: "destructive" }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
    onError: () => toast({ title: "Failed to mark all as read", variant: "destructive" }),
  });

  // Create a test notification to verify the system works
  const createTestMutation = useMutation({
    mutationFn: async () => {
      const types = ["announcement", "new_note", "new_course", "new_event"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const res = await fetch("/api/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: randomType,
          title: "Test Notification",
          message: "This is a test notification created to verify the notification system is working correctly.",
        }),
      });
      if (!res.ok) throw new Error("Failed to create notification");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Test notification created!" });
    },
    onError: (err: any) => toast({ title: `Error: ${err.message}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Notification removed" });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const formatDate = (dateStr: string | Date | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
        {/* Moodle-style page header */}
        <div className="bg-white border border-[#dee2e6] rounded-sm shadow-sm mb-4">
          <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#dee2e6]">
            <h1 className="font-semibold text-sm text-[#212529] uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0f6cb6]" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-600 text-white border-none text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </h1>
          </div>
          <div className="px-4 py-3 flex items-center justify-between bg-white">
            <p className="text-sm text-[#6c757d]">Stay up to date with your academic updates</p>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createTestMutation.mutate()}
                  disabled={createTestMutation.isPending}
                  className="text-xs border-[#dee2e6] text-[#495057] hover:bg-[#e9ecef] gap-1"
                >
                  {createTestMutation.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Plus className="w-3 h-3" />}
                  Test Notification
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-xs border-[#dee2e6] text-[#0f6cb6] hover:bg-[#e9ecef] gap-1"
                >
                  {markAllMutation.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCheck className="w-3 h-3" />}
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white border border-[#dee2e6] rounded-sm shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#0f6cb6]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <BellOff className="w-12 h-12 mx-auto mb-3 text-[#adb5bd]" />
              <p className="text-base font-medium text-[#495057]">No notifications yet</p>
              <p className="text-sm text-[#6c757d] mt-1">
                {isAdmin
                  ? `You're all caught up! Use the "Test Notification" button above to create one.`
                  : "You're all caught up! Notifications will appear here when admins broadcast updates."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e9ecef]">
              {notifications.map((notif: any, i: number) => {
                const iconConfig = NOTIF_ICONS[notif.type] || NOTIF_ICONS.announcement;
                const IconComponent = iconConfig.icon;
                return (
                  <div
                    key={notif.id ?? i}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#f8f9fa] ${
                      !notif.isRead ? "bg-[#e8f4fd] hover:bg-[#d9ecf9]" : "bg-white"
                    }`}
                    onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                  >
                    <div className={`w-8 h-8 rounded-full ${iconConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <IconComponent className={`w-4 h-4 ${iconConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!notif.isRead ? "text-[#0f6cb6]" : "text-[#212529]"}`}>
                          {notif.title || "Notification"}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-[#0f6cb6] shrink-0" />
                          )}
                          <span className="text-[11px] text-[#6c757d] whitespace-nowrap">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[#6c757d] mt-0.5 leading-relaxed">
                        {notif.message || "You have a new update."}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notif.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
