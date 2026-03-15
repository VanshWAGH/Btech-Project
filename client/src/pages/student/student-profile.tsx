import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Building, GraduationCap, BookOpen,
  Edit2, Save, X, Camera, Shield, Calendar
} from "lucide-react";
import { format } from "date-fns";

const DEPARTMENTS = ["Computer Engineering", "Information Technology", "Electronics", "Mechanical", "Civil"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SUBJECTS = ["DBMS", "Operating Systems", "Computer Networks", "Data Structures", "Software Engineering", "Web Technologies"];

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    department: user?.department || "Computer Engineering",
    semester: "6",
    subjects: ["DBMS", "Operating Systems", "Computer Networks"],
  });

  const handleSave = () => {
    setEditing(false);
    toast({ title: "Profile updated", description: "Your profile information has been saved." });
  };

  const toggleSubject = (subject: string) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const initials = `${user?.firstName?.charAt(0) || "S"}${user?.lastName?.charAt(0) || "T"}`.toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-violet-400" />
              My Profile
            </h1>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1.5">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-violet-600 hover:bg-violet-500 gap-1.5 rounded-xl">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-white/15 gap-1.5">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </Button>
            )}
          </div>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-3xl font-display font-bold shadow-2xl shadow-violet-500/30">
                {initials}
              </div>
              {editing && (
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-display font-bold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Student
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {form.department}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  Sem {form.semester}
                </Badge>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-muted-foreground">Member since</div>
              <div className="text-sm font-medium mt-0.5">
                {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'Jan 2024'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-violet-400" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">First Name</label>
              {editing ? (
                <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
                  className="bg-white/5 border-white/10 focus:border-violet-500/50" />
              ) : (
                <p className="text-sm font-medium py-2 px-3 rounded-xl bg-white/5">{form.firstName || "—"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Last Name</label>
              {editing ? (
                <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
                  className="bg-white/5 border-white/10 focus:border-violet-500/50" />
              ) : (
                <p className="text-sm font-medium py-2 px-3 rounded-xl bg-white/5">{form.lastName || "—"}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Address
            </label>
            <p className="text-sm font-medium py-2 px-3 rounded-xl bg-white/5 text-muted-foreground flex items-center gap-2">
              {user?.email}
              <Badge variant="outline" className="text-[10px] ml-auto">Cannot change</Badge>
            </p>
          </div>
        </motion.div>

        {/* Academic Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            Academic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Department</label>
              {editing ? (
                <select
                  value={form.department}
                  onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full text-sm py-2 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none"
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-background">{d}</option>)}
                </select>
              ) : (
                <p className="text-sm font-medium py-2 px-3 rounded-xl bg-white/5">{form.department}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Current Semester</label>
              {editing ? (
                <select
                  value={form.semester}
                  onChange={(e) => setForm(p => ({ ...p, semester: e.target.value }))}
                  className="w-full text-sm py-2 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500/50 outline-none"
                >
                  {SEMESTERS.map(s => <option key={s} value={s} className="bg-background">Semester {s}</option>)}
                </select>
              ) : (
                <p className="text-sm font-medium py-2 px-3 rounded-xl bg-white/5">Semester {form.semester}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-3 block">Enrolled Subjects</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => editing && toggleSubject(s)}
                  disabled={!editing}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    form.subjects.includes(s)
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                      : "bg-white/5 text-muted-foreground border-white/10"
                  } ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            Access & Security
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Clearance Level</p>
                  <p className="text-xs text-muted-foreground">Your data access tier</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                {user?.clearanceLevel || "LEVEL_1"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Building className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Tenant Scope</p>
                  <p className="text-xs text-muted-foreground">Only your department's documents</p>
                </div>
              </div>
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">Isolated</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
