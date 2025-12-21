import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserSidebar } from "./UserSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/features/shared/hooks/use-auth";
import { ProviderSelector } from "@/components/ProviderSelector";
import { CredentialSelector } from "@/components/CredentialSelector";
import { useProvider } from "@/contexts/ProviderContext";

interface UserLayoutProps {
  children: React.ReactNode;
}

export const UserLayout = ({ children }: UserLayoutProps) => {
  const { signOut, user } = useAuth();
  const { provider, selectedCredentialId, setSelectedCredentialId } = useProvider();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <UserSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-green-700 dark:text-green-300" />
              <h1 className="text-lg font-semibold text-foreground">SMS Sender</h1>
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
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
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
