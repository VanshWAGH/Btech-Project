import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  LayoutDashboard,
  Files,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Activity,
  Megaphone,
  History,
  CheckCircle,
  UserCog,
  Bot,
  BookOpen,
  Search,
  MessageSquare,
  Star,
  Bell,
  User,
  GraduationCap,
  Calendar,
  BookMarked,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch notification count and list
  const { data: notifData } = useQuery<any>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { unreadCount: 0, notifications: [] };
      return res.json();
    },
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];

  //Detect New Notifications
  useEffect(() => {
    if (notifData?.unreadCount > prevCount) {
      toast({
        title: "🔔 New Notification",
        description: "You have a new update",
      });
    }
    setPrevCount(notifData?.unreadCount || 0);
  }, [notifData?.unreadCount]);
  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Determine valid links for the current user's role
  const userRole = user?.role?.toUpperCase() || "STUDENT";

  const navigation = [
    // ── STUDENT ROUTES ──────────────────────────────
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard, roles: ["STUDENT"] },
    { name: "My Courses", href: "/student/courses", icon: GraduationCap, roles: ["STUDENT"] },
    { name: "AI Chat Assistant", href: "/student/chat", icon: Bot, roles: ["STUDENT"] },
    { name: "Course Materials", href: "/student/materials", icon: BookOpen, roles: ["STUDENT"] },
    { name: "Academic Calendar", href: "/student/calendar", icon: Calendar, roles: ["STUDENT"] },
    { name: "Knowledge Search", href: "/student/search", icon: Search, roles: ["STUDENT"] },
    { name: "Announcements", href: "/student/announcements", icon: Megaphone, roles: ["STUDENT"] },
    { name: "Ask Teacher", href: "/student/ask-teacher", icon: MessageSquare, roles: ["STUDENT"] },
    { name: "Chat History", href: "/student/history", icon: History, roles: ["STUDENT"] },
    { name: "Saved Answers", href: "/student/saved-answers", icon: Star, roles: ["STUDENT"] },
    { name: "My Profile", href: "/student/profile", icon: User, roles: ["STUDENT"] },

    // ── TEACHER ROUTES ───────────────────────────────
    { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, roles: ["TEACHER"] },
    { name: "My Courses", href: "/teacher/courses", icon: BookMarked, roles: ["TEACHER"] },
    { name: "Academic Calendar", href: "/teacher/calendar", icon: Calendar, roles: ["TEACHER"] },
    { name: "Announcements", href: "/announcements", icon: Megaphone, roles: ["TEACHER"] },
    { name: "Analytics", href: "/analytics", icon: Activity, roles: ["TEACHER"] },
    { name: "My Profile", href: "/teacher/profile", icon: User, roles: ["TEACHER"] },

    // ── UNIVERSITY ADMIN ROUTES ──────────────────────
    { name: "Dashboard Home", href: "/dashboard", icon: LayoutDashboard, roles: ["UNIVERSITY_ADMIN"] },
    { name: "University KB", href: "/documents", icon: Files, roles: ["UNIVERSITY_ADMIN"] },
    { name: "Approve Documents", href: "/approve-docs", icon: CheckCircle, roles: ["UNIVERSITY_ADMIN"] },
    { name: "Faculty & Students", href: "/faculty-mgmt", icon: UserCog, roles: ["UNIVERSITY_ADMIN"] },
    { name: "University Settings", href: "/university-mgmt", icon: Settings, roles: ["UNIVERSITY_ADMIN"] },
    { name: "Academic Calendar", href: "/calendar-mgmt", icon: Calendar, roles: ["UNIVERSITY_ADMIN"] },
    { name: "Announcements", href: "/announcements", icon: Megaphone, roles: ["UNIVERSITY_ADMIN"] },
    { name: "Analytics", href: "/analytics", icon: Activity, roles: ["UNIVERSITY_ADMIN"] },

    // ── SUPER ADMIN ROUTES ─────────────
    { name: "Dashboard Home", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
    { name: "Global Knowledge Base", href: "/documents", icon: Files, roles: ["ADMIN"] },
    { name: "User Management", href: "/admin-users", icon: UserCog, roles: ["ADMIN"] },
    { name: "Tenant Management", href: "/tenants", icon: Users, roles: ["ADMIN"] },
    { name: "Analytics Dashboard", href: "/analytics", icon: Activity, roles: ["ADMIN"] },
  ].filter(item => item.roles.includes(userRole));

  const NavLinks = () => (
    <div className="space-y-0.5">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer ${
                isActive
                  ? "bg-[#e9ecef]/80 text-[#0f6cb6] font-bold border-l-4 border-[#0f6cb6]"
                  : "text-[#0f6cb6] hover:bg-[#e9ecef]/50 hover:underline"
              }`}
            >
              {isActive ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen text-foreground flex flex-col font-sans relative bg-[#f8f9fa]">
      {/* Background image overlay for an academic, professional feel */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.04] pointer-events-none" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2000')" }}
      />
      
      {/* Moodle-style Top Navigation Bar */}
      <header className="bg-white border-b border-[#dee2e6] h-[60px] flex items-center justify-between px-4 top-0 z-40 shadow-sm relative">
        <div className="flex items-center gap-6">
          <Link href={navigation[0]?.href || "/dashboard"}>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-9 h-9 flex items-center justify-center">
                 {/* Replaced Icon with a more academic/moodle logo placeholder style */}
                 <div className="w-8 h-8 rounded-full bg-[#f8f9fa] border border-[#0f6cb6]/30 flex items-center justify-center text-[#0f6cb6] font-bold shadow-sm">
                    M
                 </div>
              </div>
              <span className="font-semibold text-xl tracking-tight text-[#0f6cb6]">Moodle</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href={navigation[0]?.href || "/dashboard"}>
              <span className="text-[#212529] hover:text-[#0f6cb6] hover:underline cursor-pointer">Dashboard</span>
            </Link>
            <Link href="/student/courses">
              <span className="text-[#212529] hover:text-[#0f6cb6] hover:underline cursor-pointer">My Courses</span>
            </Link>
            <Link href="/documents">
              <span className="text-[#212529] hover:text-[#0f6cb6] hover:underline cursor-pointer">Site features</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="md:hidden text-[#495057]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hidden md:flex hover:bg-[#e9ecef]/50">
            <Search className="w-4 h-4 text-[#495057]" />
          </Button>

          {/* Functional Notification Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative hover:bg-[#e9ecef]/50">
                <Bell className="w-4 h-4 text-[#495057]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 text-[9px] font-bold flex items-center justify-center bg-red-600 text-white rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] bg-white border-[#dee2e6] shadow-lg p-0">
              <div className="px-4 py-3 border-b border-[#dee2e6] bg-[#f8f9fa] flex justify-between items-center">
                <span className="font-semibold text-[15px] text-[#212529]">Notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="text-xs text-primary cursor-pointer hover:underline"
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n: any, i: number) => (
                    <div
                      key={i}
                      className="px-4 py-3 border-b border-[#e9ecef] hover:bg-[#f8f9fa] cursor-pointer text-sm"
                      onClick={async () => {
                        // mark as read
                        if (!n.isRead) {
                          await fetch(`/api/notifications/${n.id}/read`, {
                            method: "PATCH",
                            credentials: "include",
                          });
                        }

                        // navigate based on type
                        if (n.type === "announcement") {
                          window.location.href = "/announcements";
                        } else if (n.type === "new_event") {
                          window.location.href = "/calendar";
                        }

                        // refresh UI
                        window.location.reload();
                      }}
                    >
                      <div className="font-medium text-[#212529]">{n.title || "New Notification"}</div>
                      <div className="text-muted-foreground text-xs mt-1 truncate">{n.message || "You have a new update."}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    You have no notifications.
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-[#dee2e6] text-center bg-[#f8f9fa]">
                <Link href="/notifications">
                  <span className="text-xs text-primary hover:underline cursor-pointer font-medium">View all notifications</span>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-2 h-10 hover:bg-[#e9ecef]/50 font-normal flex items-center gap-2 border-none">
                <span className="hidden lg:inline text-sm text-[#212529]">
                  {user?.id ? `${user.id} _${user.firstName?.toUpperCase()}_${user.lastName?.toUpperCase()}` : "User"}
                </span>
                <Avatar className="h-8 w-8 border border-[#dee2e6] shadow-sm">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-[#e9ecef] text-[#495057] text-xs font-semibold shadow-inner">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3 h-3 text-[#495057] opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-[#dee2e6] shadow-md">
              <DropdownMenuLabel className="py-2">
                <span className="text-[#212529] font-semibold">{user?.firstName} {user?.lastName}</span>
                <div className="text-[11px] text-muted-foreground font-normal mt-0.5 truncate">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#dee2e6]" />
              {userRole === "STUDENT" ? (
                <DropdownMenuItem className="cursor-pointer hover:bg-[#e9ecef]" asChild>
                  <Link href="/student/profile">
                    <User className="w-4 h-4 mr-2 text-[#495057]" />
                    <span className="text-[#212529]">Profile</span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="cursor-pointer hover:bg-[#e9ecef]">
                  <Settings className="w-4 h-4 mr-2 text-[#495057]" />
                  <span className="text-[#212529]">Preferences</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-[#dee2e6]" />
              <DropdownMenuItem className="cursor-pointer hover:bg-[#e9ecef]" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2 text-red-600" />
                <span className="text-[#212529]">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Layout Container */}
      <div className="flex-1 flex w-full max-w-[1500px] mx-auto p-4 md:p-6 gap-6 relative z-10">
        
        {/* Left Navigation Block (Moodle style) */}
        <aside className="hidden md:block w-[280px] shrink-0">
          {/* Main Navigation Panel */}
          <div className="bg-white border border-[#dee2e6] shadow-sm overflow-hidden mb-6 rounded-sm">
            <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#dee2e6]">
              <h3 className="font-semibold text-sm text-[#212529] uppercase tracking-wider">Navigation</h3>
            </div>
            <div className="p-3 bg-white/50 backdrop-blur-sm">
              <NavLinks />
            </div>
          </div>
          
          {/* Administration Panel */}
          {userRole !== "STUDENT" && (
            <div className="bg-white border border-[#dee2e6] shadow-sm overflow-hidden rounded-sm">
              <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#dee2e6]">
                <h3 className="font-semibold text-sm text-[#212529] uppercase tracking-wider">
                  Administration
                </h3>
              </div>

              <div className="p-4 text-sm bg-white/50 backdrop-blur-sm">
                <Link href="/profile">
                  <div className="text-[#0f6cb6] hover:underline cursor-pointer flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" />
                    My Profile Settings
                  </div>
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Menu Content */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 pt-[60px] bg-white border-t border-[#dee2e6] shadow-xl overflow-y-auto">
            <div className="p-4 bg-[#f8f9fa] min-h-full">
              <div className="bg-white border border-[#dee2e6] p-2 mb-4 shadow-sm rounded-sm">
                <NavLinks />
              </div>
              <Button variant="outline" className="w-full text-[#212529] border-[#dee2e6] bg-white hover:bg-[#e9ecef]" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2 text-red-600" />
                Log out
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="h-full bg-transparent"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
