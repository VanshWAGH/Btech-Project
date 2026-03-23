import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Building, BookOpen,
  Edit2, Save, X, Camera, Shield
} from "lucide-react";
import { format } from "date-fns";

const SUBJECTS = ["DBMS", "Operating Systems", "Computer Networks", "Data Structures", "Software Engineering"];

export default function TeacherProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    department: user?.department || "Computer Science",
    subjects: ["DBMS", "Operating Systems"],
    experience: "2",
  });

  const handleSave = async () => {
    try {
        const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
        });

        if (!res.ok) throw new Error();

        setEditing(false);

        toast({
        title: "Profile updated",
        description: "Changes saved successfully",
        });

        // refresh page data
        window.location.reload();

    } catch (err) {
        toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
        });
    }
  };

  const toggleSubject = (subject: string) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const initials = `${user?.firstName?.charAt(0) || "T"}${user?.lastName?.charAt(0) || "R"}`.toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" />
            Teacher Profile
          </h1>

          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4" /> Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>

        {/* AVATAR */}
        <div className="glass p-6 rounded-2xl flex items-center gap-5">
          <div className="w-24 h-24 bg-blue-600 text-white flex items-center justify-center rounded-2xl text-3xl font-bold">
            {initials}
          </div>

          <div>
            <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>

            <div className="flex gap-2 mt-2">
              <Badge>Teacher</Badge>
              <Badge>{form.department}</Badge>
            </div>
          </div>
        </div>

        {/* PERSONAL INFO */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h2 className="font-semibold">Personal Info</h2>

          <Input
            disabled={!editing}
            value={form.firstName}
            onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
          />

          <Input
            disabled={!editing}
            value={form.lastName}
            onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
          />

          <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
        </div>

        {/* TEACHING INFO */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h2 className="font-semibold flex gap-2 items-center">
            <BookOpen className="w-4 h-4" />
            Teaching Info
          </h2>

          {/* Department */}
          <Input
            disabled={!editing}
            value={form.department}
            onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
          />

          {/* Experience */}
          <Input
            disabled={!editing}
            placeholder="Years of Experience"
            value={form.experience}
            onChange={(e) => setForm(p => ({ ...p, experience: e.target.value }))}
          />

          {/* Subjects */}
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button
                key={s}
                disabled={!editing}
                onClick={() => toggleSubject(s)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  form.subjects.includes(s)
                    ? "bg-blue-500/20 border-blue-500"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* SECURITY */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="font-semibold flex gap-2 items-center">
            <Shield className="w-4 h-4" />
            Access
          </h2>

          <p className="text-sm mt-2">Role: {user?.role}</p>
          <p className="text-sm">Clearance: {user?.clearanceLevel}</p>
        </div>

      </div>
    </AppLayout>
  );
}