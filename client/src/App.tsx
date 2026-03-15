import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Import Pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import Tenants from "@/pages/tenants";

// Wrapper for protected routes
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Root redirect logic */}
      <Route path="/">
        {() => {
          if (isLoading) return null;
          return isAuthenticated ? <Redirect to="/dashboard" /> : <AuthPage />;
        }}
      </Route>

      {/* Protected App Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/documents">
        {() => <ProtectedRoute component={Documents} />}
      </Route>
      <Route path="/tenants">
        {() => <ProtectedRoute component={Tenants} />}
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
