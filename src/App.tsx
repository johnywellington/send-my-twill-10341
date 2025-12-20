import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoute } from "@/features/shared/components/UserRoute";
import { PublicLayout } from "@/features/shared/layouts/PublicLayout";
import { UserLayout } from "@/features/user/layouts/UserLayout";

// Lazy load pages
const LandingPage = lazy(() => import("./features/shared/pages/LandingPage"));
const Login = lazy(() => import("./features/shared/pages/Login"));
const Signup = lazy(() => import("./features/shared/pages/Signup"));
const NotFound = lazy(() => import("./features/shared/pages/NotFound"));
const ApiDocs = lazy(() => import("./features/shared/pages/ApiDocs"));

// User pages
const Dashboard = lazy(() => import("./features/user/pages/Dashboard"));
const Contacts = lazy(() => import("./features/user/pages/Contacts"));
const Analytics = lazy(() => import("./features/user/pages/Analytics"));
const Templates = lazy(() => import("./features/user/pages/Templates"));
const ApiTest = lazy(() => import("./features/user/pages/ApiTest"));
const Comunicacao = lazy(() => import("./features/user/pages/Comunicacao"));
const ChamadasURA = lazy(() => import("./features/user/pages/ChamadasURA"));
const HistoricoSMS = lazy(() => import("./features/user/pages/HistoricoSMS"));
const ValidarNumeros = lazy(() => import("./features/user/pages/ValidarNumeros"));
const RelatorioCustos = lazy(() => import("./features/user/pages/RelatorioCustos"));
const ChamadasRecebidas = lazy(() => import("./features/user/pages/ChamadasRecebidas"));
const SIP = lazy(() => import("./features/user/pages/SIP"));

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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/docs" element={
              <PublicLayout>
                <ApiDocs />
              </PublicLayout>
            } />

          {/* User Routes */}
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
        <Route path="/api-test" element={
          <UserRoute>
            <UserLayout>
              <ApiTest />
            </UserLayout>
          </UserRoute>
        } />
        <Route path="/comunicacao" element={
          <UserRoute>
            <UserLayout>
              <Comunicacao />
            </UserLayout>
          </UserRoute>
        } />
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
