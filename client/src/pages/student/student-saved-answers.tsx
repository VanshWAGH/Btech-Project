import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Trash2, Copy, BookMarked, Search, X,
  Bot, FileText, Tag, Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// In real app these come from backend - here we use localStorage mock
const DEMO_SAVED = [
  {
    id: 1,
    question: "What is normalization?",
    answer: "Normalization is the process of organizing a database to reduce redundancy and improve data integrity. It involves dividing large tables into smaller tables and defining relationships between them. The main forms are 1NF, 2NF, 3NF, and BCNF.",
    subject: "DBMS",
    savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["DBMS", "Normalization"],
  },
  {
    id: 2,
    question: "Explain deadlock with a real example",
    answer: "A deadlock occurs when two or more processes are stuck waiting for each other indefinitely. Example: Process A holds Resource 1 and needs Resource 2. Process B holds Resource 2 and needs Resource 1. Neither can proceed, causing a deadlock. The necessary conditions are Mutual Exclusion, Hold and Wait, No preemption, and Circular Wait.",
    subject: "OS",
    savedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["OS", "Deadlock", "Processes"],
  },
];

export default function StudentSavedAnswers() {
  const [saved, setSaved] = useState(DEMO_SAVED);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();

  const filtered = saved.filter(s =>
    !search || s.question.toLowerCase().includes(search.toLowerCase()) ||
    s.answer.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    setSaved(prev => prev.filter(s => s.id !== id));
    toast({ title: "Removed", description: "Answer removed from saved items." });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Answer copied to clipboard." });
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-400" />
                Saved Answers
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Your bookmarked AI responses for quick revision</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 w-fit">
              <BookMarked className="w-3 h-3 mr-1" />
              {saved.length} Saved
            </Badge>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your saved answers..."
              className="pl-10 bg-white/5 border-white/10 focus:border-amber-500/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold mb-2">No saved answers</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No matches for your search." : "Star AI responses during chat to save them here for revision."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                layout
              >
                <div
                  className={`glass rounded-2xl overflow-hidden border transition-all ${
                    expandedId === item.id ? "border-amber-500/30" : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-1">{item.question}</h3>
                        {expandedId !== item.id && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.answer}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] bg-white/5">
                              <Tag className="w-2.5 h-2.5 mr-1" />{tag}
                            </Badge>
                          ))}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(item.savedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="border-t border-white/5 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Bot className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">AI Response</span>
                            </div>
                            <div className="glass-panel p-4 rounded-xl text-sm text-gray-300 leading-relaxed mb-3">
                              {item.answer}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopy(item.answer)}
                                className="text-xs gap-1.5 hover:bg-white/10"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                className="text-xs gap-1.5 hover:bg-red-500/10 hover:text-red-400 ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </Button>
                            </div>
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
