import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Users, FileText, Calendar, TrendingUp, Plus, ChevronRight,
  GraduationCap, Activity, Clock, Zap, Bell, BookMarked, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const eventTypeColors: Record<string, string> = {
  exam: "bg-red-500/20 text-red-300 border-red-500/30",
  assignment_deadline: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  lecture: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  holiday: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  seminar: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/teacher/stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats", { credentials: "include" });
      if (!res.ok) return { totalCourses: 0, totalStudentsEnrolled: 0, documentsUploaded: 0, recentStudentActivity: [], upcomingEvents: [] };
      return res.json();
    },
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: notifData } = useQuery<any>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
  });

  const widgetCards = [
    {
      title: "Total Courses Created",
      value: stats?.totalCourses ?? courses.length,
      icon: BookOpen,
      color: "from-violet-600/20 to-purple-600/20 border-violet-500/30",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/20",
    },
    {
      title: "Total Students Enrolled",
      value: stats?.totalStudentsEnrolled ?? 0,
      icon: Users,
      color: "from-blue-600/20 to-cyan-600/20 border-blue-500/30",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/20",
    },
    {
      title: "Documents Uploaded",
      value: stats?.documentsUploaded ?? 0,
      icon: FileText,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/30",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/20",
    },
    {
      title: "Notifications",
      value: notifData?.unreadCount ?? 0,
      icon: Bell,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/30",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/20",
    },
  ];

  const quickActions = [
    { label: "Create Course", href: "/teacher/courses", icon: Plus, color: "from-violet-600 to-purple-600", desc: "Launch a new course" },
    { label: "Upload Notes", href: "/teacher/courses", icon: FileText, color: "from-blue-600 to-cyan-600", desc: "Add study materials" },
    { label: "Calendar", href: "/teacher/calendar", icon: Calendar, color: "from-emerald-600 to-teal-600", desc: "Manage events" },
    { label: "Analytics", href: "/analytics", icon: BarChart2, color: "from-amber-600 to-orange-600", desc: "View insights" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-purple-600/20 border border-white/10 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-indigo-300 font-medium">Teacher Portal</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                Welcome, {user?.firstName || "Teacher"} 👋
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Manage your courses, upload study materials, and track student progress from your dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {user?.department || "Computer Engineering"}
                </Badge>
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                  Teacher
                </Badge>
              </div>
            </div>
            <Link href="/teacher/courses">
              <Button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white gap-2 group backdrop-blur-sm">
                <Plus className="w-4 h-4" />
                Create Course
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stat Widgets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {widgetCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`glass rounded-2xl p-5 border bg-gradient-to-br ${card.color}`}
            >
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className="text-3xl font-display font-bold mb-1">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={action.label} href={action.href}>
                <div className="group glass rounded-2xl p-5 cursor-pointer hover-elevate hover:border-white/15 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{action.label}</h3>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Courses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-violet-400" />
                My Courses
              </h2>
              <Link href="/teacher/courses">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                  Manage courses <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {courses.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No courses created yet</p>
                <Link href="/teacher/courses">
                  <Button variant="ghost" size="sm" className="mt-2 text-primary">Create your first course →</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 4).map((course: any) => (
                  <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{course.courseName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{course.courseCode} · {course.department} · Sem {course.semester}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="w-3 h-3 mr-1" />{course.enrollmentCount || 0}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Upcoming Events */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Upcoming Events
              </h2>
              <Link href="/teacher/calendar">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {(!stats?.upcomingEvents || stats.upcomingEvents.length === 0) ? (
              <div className="text-center py-10 opacity-50">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming events</p>
                <Link href="/teacher/calendar">
                  <Button variant="ghost" size="sm" className="mt-2 text-primary">Add event →</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingEvents.map((event: any) => (
                  <div key={event.id} className={`p-3 rounded-xl border ${eventTypeColors[event.eventType] || "bg-white/5 border-white/10"}`}>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs mt-1 opacity-70">{format(new Date(event.eventDate), "MMM d, yyyy")}</p>
                    <Badge className="mt-2 text-[10px]">{event.eventType?.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Student Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recent Student Activity
            </h2>
          </div>
          {(!stats?.recentStudentActivity || stats.recentStudentActivity.length === 0) ? (
            <div className="text-center py-8 opacity-50">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recentStudentActivity.map((q: any) => (
                <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{q.query}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(q.createdAt), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
