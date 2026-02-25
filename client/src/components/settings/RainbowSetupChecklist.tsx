import { CheckCircle2, Circle, WifiOff, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/useSetupChecklist";

const RAINBOW_ITEM_IDS = ["whatsapp", "kb", "staffPhone"];

export default function RainbowSetupChecklist() {
  const { items, isLoading } = useSetupChecklist();

  if (isLoading) return null;

  const rainbowItems = items.filter((i) => RAINBOW_ITEM_IDS.includes(i.id));
  if (rainbowItems.length === 0) return null;

  const allComplete = rainbowItems.every((i) => i.completed);
  if (allComplete) return null;

  const rainbowOffline = rainbowItems.some((i) => i.available === false);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
          Rainbow AI Setup
          {rainbowOffline && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rainbowOffline && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 mb-3">
            Rainbow AI is not running — start it to configure these items.
          </p>
        )}
        <ul className="space-y-2">
          {rainbowItems.map((item) => (
            <RainbowItem key={item.id} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RainbowItem({ item }: { item: ChecklistItem }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {item.completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-gray-300 shrink-0" />
        )}
        <span
          className={`text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-700"
            }`}
        >
          {item.label}
        </span>
      </div>
      {!item.completed && item.available !== false && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-purple-600 hover:text-purple-800"
          onClick={() => {
            const RAINBOW_URL = import.meta.env.VITE_RAINBOW_URL || "http://localhost:3002";
            window.open(`${RAINBOW_URL}/#dashboard`, "_blank");
          }}
        >
          Configure <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      )}
    </li>
  );
}
