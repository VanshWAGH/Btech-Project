import { AppLayout } from "@/components/layout/app-layout";
import { useState } from "react";
import { useTenants, useCreateTenant } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Building2, Plus, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Tenants() {
  const { data: tenants = [], isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", domain: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTenant.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ name: "", domain: "" });
        toast({ title: "Tenant created successfully" });
      },
      onError: (err) => {
        toast({ title: "Creation failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Manage organizations and workspace instances.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[425px] text-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Create Workspace
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="glass-input h-11"
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain (Optional)</label>
                <Input 
                  value={formData.domain}
                  onChange={e => setFormData({...formData, domain: e.target.value})}
                  className="glass-input h-11"
                  placeholder="acme.com"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTenant.isPending} className="bg-primary hover:bg-primary/90">
                  {createTenant.isPending ? "Creating..." : "Create Tenant"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass p-6 rounded-2xl h-40 animate-pulse bg-white/5" />
          ))
        ) : tenants.length === 0 ? (
          <div className="col-span-full glass p-12 text-center rounded-2xl">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No tenants configured</h3>
            <p className="text-muted-foreground">Create the first workspace to get started.</p>
          </div>
        ) : (
          tenants.map((tenant, i) => (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-2xl hover-elevate group border-white/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full">
                  <Users className="w-3 h-3" />
                  {tenant.membersCount || 0} Members
                </div>
              </div>
              
              <h3 className="text-xl font-display font-bold text-foreground mb-1">{tenant.name}</h3>
              {tenant.domain && (
                <p className="text-sm text-primary mb-4">{tenant.domain}</p>
              )}
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                <span>ID: {tenant.id}</span>
                <span>Created {format(new Date(tenant.createdAt), 'MMM yyyy')}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
