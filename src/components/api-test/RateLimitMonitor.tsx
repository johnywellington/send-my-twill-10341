import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity } from "lucide-react";
import { RATE_LIMITS } from "@/lib/rate-limits";

export const RateLimitMonitor = () => {
  // Em um cenário real, esses valores viriam de uma API ou estado global
  // Por enquanto, mostramos os limites configurados
  const limits = [
    {
      name: "Vonage SMS",
      current: RATE_LIMITS.vonage.sms.default,
      max: RATE_LIMITS.vonage.sms.max,
      unit: RATE_LIMITS.vonage.sms.unit,
    },
    {
      name: "Vonage Voice",
      current: RATE_LIMITS.vonage.voice.default,
      max: RATE_LIMITS.vonage.voice.max,
      unit: RATE_LIMITS.vonage.voice.unit,
    },
    {
      name: "Twilio SMS",
      current: RATE_LIMITS.twilio.sms.default,
      max: RATE_LIMITS.twilio.sms.max,
      unit: RATE_LIMITS.twilio.sms.unit,
    },
    {
      name: "Twilio Voice",
      current: RATE_LIMITS.twilio.voice.default,
      max: RATE_LIMITS.twilio.voice.max,
      unit: RATE_LIMITS.twilio.voice.unit,
    },
  ];

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Rate Limits Configurados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {limits.map((limit) => (
            <div key={limit.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{limit.name}</span>
                <span className="text-muted-foreground">
                  {limit.current}/{limit.max} {limit.unit}
                </span>
              </div>
              <Progress
                value={(limit.current / limit.max) * 100}
                className="h-2"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Estes são os limites configurados no sistema. Rate limits reais da API
          são monitorados durante os envios.
        </p>
      </CardContent>
    </Card>
  );
};
