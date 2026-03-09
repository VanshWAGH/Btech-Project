import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Bell, Calendar, BookOpen, Tag, Clock, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const iconForType = (title: string) => {
  const t = title?.toLowerCase() || "";
  if (t.includes("exam") || t.includes("test")) return { Icon: Calendar, color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (t.includes("assign") || t.includes("submit")) return { Icon: BookOpen, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (t.includes("seminar") || t.includes("event") || t.includes("lab")) return { Icon: Tag, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  return { Icon: Bell, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" };
};

export default function StudentAnnouncements() {
  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });

  const pinned = announcements.filter((a: any) => a.isPinned);
  const regular = announcements.filter((a: any) => !a.isPinned);

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-amber-400" />
                Announcements
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Department notices, exam schedules, and updates</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              {announcements.length} Total
            </Badge>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold mb-2">No Announcements</h3>
            <p className="text-sm text-muted-foreground">Check back later for department notices and updates.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {pinned.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  📌 Pinned
                </h2>
                {pinned.map((a: any, i: number) => {
                  const { Icon, color } = iconForType(a.title);
                  return (
                    <AnnouncementCard key={a.id} a={a} Icon={Icon} color={color} i={i} pinned />
                  );
                })}
              </div>
            )}

            {regular.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Recent Announcements
                </h2>
                {regular.map((a: any, i: number) => {
                  const { Icon, color } = iconForType(a.title);
                  return <AnnouncementCard key={a.id} a={a} Icon={Icon} color={color} i={i} />;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AnnouncementCard({ a, Icon, color, i, pinned }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.06 }}
      className={`glass rounded-2xl p-5 border ${pinned ? "border-amber-500/30 bg-amber-500/5" : "border-white/5"} hover:border-white/10 transition-all`}
    >
      <div className="flex gap-4">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-sm">{a.title}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {pinned && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">📌 Pinned</Badge>}
              {a.targetRole && (
                <Badge variant="outline" className="text-[10px] bg-white/5">{a.targetRole}</Badge>
              )}
            </div>
          </div>
          {a.content && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{a.content}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
            </span>
            <span className="text-white/20">•</span>
            <span>{format(new Date(a.createdAt), 'MMM d, yyyy')}</span>
            {a.department && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-blue-400">{a.department}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
