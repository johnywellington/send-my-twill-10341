import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoute } from "@/features/shared/components/UserRoute";
import { AdminRoute } from "@/features/shared/components/AdminRoute";
import { PublicLayout } from "@/features/shared/layouts/PublicLayout";
import { UserLayout } from "@/features/user/layouts/UserLayout";
import { AdminLayout } from "@/features/admin/layouts/AdminLayout";

// Lazy load pages
const Index = lazy(() => import("./features/shared/pages/Index"));
const Login = lazy(() => import("./features/shared/pages/Login"));
const NotFound = lazy(() => import("./features/shared/pages/NotFound"));
const ApiDocs = lazy(() => import("./features/shared/pages/ApiDocs"));

// User pages
const Dashboard = lazy(() => import("./features/user/pages/Dashboard"));
const Contacts = lazy(() => import("./features/user/pages/Contacts"));
const Analytics = lazy(() => import("./features/user/pages/Analytics"));
const Templates = lazy(() => import("./features/user/pages/Templates"));
const ApiTest = lazy(() => import("./features/user/pages/ApiTest"));
const ChamadasURA = lazy(() => import("./features/user/pages/ChamadasURA"));
const HistoricoSMS = lazy(() => import("./features/user/pages/HistoricoSMS"));
const ValidarNumeros = lazy(() => import("./features/user/pages/ValidarNumeros"));
const RelatorioCustos = lazy(() => import("./features/user/pages/RelatorioCustos"));
const ChamadasRecebidas = lazy(() => import("./features/user/pages/ChamadasRecebidas"));
const SIP = lazy(() => import("./features/user/pages/SIP"));

// Admin pages
const Numbers = lazy(() => import("./features/admin/pages/Numbers"));
const Monitoring = lazy(() => import("./features/admin/pages/Monitoring"));
const ActiveCalls = lazy(() => import("./features/admin/pages/ActiveCalls"));
const ProviderCredentials = lazy(() => import("./features/admin/pages/ProviderCredentials"));
const AdminDashboard = lazy(() => import("./features/admin/pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./features/admin/pages/AdminUsers"));
const AdminSIP = lazy(() => import("./features/admin/pages/SIP"));
const SIPDomainDetails = lazy(() => import("./features/admin/pages/SIPDomainDetails"));
const SyncLogs = lazy(() => import("./features/admin/pages/SyncLogs"));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
