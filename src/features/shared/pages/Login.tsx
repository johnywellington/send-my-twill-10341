import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/features/shared/hooks/use-auth";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, redirectToDashboard, role, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    // Redirect if already authenticated and role is loaded
    if (isAuthenticated && role && !loading) {
      redirectToDashboard();
    }
  }, [isAuthenticated, role, loading, redirectToDashboard]);

  // Reset form when switching tabs
  useEffect(() => {
    setEmail("");
    setPassword("");
  }, [activeTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session && data.user) {
        // Verificar se usuário está ativo
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active, suspended_at, suspension_reason')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          await supabase.auth.signOut();
          toast.error("Erro ao verificar status da conta");
          return;
        }

        // Usuário está suspenso
        if (profile.suspended_at) {
          await supabase.auth.signOut();
          toast.error("Conta suspensa", {
            description: profile.suspension_reason || "Entre em contato com o administrador",
            duration: 6000,
          });
          return;
        }

        // Usuário ainda não foi aprovado
        if (!profile.is_active) {
          await supabase.auth.signOut();
          toast.warning("Aguardando aprovação", {
            description: "Sua conta está aguardando aprovação do administrador. Você receberá um email quando for aprovada.",
            duration: 8000,
          });
          return;
        }

        // Atualizar last_login_at
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', data.user.id);

        toast.success("Login realizado com sucesso!");
        
        // Aguardar role ser carregado e redirecionar
        // O useEffect irá lidar com o redirecionamento quando role estiver disponível
      }
    } catch (error) {
      toast.error("Erro ao fazer login");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!email.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        // Verificar status do perfil após cadastro
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        // Se perfil inativo, fazer logout imediato
        if (profile && !profile.is_active) {
          toast.warning(
            "Conta criada! Aguardando aprovação do administrador.",
            {
              description: "Você será notificado por email quando sua conta for aprovada. Por favor, aguarde.",
              duration: 10000,
            }
          );
          
          // Delay para garantir que toast apareça antes do logout
          await new Promise(resolve => setTimeout(resolve, 500));
          await supabase.auth.signOut();
        } else {
          // Caso improvável: perfil já está ativo
          toast.success("Conta criada com sucesso!");
        }
      } else {
        // Sem sessão = email precisa ser confirmado
        toast.success(
          "Conta criada! Aguardando aprovação do administrador.",
          {
            description: "Verifique seu email para confirmar e aguarde a aprovação.",
            duration: 8000,
          }
        );
      }
    } catch (error) {
      toast.error("Erro ao criar conta");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">SMS Sender</CardTitle>
          <CardDescription className="text-center">
            Entre com sua conta ou crie uma nova
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Senha (mínimo 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
