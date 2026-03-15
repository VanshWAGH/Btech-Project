import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, MapPin, Check, Clock, Loader2, Filter,
  GraduationCap, FileText, Umbrella, Mic2, ClipboardList, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, isToday, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const EVENT_TYPES = [
  { value: "lecture", label: "Lecture / Class", icon: GraduationCap, color: "blue" },
  { value: "exam", label: "Examination", icon: FileText, color: "red" },
  { value: "assignment_deadline", label: "Assignment Deadline", icon: ClipboardList, color: "orange" },
  { value: "holiday", label: "Holiday / Break", icon: Umbrella, color: "green" },
  { value: "seminar", label: "Seminar / Workshop", icon: Mic2, color: "purple" },
];

const TYPE_STYLES: Record<string, string> = {
  lecture: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  exam: "bg-red-500/20 text-red-400 border-red-500/20",
  assignment_deadline: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  holiday: "bg-green-500/20 text-green-400 border-green-500/20",
  seminar: "bg-purple-500/20 text-purple-400 border-purple-500/20",
};

const TYPE_DOT: Record<string, string> = {
  lecture: "bg-blue-400",
  exam: "bg-red-400",
  assignment_deadline: "bg-orange-400",
  holiday: "bg-green-400",
  seminar: "bg-purple-400",
};

const EMPTY_FORM = { title: "", department: "All", eventType: "lecture", eventDate: "", description: "" };

