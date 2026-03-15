import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, BookOpen,
  AlertTriangle, Plane, Presentation, Filter, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  isToday
} from "date-fns";

const EVENT_TYPES = [
  { value: "lecture", label: "Lecture", color: "bg-blue-500", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: BookOpen },
  { value: "exam", label: "Exam", color: "bg-red-500", badge: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertTriangle },
  { value: "assignment_deadline", label: "Assignment Deadline", color: "bg-orange-500", badge: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: Clock },
  { value: "holiday", label: "Holiday", color: "bg-emerald-500", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Plane },
  { value: "seminar", label: "Seminar", color: "bg-purple-500", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Presentation },
];

const getEventType = (type: string) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];

export default function StudentCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery<any[]>({
  queryKey: ["/api/calendar", user?.department],
  queryFn: async () => {
    const params = user?.department
      ? `?department=${encodeURIComponent(user.department)}`
      : "";
    const res = await fetch(`/api/calendar${params}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    return res.json();
  },
});

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

  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.eventDate) >= now && (typeFilter === "all" || e.eventType === typeFilter))
    .slice(0, 8);

  const examSchedule = events.filter(e => e.eventType === "exam" && new Date(e.eventDate) >= now).slice(0, 5);
  const deadlines = events.filter(e => e.eventType === "assignment_deadline" && new Date(e.eventDate) >= now).slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Academic Calendar</h1>
            <p className="text-muted-foreground mt-1">View events, exams, and deadlines for your department</p>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
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
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-display font-bold">{format(currentDate, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(isSameDay(day, selectedDate!) ? null : day)}
                      className={`relative min-h-[70px] p-1.5 rounded-xl border text-left transition-all ${isSelected ? "bg-primary/20 border-primary/40" : isToday(day) ? "bg-white/10 border-white/20" : "border-transparent hover:bg-white/5"} ${!isCurrentMonth ? "opacity-30" : ""}`}
                    >
                      <span className={`text-xs font-medium ${isToday(day) ? "text-primary font-bold" : ""}`}>
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
                        {dayEvents.length > 2 && <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected day */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-sm mb-3">{format(selectedDate, "MMMM d, yyyy")}</h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No events on this day</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => {
                      const et = getEventType(event.eventType);
                      return (
                        <div key={event.id} className={`p-3 rounded-xl border ${et.badge}`}>
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.description && <p className="text-xs opacity-70 mt-0.5">{event.description}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] opacity-60">{format(new Date(event.eventDate), "h:mm a")}</p>
                            <Badge className={`text-[9px] ${et.badge}`}>{et.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Exam Schedule */}
            {examSchedule.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-4 h-4" /> Upcoming Exams
                </h3>
                <div className="space-y-2">
                  {examSchedule.map(event => (
                    <div key={event.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-red-300 mt-1">{format(new Date(event.eventDate), "MMM d, yyyy · h:mm a")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deadlines */}
            {deadlines.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-300">
                  <Clock className="w-4 h-4" /> Assignment Deadlines
                </h3>
                <div className="space-y-2">
                  {deadlines.map(event => (
                    <div key={event.id} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-orange-300 mt-1">{format(new Date(event.eventDate), "MMM d, yyyy · h:mm a")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Upcoming Events */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> All Upcoming Events
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => {
                    const et = getEventType(event.eventType);
                    return (
                      <div key={event.id} className={`p-3 rounded-xl border ${et.badge}`}>
                        <p className="text-xs font-medium">{event.title}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{format(new Date(event.eventDate), "MMM d, yyyy")}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
