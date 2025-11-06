import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, History, ChevronDown, ChevronRight } from "lucide-react";
import { TestResult } from "@/pages/ApiTest";
import { useState } from "react";
import { RequestViewer } from "./RequestViewer";

interface TestHistoryProps {
  history: TestResult[];
  onClearHistory: () => void;
}

export const TestHistory = ({ history, onClearHistory }: TestHistoryProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Testes ({history.length}/20)
          </CardTitle>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum teste executado ainda. Execute um teste acima para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((test) => (
              <div key={test.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(test.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {expandedId === test.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {test.functionName}
                        </span>
                        <Badge
                          variant={
                            test.status === "success" ? "default" : "destructive"
                          }
                        >
                          {test.status === "success" ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(test.timestamp).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{test.latency}ms</p>
                  </div>
                </div>

                {expandedId === test.id && (
                  <div className="p-3 bg-muted/20 space-y-3 border-t">
                    <RequestViewer title="Request" data={test.request} />
                    <RequestViewer title="Response" data={test.response} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
