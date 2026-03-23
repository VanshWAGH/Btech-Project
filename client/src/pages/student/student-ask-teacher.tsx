import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Clock, CheckCircle, AlertTriangle,
  Send, Bot, Loader2, User, ChevronDown, ChevronUp,
  Sparkles, ArrowRight
} from "lucide-react";
import { format } from "date-fns";

type TeacherQuestion = {
  id: number;
  question: string;
  subject: string;
  status: string;
  createdAt: string;
  aiAnswer?: string | null;
  teacherReply?: string | null;
  answeredAt?: string | null;
  teacherName?: string | null;
};

export default function StudentAskTeacher() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [tab, setTab] = useState<"new" | "pending" | "answered">("new");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: teacherQuestions = [] } = useQuery<TeacherQuestion[]>({
    queryKey: ["/api/student/teacher-questions"],
    queryFn: async () => {
      const res = await fetch("/api/student/teacher-questions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const normalizedQuestions = (teacherQuestions as TeacherQuestion[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .reduce<TeacherQuestion[]>((acc, curr) => {
      const currTime = new Date(curr.createdAt).getTime();
      const existingIdx = acc.findIndex((q) => {
        const qTime = new Date(q.createdAt).getTime();
        const closeInTime = Math.abs(qTime - currTime) < 30_000; // same ask event window
        return q.question.trim().toLowerCase() === curr.question.trim().toLowerCase() && closeInTime;
      });

      if (existingIdx === -1) {
        acc.push(curr);
        return acc;
      }

      const existing = acc[existingIdx];
      const existingScore = (existing.teacherReply ? 2 : 0) + (existing.aiAnswer ? 1 : 0);
      const currentScore = (curr.teacherReply ? 2 : 0) + (curr.aiAnswer ? 1 : 0);
      if (currentScore > existingScore) acc[existingIdx] = curr;
      return acc;
    }, []);

  const pendingQuestions = normalizedQuestions.filter((q) => !q.aiAnswer && !q.teacherReply && q.status !== "answered");
  const answeredQuestions = normalizedQuestions.filter((q) => !!q.aiAnswer || q.status === "answered" || !!q.teacherReply);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsSubmitting(true);
    try {
      const aiRes = await apiRequest("POST", "/api/student/chat", { query: question });
      const aiData = await aiRes.json();
      const confidence = typeof aiData?.confidenceScore === "number"
        ? aiData.confidenceScore
        : (aiData?.sources?.length ? Math.min(0.95, 0.5 + aiData.sources.length * 0.15) : 0.3);

      await apiRequest("POST", "/api/student/ask-teacher", {
        question,
        subject: subject || "General",
        aiAttempted: confidence >= 0.5,
        confidenceScore: confidence,
        aiAnswer: aiData?.response || null,
      });

      if (confidence >= 0.5) {
        setTab("answered");
        toast({
          title: "AI answered. Teacher notified.",
          description: "Your question is answered and a teacher was notified for further guidance if needed.",
        });
      } else {
        setTab("pending");
        toast({
          title: "Forwarded to teacher",
          description: "AI confidence was low. Your question has been sent to the teacher.",
        });
      }
      setQuestion("");
      setSubject("");
      queryClient.invalidateQueries({ queryKey: ["/api/student/teacher-questions"] });
    } catch {
      try {
        await apiRequest("POST", "/api/student/ask-teacher", {
          question,
          subject: subject || "General",
          aiAttempted: false,
          confidenceScore: 0,
        });
      } catch {}
      setQuestion("");
      setSubject("");
      setTab("pending");
      toast({ title: "Question submitted", description: "Sent to your teacher for review." });
      queryClient.invalidateQueries({ queryKey: ["/api/student/teacher-questions"] });
    } finally {
      setIsSubmitting(false);
    }
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
              { key: "pending", label: `Pending (${pendingQuestions.length})` },
              { key: "answered", label: `Answered (${answeredQuestions.length})` },
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
              {pendingQuestions.map((q, i) => (
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
                        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">⏳ Awaiting Teacher</span>
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
              {answeredQuestions.map((q, i) => (
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
                          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">✅ Answered</span>
                          <span className="text-xs text-muted-foreground">{q.subject}</span>
                          <span className="text-xs text-muted-foreground">• {q.teacherName || "Teacher / AI"}</span>
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
                              <span className="text-xs font-semibold text-emerald-300">{q.teacherName || "Teacher / AI"}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(q.answeredAt || q.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            {q.aiAnswer && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-violet-300 mb-1">AI Answer</p>
                                <div className="glass-panel p-4 rounded-xl text-sm text-gray-300 leading-relaxed">
                                  {q.aiAnswer}
                                </div>
                              </div>
                            )}
                            {q.teacherReply && (
                              <div>
                                <p className="text-xs font-semibold text-emerald-300 mb-1">Teacher Follow-up</p>
                                <div className="glass-panel p-4 rounded-xl text-sm text-gray-300 leading-relaxed border border-emerald-500/20">
                                  {q.teacherReply}
                                </div>
                              </div>
                            )}
                            {!q.aiAnswer && !q.teacherReply && (
                              <div className="glass-panel p-4 rounded-xl text-sm text-gray-300 leading-relaxed">
                                Answer shared by AI.
                              </div>
                            )}
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
