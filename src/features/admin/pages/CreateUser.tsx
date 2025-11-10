import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UserPlus, Shield, AlertTriangle, Info } from "lucide-react";

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "user" as "admin" | "user",
    is_active: true,
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const validatePassword = (password: string) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    });
  };

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    validatePassword(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    if (!isPasswordStrong) {
      toast.error("A senha não atende aos requisitos de segurança");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-admin', {
        body: formData
      });

      if (error) throw error;

      toast.success(`Usuário ${formData.email} criado com sucesso!`);
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "user",
        is_active: true,
      });
      
      // Redirect to users page
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Criar Novo Usuário</h1>
        <p className="text-muted-foreground mt-2">
          Crie um novo usuário ou administrador no sistema
        </p>
      </div>

      {/* Security Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Segurança:</strong> Esta ação cria usuários com acesso imediato ao sistema. 
          Para maior segurança, considere usar o fluxo de registro normal e promover usuários existentes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Informações do Usuário
          </CardTitle>
          <CardDescription>
            Preencha os dados do novo usuário. A senha deve atender aos requisitos de segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha forte"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
              />
              
              {/* Password Strength Indicators */}
              {formData.password && (
                <div className="space-y-2 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Requisitos de Senha:</p>
                  <div className="space-y-1 text-sm">
                    <div className={passwordStrength.length ? "text-green-600" : "text-muted-foreground"}>
                      {passwordStrength.length ? "✓" : "○"} Mínimo 8 caracteres
                    </div>
                    <div className={passwordStrength.uppercase ? "text-green-600" : "text-muted-foreground"}>
                      {passwordStrength.uppercase ? "✓" : "○"} Letra maiúscula
                    </div>
                    <div className={passwordStrength.lowercase ? "text-green-600" : "text-muted-foreground"}>
                      {passwordStrength.lowercase ? "✓" : "○"} Letra minúscula
                    </div>
                    <div className={passwordStrength.number ? "text-green-600" : "text-muted-foreground"}>
                      {passwordStrength.number ? "✓" : "○"} Número
                    </div>
                    <div className={passwordStrength.special ? "text-green-600" : "text-muted-foreground"}>
                      {passwordStrength.special ? "✓" : "○"} Caractere especial (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Nome do usuário"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+351 XXX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={20}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role do Usuário
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário Normal</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              
              {formData.role === "admin" && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Atenção:</strong> Administradores têm acesso total ao sistema. 
                    Criar admins deve ser feito com cautela.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Conta Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Desative para criar uma conta que precisa de aprovação
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/users')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isPasswordStrong}
              >
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alternative Method Info */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Método Alternativo (Mais Seguro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Recomendação de Segurança:</strong> Para criar novos administradores com maior segurança:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>O novo admin registra-se normalmente como usuário</li>
            <li>Você aprova o cadastro na página de Usuários</li>
            <li>Você promove o usuário para admin usando "Alterar Role"</li>
          </ol>
          <p className="text-muted-foreground italic mt-2">
            Este método cria um rastro de auditoria mais claro e evita a criação direta de contas privilegiadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUser;
