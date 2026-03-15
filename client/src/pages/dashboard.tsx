import { AppLayout } from "@/components/layout/app-layout";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateQuery, useQueries } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProcessedQueryResponse } from "@shared/schema";
import { Search, Sparkles, FileText, Bot, ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [queryInput, setQueryInput] = useState("");
  const [activeResult, setActiveResult] = useState<ProcessedQueryResponse | null>(null);
  
  const { data: history = [] } = useQueries();
  const createQuery = useCreateQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || createQuery.isPending) return;

    createQuery.mutate({ query: queryInput }, {
      onSuccess: (data) => {
        setActiveResult(data);
        setQueryInput("");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-scroll to bottom of results
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeResult, createQuery.isPending]);

  return (
    <AppLayout>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        
        {/* Main Interface */}
        <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
          <header className="mb-6">
            <h1 className="text-3xl font-display font-bold">Query Engine</h1>
            <p className="text-muted-foreground mt-1">Ask questions across your organization's knowledge base.</p>
          </header>

          {/* Results Area */}
          <div className="flex-1 glass rounded-2xl p-6 mb-6 overflow-y-auto custom-scrollbar relative flex flex-col">
            {!activeResult && !createQuery.isPending && (
              <div className="m-auto text-center max-w-md opacity-60">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">How can I help?</h3>
                <p className="text-sm">Search documents, ask questions, or synthesize information from your secure tenant vault.</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {createQuery.isPending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center m-auto space-y-6"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Bot className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-primary animate-pulse">Retrieving context...</p>
                    <p className="text-xs text-muted-foreground mt-2">Scanning semantic vectors</p>
                  </div>
                </motion.div>
              )}

              {activeResult && !createQuery.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* AI Response */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="glass-panel p-6 rounded-2xl rounded-tl-sm text-sm leading-relaxed prose prose-invert max-w-none">
                        {activeResult.response.split('\n').map((para, i) => (
                          <p key={i} className="mb-4 last:mb-0 text-gray-200">{para}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Context Sources */}
                  {activeResult.sources && activeResult.sources.length > 0 && (
                    <div className="pl-14">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> 
                        Sources Consulted
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeResult.sources.map((source, idx) => (
                          <div key={idx} className="glass-panel p-3 rounded-xl hover-elevate cursor-pointer group">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{source.title}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
                                {source.category || 'General'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="relative mt-auto shrink-0">
            <div className="relative flex items-end shadow-2xl shadow-black/50 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <Textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your documents..."
                className="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 px-4 py-4 text-base"
                rows={1}
                disabled={createQuery.isPending}
              />
              <div className="p-3 shrink-0">
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!queryInput.trim() || createQuery.isPending}
                  className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-95"
                >
                  {createQuery.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CornerDownLeft className="w-5 h-5" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Responses are generated based strictly on available tenant context.
            </p>
          </form>
        </div>

        {/* Sidebar History */}
        <div className="w-full lg:w-80 h-[calc(100vh-8rem)] flex flex-col shrink-0">
          <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recent Queries</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
              {history.length === 0 ? (
                <div className="text-center p-6 opacity-50">
                  <p className="text-xs">No history yet</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Note: In a real app we'd fetch the full detail, 
                      // here we simulate loading it to activeResult
                      setQueryInput(item.query);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {item.query}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </AppLayout>
  );
}
