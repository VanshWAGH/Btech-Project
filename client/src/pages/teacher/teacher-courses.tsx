import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus, BookOpen, Users, Pencil, Trash2, Eye, ChevronRight,
  Search, Filter, X, Loader2, GraduationCap, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DEPARTMENTS = [
  "Computer Engineering", "Information Technology", "Electronics", "Mechanical",
  "Civil", "Chemical", "Electrical", "MBA", "MCA", "BSc"
];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

interface Course {
  id: number;
  courseId: string;
  courseName: string;
  courseCode: string;
  department: string;
  semester: string;
  teacherName: string;
  description: string;
  enrollmentCount: number;
  createdAt: string;
}

interface CourseForm {
  courseId: string;
  courseName: string;
  courseCode: string;
  department: string;
  semester: string;
  description: string;
}

const emptyForm: CourseForm = {
  courseId: "",
  courseName: "",
  courseCode: "",
  department: "",
  semester: "",
  description: "",
};

export default function TeacherCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CourseForm) => {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/courses"] });
      qc.invalidateQueries({ queryKey: ["/api/teacher/stats"] });
      toast({ title: "Course created!", description: "Your new course is live." });
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CourseForm }) => {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course updated!" });
      setShowModal(false);
      setEditCourse(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/courses"] });
      qc.invalidateQueries({ queryKey: ["/api/teacher/stats"] });
      toast({ title: "Course deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => { setForm(emptyForm); setEditCourse(null); setShowModal(true); };
  const openEdit = (c: Course) => {
    setEditCourse(c);
    setForm({ courseId: c.courseId, courseName: c.courseName, courseCode: c.courseCode, department: c.department, semester: c.semester, description: c.description });
    setShowModal(true);
  };
  const handleSubmit = () => {
    if (!form.courseName || !form.courseCode || !form.department || !form.semester) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    if (editCourse) updateMutation.mutate({ id: editCourse.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.courseName.toLowerCase().includes(search.toLowerCase()) || c.courseCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || c.department === deptFilter;
    return matchSearch && matchDept;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Course Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage your courses</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-2">
            <Plus className="w-4 h-4" /> Create Course
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="pl-10 bg-white/5 border-white/10" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-52 bg-white/5 border-white/10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl opacity-60">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or create a new course</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group glass rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all duration-300 hover-elevate"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-purple-600/30 flex items-center justify-center border border-violet-500/30">
                    <BookOpen className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(course)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(course.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.courseName}</h3>
                <p className="text-xs text-muted-foreground mb-3">{course.courseCode}</p>
                {course.description && <p className="text-xs text-gray-400 line-clamp-2 mb-4">{course.description}</p>}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30">{course.department}</Badge>
                  <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">Sem {course.semester}</Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {course.enrollmentCount || 0} students
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/teacher/courses/${course.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-white/5 hover:bg-white/10 border-white/10 gap-1">
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/notes`}>
                      <Button size="sm" className="h-7 text-xs gap-1 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                        <FileText className="w-3 h-3" /> Notes
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); setEditCourse(null); } }}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Course ID</Label>
                <Input value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} placeholder="e.g. CS301" className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label>Course Code *</Label>
                <Input value={form.courseCode} onChange={e => setForm(f => ({ ...f, courseCode: e.target.value }))} placeholder="e.g. CS-301" className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Course Name *</Label>
              <Input value={form.courseName} onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))} placeholder="e.g. Database Management Systems" className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Semester *</Label>
                <Select value={form.semester} onValueChange={v => setForm(f => ({ ...f, semester: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select sem" /></SelectTrigger>
                  <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Course description..." className="bg-white/5 border-white/10 resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-primary hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editCourse ? "Update Course" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Course?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the course and all its notes. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
