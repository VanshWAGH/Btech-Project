import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Building2, Plus, Calendar as CalendarIcon, Edit2, CheckCircle2, Trash2, ChevronRight, Loader2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className={`glass p-5 rounded-xl border border-white/5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl bg-${color}/20 flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 text-${color}`} />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-bold font-display">{value}</p>
      </div>
    </div>
  );
}

export default function UniversitySettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "years" | "semesters">("overview");
  const [deptDialog, setDeptDialog] = useState(false);
  const [yearDialog, setYearDialog] = useState(false);
  const [semDialog, setSemDialog] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);

  const [deptForm, setDeptForm] = useState({ name: "", headId: "" });
  const [yearForm, setYearForm] = useState({ name: "", startDate: "", endDate: "" });
  const [semForm, setSemForm] = useState({ name: "", startDate: "", endDate: "", academicYearId: "" });

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"], retry: false });
  const { data: departments = [], isLoading: deptsLoading } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const { data: academicYears = [], isLoading: yearsLoading } = useQuery<any[]>({ queryKey: ["/api/academic-years"] });
  const { data: semesters = [], isLoading: semsLoading } = useQuery<any[]>({ queryKey: ["/api/semesters"] });

  const createDept = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/departments", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); setDeptDialog(false); setDeptForm({ name: "", headId: "" }); toast({ title: "Department created!" }); },
    onError: () => toast({ title: "Failed to create department", variant: "destructive" }),
  });

  const updateDept = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/departments/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); setDeptDialog(false); setEditDept(null); toast({ title: "Department updated!" }); },
    onError: () => toast({ title: "Failed to update department", variant: "destructive" }),
  });

  const deleteDept = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/departments"] }); toast({ title: "Department removed" }); },
    onError: () => toast({ title: "Failed to delete department", variant: "destructive" }),
  });

  const createYear = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/academic-years", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/academic-years"] }); setYearDialog(false); setYearForm({ name: "", startDate: "", endDate: "" }); toast({ title: "Academic Year created!" }); },
    onError: () => toast({ title: "Failed to create academic year", variant: "destructive" }),
  });

  const activateYear = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/academic-years/${id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/academic-years"] }); toast({ title: "Academic Year activated!" }); },
  });

  const createSem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/semesters", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/semesters"] }); setSemDialog(false); setSemForm({ name: "", startDate: "", endDate: "", academicYearId: "" }); toast({ title: "Semester created!" }); },
    onError: () => toast({ title: "Failed to create semester", variant: "destructive" }),
  });

  const activateSem = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/semesters/${id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/semesters"] }); toast({ title: "Semester activated!" }); },
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "departments", label: "Departments" },
    { id: "years", label: "Academic Years" },
    { id: "semesters", label: "Semesters" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            University Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage your institution, departments, academic years and semesters.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Departments" value={stats?.totalDepts ?? departments.length} icon={Building2} color="primary" />
            <StatCard label="Teachers" value={stats?.totalTeachers ?? 0} icon={Settings} color="accent" />
            <StatCard label="Students" value={stats?.totalStudents ?? 0} icon={CheckCircle2} color="green-400" />
            <StatCard label="Active Year" value={stats?.activeYear ?? "N/A"} icon={CalendarIcon} color="yellow-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-2xl border-white/5">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Departments</h2>
              <div className="space-y-2">
                {(departments as any[]).slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="mt-3 w-full text-primary" onClick={() => setActiveTab("departments")}>Manage Departments →</Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-2xl border-white/5">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-accent" /> Academic Terms</h2>
              <div className="space-y-2">
                {(academicYears as any[]).slice(0, 3).map((y: any) => (
                  <div key={y.id} className={`flex justify-between items-center p-3 rounded-lg text-sm border ${y.isActive ? 'bg-accent/10 border-accent/20' : 'bg-white/5 border-white/5'}`}>
                    <span className="font-medium">{y.name}</span>
                    {y.isActive && <span className="text-xs text-accent flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span>}
                  </div>
                ))}
                {(semesters as any[]).filter((s: any) => s.isActive).map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center p-3 rounded-lg text-sm border bg-primary/10 border-primary/20">
                    <span className="font-medium">{s.name} <span className="text-xs text-muted-foreground ml-1">(current)</span></span>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="mt-3 w-full text-accent" onClick={() => setActiveTab("years")}>Manage Academic Terms →</Button>
            </motion.div>
          </div>

          {/* Upcoming Events */}
          {stats?.upcomingEvents?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 rounded-2xl border-white/5">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-yellow-400" /> Upcoming Events</h2>
              <div className="space-y-3">
                {stats.upcomingEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 flex flex-col items-center justify-center bg-black/40 rounded-lg text-xs shrink-0">
                      <span className="uppercase text-[10px] text-muted-foreground">{format(new Date(e.eventDate), 'MMM')}</span>
                      <span className="font-bold">{format(new Date(e.eventDate), 'd')}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.department} • {e.eventType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="glass p-6 rounded-2xl border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Departments</h2>
            <Dialog open={deptDialog} onOpenChange={(o) => { setDeptDialog(o); if (!o) { setEditDept(null); setDeptForm({ name: "", headId: "" }); } }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Department</Button>
              </DialogTrigger>
              <DialogContent className="glass border-white/10 sm:max-w-[400px]">
                <DialogHeader><DialogTitle>{editDept ? "Edit Department" : "Add New Department"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Department Name</label>
                    <Input placeholder="e.g. Computer Engineering" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} className="bg-black/40 border-white/10" />
                  </div>
                  <Button className="w-full bg-primary" disabled={!deptForm.name || createDept.isPending || updateDept.isPending}
                    onClick={() => editDept ? updateDept.mutate({ id: editDept.id, data: { name: deptForm.name } }) : createDept.mutate({ name: deptForm.name })}>
                    {(createDept.isPending || updateDept.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editDept ? "Update Department" : "Create Department"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {deptsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-3">
              {(departments as any[]).map((dep: any) => (
                <div key={dep.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-colors">
                  <div>
                    <h3 className="font-medium">{dep.name}</h3>
                    {dep.headName && dep.headName.trim() !== " " && (
                      <p className="text-xs text-muted-foreground mt-0.5">Head: {dep.headName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary" onClick={() => { setEditDept(dep); setDeptForm({ name: dep.name, headId: dep.headId ?? "" }); setDeptDialog(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-400" onClick={() => deleteDept.mutate(dep.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No departments yet. Create your first department.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Academic Years Tab */}
      {activeTab === "years" && (
        <div className="glass p-6 rounded-2xl border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-accent" /> Academic Years</h2>
            <Dialog open={yearDialog} onOpenChange={setYearDialog}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-black" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Year</Button>
              </DialogTrigger>
              <DialogContent className="glass border-white/10 sm:max-w-[400px]">
                <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Year Name (e.g. 2025-2026)</label>
                    <Input placeholder="2025-2026" value={yearForm.name} onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} className="bg-black/40 border-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Start Date</label>
                      <Input type="date" value={yearForm.startDate} onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))} className="bg-black/40 border-white/10" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">End Date</label>
                      <Input type="date" value={yearForm.endDate} onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))} className="bg-black/40 border-white/10" />
                    </div>
                  </div>
                  <Button className="w-full bg-accent text-black" disabled={!yearForm.name || !yearForm.startDate || !yearForm.endDate || createYear.isPending}
                    onClick={() => createYear.mutate(yearForm)}>
                    {createYear.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Academic Year
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {yearsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-3">
              {(academicYears as any[]).map((year: any) => (
                <div key={year.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${year.isActive ? 'bg-accent/10 border-accent/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{year.name}</h3>
                      {year.isActive && <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/20 font-bold uppercase">Active</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(year.startDate), 'MMM d, yyyy')} → {format(new Date(year.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {!year.isActive && (
                    <Button size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10 hover:text-accent" onClick={() => activateYear.mutate(year.id)}>
                      Set Active
                    </Button>
                  )}
                </div>
              ))}
              {academicYears.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No academic years yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Semesters Tab */}
      {activeTab === "semesters" && (
        <div className="glass p-6 rounded-2xl border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Semesters</h2>
            <Dialog open={semDialog} onOpenChange={setSemDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Semester</Button>
              </DialogTrigger>
              <DialogContent className="glass border-white/10 sm:max-w-[440px]">
                <DialogHeader><DialogTitle>Add Semester</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Semester Name</label>
                    <Input placeholder="e.g. Semester I" value={semForm.name} onChange={e => setSemForm(f => ({ ...f, name: e.target.value }))} className="bg-black/40 border-white/10" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Academic Year</label>
                    <select value={semForm.academicYearId} onChange={e => setSemForm(f => ({ ...f, academicYearId: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white">
                      <option value="">Select Academic Year</option>
                      {(academicYears as any[]).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Start Date</label>
                      <Input type="date" value={semForm.startDate} onChange={e => setSemForm(f => ({ ...f, startDate: e.target.value }))} className="bg-black/40 border-white/10" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">End Date</label>
                      <Input type="date" value={semForm.endDate} onChange={e => setSemForm(f => ({ ...f, endDate: e.target.value }))} className="bg-black/40 border-white/10" />
                    </div>
                  </div>
                  <Button className="w-full bg-primary" disabled={!semForm.name || !semForm.startDate || !semForm.endDate || !semForm.academicYearId || createSem.isPending}
                    onClick={() => createSem.mutate({ ...semForm, academicYearId: parseInt(semForm.academicYearId) })}>
                    {createSem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Semester
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {semsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-3">
              {(semesters as any[]).map((sem: any) => (
                <div key={sem.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${sem.isActive ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{sem.name}</h3>
                      {sem.isActive && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 font-bold uppercase">Current</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(sem.startDate), 'MMM d, yyyy')} → {format(new Date(sem.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {!sem.isActive && (
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary" onClick={() => activateSem.mutate(sem.id)}>
                      Set Current
                    </Button>
                  )}
                </div>
              ))}
              {semesters.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No semesters yet. Add a semester to get started.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
