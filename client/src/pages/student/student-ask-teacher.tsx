import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateQuery } from "@/hooks/use-queries";
import {
  MessageSquare, Clock, CheckCircle, AlertTriangle,
  Send, Bot, Loader2, User, ChevronDown, ChevronUp,
  Sparkles, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

// Mock pending & answered questions (in real app these come from teacher-questions API)
const MOCK_PENDING = [
  { id: 1, question: "Can you explain the difference between 2NF and 3NF with a real example?", subject: "DBMS", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: "pending" },
  { id: 2, question: "What is the difference between semaphore and mutex?", subject: "OS", createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), status: "pending" },
];

const MOCK_ANSWERED = [
  {
    id: 3,
    question: "When is the DBMS project submission deadline?",
    subject: "DBMS",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "answered",
    answer: "The DBMS project submission deadline is October 25th, 2024. Please submit via the college portal with your roll number as the filename.",
    answeredBy: "Prof. Sharma",
    answeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function StudentAskTeacher() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [tab, setTab] = useState<"new" | "pending" | "answered">("new");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();
  const createQuery = useCreateQuery();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsSubmitting(true);

    // Try AI first
    createQuery.mutate({ query: question }, {
      onSuccess: (data: any) => {
        const confidence = data.sources?.length ? Math.min(0.95, 0.5 + data.sources.length * 0.15) : 0.3;
        setIsSubmitting(false);
        if (confidence < 0.5) {
          // Forward to teacher (mock)
          toast({
            title: "✅ Forwarded to Teacher",
            description: "The AI couldn't answer confidently. Your question has been sent to your department teacher.",
          });
          setQuestion("");
          setSubject("");
          setTab("pending");
        } else {
          toast({
            title: "💡 AI answered!",
            description: "The AI found a confident answer. Check the Chat page for details.",
          });
        }
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ title: "Question submitted", description: "Sent to your teacher for review." });
        setQuestion(""); setSubject("");
        setTab("pending");
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2 mb-1">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            Ask Teacher
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            When the AI can't answer confidently, your question gets forwarded to a teacher.
          </p>

          {/* Flow diagram */}
          <div className="glass rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">How It Works</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "Your Question", icon: User, color: "bg-blue-500/20 text-blue-300" },
                { label: "AI Tries to Answer", icon: Bot, color: "bg-violet-500/20 text-violet-300" },
                { label: "If Confidence Low", icon: AlertTriangle, color: "bg-amber-500/20 text-amber-300" },
                { label: "Forwarded to Teacher", icon: MessageSquare, color: "bg-emerald-500/20 text-emerald-300" },
                { label: "You Get Notified", icon: CheckCircle, color: "bg-green-500/20 text-green-300" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step.color} border border-white/10 text-xs font-medium`}>
                    <step.icon className="w-3 h-3" />
                    {step.label}
                  </div>
                  {i < 4 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 glass rounded-xl mb-6 w-fit">
            {[
              { key: "new", label: "Ask Question" },
              { key: "pending", label: `Pending (${MOCK_PENDING.length})` },
              { key: "answered", label: `Answered (${MOCK_ANSWERED.length})` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-4 py-2 text-sm rounded-lg transition-all ${
                  tab === t.key ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "new" && (
            <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass rounded-2xl p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Submit a Question
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Subject / Course</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. DBMS, Operating Systems"
                      className="bg-white/5 border-white/10 focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Your Question</label>
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Type your question here... The AI will try to answer first. If it can't, it'll be sent to your teacher."
                      className="min-h-[140px] bg-white/5 border-white/10 focus:border-blue-500/50 resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!question.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 gap-2 rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Question
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {tab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {MOCK_PENDING.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">{q.question}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">⏳ Awaiting Teacher</Badge>
                        <span className="text-xs text-muted-foreground">{q.subject}</span>
                        <span className="text-xs text-muted-foreground">• {format(new Date(q.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === "answered" && (
            <motion.div key="answered" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {MOCK_ANSWERED.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl overflow-hidden border border-emerald-500/20"
                >
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">{q.question}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">✅ Answered</Badge>
                          <span className="text-xs text-muted-foreground">{q.subject}</span>
                          <span className="text-xs text-muted-foreground">• {q.answeredBy}</span>
                        </div>
                      </div>
                      {expandedId === q.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedId === q.id && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="border-t border-white/5 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <User className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-semibold text-emerald-300">{q.answeredBy}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(q.answeredAt), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="glass-panel p-4 rounded-xl text-sm text-gray-300 leading-relaxed">
                              {q.answer}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
