import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserRoute } from "@/components/UserRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { UserLayout } from "@/components/layouts/UserLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import ApiTest from "./pages/ApiTest";
import ApiDocs from "./pages/ApiDocs";
import Numbers from "./pages/Numbers";
import Monitoring from "./pages/Monitoring";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicLayout>
              <Login />
            </PublicLayout>
          } />

          {/* User Routes - Green Sidebar */}
          <Route path="/" element={
            <UserRoute>
              <UserLayout>
                <Index />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/dashboard" element={
            <UserRoute>
              <UserLayout>
                <Dashboard />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/contacts" element={
            <UserRoute>
              <UserLayout>
                <Contacts />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/analytics" element={
            <UserRoute>
              <UserLayout>
                <Analytics />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/templates" element={
            <UserRoute>
              <UserLayout>
                <Templates />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/numbers" element={
            <UserRoute>
              <UserLayout>
                <Numbers />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/api-test" element={
            <UserRoute>
              <UserLayout>
                <ApiTest />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/docs" element={
            <UserRoute>
              <UserLayout>
                <ApiDocs />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/monitoring" element={
            <UserRoute>
              <UserLayout>
                <Monitoring />
              </UserLayout>
            </UserRoute>
          } />

          {/* Admin Routes - Red Sidebar */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </AdminRoute>
          } />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
