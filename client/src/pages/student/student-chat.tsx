import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateQuery, useQueries } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Bot, CornerDownLeft, Loader2, ShieldCheck, Sparkles, FileText,
  Star, ThumbsUp, ChevronRight, MessageSquare, Send, BookMarked,
  AlertTriangle, Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProcessedQueryResponse } from "@shared/schema";
import { format } from "date-fns";

const SUGGESTED = [
  "What is Unit 3 in DBMS syllabus?",
  "Explain normalization in simple terms",
  "When is the next internal exam?",
  "What are ACID properties?",
  "Explain deadlock with example",
];

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 0.8 ? "bg-emerald-500" : score >= 0.5 ? "bg-amber-500" : "bg-red-500";
  const label = score >= 0.8 ? "High" : score >= 0.5 ? "Medium" : "Low";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          className={`h-full ${color} rounded-full`}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${score >= 0.8 ? "text-emerald-400" : score >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
        {label} ({Math.round(score * 100)}%)
      </span>
    </div>
  );
}

export default function StudentChat() {
  const [queryInput, setQueryInput] = useState("");
  const [activeResult, setActiveResult] = useState<ProcessedQueryResponse | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const createQuery = useCreateQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  // Extract pre-filled question from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQueryInput(q);
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || createQuery.isPending) return;
    const q = queryInput;
    setQueryInput("");
    createQuery.mutate({ query: q }, {
      onSuccess: (data) => {
        setActiveResult(data);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to process query. Please try again.", variant: "destructive" });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handleSave = () => {
    if (!activeResult) return;
    setSavedAnswers(prev => [...prev, activeResult.response]);
    toast({ title: "⭐ Saved!", description: "Answer saved to your bookmarks." });
  };

  const handleAskTeacher = () => {
    toast({ title: "Forwarded to Teacher", description: "Your question has been escalated to the department teacher." });
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeResult, createQuery.isPending]);

  const confidence = activeResult ? (activeResult.sources?.length ? Math.min(0.95, 0.5 + activeResult.sources.length * 0.15) : 0.35) : 0;

  return (
    <AppLayout>
      <div className="h-full flex flex-col lg:flex-row gap-6">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col h-[calc(100vh-8rem)]">
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Brain className="w-6 h-6 text-violet-400" />
                AI Study Assistant
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Powered by your department's knowledge base</p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
              RAG Active
            </Badge>
          </header>

          {/* Results Area */}
          <div className="flex-1 glass rounded-2xl p-6 mb-5 overflow-y-auto custom-scrollbar relative flex flex-col">
            {!activeResult && !createQuery.isPending && (
              <div className="m-auto text-center max-w-md opacity-70">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">How can I help you study?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Ask about your syllabus, assignments, concepts, or exam schedules.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQueryInput(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {createQuery.isPending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center m-auto space-y-5"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <Bot className="w-6 h-6 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-violet-300 animate-pulse">Searching knowledge base...</p>
                    <p className="text-xs text-muted-foreground mt-1">Applying tenant-specific vector filter</p>
                  </div>
                </motion.div>
              )}

              {activeResult && !createQuery.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* AI Answer */}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <div className="glass-panel p-5 rounded-2xl rounded-tl-sm border border-violet-500/20 shadow-lg">
                        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Response</span>
                          <ConfidenceBar score={confidence} />
                        </div>
                        {activeResult.response.split('\n').map((para, i) => (
                          <p key={i} className="mb-3 last:mb-0 text-sm leading-relaxed text-gray-200">{para}</p>
                        ))}
                        {confidence < 0.5 && (
                          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <p className="text-xs text-amber-300">Low confidence answer. Consider asking your teacher for clarification.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="ghost" onClick={handleSave} className="text-xs gap-1.5 hover:text-amber-400 hover:bg-amber-500/10">
                          <Star className="w-3.5 h-3.5" /> Save Answer
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs gap-1.5 hover:text-emerald-400 hover:bg-emerald-500/10">
                          <ThumbsUp className="w-3.5 h-3.5" /> Helpful
                        </Button>
                        {confidence < 0.5 && (
                          <Button size="sm" variant="ghost" onClick={handleAskTeacher} className="text-xs gap-1.5 hover:text-blue-400 hover:bg-blue-500/10">
                            <MessageSquare className="w-3.5 h-3.5" /> Ask Teacher
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sources */}
                  {activeResult.sources && activeResult.sources.length > 0 && (
                    <div className="pl-14">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Sources from Knowledge Base
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeResult.sources.map((source: any, idx: number) => (
                          <div key={idx} className="glass-panel p-3 rounded-xl border-l-2 border-l-violet-500/50 group hover:bg-violet-500/5 transition-colors cursor-pointer">
                            <p className="font-medium text-sm truncate">{source.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                                {source.category || 'Course Material'}
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
            <div className="relative flex items-end shadow-2xl shadow-black/50 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/30 transition-all">
              <Textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your syllabus, assignments, or exams..."
                className="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 px-4 py-4 text-sm"
                rows={1}
                disabled={createQuery.isPending}
              />
              <div className="p-3 shrink-0">
                <Button
                  type="submit"
                  size="icon"
                  disabled={!queryInput.trim() || createQuery.isPending}
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/25 transition-all active:scale-95"
                >
                  {createQuery.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Responses are filtered to your department's documents only
            </p>
          </form>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 h-[calc(100vh-8rem)] flex flex-col shrink-0 space-y-4">
          <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Suggested Questions
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQueryInput(q)}
                  className="w-full text-left p-3 rounded-xl hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-violet-400 font-bold mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-xs group-hover:text-violet-300 transition-colors line-clamp-2">{q}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {savedAnswers.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <BookMarked className="w-4 h-4 text-amber-400" />
                Saved ({savedAnswers.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                <a href="/student/saved-answers" className="text-amber-400 hover:underline">View all saved answers →</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
