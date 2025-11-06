import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Loader2, CheckCircle2, XCircle, Beaker } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEdgeFunctionTest } from "@/hooks/use-edge-function-test";
import { TestResult } from "@/pages/ApiTest";
import { RequestViewer } from "./RequestViewer";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "json";
  placeholder?: string;
  options?: string[];
}

interface TestCardProps {
  title: string;
  functionName: string;
  defaultParams: Record<string, any>;
  fields: Field[];
  onTestComplete: (result: TestResult) => void;
}

export const TestCard = ({
  title,
  functionName,
  defaultParams,
  fields,
  onTestComplete,
}: TestCardProps) => {
  const [params, setParams] = useState({ ...defaultParams, dryRun: true });
  const { test, loading, result } = useEdgeFunctionTest(functionName);

  const handleChange = (name: string, value: any) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    const testResult = await test(params);
    onTestComplete(testResult);
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle Dry-Run */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <Label className="font-medium text-blue-900 dark:text-blue-100">
                Modo Teste (Dry-Run)
              </Label>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Teste sem gastar créditos reais
              </p>
            </div>
          </div>
          <Switch
            checked={params.dryRun}
            onCheckedChange={(checked) => handleChange('dryRun', checked)}
          />
        </div>

        {/* Form Fields */}
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === "text" && (
              <Input
                id={field.name}
                value={params[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                id={field.name}
                value={params[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            )}
            {field.type === "json" && (
              <Textarea
                id={field.name}
                value={typeof params[field.name] === 'string' ? params[field.name] : JSON.stringify(params[field.name], null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange(field.name, parsed);
                  } catch {
                    handleChange(field.name, e.target.value);
                  }
                }}
                placeholder={field.placeholder}
                rows={6}
                className="font-mono text-sm"
              />
            )}
            {field.type === "number" && (
              <Input
                id={field.name}
                type="number"
                value={params[field.name]}
                onChange={(e) => handleChange(field.name, Number(e.target.value))}
                placeholder={field.placeholder}
              />
            )}
            {field.type === "select" && (
              <Select
                value={params[field.name]}
                onValueChange={(value) => handleChange(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.type === "checkbox" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.name}
                  checked={params[field.name]}
                  onCheckedChange={(checked) => handleChange(field.name, checked)}
                />
                <Label htmlFor={field.name} className="cursor-pointer">
                  Ativar
                </Label>
              </div>
            )}
          </div>
        ))}

        {/* Test Button */}
        <Button
          onClick={handleTest}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Executar Teste
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.status === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">
                  {result.status === "success" ? "Sucesso" : "Erro"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {result.latency}ms
              </span>
            </div>

            <RequestViewer
              title="Response"
              data={result.response}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
