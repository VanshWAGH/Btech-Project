import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCreateQuery } from "@/hooks/use-queries";
import {
  Search, Loader2, FileText, Sparkles, Database,
  ChevronRight, X, Bot, ShieldCheck, ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EXAMPLE_QUERIES = [
  "Database transactions",
  "OS scheduling algorithms",
  "Normalization techniques",
  "TCP vs UDP comparison",
  "Binary trees and traversal",
  "Software development lifecycle",
  "Network topology types",
  "Memory management in OS",
];

interface SearchResult {
  query: string;
  response: string;
  sources: any[];
  confidence: number;
}

export default function StudentSearch() {
  const [searchInput, setSearchInput] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const createQuery = useCreateQuery();
  const { toast } = useToast();

  const handleSearch = (q?: string) => {
    const query = q || searchInput;
    if (!query.trim() || createQuery.isPending) return;
    setResult(null);
    createQuery.mutate({ query }, {
      onSuccess: (data: any) => {
        const confidence = data.sources?.length ? Math.min(0.95, 0.5 + data.sources.length * 0.15) : 0.3;
        setResult({
          query,
          response: data.response,
          sources: data.sources || [],
          confidence,
        });
      },
      onError: () => toast({ title: "Search failed", description: "Please try again.", variant: "destructive" }),
    });
    if (!q) setSearchInput(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 text-emerald-400" />
            Knowledge Base Search
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Semantic search powered by vector embeddings — filtered to your department's knowledge base.
          </p>

          {/* Search Bar */}
          <div className="relative glass rounded-2xl p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search academic knowledge base..."
                  className="pl-12 pr-10 h-14 bg-transparent border-0 focus-visible:ring-0 text-base"
                  disabled={createQuery.isPending}
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(""); setResult(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={!searchInput.trim() || createQuery.isPending}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-xl shrink-0 gap-2"
              >
                {createQuery.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Search
              </Button>
            </div>
          </div>

          {/* How it works badge */}
          <div className="flex items-center gap-2 mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              Query → Embedding → Vector Search → Tenant Filter → Answer
            </span>
          </div>
        </motion.div>

        {/* Example Queries */}
        {!result && !createQuery.isPending && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Popular Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { setSearchInput(q); handleSearch(q); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 transition-all text-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        <AnimatePresence>
          {createQuery.isPending && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-12 text-center"
            >
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Database className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="font-medium text-emerald-300 animate-pulse">Searching vector database...</p>
              <p className="text-xs text-muted-foreground mt-2">Applying semantic similarity and tenant isolation filter</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !createQuery.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Query display */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">Results for: <span className="text-foreground font-medium">"{result.query}"</span></p>
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shrink-0">
                  {result.sources.length} sources found
                </Badge>
              </div>

              {/* AI Answer */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI-Synthesized Answer</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-emerald-400">{Math.round(result.confidence * 100)}% confidence</span>
                    </div>
                  </div>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  {result.response.split('\n').map((para, i) => (
                    <p key={i} className="text-sm text-gray-200 mb-3 last:mb-0 leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>

              {/* Source Documents */}
              {result.sources.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Retrieved Documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.sources.map((src: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="group glass-panel p-4 rounded-xl border-l-2 border-l-emerald-500/60 hover:bg-emerald-500/5 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium line-clamp-2 group-hover:text-emerald-300 transition-colors">{src.title}</p>
                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded mt-1.5 inline-block">
                              {src.category || 'Course Material'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
