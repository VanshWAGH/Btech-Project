import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Shield, Database, Zap } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Visual / Branding Left Side */}
      <div className="w-full md:w-1/2 relative hidden md:flex flex-col justify-between p-12 lg:p-24 overflow-hidden border-r border-white/5">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-accent/30 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animate-blob-delayed" />
        
        <div className="relative z-10 flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-white">NexusRAG</h1>
        </div>

        <div className="relative z-10 mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl lg:text-6xl font-display font-bold leading-[1.1] mb-6">
              Intelligence <br/>
              <span className="text-gradient">Contextualized.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mb-12 leading-relaxed">
              Enterprise-grade Multi-Tenant RAG system. securely chat with your organization's documents with unprecedented accuracy and access control.
            </p>

            <div className="space-y-6">
              {[
                { icon: Shield, text: "Isolated tenant environments" },
                { icon: Database, text: "Vector-powered retrieval" },
                { icon: Zap, text: "Real-time stream processing" }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center gap-4 text-sm font-medium text-gray-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  {feature.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Unsplash abstract tech image in background */}
        {/* Abstract tech background */}
        <img 
          src="https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1000&q=80" 
          alt="Abstract tech" 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] mix-blend-screen pointer-events-none"
        />
      </div>

      {/* Auth Action Right Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-24 relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,80,255,0.05)_0%,transparent_100%)] md:hidden pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass p-10 rounded-3xl shadow-2xl relative"
        >
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-xl text-white">NexusRAG</h1>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-display font-semibold mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with Google or email to access your workspace
            </p>
          </div>

          <div className="flex justify-center">
            <SignIn
              routing="path"
              path="/"
              appearance={{
                elements: {
                  card: "shadow-none bg-transparent border-0",
                },
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
