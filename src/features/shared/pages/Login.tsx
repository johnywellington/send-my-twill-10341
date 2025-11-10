import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/features/shared/hooks/use-auth";
import { MessageSquare, User, Shield } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, redirectToDashboard, role, loading, signInWithRole } = useAuth();
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated && role && !loading) {
      redirectToDashboard();
    }
  }, [isAuthenticated, role, loading, redirectToDashboard]);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingUser(true);

    try {
      await signInWithRole(userEmail, userPassword, 'user');
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("User login error:", error);
      toast.error(error.message || "Erro ao fazer login como operador");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAdmin(true);

    try {
      await signInWithRole(adminEmail, adminPassword, 'admin');
      toast.success("Login administrativo realizado com sucesso!");
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error(error.message || "Erro ao fazer login como administrador");
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">SMS Sender Platform</h1>
          <p className="text-muted-foreground">Selecione o tipo de acesso</p>
        </div>

        {/* Dual Login Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* User Login Card */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Operador</CardTitle>
              <CardDescription>
                Acesso para envio de SMS, chamadas e gestão de contatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email do Operador"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    disabled={isLoadingUser}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    disabled={isLoadingUser}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingUser}>
                  {isLoadingUser ? "Entrando..." : "Entrar como Operador"}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/signup")}
                    disabled={isLoadingUser}
                  >
                    Criar conta de operador
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Admin Login Card */}
          <Card className="border-2 hover:border-destructive/50 transition-colors">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Shield className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">Administrador</CardTitle>
              <CardDescription>
                Acesso completo para configuração e gestão do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email do Administrador"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    disabled={isLoadingAdmin}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={isLoadingAdmin}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-destructive hover:bg-destructive/90" 
                  disabled={isLoadingAdmin}
                >
                  {isLoadingAdmin ? "Entrando..." : "Entrar como Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Voltar para página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
