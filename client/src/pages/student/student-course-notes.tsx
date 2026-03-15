import { AppLayout } from "@/components/layout/app-layout";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Search, Filter, ArrowLeft, Download, Tag, BookOpen,
  Loader2, ChevronRight, BookMarked
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";

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

export default function StudentCourseNotes() {
  const [, params] = useRoute("/student/course/:id/notes");
  const [, navigate] = useLocation();
  const courseId = params?.id ? parseInt(params.id) : 0;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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

  const topics = Array.from(new Set(notes.map((n: any) => n.topic).filter(Boolean)));
  const filtered = notes.filter((n: any) => {
    const matchSearch = !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      (n.topic || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || n.fileType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/student/courses")} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3 h-3" /> {course?.courseName || "Course"}
              <ChevronRight className="w-3 h-3" /> Study Materials
            </div>
            <h1 className="text-2xl font-display font-bold">Study Materials</h1>
          </div>
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
            <div className="ml-auto text-xs text-muted-foreground">
              {notes.length} materials available
            </div>
          </div>
        )}

        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSearch("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${!search ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-transparent hover:border-white/10"}`}
            >
              All Topics
            </button>
            {topics.map(topic => (
              <button
                key={topic}
                onClick={() => setSearch(search === topic ? "" : topic)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${search === topic ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-transparent hover:border-white/10"}`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, topic, or tag..." className="pl-10 bg-white/5 border-white/10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(FILE_ICONS).map(t => <SelectItem key={t} value={t}>{FILE_ICONS[t]} {t.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl opacity-60">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No materials found</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new uploads</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((note: any, i: number) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group glass rounded-2xl p-5 border border-white/5 hover:border-primary/30 transition-all duration-300 hover-elevate"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{FILE_ICONS[note.fileType] || "📄"}</div>
                  <Badge className={`text-[10px] ${TYPE_COLORS[note.fileType] || "bg-gray-500/20"}`}>
                    {(note.fileType || "file").toUpperCase()}
                  </Badge>
                </div>

                <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">{note.title}</h3>
                {note.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{note.description}</p>
                )}

                {note.topic && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{note.topic}</span>
                  </div>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 4).map((tag: string, ti: number) => (
                      <span key={ti} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-muted-foreground">By {note.uploaderName || "Instructor"}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(note.uploadedAt), "MMM d, yyyy")}</p>
                  </div>
                  {note.fileUrl ? (
                    <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" download>
                      <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-1">
                        <Download className="w-3 h-3" /> Download
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" disabled className="h-7 text-xs opacity-40 gap-1">
                      <Download className="w-3 h-3" /> No file
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
