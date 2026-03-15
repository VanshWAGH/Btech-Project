import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueries } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock, Bot, Search, ChevronRight, MessageSquare, Calendar,
  CornerDownLeft, Loader2, History, Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function StudentHistory() {
  const { data: history = [], isLoading } = useQueries();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = history.filter((q: any) =>
    !search || q.query?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-violet-400" />
                Chat History
              </h1>
              <p className="text-sm text-muted-foreground mt-1">View and revisit your previous AI conversations</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                {history.length} Questions
              </Badge>
              <Link href="/student/chat">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 gap-1.5 rounded-xl">
                  <MessageSquare className="w-3.5 h-3.5" /> New Chat
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your questions..."
              className="pl-10 bg-white/5 border-white/10 focus:border-violet-500/50"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold mb-2">No history yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start asking questions to see your chat history here.</p>
            <Link href="/student/chat">
              <Button variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10">
                Ask your first question →
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`glass rounded-2xl overflow-hidden border transition-colors cursor-pointer ${
                    expanded === item.id ? "border-violet-500/30" : "border-white/5 hover:border-white/10"
                  }`}
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1 line-clamp-1">{item.query}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.createdAt), 'MMM d, yyyy')}
                        </span>
                        {item.relevantDocs?.length > 0 && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="text-violet-400">{item.relevantDocs.length} sources</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/student/chat?q=${encodeURIComponent(item.query)}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs gap-1 hover:bg-violet-500/10 hover:text-violet-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CornerDownLeft className="w-3 h-3" /> Ask Again
                        </Button>
                      </Link>
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === item.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0">
                          <div className="border-t border-white/5 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                              <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Response</span>
                            </div>
                            <div className="glass-panel rounded-xl p-4 text-sm text-gray-300 leading-relaxed line-clamp-6">
                              {item.response || "No response recorded."}
                            </div>
                            {item.relevantDocs?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">Sources used:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.relevantDocs.map((d: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-white/5">{d}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
