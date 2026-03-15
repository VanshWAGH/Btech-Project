import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Megaphone, Plus, Clock, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Announcements() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        content: "",
        targetRole: "ALL",
        department: ""
    });

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ['/api/announcements'],
        queryFn: async () => {
            const res = await fetch('/api/announcements');
            if (!res.ok) throw new Error("Failed to load announcements");
            return res.json();
        }
    });

    const createAnnouncement = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/announcements', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create announcement");
            return res.json();
        },
        onSuccess: () => {
            setIsDialogOpen(false);
            setFormData({ title: "", content: "", targetRole: "ALL", department: "" });
            queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
            toast({ title: "Announcement Broadcasted" });
        }
    });

    const handleBroadcast = (e: React.FormEvent) => {
        e.preventDefault();
        createAnnouncement.mutate(formData);
    };

    const isAdminOrDept = user?.role === 'ADMIN' || user?.role === 'UNIVERSITY_ADMIN';

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold">Announcements</h1>
                    <p className="text-muted-foreground mt-1">Tenant-wide updates and circulars spanning your organization.</p>
                </div>

                {isAdminOrDept && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Broadcast Update
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass border-white/10 sm:max-w-[600px] text-foreground p-0 overflow-hidden">
                            <div className="p-6 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
                                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-primary" />
                                    New Broadcast
                                </DialogTitle>
                            </div>
                            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title</label>
                                    <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="glass-input h-11" placeholder="Holiday Schedule update" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Target Roll</label>
                                        <select value={formData.targetRole} onChange={e => setFormData({ ...formData, targetRole: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60">
                                            <option value="ALL">All Roles</option>
                                            <option value="STUDENT">Students Only</option>
                                            <option value="TEACHER">Faculty Only</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Target Department</label>
                                        <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="glass-input h-11" placeholder="Empty for global" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Message Content</label>
                                    <Textarea required value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="glass-input min-h-[150px] resize-y" />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={createAnnouncement.isPending} className="bg-primary hover:bg-primary/90">
                                        {createAnnouncement.isPending ? "Broadcasting..." : "Broadcast"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="text-center p-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                ) : announcements.length === 0 ? (
                    <div className="glass-panel p-12 text-center rounded-2xl">
                        <Megaphone className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <p className="text-muted-foreground">No recent announcements from your organization admin.</p>
                    </div>
                ) : (
                    announcements.map((item: any) => (
                        <div key={item.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold">{item.title}</h3>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-300 whitespace-pre-line text-sm mb-6">{item.content}</p>

                            <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                                {(item.targetRole || item.department) && (
                                    <>
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3 text-primary/70" /> {item.targetRole || 'ALL'}</span>
                                        {item.department && <span className="flex items-center gap-1"><Building className="w-3 h-3 text-accent/70" /> {item.department}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </AppLayout>
    );
}
