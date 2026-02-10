import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  TestTube2,
  MessageSquare,
  GitBranch,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mcpFetch } from "@/lib/mcp-api";

interface IntentCategory {
  category: string;
  patterns: string[];
  flags: string;
  enabled: boolean;
}

interface IntentsConfig {
  categories: IntentCategory[];
}

interface RoutingConfig {
  [intent: string]: {
    action: "static_reply" | "llm_reply" | "start_booking" | "escalate" | "forward_payment";
  };
}

export default function IntentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const { data: intentsConfig, isLoading: intentsLoading } = useQuery<IntentsConfig>({
    queryKey: ["mcp", "intents"],
    queryFn: () => mcpFetch("/intents"),
  });

  const { data: routingConfig, isLoading: routingLoading } = useQuery<RoutingConfig>({
    queryKey: ["mcp", "routing"],
    queryFn: () => mcpFetch("/routing"),
  });

  const toggleIntentMutation = useMutation({
    mutationFn: async ({ category, enabled }: { category: string; enabled: boolean }) => {
      return mcpFetch(`/intents/${category}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "intents"] });
      toast({ title: "Intent Updated", description: "Intent status has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRoutingMutation = useMutation({
    mutationFn: async ({ intent, action }: { intent: string; action: string }) => {
      return mcpFetch(`/routing/${intent}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "routing"] });
      toast({ title: "Routing Updated" });
    },
  });

  if (intentsLoading || routingLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const getCategoryDisplayName = (category: string) =>
    category.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Intents & Routing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {intentsConfig?.categories.map((intent) => {
          const routing = routingConfig?.[intent.category];
          return (
            <Card key={intent.category}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{getCategoryDisplayName(intent.category)}</CardTitle>
                  <Switch
                    checked={intent.enabled}
                    onCheckedChange={(checked) =>
                      toggleIntentMutation.mutate({ category: intent.category, enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Patterns:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {intent.patterns.slice(0, 2).map((pattern, idx) => (
                      <code key={idx} className="block text-xs bg-muted p-1 rounded truncate">{pattern}</code>
                    ))}
                    {intent.patterns.length > 2 && <p className="text-xs italic">+{intent.patterns.length - 2} more</p>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><GitBranch className="h-3 w-3" />Routing</Label>
                  <Select
                    value={routing?.action || "llm_reply"}
                    onValueChange={(action) => updateRoutingMutation.mutate({ intent: intent.category, action })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static_reply">Static Reply</SelectItem>
                      <SelectItem value="llm_reply">LLM Reply</SelectItem>
                      <SelectItem value="start_booking">Start Booking</SelectItem>
                      <SelectItem value="escalate">Escalate</SelectItem>
                      <SelectItem value="forward_payment">Forward Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}