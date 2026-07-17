import "./lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CaptainsPage from "./pages/CaptainsPage";
import PassengersPage from "./pages/PassengersPage";
import TripsPage from "./pages/TripsPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import RoutesPage from "./pages/RoutesPage";
import DiscountCodesPage from "./pages/DiscountCodesPage";
import NotificationsPage from "./pages/NotificationsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function isAuthenticated() {
  return !!localStorage.getItem("riden_token");
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/captains" component={() => <ProtectedRoute component={CaptainsPage} />} />
      <Route path="/passengers" component={() => <ProtectedRoute component={PassengersPage} />} />
      <Route path="/trips" component={() => <ProtectedRoute component={TripsPage} />} />
      <Route path="/complaints" component={() => <ProtectedRoute component={ComplaintsPage} />} />
      <Route path="/routes" component={() => <ProtectedRoute component={RoutesPage} />} />
      <Route path="/discount-codes" component={() => <ProtectedRoute component={DiscountCodesPage} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">404 — Not Found</h1>
            <a href="/admin/" className="mt-2 text-sm text-blue-600 underline block">Go to Dashboard</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
