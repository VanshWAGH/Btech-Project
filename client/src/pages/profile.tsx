import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Building,
  Edit2, Save, X, Camera, Shield, Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    department: user?.department || "",
    bio: user?.bio || "",
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

  const initials = `${user?.firstName?.charAt(0) || "A"}${user?.lastName?.charAt(0) || "D"}`.toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-red-400" />
              Admin Profile
            </h1>

            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4" /> Edit Profile
              </Button>
            )}
          </div>
        </motion.div>

        {/* AVATAR SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>

              {editing && (
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>

              <div className="flex gap-2 mt-2">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                  Admin
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {form.department || "Department"}
                </Badge>
              </div>
            </div>

            <div className="ml-auto hidden sm:block text-right">
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium">
                {user?.createdAt
                  ? format(new Date(user.createdAt), "MMMM yyyy")
                  : "—"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* PERSONAL INFO */}
        <motion.div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-red-400" />
            Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">First Name</label>
              <Input
                disabled={!editing}
                value={form.firstName}
                onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Last Name</label>
              <Input
                disabled={!editing}
                value={form.lastName}
                onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <p className="text-sm py-2 px-3 rounded-xl bg-white/5 text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </motion.div>

        {/* ADMIN INFO */}
        <motion.div className="glass rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400" />
            Administration Info
          </h2>

          <div>
            <label className="text-xs text-muted-foreground">Department</label>
            <Input
              disabled={!editing}
              value={form.department}
              onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Bio</label>
            <Input
              disabled={!editing}
              value={form.bio}
              onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
            />
          </div>
        </motion.div>

        {/* SECURITY */}
        <motion.div className="glass rounded-2xl p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            Access & Security
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-white/5 rounded-xl">
              <span>Role</span>
              <Badge>{user?.role}</Badge>
            </div>

            <div className="flex justify-between p-3 bg-white/5 rounded-xl">
              <span>Clearance Level</span>
              <Badge>{user?.clearanceLevel}</Badge>
            </div>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}