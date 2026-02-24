import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Trash2, FileText, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const { data: documents = [], isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", category: "", content: "" });

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    createDocument.mutate(
      {
        title: formData.title,
        category: formData.category,
        content: formData.content,
      },
      {
        onSuccess: () => {
          setIsUploadOpen(false);
          setFormData({ title: "", category: "", content: "" });
          toast({ title: "Document uploaded successfully" });
        },
        onError: (err) => {
          toast({ title: "Failed to upload", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if(confirm("Are you sure you want to delete this document?")) {
      deleteDocument.mutate(id, {
        onSuccess: () => toast({ title: "Document deleted" })
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage documents available for the RAG engine.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 glass-input rounded-xl h-11"
            />
          </div>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Upload Context
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/10 sm:max-w-[600px] text-foreground p-0 overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Add Document
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">This text will be embedded and made searchable.</p>
              </div>
              
              <form onSubmit={handleUpload} className="p-6 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input 
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="glass-input h-11"
                        placeholder="e.g. Q3 Roadmap"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Input 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="glass-input h-11"
                        placeholder="e.g. Planning"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content (Text)</label>
                    <Textarea 
                      required
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      className="glass-input min-h-[200px] resize-y"
                      placeholder="Paste document text here..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDocument.isPending} className="bg-primary hover:bg-primary/90">
                    {createDocument.isPending ? "Uploading..." : "Save Document"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Date Added</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-6 py-5"><div className="h-5 w-48 bg-white/5 rounded animate-pulse"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-24 bg-white/5 rounded animate-pulse"></div></td>
                    <td className="px-6 py-5"><div className="h-5 w-32 bg-white/5 rounded animate-pulse"></div></td>
                    <td className="px-6 py-5"></td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No documents found. Upload your first context source.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={doc.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300 border border-white/5">
                        {doc.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteDocument.isPending}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
