import { Link } from "wouter";
import { CheckCircle2, Circle, ArrowRight, X, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSetupChecklist } from "@/hooks/useSetupChecklist";

export default function SetupChecklist() {
  const { items, completedCount, totalCount, isAllComplete, isDismissed, dismiss, isLoading } =
    useSetupChecklist();

  if (isLoading || isAllComplete || isDismissed) return null;

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="mb-6 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏨</span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Get your property ready</h2>
              <p className="text-xs text-gray-500">
                {completedCount} of {totalCount} steps complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Progress value={percent} className="w-24 h-2" />
              <span className="text-sm font-medium text-indigo-700">{percent}%</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss setup checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <span
                  className={`text-sm truncate ${
                    item.completed ? "text-gray-400 line-through" : "text-gray-700"
                  }`}
                >
                  {item.label}
                </span>
                {item.available === false && !item.completed && (
                  <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-200 bg-amber-50">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Rainbow offline
                  </Badge>
                )}
              </div>
              {!item.completed && item.available !== false && (
                <Link href={item.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    Go <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
