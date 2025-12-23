import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useValidatePhone } from "@/hooks/use-validate-phone";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ValidarNumeros = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [level, setLevel] = useState<'basic' | 'standard' | 'advanced'>('standard');
  const [result, setResult] = useState<any>(null);
  
  const { validate, validating } = useValidatePhone();

  const handleValidate = () => {
    validate(
      { phoneNumber, level },
      {
        onSuccess: (data) => {
          setResult(data);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Validação de Números</h1>
            <p className="text-muted-foreground">
              Vonage Number Insight API - Valide números antes de enviar
            </p>
          </div>
        </div>

        {/* Validation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Validar Número</CardTitle>
            <CardDescription>
              Use a API do Vonage para verificar se um número é válido, ativo e alcançável
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Número de Telefone</Label>
                <Input
                  placeholder="+5511999999999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div>
                <Label>Nível de Validação</Label>
                <Select value={level} onValueChange={(v: any) => setLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (Grátis)</SelectItem>
                    <SelectItem value="standard">Standard ($0.004)</SelectItem>
                    <SelectItem value="advanced">Advanced ($0.015)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Basic:</strong> Formato e país • 
                <strong> Standard:</strong> + Operadora e tipo de linha • 
                <strong> Advanced:</strong> + Status de roaming e portabilidade
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleValidate}
              disabled={!phoneNumber || validating}
              className="w-full"
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar Número'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resultado da Validação</CardTitle>
                {result.valid ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Válido
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Inválido
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número Internacional</Label>
                  <p className="font-medium">{result.phoneNumber || '-'}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Formato Nacional</Label>
                  <p className="font-medium">{result.nationalFormat || '-'}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">País</Label>
                  <p className="font-medium">
                    {result.countryName} ({result.countryCode})
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Operadora</Label>
                  <p className="font-medium">{result.carrier || 'Desconhecida'}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Tipo de Linha</Label>
                  <Badge variant="outline">
                    {result.lineType === 'mobile' && '📱 Móvel'}
                    {result.lineType === 'landline' && '☎️ Fixo'}
                    {result.lineType === 'voip' && '💻 VoIP'}
                    {!result.lineType && 'Desconhecido'}
                  </Badge>
                </div>

                <div>
                  <Label className="text-muted-foreground">Alcançável</Label>
                  <Badge variant={result.reachable === 'reachable' ? 'default' : 'destructive'}>
                    {result.reachable === 'reachable' ? 'Sim' : 'Não'}
                  </Badge>
                </div>

                {result.ported && (
                  <div>
                    <Label className="text-muted-foreground">Portabilidade</Label>
                    <Badge variant="secondary">Número Portado</Badge>
                  </div>
                )}

                {result.roaming && result.roaming !== 'unknown' && (
                  <div>
                    <Label className="text-muted-foreground">Roaming</Label>
                    <Badge variant="outline">{result.roaming}</Badge>
                  </div>
                )}
              </div>

              {result.error && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              )}

              {result.lookupOutcomeMessage && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{result.lookupOutcomeMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Basic Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">Grátis</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>✓ Formato do número</li>
                <li>✓ Código do país</li>
                <li>✓ Validação básica</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Standard Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">$0.004</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>✓ Tudo do Basic</li>
                <li>✓ Nome da operadora</li>
                <li>✓ Tipo de linha</li>
                <li>✓ Status alcançável</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Advanced Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-500">$0.015</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>✓ Tudo do Standard</li>
                <li>✓ Status de roaming</li>
                <li>✓ Portabilidade</li>
                <li>✓ Nome do chamador</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ValidarNumeros;