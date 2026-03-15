import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Loader2,
  BookOpen, Clock, AlertTriangle, Plane, Presentation, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  isToday
} from "date-fns";

const DEPARTMENTS = [
  "Computer Science", "Information Technology", "Electronics", "Mechanical",
  "Civil", "Chemical", "Electrical", "MBA", "MCA", "BSc"
];
const EVENT_TYPES = [
  { value: "lecture", label: "Lecture", color: "bg-blue-500", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: BookOpen },
  { value: "exam", label: "Exam", color: "bg-red-500", badge: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertTriangle },
  { value: "assignment_deadline", label: "Assignment Deadline", color: "bg-orange-500", badge: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: Clock },
  { value: "holiday", label: "Holiday", color: "bg-emerald-500", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Plane },
  { value: "seminar", label: "Seminar", color: "bg-purple-500", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Presentation },
];

const getEventType = (type: string) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];

interface EventForm {
  title: string;
  description: string;
  eventDate: string;
  eventType: string;
  department: string;
}

const emptyForm: EventForm = { title: "", description: "", eventDate: "", eventType: "lecture", department: "" };

export default function TeacherCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<any | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/calendar", user?.department],
    queryFn: async () => {
      const params = user?.department ? `?department=${encodeURIComponent(user.department)}` : "";
      const res = await fetch(`/api/calendar${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, department: data.department || user?.department || "" }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Event created!", description: "Department members have been notified." });
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventForm }) => {
      const res = await fetch(`/api/calendar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Event updated!" });
      setShowModal(false);
      setEditEvent(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Event deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = (date?: Date) => {
    setEditEvent(null);
    setForm({ ...emptyForm, eventDate: date ? format(date, "yyyy-MM-dd'T'HH:mm") : "", department: user?.department || "" });
    setShowModal(true);
  };

  const openEdit = (event: any) => {
    setEditEvent(event);
    setForm({
      title: event.title, description: event.description || "",
      eventDate: format(new Date(event.eventDate), "yyyy-MM-dd'T'HH:mm"),
      eventType: event.eventType, department: event.department,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.eventDate) { toast({ title: "Title and date are required", variant: "destructive" }); return; }
    if (editEvent) updateMutation.mutate({ id: editEvent.id, data: form });
    else createMutation.mutate(form);
  };

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.eventDate), day) && (typeFilter === "all" || e.eventType === typeFilter));

  const selectedDayEvents = selectedDate
    ? events.filter(e => isSameDay(new Date(e.eventDate), selectedDate) && (typeFilter === "all" || e.eventType === typeFilter))
    : [];

  const upcomingEvents = events
    .filter(e => new Date(e.eventDate) >= new Date() && (typeFilter === "all" || e.eventType === typeFilter))
    .slice(0, 6);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Academic Calendar</h1>
            <p className="text-muted-foreground mt-1">Manage academic events for your department</p>
          </div>
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 bg-white/5 border-white/10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => openCreate()} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-2">
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(t => (
            <Badge key={t.value} className={`text-[10px] cursor-pointer ${typeFilter === t.value ? t.badge : "bg-white/5 text-muted-foreground border-white/10"}`} onClick={() => setTypeFilter(typeFilter === t.value ? "all" : t.value)}>
              <span className={`w-2 h-2 rounded-full ${t.color} mr-1.5 inline-block`} />
              {t.label}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-2 glass rounded-2xl p-6">
            {/* Nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-display font-bold">{format(currentDate, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => { setSelectedDate(isSameDay(day, selectedDate!) ? null : day); }}
                    onDoubleClick={() => openCreate(day)}
                    className={`relative min-h-[70px] p-1.5 rounded-xl border text-left transition-all ${isSelected ? "bg-primary/20 border-primary/40" : isToday(day) ? "bg-white/10 border-white/20" : "border-transparent hover:bg-white/5"} ${!isCurrentMonth ? "opacity-30" : ""}`}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? "text-primary font-bold" : ""} ${!isCurrentMonth ? "text-muted-foreground" : ""}`}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => {
                        const et = getEventType(e.eventType);
                        return (
                          <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded ${et.color} text-white truncate`}>
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected Day Events */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{format(selectedDate, "MMMM d, yyyy")}</h3>
                  <button onClick={() => openCreate(selectedDate)} className="p-1 rounded-lg hover:bg-white/10 text-primary">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No events — double-click to add</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => {
                      const et = getEventType(event.eventType);
                      return (
                        <div key={event.id} className={`p-3 rounded-xl border ${et.badge}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{event.title}</p>
                              {event.description && <p className="text-xs opacity-70 mt-0.5">{event.description}</p>}
                              <p className="text-[10px] mt-1 opacity-60">{format(new Date(event.eventDate), "h:mm a")}</p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(event)} className="p-1 rounded hover:bg-white/10"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => setDeleteId(event.id)} className="p-1 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Upcoming Events */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Upcoming Events
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => {
                    const et = getEventType(event.eventType);
                    return (
                      <div key={event.id} className={`p-3 rounded-xl border ${et.badge} group`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium">{event.title}</p>
                            <p className="text-[10px] opacity-70 mt-0.5">{format(new Date(event.eventDate), "MMM d, yyyy")}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(event)} className="p-1 rounded hover:bg-white/10"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => setDeleteId(event.id)} className="p-1 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); setEditEvent(null); } }}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Edit Event" : "Add Calendar Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mid-Semester Exam" className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Event Type *</Label>
                <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Dept..." /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." className="bg-white/5 border-white/10 resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-primary hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editEvent ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Event?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this calendar event.</p>
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
