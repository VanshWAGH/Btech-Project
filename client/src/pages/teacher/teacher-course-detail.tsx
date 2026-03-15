import { AppLayout } from "@/components/layout/app-layout";
import { useRoute, useLocation, Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Users, FileText, ArrowLeft, ChevronRight, Loader2,
  UserPlus, UserMinus, Search, Mail, GraduationCap, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function TeacherCourseDetail() {
  const [, params] = useRoute("/teacher/courses/:id");
  const [, navigate] = useLocation();
  const courseId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<any>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: [`/api/courses/${courseId}/students`],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/students`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (email: string) => {
      // First get the user by email conceptually - for now just enroll by student ID from email field
      // In a full system you'd look up user by email first
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentEmail: email }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Student enrolled!" });
      setShowEnrollModal(false);
      setStudentEmail("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const res = await fetch(`/api/courses/${courseId}/enroll/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      toast({ title: "Student removed" });
      setRemoveId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: notes = [] } = useQuery<any[]>({
    queryKey: [`/api/courses/${courseId}/notes`],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/notes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredStudents = students.filter(s =>
    !search || (s.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.studentEmail || "").toLowerCase().includes(search.toLowerCase())
  );

  if (courseLoading) return <AppLayout><div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  if (!course) return <AppLayout><div className="text-center mt-20 text-muted-foreground">Course not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/teacher/courses")} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3 h-3" /> Courses <ChevronRight className="w-3 h-3" /> {course.courseName}
            </div>
            <h1 className="text-2xl font-display font-bold">{course.courseName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">{course.courseCode}</Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{course.department}</Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Semester {course.semester}</Badge>
            </div>
          </div>
          <Link href={`/teacher/courses/${courseId}/notes`}>
            <Button className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-2">
              <FileText className="w-4 h-4" /> Manage Notes
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Enrolled Students", value: students.length, icon: Users, color: "text-violet-400", bg: "bg-violet-500/20" },
            { label: "Notes Uploaded", value: notes.length, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/20" },
            { label: "Course Code", value: course.courseCode, icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/20" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Description */}
        {course.description && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-2 text-sm">About this Course</h3>
            <p className="text-sm text-muted-foreground">{course.description}</p>
          </div>
        )}

        {/* Enrolled Students */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              Enrolled Students ({students.length})
            </h2>
            <Button onClick={() => setShowEnrollModal(true)} size="sm" className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-1.5 text-xs">
              <UserPlus className="w-3.5 h-3.5" /> Enroll Student
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="pl-10 bg-white/5 border-white/10" />
          </div>

          {studentsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{students.length === 0 ? "No students enrolled yet" : "No matching students"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student: any) => (
                <div key={student.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-400">{(student.studentName || "S").charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{student.studentName || "Unknown Student"}</p>
                    <p className="text-xs text-muted-foreground">{student.studentEmail}</p>
                  </div>
                  {student.department && (
                    <Badge className="text-[10px] bg-white/5">{student.department}</Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground shrink-0">
                    {student.enrolledAt ? format(new Date(student.enrolledAt), "MMM d") : ""}
                  </p>
                  <button onClick={() => setRemoveId(student.studentId)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enroll Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-sm">
          <DialogHeader><DialogTitle>Manually Enroll Student</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Enter the student's email to enroll them in this course.</p>
            <div className="space-y-1.5">
              <Label>Student Email</Label>
              <Input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="student@university.edu" className="bg-white/5 border-white/10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollModal(false)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button onClick={() => enrollMutation.mutate(studentEmail)} disabled={!studentEmail || enrollMutation.isPending}>
              {enrollMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm */}
      <Dialog open={!!removeId} onOpenChange={v => !v && setRemoveId(null)}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove Student?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove this student from the course?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button variant="destructive" onClick={() => removeId && removeMutation.mutate(removeId)} disabled={removeMutation.isPending}>
              {removeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
