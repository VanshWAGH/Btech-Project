import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Search, Download, Eye, BookOpen, Filter,
  Database, GraduationCap, FlaskConical, BookMarked, Loader2
} from "lucide-react";
import { format } from "date-fns";

const SUBJECTS = ["All", "DBMS", "Operating Systems", "Computer Networks", "Data Structures", "Software Engineering"];
const TYPES = ["All", "Syllabus", "Notes", "Assignment", "Lab Manual", "Question Paper"];

const categoryIcon: Record<string, any> = {
  syllabus: GraduationCap,
  notes: BookOpen,
  assignment: FileText,
  lab: FlaskConical,
  default: BookMarked,
};

const categoryColor: Record<string, string> = {
  syllabus: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300",
  notes: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300",
  assignment: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
  lab: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
  default: "from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-300",
};

function getCategoryKey(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("syllabus")) return "syllabus";
  if (c.includes("note") || c.includes("lecture")) return "notes";
  if (c.includes("assign")) return "assignment";
  if (c.includes("lab")) return "lab";
  return "default";
}

export default function StudentMaterials() {
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });

  const filtered = documents.filter((doc: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || doc.title?.toLowerCase().includes(q) || doc.content?.toLowerCase().includes(q);
    const matchSubject = selectedSubject === "All" || doc.category?.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchType = selectedType === "All" || doc.category?.toLowerCase().includes(selectedType.toLowerCase());
    return matchSearch && matchSubject && matchType;
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-400" />
                Course Materials
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Access all academic documents from your department
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Database className="w-3 h-3 mr-1" />
                {documents.length} Documents
              </Badge>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search materials by title or content..."
                className="pl-10 bg-white/5 border-white/10 focus:border-blue-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mr-1">Subject:</span>
              </div>
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedSubject === s
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mr-1">Type:</span>
              </div>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedType === t
                      ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold mb-2">No materials found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later for new uploads.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((doc: any, i: number) => {
              const catKey = getCategoryKey(doc.category);
              const color = categoryColor[catKey];
              const Icon = categoryIcon[catKey];
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group glass rounded-2xl p-5 border bg-gradient-to-br ${color} hover-elevate transition-all cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Icon className="w-5 h-5 opacity-80" />
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-black/20 border-white/15">
                      {doc.status || "active"}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:opacity-90 transition-opacity">
                    {doc.title}
                  </h3>
                  {doc.content && (
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">{doc.content.substring(0, 100)}…</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {doc.category || "General"}
                    </span>
                    <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1 text-xs bg-black/20 hover:bg-black/30 border border-white/10 gap-1">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-xs bg-black/20 hover:bg-black/30 border border-white/10 gap-1">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
