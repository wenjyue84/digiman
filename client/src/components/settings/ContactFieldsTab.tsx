import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tags, Plus, Trash2, Lock, CalendarDays, Type, Hash, ListFilter, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = "date" | "text" | "number" | "select";

interface ContactFieldDef {
  id: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  fieldOptions: unknown;   // JSONB from DB — may be string[] or null
  isBuiltIn: boolean;
  sortOrder: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  date:   <CalendarDays className="h-3.5 w-3.5 text-blue-500" />,
  text:   <Type className="h-3.5 w-3.5 text-gray-500" />,
  number: <Hash className="h-3.5 w-3.5 text-purple-500" />,
  select: <ListFilter className="h-3.5 w-3.5 text-amber-500" />,
};

const TYPE_LABELS: Record<FieldType, string> = {
  date:   "Date",
  text:   "Text",
  number: "Number",
  select: "Select (options)",
};

const EMPTY_FORM = {
  fieldKey: "",
  fieldLabel: "",
  fieldType: "text" as FieldType,
  fieldOptionsRaw: "",  // comma-separated string for the form input
};

function toStringArray(options: unknown): string[] {
  if (!options) return [];
  if (Array.isArray(options)) return options.map(String);
  return [];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ContactFieldsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [keyError, setKeyError] = useState("");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: fields = [], isLoading, error } = useQuery<ContactFieldDef[]>({
    queryKey: ["/api/contact-fields/definitions"],
    retry: false,
  });

  const dbUnavailable = !!(error as any)?.message?.includes("503");

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/contact-fields/definitions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-fields/definitions"] });
      toast({ title: "Field Created", description: `"${form.fieldLabel}" added successfully.` });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("409") ? "Field key already exists" : "Failed to create field";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldKey: string) => apiRequest("DELETE", `/api/contact-fields/definitions/${fieldKey}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-fields/definitions"] });
      toast({ title: "Field Deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete field", variant: "destructive" }),
  });

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setKeyError("");
    setDialogOpen(true);
  }

  function handleSave() {
    const key = form.fieldKey.trim().replace(/\s+/g, "_").toLowerCase();
    const label = form.fieldLabel.trim();

    if (!key) { setKeyError("Field key is required"); return; }
    if (!label) {
      toast({ title: "Validation Error", description: "Field label is required.", variant: "destructive" });
      return;
    }

    const options = form.fieldType === "select"
      ? form.fieldOptionsRaw.split(",").map(o => o.trim()).filter(Boolean)
      : null;

    createMutation.mutate({
      fieldKey: key,
      fieldLabel: label,
      fieldType: form.fieldType,
      fieldOptions: options,
      sortOrder: fields.length + 1,
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const builtIn = fields.filter(f => f.isBuiltIn);
  const custom  = fields.filter(f => !f.isBuiltIn);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center">
                <Tags className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">Contact Fields</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  Define fields stored per WhatsApp contact (check-in date, room, booking source, etc.)
                </p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5" disabled={dbUnavailable || isLoading}>
              <Plus className="h-4 w-4" /> New Field
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* DB unavailable notice */}
      {dbUnavailable && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Database not configured — set{" "}
            <code className="text-xs bg-amber-100 px-1 rounded">DATABASE_URL</code>{" "}
            to enable contact fields.
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-gray-400 text-sm">Loading fields...</CardContent>
        </Card>
      )}

      {/* Built-in fields */}
      {!isLoading && !dbUnavailable && builtIn.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Built-in Fields</span>
              <span className="text-xs text-gray-400">(system — cannot be deleted)</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="divide-y divide-gray-100">
              {builtIn.map(field => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onDelete={() => {}}
                  canDelete={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom fields */}
      {!isLoading && !dbUnavailable && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <span className="text-sm font-medium text-gray-600">Custom Fields</span>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {custom.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No custom fields yet. Click "New Field" to add one.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {custom.map(field => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    onDelete={() => deleteMutation.mutate(field.fieldKey)}
                    canDelete
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Contact Field</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div>
              <Label htmlFor="cf-label">Display Label *</Label>
              <Input
                id="cf-label"
                value={form.fieldLabel}
                onChange={e => setForm({ ...form, fieldLabel: e.target.value })}
                placeholder="e.g. Guest Notes"
                className="mt-1"
              />
            </div>

            {/* Key */}
            <div>
              <Label htmlFor="cf-key">Field Key *</Label>
              <Input
                id="cf-key"
                value={form.fieldKey}
                onChange={e => { setForm({ ...form, fieldKey: e.target.value }); setKeyError(""); }}
                placeholder="e.g. guest_notes (auto-lowercased)"
                className={`mt-1 ${keyError ? "border-red-400" : ""}`}
              />
              {keyError && <p className="text-xs text-red-500 mt-1">{keyError}</p>}
              <p className="text-xs text-gray-400 mt-1">Spaces converted to underscores, lowercase</p>
            </div>

            {/* Type */}
            <div>
              <Label>Field Type</Label>
              <Select
                value={form.fieldType}
                onValueChange={v => setForm({ ...form, fieldType: v as FieldType, fieldOptionsRaw: "" })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select (options)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options — only for select type */}
            {form.fieldType === "select" && (
              <div>
                <Label htmlFor="cf-options">Options (comma-separated)</Label>
                <Input
                  id="cf-options"
                  value={form.fieldOptionsRaw}
                  onChange={e => setForm({ ...form, fieldOptionsRaw: e.target.value })}
                  placeholder="e.g. option1, option2, option3"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── FieldRow sub-component ────────────────────────────────────────────────────

function FieldRow({
  field,
  onDelete,
  canDelete,
}: {
  field: ContactFieldDef;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const options = toStringArray(field.fieldOptions);
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">{TYPE_ICONS[field.fieldType]}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{field.fieldLabel}</span>
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
              {TYPE_LABELS[field.fieldType]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <code className="text-xs text-gray-400 bg-gray-50 px-1 rounded">{field.fieldKey}</code>
            {options.length > 0 && (
              <span className="text-xs text-gray-400">{options.join(", ")}</span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
        onClick={onDelete}
        disabled={!canDelete}
        title={!canDelete ? "Built-in fields cannot be deleted" : "Delete field"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
