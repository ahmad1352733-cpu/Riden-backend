import "./lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Router as WouterRouter, Route, Switch, Redirect } from "wouter";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import TripsPage from "@/pages/TripsPage";
import ComplaintsPage from "@/pages/ComplaintsPage";
import RoutesPage from "@/pages/RoutesPage";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, token } = useAuth();
  if (!token) return <Redirect to="/login" />;
  if (isLoading)
    return (
      <div className="min-h-screen bg-[#0F1B2D] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/trips" component={() => <ProtectedRoute component={TripsPage} />} />
      <Route path="/complaints" component={() => <ProtectedRoute component={ComplaintsPage} />} />
      <Route path="/routes" component={() => <ProtectedRoute component={RoutesPage} />} />
      <Route path="/" component={() => <ProtectedRoute component={HomePage} />} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}
