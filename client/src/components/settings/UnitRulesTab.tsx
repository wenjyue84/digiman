import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Shield, Users, Wrench, ArrowDown, X, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UnitRulesTabProps {
  onSwitchTab?: (tab: string) => void;
}

interface UnitRules {
  deckPriority: boolean;
  excludedCapsules: string[];
  genderRules: {
    female: { preferred: string[]; fallbackToOther: boolean };
    male: { preferred: string[]; fallbackToOther: boolean };
  };
  maintenanceDeprioritize: boolean;
  deprioritizedCapsules: string[];
  autoLinkedCapsules?: string[];
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  const addChip = () => {
    const val = input.trim().toUpperCase();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="ml-0.5 hover:text-red-600">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(); } }}
          placeholder={placeholder}
          className="max-w-[140px]"
        />
        <Button type="button" variant="outline" size="sm" onClick={addChip} disabled={!input.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default function UnitRulesTab({ onSwitchTab }: UnitRulesTabProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery<UnitRules>({
    queryKey: ["/api/settings/unit-rules"],
    queryFn: async () => {
      const res = await fetch("/api/settings/unit-rules");
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    },
  });

  const [local, setLocal] = useState<UnitRules | null>(null);
  const [dirty, setDirty] = useState(false);

  // Track auto-linked capsules separately (from server response)
  const autoLinked = rules?.autoLinkedCapsules || [];

  useEffect(() => {
    if (rules && !local) {
      // Store only manual capsules in local state (exclude auto-linked)
      const manual = (rules.deprioritizedCapsules || []).filter(
        c => !(rules.autoLinkedCapsules || []).includes(c)
      );
      setLocal({ ...rules, deprioritizedCapsules: manual });
    }
  }, [rules, local]);

  const update = <K extends keyof UnitRules>(key: K, value: UnitRules[K]) => {
    if (!local) return;
    setLocal({ ...local, [key]: value });
    setDirty(true);
  };

  const updateGender = (gender: "female" | "male", field: "preferred" | "fallbackToOther", value: any) => {
    if (!local) return;
    setLocal({
      ...local,
      genderRules: {
        ...local.genderRules,
        [gender]: { ...local.genderRules[gender], [field]: value },
      },
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: UnitRules) => {
      // Only send manual capsules — server re-merges auto-linked on next GET
      const { autoLinkedCapsules, ...payload } = data;
      const res = await apiRequest("PUT", "/api/settings/unit-rules", payload);
      return res.json();
    },
    onSuccess: () => {
      setLocal(null); // Reset so useEffect picks up fresh merged data from refetch
      queryClient.invalidateQueries({ queryKey: ["/api/settings/unit-rules"] });
      setDirty(false);
      toast({ title: "Rules Saved", description: "Unit assignment rules updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save rules", variant: "destructive" });
    },
  });

  if (isLoading || !local) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deck Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDown className="h-4 w-4 text-blue-600" />
            Deck Priority
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Prefer lower deck (even numbers)</Label>
              <p className="text-sm text-gray-500">Assigns even-numbered units first (lower deck preferred by guests)</p>
            </div>
            <Switch checked={local.deckPriority} onCheckedChange={(v) => update("deckPriority", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Excluded Capsules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-red-600" />
            Excluded Units
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">These units will never be auto-assigned to guests</p>
          <ChipInput
            values={local.excludedCapsules}
            onChange={(v) => update("excludedCapsules", v)}
            placeholder="e.g. J1, R3"
          />
        </CardContent>
      </Card>

      {/* Gender Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-purple-600" />
            Gender Assignment Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Female */}
          <div className="space-y-3 p-4 bg-pink-50 rounded-lg border border-pink-100">
            <Label className="font-medium text-pink-800">Female Guests</Label>
            <p className="text-sm text-gray-600">Preferred units for female guests</p>
            <ChipInput
              values={local.genderRules.female.preferred}
              onChange={(v) => updateGender("female", "preferred", v)}
              placeholder="e.g. C1, C2"
            />
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={local.genderRules.female.fallbackToOther}
                onCheckedChange={(v) => updateGender("female", "fallbackToOther", v)}
              />
              <Label className="text-sm">Allow fallback to other units if preferred are occupied</Label>
            </div>
          </div>

          {/* Male */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Label className="font-medium text-blue-800">Male Guests</Label>
            <p className="text-sm text-gray-600">Preferred units for male guests (leave empty for no preference)</p>
            <ChipInput
              values={local.genderRules.male.preferred}
              onChange={(v) => updateGender("male", "preferred", v)}
              placeholder="e.g. C7, C8"
            />
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={local.genderRules.male.fallbackToOther}
                onCheckedChange={(v) => updateGender("male", "fallbackToOther", v)}
              />
              <Label className="text-sm">Allow fallback to other units if preferred are occupied</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Deprioritization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-orange-600" />
            Maintenance Deprioritization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Deprioritize units with maintenance issues</Label>
              <p className="text-sm text-gray-500">These units will only be assigned when no better options exist</p>
            </div>
            <Switch
              checked={local.maintenanceDeprioritize}
              onCheckedChange={(v) => update("maintenanceDeprioritize", v)}
            />
          </div>
          {local.maintenanceDeprioritize && (
            <div className="pt-2 space-y-3">
              {/* Auto-linked from active problems */}
              {autoLinked.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block text-orange-700">
                    Auto-linked from active problems ({autoLinked.length})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    <TooltipProvider>
                      {autoLinked.map((unit) => (
                        <Tooltip key={unit}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="gap-1 bg-orange-50 border-orange-300 text-orange-800 cursor-pointer hover:bg-orange-100"
                              onClick={() => onSwitchTab?.("maintenance")}
                            >
                              <Lock className="h-3 w-3" />
                              {unit}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Click to view in Maintenance tab</TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    These are automatically deprioritized based on active maintenance issues. Resolve the problem to remove.
                  </p>
                </div>
              )}
              {/* Manual deprioritized capsules */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Manual Deprioritization</Label>
                <ChipInput
                  values={local.deprioritizedCapsules}
                  onChange={(v) => update("deprioritizedCapsules", v)}
                  placeholder="e.g. C10, C15"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(local)}
          disabled={!dirty || saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Rules"}
        </Button>
      </div>
    </div>
  );
}
