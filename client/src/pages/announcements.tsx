import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Megaphone, Plus, Clock, Users, Building, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";


// fallback list – used when /api/departments returns nothing
const STATIC_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Chemical",
  "Electrical",
  "MBA",
  "MCA",
  "BSc",
];

const EVENT_TYPES = [
  { value: "", label: "No calendar entry" },
  { value: "lecture", label: "Lecture / Class" },
  { value: "exam", label: "Exam" },
  { value: "assignment_deadline", label: "Assignment Deadline" },
  { value: "holiday", label: "Holiday" },
  { value: "seminar", label: "Seminar / Workshop" },
];

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    targetRole: "ALL",
    department: "",
    eventType: "",
    eventDate: "",
  });

  // ✅ announcements fetch
  const { data: announcements = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load announcements");
      }
      return res.json();
    },
  });

  // ✅ departments fetch
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deptOptionsSource =
    departments.length > 0
      ? departments.map((d: any) => d.name)
      : STATIC_DEPARTMENTS;

  const allDeptOptions = [
    { value: "", label: "All Departments" },
    ...deptOptionsSource.map((name) => ({ value: name, label: name })),
  ];

  const createAnnouncement = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create announcement");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        content: "",
        targetRole: "ALL",
        department: "",
        eventType: "",
        eventDate: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "✅ Broadcast sent!",
        description: "All members have been notified.",
      });
    },
  });

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }

    // ✅ smart payload (merged logic)
    const payload =
      !formData.eventType || !formData.eventDate
        ? {
            title: formData.title,
            content: formData.content,
            targetRole: formData.targetRole,
            department: formData.department,
          }
        : formData;

    createAnnouncement.mutate(payload);
  };

  const isAdminOrDept =
    user?.role === "ADMIN" || user?.role === "UNIVERSITY_ADMIN" || user?.role === "TEACHER";

  const formatDate = (d: any) => {
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <AppLayout>
      {/* Moodle-style page header block */}
      <div className="bg-white border border-[#dee2e6] rounded-sm shadow-sm mb-4">
        <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#dee2e6] flex items-center justify-between">
          <h1 className="font-semibold text-sm text-[#212529] uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#0f6cb6]" />
            Announcements &amp; Broadcasts
          </h1>

          {isAdminOrDept && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#0f6cb6] hover:bg-[#0a5a9c] text-white text-xs gap-1"
                >
                  <Plus className="w-3 h-3" />
                  New Broadcast
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[620px] bg-white border-[#dee2e6] p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 bg-[#f8f9fa] border-b border-[#dee2e6]">
                  <DialogTitle className="text-base font-semibold text-[#212529] flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#0f6cb6]" />
                    Broadcast a New Announcement
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBroadcast} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#212529]">
                      Title *
                    </label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="border-[#dee2e6] focus:border-[#0f6cb6] text-[#212529]"
                      placeholder="e.g. Holiday Schedule Update"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#212529]">Target Role</label>
                      <select
                        value={formData.targetRole}
                        onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                        className="w-full h-9 px-3 rounded-md bg-white border border-[#dee2e6] text-sm text-[#212529] focus:outline-none focus:ring-1 focus:ring-[#0f6cb6]"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="STUDENT">Students Only</option>
                        <option value="TEACHER">Faculty Only</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[#212529]">Department</label>
                      <Input
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="border-[#dee2e6] focus:border-[#0f6cb6] text-[#212529]"
                        placeholder="Leave empty for all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#212529]">Message *</label>
                    <Textarea
                      required
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="border-[#dee2e6] focus:border-[#0f6cb6] text-[#212529] min-h-[120px] resize-y"
                      placeholder="Write the announcement message here..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#dee2e6] text-[#495057] hover:bg-[#e9ecef] text-sm"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAnnouncement.isPending}
                      className="bg-[#0f6cb6] hover:bg-[#0a5a9c] text-white text-sm gap-1"
                    >
                      {createAnnouncement.isPending ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Broadcasting...</>
                      ) : (
                        <><Megaphone className="w-3 h-3" /> Broadcast</>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="px-4 py-2 bg-white">
          <p className="text-sm text-[#6c757d]">
            University-wide announcements and circulars from administrators and faculty.
          </p>
        </div>
      </div>

      {/* Announcements list */}
      <div className="bg-white border border-[#dee2e6] rounded-sm shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f6cb6]" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm font-medium text-red-600">
              Failed to load announcements. Please refresh.
            </p>
            <p className="text-xs text-[#6c757d] mt-1">{(error as any)?.message}</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-[#adb5bd]" />
            <p className="text-base font-medium text-[#495057]">No announcements yet</p>
            <p className="text-sm text-[#6c757d] mt-1">
              {isAdminOrDept
                ? `Use the "New Broadcast" button above to send one.`
                : "Check back later for updates from the administration."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e9ecef]">
            {announcements.map((item: any) => (
              <div key={item.id} className="px-5 py-4 hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8f4fd] flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="w-4 h-4 text-[#0f6cb6]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#212529]">{item.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#6c757d]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        {item.targetRole && item.targetRole !== "ALL" && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#0f6cb6]" />
                            {item.targetRole}
                          </span>
                        )}
                        {item.department && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-[#6c757d]" />
                            {item.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#495057] whitespace-pre-line leading-relaxed pl-11">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
