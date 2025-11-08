import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ProviderSelector } from "@/components/ProviderSelector";
import { CredentialSelector } from "@/components/credentials/CredentialSelector";
import { useProvider } from "@/contexts/ProviderContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { signOut, user } = useAuth();
  const { provider, selectedCredentialId, setSelectedCredentialId } = useProvider();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-red-700 dark:text-red-300" />
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">SMS Sender Admin</h1>
                <Badge variant="destructive" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ProviderSelector />
              
              <div className="w-72">
                <CredentialSelector
                  provider={provider}
                  value={selectedCredentialId}
                  onChange={setSelectedCredentialId}
                  showLegacyOption={true}
                  compact={true}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
