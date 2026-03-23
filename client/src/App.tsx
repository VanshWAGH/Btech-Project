import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Static imports for primary pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import Tenants from "@/pages/tenants";
import AnalyticsDashboard from "@/pages/analytics";
import Announcements from "@/pages/announcements";
import Notifications from "@/pages/notifications";
import ProfileSettings from "./pages/profile";
import TeacherProfile from "./pages/teacher/teacher-profile";
import Profile from "./pages/profile";

// Lazy-loaded Student pages
const StudentDashboard = lazy(() => import("@/pages/student/student-dashboard"));
const StudentChat = lazy(() => import("@/pages/student/student-chat"));
const StudentMaterials = lazy(() => import("@/pages/student/student-materials"));
const StudentSearch = lazy(() => import("@/pages/student/student-search"));
const StudentAnnouncements = lazy(() => import("@/pages/student/student-announcements"));
const StudentAskTeacher = lazy(() => import("@/pages/student/student-ask-teacher"));
const StudentHistory = lazy(() => import("@/pages/student/student-history"));
const StudentProfile = lazy(() => import("@/pages/student/student-profile"));
const StudentSavedAnswers = lazy(() => import("@/pages/student/student-saved-answers"));
const StudentCourses = lazy(() => import("@/pages/student/student-courses"));
const StudentCourseNotes = lazy(() => import("@/pages/student/student-course-notes"));
const StudentCalendar = lazy(() => import("@/pages/student/student-calendar"));

// Lazy-loaded Teacher pages
const TeacherDashboard = lazy(() => import("@/pages/teacher/teacher-dashboard"));
const TeacherCourses = lazy(() => import("@/pages/teacher/teacher-courses"));
const TeacherCourseDetail = lazy(() => import("@/pages/teacher/teacher-course-detail"));
const TeacherCourseNotes = lazy(() => import("@/pages/teacher/teacher-course-notes"));
const TeacherCalendar = lazy(() => import("@/pages/teacher/teacher-calendar"));
// Lazy-loaded University Admin pages
const UniversitySettings = lazy(() => import("@/pages/university/university-settings"));
const FacultyMgmt = lazy(() => import("@/pages/university/faculty-mgmt"));
const UniversityCalendar = lazy(() => import("@/pages/university/university-calendar"));
const UniversityKB = lazy(() => import("@/pages/university/university-kb"));

// Page loading spinner
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}

// Wrapper for protected routes
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  const defaultRedirect = () => {
    if (isLoading) return <PageLoader />;
    if (!isAuthenticated) return <AuthPage />;
    const role = user?.role?.toUpperCase();
    if (role === "STUDENT") return <Redirect to="/student/dashboard" />;
    if (role === "TEACHER") return <Redirect to="/teacher/dashboard" />;
    return <Redirect to="/dashboard" />;
  };

  return (
    <Switch>
      {/* Root redirect */}
      <Route path="/">
        {() => defaultRedirect()}
      </Route>

      {/* ============================================ */}
      {/* ADMIN / UNIVERSITY ADMIN ROUTES              */}
      {/* ============================================ */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/documents">
        {() => <ProtectedRoute component={Documents} />}
      </Route>
      <Route path="/tenants">
        {() => <ProtectedRoute component={Tenants} />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsDashboard} />}
      </Route>
      <Route path="/announcements">
        {() => <ProtectedRoute component={Announcements} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/approve-docs">
        {() => <ProtectedRoute component={Documents} />}
      </Route>
      <Route path="/university-kb">
        {() => <ProtectedRoute component={UniversityKB} />}
      </Route>
      <Route path="/faculty-mgmt">
        {() => <ProtectedRoute component={FacultyMgmt} />}
      </Route>
      <Route path="/university-mgmt">
        {() => <ProtectedRoute component={UniversitySettings} />}
      </Route>
      <Route path="/calendar-mgmt">
        {() => <ProtectedRoute component={UniversityCalendar} />}
      </Route>
      <Route path="/admin-users">
        {() => <ProtectedRoute component={Tenants} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>

      {/* ============================================ */}
      {/* TEACHER ROUTES                               */}
      {/* ============================================ */}
      <Route path="/teacher/dashboard">
        {() => <ProtectedRoute component={TeacherDashboard} />}
      </Route>
      <Route path="/teacher/courses/:id/notes">
        {() => <ProtectedRoute component={TeacherCourseNotes} />}
      </Route>
      <Route path="/teacher/courses/:id">
        {() => <ProtectedRoute component={TeacherCourseDetail} />}
      </Route>
      <Route path="/teacher/courses">
        {() => <ProtectedRoute component={TeacherCourses} />}
      </Route>
      <Route path="/teacher/calendar">
        {() => <ProtectedRoute component={TeacherCalendar} />}
      </Route>
      <Route path="/teacher/profile">
        {() => <ProtectedRoute component={TeacherProfile} />}
      </Route>

      {/* ============================================ */}
      {/* STUDENT TENANT ROUTES                         */}
      {/* ============================================ */}
      <Route path="/student/dashboard">
        {() => <ProtectedRoute component={StudentDashboard} />}
      </Route>
      <Route path="/student/chat">
        {() => <ProtectedRoute component={StudentChat} />}
      </Route>
      <Route path="/student/materials">
        {() => <ProtectedRoute component={StudentMaterials} />}
      </Route>
      <Route path="/student/search">
        {() => <ProtectedRoute component={StudentSearch} />}
      </Route>
      <Route path="/student/announcements">
        {() => <ProtectedRoute component={StudentAnnouncements} />}
      </Route>
      <Route path="/student/ask-teacher">
        {() => <ProtectedRoute component={StudentAskTeacher} />}
      </Route>
      <Route path="/student/history">
        {() => <ProtectedRoute component={StudentHistory} />}
      </Route>
      <Route path="/student/profile">
        {() => <ProtectedRoute component={StudentProfile} />}
      </Route>
      <Route path="/student/saved-answers">
        {() => <ProtectedRoute component={StudentSavedAnswers} />}
      </Route>
      <Route path="/student/courses">
        {() => <ProtectedRoute component={StudentCourses} />}
      </Route>
      <Route path="/student/course/:id/notes">
        {() => <ProtectedRoute component={StudentCourseNotes} />}
      </Route>
      <Route path="/student/calendar">
        {() => <ProtectedRoute component={StudentCalendar} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
