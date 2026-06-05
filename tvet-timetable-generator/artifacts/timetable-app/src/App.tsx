import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/Home";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import UploadFiles from "./pages/admin/UploadFiles";
import ManageClasses from "./pages/admin/ManageClasses";
import ManageModules from "./pages/admin/ManageModules";
import ManageTeachers from "./pages/admin/ManageTeachers";
import GenerateTimetables from "./pages/admin/GenerateTimetables";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={() => <AdminLayout><Overview /></AdminLayout>} />
      <Route path="/admin/overview" component={() => <AdminLayout><Overview /></AdminLayout>} />
      <Route path="/admin/upload" component={() => <AdminLayout><UploadFiles /></AdminLayout>} />
      <Route path="/admin/classes" component={() => <AdminLayout><ManageClasses /></AdminLayout>} />
      <Route path="/admin/modules" component={() => <AdminLayout><ManageModules /></AdminLayout>} />
      <Route path="/admin/teachers" component={() => <AdminLayout><ManageTeachers /></AdminLayout>} />
      <Route path="/admin/generate" component={() => <AdminLayout><GenerateTimetables /></AdminLayout>} />
      <Route>404 Not Found</Route>
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
