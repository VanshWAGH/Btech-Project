import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Search, 
  Globe, 
  ChevronDown, 
  GraduationCap, 
  Settings, 
  ShieldCheck,
  Maximize
} from "lucide-react";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [department, setDepartment] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mode === "register" ? { email, password, firstName, lastName, role, department } : { email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Authentication failed");
      }

      // On success, reload app state
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-[#0f6cb6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#fdfaf6] text-[#212529]">
      
      {/* 1. Moodle Dark Blue Top Bar with Gradient */}
      <div className="bg-gradient-to-r from-[#153e5c] to-[#0e2a3f] text-white text-sm py-2 px-8 flex justify-end items-center gap-6 font-medium z-20 shadow-sm">
        <a href="#" className="hover:text-orange-300 text-orange-400 flex items-center gap-1 transition-colors">
          Moodle.org <ArrowRight className="w-3 h-3 -rotate-45" />
        </a>
        <a href="#" className="hover:text-gray-200 transition-colors">Login help</a>
        <a href="#" className="hover:text-gray-200 transition-colors">Submit an RFP</a>
        <div className="w-px h-4 bg-white/30 rounded"></div>
        <button className="flex items-center gap-1 hover:text-gray-200 transition-colors">
          EN <ChevronDown className="w-3 h-3" />
        </button>
        <button className="hover:text-gray-300 transition-colors">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Main White Navigation Header */}
      <header className="bg-white py-4 px-8 flex items-center justify-between border-b border-[#e3e6f0] sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-12">
          {/* Authentic Moodle Logo Replica */}
          <div className="flex items-center gap-1">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.5 }}
              className="font-bold text-[28px] tracking-tight leading-none flex items-center text-[#e57300]"
            >
              <span className="relative inline-block">
                <GraduationCap className="w-7 h-7 absolute -top-4 -left-1.5 text-[#222] -rotate-12" />
                m
              </span>
              <span className="tracking-tight">oodle</span>
              <span className="text-[#222] text-[10px] align-top leading-none ml-1 relative mt-[2px] font-semibold">®</span>
            </motion.div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8 text-[#153e5c] font-semibold text-[15px]">
            {["Products", "Services", "Solutions", "About Us", "Resources"].map((item) => (
              <button key={item} className="flex items-center gap-1 hover:text-[#ea7600] transition-colors">
                {item} <ChevronDown className="w-4 h-4" />
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <button className="border-2 border-[#153e5c] text-[#153e5c] font-bold px-6 py-2 rounded-full hover:bg-[#153e5c] hover:text-white transition-colors">
            Get Moodle
          </button>
          <button className="font-semibold text-[#153e5c] hover:text-[#ea7600]">
            Contact Us
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full bg-[#fdfcf9]">
        {/* Hero Section */}
        <div className="max-w-[1400px] mx-auto px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center overflow-hidden">
          
          {/* Left Text Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-xl"
          >
            <h1 
              className="text-5xl lg:text-[4.5rem] leading-[1.05] font-bold text-[#103653] mb-8"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              Online learning, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e57300] to-[#f98012]">delivered your way</span>
            </h1>
            <p className="text-lg text-[#5a646c] leading-relaxed mb-8">
              Join hundreds of thousands of educators and trainers on our secure campus platform. Experience the world's most customisable and trusted learning management integration.
            </p>
            
            {/* Show an image in BOTH states, but different ones */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative h-[320px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group"
            >
              {mode === "register" ? (
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Students learning"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <img 
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="University campus"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              )}
            </motion.div>
          </motion.div>

          {/* Right Auth Column */}
          <div className="flex justify-center lg:justify-end relative z-10">
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
               className="w-full max-w-md bg-white p-10 rounded-3xl shadow-[0_15px_40px_rgb(0,0,0,0.1)] border border-[#e3e6f0]"
             >
               
               <div className="mb-8">
                 <h2 className="text-3xl font-serif text-[#103653] font-bold mb-2">
                   {mode === "login" ? "Welcome back" : "Create an account"}
                 </h2>
                 <p className="text-[#5a646c] text-sm">
                   {mode === "login" ? "Enter your credentials to access your campus portal." : "Join your academic institution's platform today."}
                 </p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                 <div className="space-y-1">
                   <label className="text-sm font-semibold text-[#153e5c]">Email Address</label>
                   <input
                     type="email"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600] transition-colors"
                     placeholder="you@university.edu"
                   />
                 </div>

                 {mode === "register" && (
                   <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-[#153e5c]">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-[#153e5c]">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-[#153e5c]">Campus Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600]"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="TEACHER">Faculty / Teacher</option>
                        <option value="UNIVERSITY_ADMIN">University Admin</option>
                        <option value="ADMIN">System Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-[#153e5c]">Department</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600]"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                   </>
                 )}

                 <div className="space-y-1">
                   <div className="flex justify-between items-center">
                     <label className="text-sm font-semibold text-[#153e5c]">Password</label>
                     {mode === "login" && (
                       <a href="#" className="text-xs text-[#0f6cb6] hover:underline">Forgot password?</a>
                     )}
                   </div>
                   <input
                     type="password"
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full h-12 px-4 rounded-md border border-[#ced4da] bg-[#f8f9fa] focus:outline-none focus:border-[#ea7600] focus:ring-1 focus:ring-[#ea7600]"
                     placeholder="••••••••"
                   />
                 </div>

                 {error && (
                   <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm text-center">
                     {error}
                   </div>
                 )}

                 <button
                   type="submit"
                   disabled={submitting}
                   className="w-full h-12 mt-2 bg-gradient-to-r from-[#153e5c] to-[#103653] hover:from-[#103653] hover:to-[#0a2336] shadow-md hover:shadow-lg text-white font-bold rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70"
                 >
                   {submitting ? "Processing..." : (mode === "login" ? "Log in" : "Register Now")}
                 </button>

                 <div className="text-center mt-6">
                   <p className="text-[#5a646c] text-sm">
                     {mode === "login" ? "Don't have an account?" : "Already properly enrolled?"}
                     <button
                       type="button"
                       className="ml-2 font-bold text-[#ea7600] hover:text-[#d36a00] hover:underline"
                       onClick={() => setMode(m => m === "login" ? "register" : "login")}
                     >
                       {mode === "login" ? "Sign up here" : "Log in"}
                     </button>
                   </p>
                 </div>
               </form>
             </motion.div>
          </div>
        </div>

        {/* Feature Cards Section (Matching marketing image) */}
        <div className="max-w-[1400px] mx-auto px-8 py-16 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-3xl border border-[#e3e6f0] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#ea7600] to-[#c66300] shadow-inner rounded-full flex items-center justify-center mb-6">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-serif text-[#103653] font-bold mb-4 leading-tight group-hover:text-[#ea7600] transition-colors" style={{ fontFamily: "'Georgia', serif" }}>
                Customise your learning experience
              </h3>
              <p className="text-[#5a646c] leading-relaxed">
                With a wide range of inbuilt features, plugins, and integrations at your disposal, you can create any course or AI-assisted learning environment you envision.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-3xl border border-[#e3e6f0] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#ea7600] to-[#c66300] shadow-inner rounded-full flex items-center justify-center mb-6">
                <Maximize className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-serif text-[#103653] font-bold mb-4 leading-tight group-hover:text-[#ea7600] transition-colors" style={{ fontFamily: "'Georgia', serif" }}>
                Scale your platform to any size
              </h3>
              <p className="text-[#5a646c] leading-relaxed">
                From small classrooms to large universities and multi-tenant departments, our engineered system can be scaled to support organizations of all sizes reliably.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-3xl border border-[#e3e6f0] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-gradient-to-br from-[#ea7600] to-[#c66300] shadow-inner rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-serif text-[#103653] font-bold mb-4 leading-tight group-hover:text-[#ea7600] transition-colors" style={{ fontFamily: "'Georgia', serif" }}>
                Safeguard your LMS data and systems
              </h3>
              <p className="text-[#5a646c] leading-relaxed">
                Our platform is committed to safeguarding data security, user privacy, and cross-departmental controls. Your institutional data remains safely deployed.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