export default function UniversityCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = ["ADMIN", "UNIVERSITY_ADMIN"].includes(user?.role?.toUpperCase() || "");
  const isTeacher = user?.role?.toUpperCase() === "TEACHER";

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editEvent, setEditEvent] = useState<any>(null);

  const { data: events = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/calendar"] });
  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });

  const allDepts = ["All", ...(departments as any[]).map((d: any) => d.name)];

  const createEvent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calendar", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar"] }); setDialogOpen(false); setForm(EMPTY_FORM); toast({ title: "Event published!" }); },
    onError: () => toast({ title: "Failed to publish event", variant: "destructive" }),
  });

  const suggestEvent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calendar/suggest", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar"] }); setSuggestOpen(false); setForm(EMPTY_FORM); toast({ title: "Suggestion submitted for admin review!" }); },
    onError: () => toast({ title: "Failed to submit suggestion", variant: "destructive" }),
  });

  const approveEvent = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/calendar/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar"] }); toast({ title: "Event approved!" }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/calendar/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/calendar"] }); toast({ title: "Event removed" }); },
  });

  const filtered = (events as any[]).filter(e => {
    const matchType = filter === "all" || e.eventType === filter;
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.department || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const upcoming = filtered.filter(e => !isPast(new Date(e.eventDate)) || isToday(new Date(e.eventDate)));
  const past = filtered.filter(e => isPast(new Date(e.eventDate)) && !isToday(new Date(e.eventDate)));
  const pending = (events as any[]).filter(e => (e as any).status === "pending");

  const handleSubmit = (isSuggestion = false) => {
    const payload = { ...form, eventDate: new Date(form.eventDate).toISOString() };
    if (isSuggestion) suggestEvent.mutate(payload);
    else createEvent.mutate(payload);
  };

  const EventForm = ({ onSubmit, disabled }: { onSubmit: () => void; disabled: boolean }) => (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium mb-1 block">Event Title *</label>
        <Input placeholder="e.g. End Semester Examinations Begin" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-black/40 border-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Event Type *</label>
          <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white">
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Date *</label>
          <Input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className="bg-black/40 border-white/10" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Target Department</label>
        <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white">
          {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Description (optional)</label>
        <Input placeholder="Additional details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-black/40 border-white/10" />
      </div>
      <Button className="w-full bg-primary" onClick={onSubmit} disabled={!form.title || !form.eventDate || disabled}>
        {disabled && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {isAdmin ? "Publish Event" : "Submit Suggestion"}
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Academic Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage and publish university-wide academic events." : "View the academic schedule. Teachers can suggest new events."}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setForm(EMPTY_FORM); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10">
                  <Plus className="w-4 h-4 mr-2" /> Publish Event
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-white/10 sm:max-w-[460px]">
                <DialogHeader><DialogTitle>Publish Academic Event</DialogTitle></DialogHeader>
                <EventForm onSubmit={() => handleSubmit(false)} disabled={createEvent.isPending} />
              </DialogContent>
            </Dialog>
          )}
          {isTeacher && (
            <Dialog open={suggestOpen} onOpenChange={o => { setSuggestOpen(o); if (!o) setForm(EMPTY_FORM); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 h-10">
                  <Plus className="w-4 h-4 mr-2" /> Suggest Event
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-white/10 sm:max-w-[460px]">
                <DialogHeader><DialogTitle>Suggest Calendar Event</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">Your suggestion will be reviewed by the university admin before appearing on the calendar.</p>
                <EventForm onSubmit={() => handleSubmit(true)} disabled={suggestEvent.isPending} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Pending Approvals for Admin */}
      {isAdmin && pending.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 glass p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <h3 className="font-semibold text-yellow-400 flex items-center gap-2 mb-3 text-sm">
            <AlertCircle className="w-4 h-4" /> {pending.length} Teacher Suggestion{pending.length > 1 ? "s" : ""} Pending Review
          </h3>
          <div className="space-y-2">
            {pending.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.department} • {e.eventType} • {format(new Date(e.eventDate), "MMM d, yyyy")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 h-7 px-3" onClick={() => approveEvent.mutate(e.id)}>
                    <Check className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="hover:text-red-400 h-7 w-7 p-0" onClick={() => deleteEvent.mutate(e.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 pr-3 h-9 bg-black/40 border border-white/10 rounded-lg text-sm text-white appearance-none">
            <option value="all">All Types</option>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-black/40 border-white/10 text-sm" />
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {EVENT_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(filter === t.value ? "all" : t.value)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${filter === t.value ? TYPE_STYLES[t.value] : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
            <div className={`w-2 h-2 rounded-full ${TYPE_DOT[t.value]}`} />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.filter(e => (e as any).status !== "pending").length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Upcoming Events ({upcoming.filter(e => (e as any).status !== "pending").length})
              </h2>
              <div className="grid gap-3">
                <AnimatePresence>
                  {upcoming.filter(e => (e as any).status !== "pending").map((event: any, i) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-5 p-5 rounded-xl border border-white/5 bg-white/5 hover:border-primary/30 hover:bg-white/8 transition-all group">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-black/40 border border-white/5 shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(event.eventDate), "MMM")}</span>
                        <span className="text-xl font-bold">{format(new Date(event.eventDate), "d")}</span>
                        {isToday(new Date(event.eventDate)) && <span className="text-[8px] text-primary font-bold uppercase">Today</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TYPE_STYLES[event.eventType] || "bg-white/10 text-white border-white/10"}`}>
                            {event.eventType?.replace("_", " ")}
                          </span>
                          <h3 className="font-semibold">{event.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />{format(new Date(event.eventDate), "EEEE, MMMM d, yyyy")}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.department}</span>
                          {event.description && <span className="truncate max-w-xs">{event.description}</span>}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-400" onClick={() => deleteEvent.mutate(event.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Past Events */}
          {past.filter(e => (e as any).status !== "pending").length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Check className="w-4 h-4" /> Past Events
              </h2>
              <div className="grid gap-3 opacity-60">
                {past.filter(e => (e as any).status !== "pending").slice(0, 5).map((event: any, i) => (
                  <div key={event.id} className="flex items-center gap-5 p-4 rounded-xl border border-white/5 bg-white/[0.03] transition-all group">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-black/30 border border-white/5 shrink-0">
                      <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(event.eventDate), "MMM")}</span>
                      <span className="text-base font-bold">{format(new Date(event.eventDate), "d")}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${TYPE_STYLES[event.eventType] || ""}`}>
                          {event.eventType?.replace("_", " ")}
                        </span>
                        <h3 className="text-sm font-medium line-through text-muted-foreground">{event.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.department} • {format(new Date(event.eventDate), "MMMM d, yyyy")}</p>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-red-400" onClick={() => deleteEvent.mutate(event.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {filtered.filter(e => (e as any).status !== "pending").length === 0 && (
            <div className="text-center py-24 text-muted-foreground">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm mt-1">{isAdmin ? "Publish the first event to get started." : "No academic events are scheduled yet."}</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
