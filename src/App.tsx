import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/features/shared/components/ProtectedRoute";
import { UserRoute } from "@/features/shared/components/UserRoute";
import { AdminRoute } from "@/features/shared/components/AdminRoute";
import { PublicLayout } from "@/features/shared/layouts/PublicLayout";
import { UserLayout } from "@/features/user/layouts/UserLayout";
import { AdminLayout } from "@/features/admin/layouts/AdminLayout";
import Index from "./features/shared/pages/Index";
import Login from "./features/shared/pages/Login";
import Dashboard from "./features/user/pages/Dashboard";
import Contacts from "./features/user/pages/Contacts";
import Analytics from "./features/user/pages/Analytics";
import Templates from "./features/user/pages/Templates";
import ApiTest from "./features/user/pages/ApiTest";
import ApiDocs from "./features/shared/pages/ApiDocs";
import Numbers from "./features/admin/pages/Numbers";
import Monitoring from "./features/admin/pages/Monitoring";
import ActiveCalls from "./features/admin/pages/ActiveCalls";
import ChamadasURA from "./features/user/pages/ChamadasURA";
import HistoricoSMS from "./features/user/pages/HistoricoSMS";
import ValidarNumeros from "./features/user/pages/ValidarNumeros";
import RelatorioCustos from "./features/user/pages/RelatorioCustos";
import ChamadasRecebidas from "./features/user/pages/ChamadasRecebidas";
import ProviderCredentials from "./features/admin/pages/ProviderCredentials";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import AdminUsers from "./features/admin/pages/AdminUsers";
import AdminSIP from "./features/admin/pages/SIP";
import SIPDomainDetails from "./features/admin/pages/SIPDomainDetails";
import SIP from "./features/user/pages/SIP";
import SyncLogs from "./features/admin/pages/SyncLogs";
import NotFound from "./features/shared/pages/NotFound";

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
        <Route path="/historico-sms" element={
          <UserRoute>
            <UserLayout>
              <HistoricoSMS />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/validar-numeros" element={
          <UserRoute>
            <UserLayout>
              <ValidarNumeros />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/relatorio-custos" element={
          <UserRoute>
            <UserLayout>
              <RelatorioCustos />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/chamadas-recebidas" element={
          <UserRoute>
            <UserLayout>
              <ChamadasRecebidas />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/chamadas-ura" element={
          <UserRoute>
            <UserLayout>
              <ChamadasURA />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/credentials" element={
          <UserRoute>
            <UserLayout>
              <ProviderCredentials />
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
          <Route path="/active-calls" element={
            <UserRoute>
              <UserLayout>
                <ActiveCalls />
              </UserLayout>
            </UserRoute>
          } />
          <Route path="/sync-logs" element={
            <UserRoute>
              <UserLayout>
                <SyncLogs />
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
          <Route path="/admin/sip" element={
            <AdminRoute>
              <AdminLayout>
                <AdminSIP />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/sip/domain/:domainGroupId" element={
            <AdminRoute>
              <AdminLayout>
                <SIPDomainDetails />
              </AdminLayout>
            </AdminRoute>
          } />

          {/* User SIP Route */}
          <Route path="/sip" element={
            <UserRoute>
              <UserLayout>
                <SIP />
              </UserLayout>
            </UserRoute>
          } />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
