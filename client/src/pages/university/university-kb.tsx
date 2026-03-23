import { AppLayout } from "@/components/layout/app-layout";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Upload,
  Trash2,
  FileText,
  Search,
  Plus,
  Database,
  CheckCircle2,
  Loader2,
  FileUp,
  AlignLeft,
  X,
  BookOpen,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface KBDocument {
  id: number;
  title: string;
  category: string | null;
  status: string | null;
  createdAt: string;
  uploaderName?: string;
}

// ─────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────

async function fetchKBDocs(): Promise<KBDocument[]> {
  const res = await fetch("/api/university-kb", { credentials: "include" });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch KB documents");
  return res.json();
}

async function uploadTextDoc(data: { title: string; category: string; content: string }) {
  const res = await fetch("/api/university-kb", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to upload document");
  return res.json();
}

async function uploadFileDoc(formData: FormData) {
  const res = await fetch("/api/university-kb", {
    method: "POST",
    credentials: "include",
    body: formData,   // browser sets multipart/form-data boundary automatically
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to upload file");
  return res.json();
}

async function deleteKBDoc(id: number) {
  const res = await fetch(`/api/university-kb/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to delete document");
}

// ─────────────────────────────────────────────────────────────
// Upload Dialog — two tabs: "Paste Text" / "Upload File"
// ─────────────────────────────────────────────────────────────

type UploadTab = "text" | "file";

function UploadDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<UploadTab>("text");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [textForm, setTextForm] = useState({ title: "", category: "University KB", content: "" });
  const [fileTitle, setFileTitle] = useState("");
  const [fileCategory, setFileCategory] = useState("University KB");

  const uploadText = useMutation({
    mutationFn: uploadTextDoc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/university-kb"] });
      toast({ title: "✅ Document uploaded", description: "Content has been added to the University KB and queued for embedding." });
      onClose();
    },
    onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const uploadFile = useMutation({
    mutationFn: uploadFileDoc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/university-kb"] });
      toast({ title: "✅ File uploaded", description: "File content has been extracted and added to the University KB." });
      onClose();
    },
    onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!fileTitle) setFileTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [fileTitle]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textForm.title.trim() || !textForm.content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    uploadText.mutate(textForm);
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("title", fileTitle.trim() || selectedFile.name);
    fd.append("category", fileCategory.trim() || "University KB");
    uploadFile.mutate(fd);
  };

  const isPending = uploadText.isPending || uploadFile.isPending;

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-md">
        <button
          type="button"
          onClick={() => setTab("text")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${
            tab === "text"
              ? "bg-white text-[#0f6cb6] shadow-sm border border-[#dee2e6]"
              : "text-[#6c757d] hover:text-[#212529]"
          }`}
        >
          <AlignLeft className="w-4 h-4" /> Paste Text
        </button>
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${
            tab === "file"
              ? "bg-white text-[#0f6cb6] shadow-sm border border-[#dee2e6]"
              : "text-[#6c757d] hover:text-[#212529]"
          }`}
        >
          <FileUp className="w-4 h-4" /> Upload File
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "text" ? (
          <motion.form
            key="text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleTextSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#495057] uppercase tracking-wide">Document Title *</label>
                <Input
                  required
                  placeholder="e.g. Admission Policy 2025"
                  value={textForm.title}
                  onChange={(e) => setTextForm((f) => ({ ...f, title: e.target.value }))}
                  className="border-[#ced4da] focus:border-[#0f6cb6] focus:ring-1 focus:ring-[#0f6cb6]/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#495057] uppercase tracking-wide">Category</label>
                <Input
                  placeholder="e.g. Admissions, Fee Structure"
                  value={textForm.category}
                  onChange={(e) => setTextForm((f) => ({ ...f, category: e.target.value }))}
                  className="border-[#ced4da] focus:border-[#0f6cb6] focus:ring-1 focus:ring-[#0f6cb6]/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#495057] uppercase tracking-wide">Content *</label>
              <Textarea
                required
                placeholder="Paste the university document text here... Fee structure, admission info, hostel rules, exam schedules, etc."
                value={textForm.content}
                onChange={(e) => setTextForm((f) => ({ ...f, content: e.target.value }))}
                className="min-h-[180px] resize-y border-[#ced4da] focus:border-[#0f6cb6] focus:ring-1 focus:ring-[#0f6cb6]/20"
              />
              <p className="text-xs text-[#6c757d]">{textForm.content.length} characters</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <Button type="button" variant="outline" onClick={onClose} className="border-[#dee2e6]">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#0f6cb6] hover:bg-[#0d5c97] text-white">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Add to KB</>}
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="file"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleFileSubmit}
            className="space-y-4"
          >
            {/* Drag-and-drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#0f6cb6] bg-[#0f6cb6]/5"
                  : "border-[#ced4da] hover:border-[#0f6cb6]/50 hover:bg-[#f8f9fa]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx,.json,.html"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-medium text-[#212529]">{selectedFile.name}</p>
                  <p className="text-sm text-[#6c757d]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileTitle(""); }}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#e9ecef] flex items-center justify-center">
                    <FileUp className="w-7 h-7 text-[#6c757d]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#212529]">Drop a file here, or click to browse</p>
                    <p className="text-sm text-[#6c757d] mt-1">Supported: TXT, MD, PDF, DOC, DOCX, JSON, HTML (max 10 MB)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title & Category overrides */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#495057] uppercase tracking-wide">Title (auto-filled)</label>
                <Input
                  placeholder="Overrride file name"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="border-[#ced4da] focus:border-[#0f6cb6]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#495057] uppercase tracking-wide">Category</label>
                <Input
                  placeholder="e.g. Fee Structure"
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  className="border-[#ced4da] focus:border-[#0f6cb6]"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Text is extracted from the file and fed to the AI. For PDF/DOCX files, plain text content is parsed.
                The document will be automatically embedded via the RAG pipeline and made available for student/teacher queries.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
              <Button type="button" variant="outline" onClick={onClose} className="border-[#dee2e6]">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedFile} className="bg-[#0f6cb6] hover:bg-[#0d5c97] text-white">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…</> : <><FileUp className="w-4 h-4 mr-2" /> Upload File</>}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function UniversityKB() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: docs = [], isLoading, error } = useQuery<KBDocument[]>({
    queryKey: ["/api/university-kb"],
    queryFn: fetchKBDocs,
    retry: false,
  });

  const deleteDoc = useMutation({
    mutationFn: deleteKBDoc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/university-kb"] });
      toast({ title: "Document deleted from University KB" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(docs.map((d) => d.category || "Uncategorized")));

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#212529] flex items-center gap-2">
            <Database className="w-6 h-6 text-[#0f6cb6]" />
            University Knowledge Base
          </h1>
          <p className="text-[#6c757d] mt-1 text-sm">
            Upload university documents — admission policies, fee structures, hostel rules, academic calendars — to power
            AI responses for students and teachers.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0f6cb6] hover:bg-[#0d5c97] text-white shrink-0 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px] bg-white border-[#dee2e6] shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#212529]">
                <BookOpen className="w-5 h-5 text-[#0f6cb6]" />
                Add to University Knowledge Base
              </DialogTitle>
              <p className="text-sm text-[#6c757d]">Upload a file or paste text. Content will be embedded for AI-powered Q&A.</p>
            </DialogHeader>
            <UploadDialog onClose={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Documents", value: docs.length, icon: FileText, color: "text-[#0f6cb6]", bg: "bg-[#e8f1fb]" },
          { label: "Categories", value: categories.length, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Characters", value: `~${(docs.length * 2000).toLocaleString()}`, icon: AlignLeft, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "AI-Ready", value: docs.length > 0 ? "Yes ✓" : "No", icon: CheckCircle2, color: docs.length > 0 ? "text-green-600" : "text-[#6c757d]", bg: docs.length > 0 ? "bg-green-50" : "bg-[#f8f9fa]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#dee2e6] rounded-md p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-[#6c757d]">{stat.label}</p>
              <p className="font-bold text-[#212529] text-lg leading-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
        <Input
          placeholder="Search documents by title or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-[#ced4da] focus:border-[#0f6cb6] focus:ring-1 focus:ring-[#0f6cb6]/20 bg-white"
        />
      </div>

      {/* Document list */}
      <div className="bg-white border border-[#dee2e6] rounded-md shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-[#f8f9fa] border-b border-[#dee2e6] text-xs font-semibold text-[#6c757d] uppercase tracking-wider">
          <span>Document</span>
          <span>Category</span>
          <span>Status</span>
          <span>Added</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0f6cb6]" />
            <p className="text-sm text-[#6c757d]">Loading knowledge base…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-600">
            <X className="w-10 h-10 opacity-50" />
            <p className="font-medium">Failed to load knowledge base</p>
            <p className="text-sm text-[#6c757d]">{(error as any).message}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#6c757d]">
            <Database className="w-12 h-12 opacity-20" />
            <p className="font-medium text-[#495057]">
              {search ? "No documents match your search" : "No documents in the University KB yet"}
            </p>
            {!search && (
              <p className="text-sm text-center max-w-xs">
                Click "Add Knowledge" to upload your first document. Students and teachers will be able to ask the AI
                questions based on this content.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#f1f3f5]">
            <AnimatePresence>
              {filtered.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3.5 hover:bg-[#f8f9fa] transition-colors"
                >
                  {/* Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#e8f1fb] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#0f6cb6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#212529] text-sm truncate">{doc.title}</p>
                      {doc.uploaderName && (
                        <p className="text-xs text-[#6c757d] truncate">by {doc.uploaderName}</p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#e9ecef] text-[#495057] border border-[#dee2e6] whitespace-nowrap">
                    {doc.category || "Uncategorized"}
                  </span>

                  {/* Status */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                      doc.status === "APPROVED"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : doc.status === "REJECTED"
                        ? "bg-red-100 text-red-600 border border-red-200"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    {doc.status || "APPROVED"}
                  </span>

                  {/* Date */}
                  <span className="text-xs text-[#6c757d] whitespace-nowrap">
                    {format(new Date(doc.createdAt), "MMM d, yyyy")}
                  </span>

                  {/* Delete */}
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteDoc.isPending}
                      onClick={() => {
                        if (confirm(`Delete "${doc.title}" from the University KB?`)) {
                          deleteDoc.mutate(doc.id);
                        }
                      }}
                      className="h-8 w-8 text-[#6c757d] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete document"
                    >
                      {deleteDoc.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {docs.length > 0 && (
        <p className="mt-4 text-xs text-[#6c757d] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {docs.length} document{docs.length !== 1 ? "s" : ""} in the knowledge base — students and teachers can query this content via AI Chat.
        </p>
      )}
    </AppLayout>
  );
}
