import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Bot, BookOpen, Bell, Megaphone, Star, TrendingUp, Clock, Zap,
  ArrowRight, MessageSquare, FileText, Search, GraduationCap,
  ChevronRight, Sparkles, Brain, BookMarked
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const suggestedQuestions = [
  "What is normalization in DBMS?",
  "Explain ACID properties",
  "What is deadlock in OS?",
  "Difference between TCP and UDP",
  "Explain process scheduling algorithms",
];

const recommendedTopics = [
  { topic: "Functional Dependencies", subject: "DBMS", color: "from-violet-500/20 to-purple-500/20 border-violet-500/30" },
  { topic: "BCNF & 3NF", subject: "DBMS", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30" },
  { topic: "Transaction Management", subject: "DBMS", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30" },
  { topic: "Page Replacement Algorithms", subject: "OS", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30" },
];

const quickActions = [
  { label: "Ask AI", href: "/student/chat", icon: Bot, color: "from-violet-600 to-purple-600", desc: "Get instant answers" },
  { label: "Course Materials", href: "/student/materials", icon: BookOpen, color: "from-blue-600 to-cyan-600", desc: "View study resources" },
  { label: "Search", href: "/student/search", icon: Search, color: "from-emerald-600 to-teal-600", desc: "Search knowledge base" },
  { label: "Ask Teacher", href: "/student/ask-teacher", icon: MessageSquare, color: "from-amber-600 to-orange-600", desc: "Escalate questions" },
];

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/queries"],
    queryFn: async () => {
      const res = await fetch("/api/queries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const recentAnnouncements = announcements.slice(0, 3);
  const recentMaterials = documents.slice(0, 4);
  const recentQueries = history.slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Hero Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-blue-600/20 border border-white/10 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-violet-300 font-medium">Student Portal</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                Welcome back, {user?.firstName || "Student"} 👋
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Your personal AI-powered academic assistant is ready to help you learn, explore, and excel.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30">
                  {user?.department || "Computer Engineering"}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  Semester {user?.semester || "6"}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                  AI Ready
                </Badge>
              </div>
            </div>
            <Link href="/student/chat">
              <Button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white gap-2 group backdrop-blur-sm">
                <Bot className="w-4 h-4" />
                Start AI Chat
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link href={action.href}>
                  <div className="group glass rounded-2xl p-5 cursor-pointer hover-elevate hover:border-white/15 transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{action.label}</h3>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Chat History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                Recent Questions
              </h2>
              <Link href="/student/history">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recentQueries.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No questions asked yet</p>
                <Link href="/student/chat">
                  <Button variant="ghost" size="sm" className="mt-2 text-primary">Start chatting →</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQueries.map((q: any) => (
                  <Link key={q.id} href="/student/history">
                    <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{q.query}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(q.createdAt), 'MMM d, h:mm a')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Announcements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Announcements
              </h2>
              <Link href="/student/announcements">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No announcements</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a: any, i: number) => (
                  <div key={a.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-amber-200 line-clamp-2">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Study Materials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Recent Materials
              </h2>
              <Link href="/student/materials">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recentMaterials.length === 0 ? (
              <div className="text-center py-8 opacity-50">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No materials yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMaterials.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.category || 'General'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{doc.status || 'active'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Suggested Questions & Recommended Topics */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Suggested Questions
              </h2>
              <div className="space-y-2">
                {suggestedQuestions.slice(0, 3).map((q, i) => (
                  <Link key={i} href={`/student/chat?q=${encodeURIComponent(q)}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-violet-400 font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm group-hover:text-violet-300 transition-colors">{q}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-emerald-400" />
                Recommended Topics
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {recommendedTopics.map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border cursor-pointer hover:scale-105 transition-transform`}
                  >
                    <p className="text-xs font-semibold mb-1">{item.topic}</p>
                    <span className="text-[10px] text-muted-foreground">{item.subject}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
