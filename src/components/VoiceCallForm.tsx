import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface VoiceCallFormProps {
  onCallMade?: () => void;
}

export function VoiceCallForm({ onCallMade }: VoiceCallFormProps) {
  const [to, setTo] = useState("351911019866");
  const [from, setFrom] = useState("447418373592");
  const [message, setMessage] = useState("Hello from Voice API");
  const [language, setLanguage] = useState("en-US");
  const [style, setStyle] = useState("0");
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  // Gerar preview do request
  const requestPreview = {
    from: { type: "phone", number: from },
    to: [{ type: "phone", number: to }],
    ncco: [{
      action: "talk",
      language: language,
      style: parseInt(style),
      premium: premium,
      text: message
    }]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !from || !message) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-voice-call', {
        body: {
          to,
          from,
          text: message,
          language,
          style: parseInt(style),
          premium
        }
      });

      if (error) {
        toast.error("Error making call", {
          description: error.message,
        });
        return;
      }

      if (data?.success) {
        toast.success("Call initiated successfully!", {
          description: `UUID: ${data.uuid}`
        });
        onCallMade?.();
      } else {
        toast.error("Failed to make call", {
          description: data?.error || "Unknown error"
        });
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      toast.error("Unexpected error", {
        description: error.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Try it out</CardTitle>
          <CardDescription>
            Try our API by sending a Voice call to your phone. Sending a Voice call uses your account credit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="tel"
                placeholder="447418373592"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to">
                To <span className="text-muted-foreground">ⓘ</span>
              </Label>
              <Input
                id="to"
                type="tel"
                placeholder="351911019866"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                  <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                  <SelectItem value="es-ES">Español (España)</SelectItem>
                  <SelectItem value="es-US">Español (Estados Unidos)</SelectItem>
                  <SelectItem value="fr-FR">Français</SelectItem>
                  <SelectItem value="de-DE">Deutsch</SelectItem>
                  <SelectItem value="it-IT">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="premium" 
                checked={premium}
                onCheckedChange={(checked) => setPremium(checked as boolean)}
              />
              <Label htmlFor="premium" className="cursor-pointer text-primary">
                Premium Voices
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Hello from Voice API"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[100px]"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                For this specific call the character limit is 100
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Making Call...
                </>
              ) : (
                "Call"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Voice API Request:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-blue-600">POST</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                https://api.nexmo.com/v1/calls
              </code>
            </div>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{JSON.stringify(requestPreview, null, 2)}
            </pre>
            <a 
              href="https://developer.vonage.com/en/voice/voice-api/overview" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-block"
            >
              Learn more
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
