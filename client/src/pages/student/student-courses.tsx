import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Search, Filter, Users, GraduationCap, CheckCircle, Plus,
  Loader2, ChevronRight, BookMarked, FileText, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Link } from "wouter";
import { format } from "date-fns";

const DEPARTMENTS = [
  "All Departments", "Computer Engineering", "Information Technology", "Electronics",
  "Mechanical", "Civil", "Chemical", "Electrical", "MBA", "MCA", "BSc"
];

export default function StudentCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [tab, setTab] = useState<"browse" | "enrolled">("browse");

  const { data: allCourses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses", deptFilter],
    queryFn: async () => {
      const params = deptFilter !== "all" ? `?department=${encodeURIComponent(deptFilter)}` : "";
      const res = await fetch(`/api/courses${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: enrolledCourses = [] } = useQuery<any[]>({
    queryKey: ["/api/student/courses"],
    queryFn: async () => {
      const res = await fetch("/api/student/courses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const enrolledIds = new Set(enrolledCourses.map((e: any) => e.id));

  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/student/courses"] });
      toast({ title: "Enrolled!", description: "You've successfully enrolled in the course." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = (tab === "enrolled" ? enrolledCourses : allCourses).filter(c => {
    if (!search) return true;
    return c.courseName?.toLowerCase().includes(search.toLowerCase()) ||
      c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Courses</h1>
          <p className="text-muted-foreground mt-1">Browse and enroll in available courses</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "browse", label: "Browse Courses", icon: BookOpen },
            { id: "enrolled", label: `My Courses (${enrolledCourses.length})`, icon: BookMarked },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground hover:text-foreground border border-transparent"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="pl-10 bg-white/5 border-white/10" />
          </div>
          {tab === "browse" && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-52 bg-white/5 border-white/10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.slice(1).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl opacity-60">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">{tab === "enrolled" ? "No enrolled courses yet" : "No courses found"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "enrolled" ? "Browse and enroll in courses" : "Try a different search or department"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((course: any, i: number) => {
              const isEnrolled = enrolledIds.has(course.id);
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group glass rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all duration-300 hover-elevate"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 flex items-center justify-center border border-violet-500/30">
                      <GraduationCap className="w-6 h-6 text-violet-400" />
                    </div>
                    {isEnrolled && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> Enrolled
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.courseName}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{course.courseCode}</p>

                  {course.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{course.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30">{course.department}</Badge>
                    <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">Sem {course.semester}</Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{course.teacherName || "Faculty"}</span>
                    <span className="mx-1">·</span>
                    <Users className="w-3.5 h-3.5" />
                    <span>{course.enrollmentCount || 0} students</span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-white/5">
                    {isEnrolled ? (
                      <Link href={`/student/course/${course.id}/notes`} className="flex-1">
                        <Button size="sm" className="w-full h-8 text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-1">
                          <FileText className="w-3 h-3" /> View Materials
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 gap-1"
                        onClick={() => enrollMutation.mutate(course.id)}
                        disabled={enrollMutation.isPending}
                      >
                        {enrollMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Enroll Now
                      </Button>
                    )}
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
