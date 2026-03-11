import { AppLayout } from "@/components/layout/app-layout";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Upload, Loader2, Search, Trash2, Pencil, Tag, Download,
  ArrowLeft, BookOpen, ChevronRight, Plus, X
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
import { format } from "date-fns";

const FILE_TYPES = ["pdf", "docx", "ppt", "video", "image", "other"];
const FILE_ICONS: Record<string, string> = {
  pdf: "🔴", docx: "🔵", ppt: "🟠", video: "🎬", image: "🖼️", other: "📄"
};
const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-500/20 text-red-300 border-red-500/30",
  docx: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ppt: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  video: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  image: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

interface NoteForm {
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  topic: string;
  tags: string;
}

const emptyNoteForm: NoteForm = { title: "", description: "", fileUrl: "", fileType: "pdf", topic: "", tags: "" };

export default function TeacherCourseNotes() {
  const [, params] = useRoute("/teacher/courses/:id/notes");
  const [, navigate] = useLocation();
  const courseId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<any | null>(null);
  const [form, setForm] = useState<NoteForm>(emptyNoteForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: course } = useQuery<any>({
    queryKey: [`/api/courses/${courseId}`],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/courses/${courseId}/notes`],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/notes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NoteForm) => {
      const payload = { ...data, tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [] };
      const res = await fetch(`/api/courses/${courseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/notes`] });
      qc.invalidateQueries({ queryKey: ["/api/teacher/stats"] });
      toast({ title: "Note uploaded!", description: "Students have been notified." });
      setShowModal(false);
      setForm(emptyNoteForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: NoteForm }) => {
      const payload = { ...data, tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [] };
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/notes`] });
      toast({ title: "Note updated!" });
      setShowModal(false);
      setEditNote(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/notes`] });
      toast({ title: "Note deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => { setForm(emptyNoteForm); setEditNote(null); setShowModal(true); };
  const openEdit = (note: any) => {
    setEditNote(note);
    setForm({ title: note.title, description: note.description || "", fileUrl: note.fileUrl || "", fileType: note.fileType || "pdf", topic: note.topic || "", tags: (note.tags || []).join(", ") });
    setShowModal(true);
  };
  const handleSubmit = () => {
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (editNote) updateMutation.mutate({ id: editNote.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.topic || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || n.fileType === typeFilter;
    return matchSearch && matchType;
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => navigate("/teacher/courses")} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3 h-3" /> {course?.courseName || "Course"}
              <ChevronRight className="w-3 h-3" /> Notes
            </div>
            <h1 className="text-2xl font-display font-bold">Course Notes</h1>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-2">
            <Upload className="w-4 h-4" /> Upload Note
          </Button>
        </div>

        {/* Course Info */}
        {course && (
          <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold">{course.courseName}</p>
              <p className="text-xs text-muted-foreground">{course.courseCode} · {course.department} · Sem {course.semester}</p>
            </div>
            <div className="ml-auto flex gap-3 text-sm text-muted-foreground">
              <span>{notes.length} notes</span>
              <span>·</span>
              <span>{course.enrollmentCount || 0} students enrolled</span>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or topic..." className="pl-10 bg-white/5 border-white/10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {FILE_TYPES.map(t => <SelectItem key={t} value={t}>{FILE_ICONS[t]} {t.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl opacity-60">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No notes found</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your first study material</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group glass rounded-2xl p-5 border border-white/5 hover:border-primary/30 transition-all duration-300 hover-elevate"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{FILE_ICONS[note.fileType] || "📄"}</div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(note)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-primary">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(note.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">{note.title}</h3>
                {note.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{note.description}</p>}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge className={`text-[10px] ${TYPE_COLORS[note.fileType] || "bg-gray-500/20"}`}>{(note.fileType || "file").toUpperCase()}</Badge>
                  {note.topic && <Badge className="text-[10px] bg-white/10 text-gray-300"><Tag className="w-2.5 h-2.5 mr-1" />{note.topic}</Badge>}
                </div>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 3).map((tag: string, ti: number) => (
                      <span key={ti} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground">{format(new Date(note.uploadedAt), "MMM d, yyyy")}</p>
                  {note.fileUrl && (
                    <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] bg-white/5 hover:bg-white/10 border-white/10 gap-1">
                        <Download className="w-3 h-3" /> View
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload/Edit Modal */}
      <Dialog open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); setEditNote(null); } }}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editNote ? "Edit Note" : "Upload Study Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Chapter 1 - Normalization" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of the material..." className="bg-white/5 border-white/10 resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>File Type</Label>
                <Select value={form.fileType} onValueChange={v => setForm(f => ({ ...f, fileType: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{FILE_TYPES.map(t => <SelectItem key={t} value={t}>{FILE_ICONS[t]} {t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Normalization" className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>File URL</Label>
              <Input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." className="bg-white/5 border-white/10" />
              <p className="text-[10px] text-muted-foreground">Link to uploaded PDF, video, or document</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. dbms, sql, normalization" className="bg-white/5 border-white/10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="bg-white/5 border-white/10">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-primary hover:bg-primary/90">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editNote ? "Update Note" : "Upload Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Note?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this study material.</p>
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
