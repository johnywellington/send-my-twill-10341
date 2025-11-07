import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { SIPCallDialog } from "./SIPCallDialog";

export function MakeCallContent() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Fazer Chamada SIP
          </CardTitle>
          <CardDescription>
            Inicie uma chamada através do seu ramal SIP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogOpen(true)} className="w-full" size="lg">
            <Phone className="h-5 w-5 mr-2" />
            Nova Chamada
          </Button>
        </CardContent>
      </Card>

      <SIPCallDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Card>
        <CardHeader>
          <CardTitle>Últimas Chamadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma chamada recente</p>
        </CardContent>
      </Card>
    </div>
  );
}
