import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserCog, Search, CheckCircle, XCircle, MoreVertical, BookOpen,
  Users, Mail, GraduationCap, Loader2, UserCheck, AlertCircle, Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_BADGE: Record<string, string> = {
  LEVEL_1: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  LEVEL_2: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  LEVEL_3: "bg-green-500/20 text-green-400 border-green-500/20",
  LEVEL_MAX: "bg-red-500/20 text-red-400 border-red-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  LEVEL_1: "Pending",
  LEVEL_2: "Active",
  LEVEL_3: "Senior",
  LEVEL_MAX: "Admin",
};

export default function FacultyMgmt() {
  const [activeTab, setActiveTab] = useState<"faculty" | "students">("faculty");
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [deptDialog, setDeptDialog] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: teachers = [], isLoading: teachersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/teachers"] });
  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/students"] });
  const { data: courses = [] } = useQuery<any[]>({ queryKey: ["/api/courses"] });
  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({ title: "User updated successfully!" });
      setAssignDialog(null);
      setDeptDialog(null);
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const approveTeacher = (teacher: any) =>
    updateUser.mutate({ id: teacher.id, data: { clearanceLevel: "LEVEL_2" } });

  const deactivateTeacher = (teacher: any) =>
    updateUser.mutate({ id: teacher.id, data: { clearanceLevel: "LEVEL_1" } });

  const filteredTeachers = (teachers as any[]).filter(t =>
    !searchTerm ||
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = (students as any[]).filter(s =>
    !searchTerm ||
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = (teachers as any[]).filter(t => t.clearanceLevel === "LEVEL_1").length;

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Faculty & Student Management
          </h1>
          <p className="text-muted-foreground mt-1">Approve registrations, assign departments, manage courses and profiles.</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{pendingCount} pending approval{pendingCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-1">
        <button onClick={() => setActiveTab("faculty")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "faculty" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}>
          <UserCog className="w-4 h-4" /> Faculty Hub {pendingCount > 0 && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 rounded-full">{pendingCount}</span>}
        </button>
        <button onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "students" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"}`}>
          <Users className="w-4 h-4" /> Student Roster
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={`Search ${activeTab === "faculty" ? "faculty" : "students"} by name, email, department...`}
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 h-11 glass-input max-w-md" />
      </div>

      {/* FACULTY TABLE */}
      {activeTab === "faculty" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl border-white/5 overflow-hidden">
          {teachersLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{teachers.length === 0 ? "No teachers have registered yet." : "No results match your search."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Teacher</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher: any) => {
                  const teacherCourses = (courses as any[]).filter(c => c.teacherId === teacher.id);
                  const status = teacher.clearanceLevel || "LEVEL_1";
                  return (
                    <TableRow key={teacher.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {(teacher.firstName?.[0] || teacher.email?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{teacher.firstName} {teacher.lastName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{teacher.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {teacher.department || <span className="text-muted-foreground italic">Unassigned</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        {teacherCourses.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {teacherCourses.slice(0, 2).map((c: any) => (
                              <span key={c.id} className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{c.courseCode || c.courseName}</span>
                            ))}
                            {teacherCourses.length > 2 && <span className="text-[10px] text-muted-foreground">+{teacherCourses.length - 2} more</span>}
                          </div>
                        ) : <span className="text-xs text-muted-foreground italic">No courses</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_BADGE[status] || "bg-white/10 text-white border-white/10"}`}>
                          {STATUS_LABEL[status] || status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 border border-transparent hover:border-white/10">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-52">
                            <DropdownMenuLabel>Manage Faculty</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {status === "LEVEL_1" && (
                              <DropdownMenuItem className="text-green-400 focus:bg-green-500/10 focus:text-green-400 cursor-pointer" onClick={() => approveTeacher(teacher)}>
                                <UserCheck className="w-4 h-4 mr-2" /> Approve Registration
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={() => setDeptDialog(teacher)}>
                              <Building2 className="w-4 h-4 mr-2" /> Assign Department
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer focus:bg-white/10" onClick={() => setAssignDialog(teacher)}>
                              <BookOpen className="w-4 h-4 mr-2" /> View Assigned Courses
                            </DropdownMenuItem>
                            {status !== "LEVEL_1" && (
                              <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer" onClick={() => deactivateTeacher(teacher)}>
                                  <XCircle className="w-4 h-4 mr-2" /> Deactivate Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </motion.div>
      )}

      {/* STUDENTS TABLE */}
      {activeTab === "students" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl border-white/5 overflow-hidden">
          {studentsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{students.length === 0 ? "No students have registered yet." : "No results match your search."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year / Sem</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student: any) => (
                  <TableRow key={student.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                          {(student.firstName?.[0] || student.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {student.department || <span className="text-muted-foreground italic">Unassigned</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{student.academicYear || "—"}</span>
                        {student.semester && <span className="ml-1 text-xs text-muted-foreground">/ {student.semester}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-8 text-xs hover:text-primary"
                        onClick={() => setDeptDialog(student)}>
                        <Building2 className="w-3 h-3 mr-1" /> Assign Dept
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      )}

      {/* Assign Department Dialog */}
      <Dialog open={!!deptDialog} onOpenChange={o => !o && setDeptDialog(null)}>
        <DialogContent className="glass border-white/10 sm:max-w-[360px]">
          <DialogHeader><DialogTitle>Assign Department</DialogTitle></DialogHeader>
          {deptDialog && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Assign <strong className="text-white">{deptDialog.firstName} {deptDialog.lastName}</strong> to a department.</p>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <select defaultValue={deptDialog.department || ""} id="dept-select"
                  className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white">
                  <option value="">None</option>
                  {(departments as any[]).map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <Button className="w-full bg-primary" disabled={updateUser.isPending}
                onClick={() => {
                  const sel = (document.getElementById("dept-select") as HTMLSelectElement).value;
                  updateUser.mutate({ id: deptDialog.id, data: { department: sel } });
                }}>
                {updateUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Assignment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Courses Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={o => !o && setAssignDialog(null)}>
        <DialogContent className="glass border-white/10 sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Courses for {assignDialog?.firstName} {assignDialog?.lastName}</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-3 pt-2">
              {(courses as any[]).filter(c => c.teacherId === assignDialog.id).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No courses assigned yet.</p>
                </div>
              ) : (
                (courses as any[]).filter(c => c.teacherId === assignDialog.id).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="font-medium text-sm">{c.courseName}</p>
                      <p className="text-xs text-muted-foreground">{c.courseCode} • {c.department} • {c.semester}</p>
                    </div>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">{c.enrollmentCount ?? 0} students</span>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
