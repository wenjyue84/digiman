import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Trash2, Edit, Bell, CalendarClock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledRule {
  id: number;
  name: string;
  isActive: boolean;
  triggerField: string;
  triggerOffsetHours: number;
  messageEn: string;
  messageMs: string | null;
  messageZh: string | null;
  cooldownHours: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIGGER_FIELD_LABELS: Record<string, string> = {
  check_in_date:  "Check-in Date",
  check_out_date: "Check-out Date",
  booking_date:   "Booking Date",
};

function formatTrigger(rule: ScheduledRule): string {
  const fieldLabel = TRIGGER_FIELD_LABELS[rule.triggerField] ?? rule.triggerField;
  if (rule.triggerOffsetHours === 0) return `At ${fieldLabel}`;
  if (rule.triggerOffsetHours > 0) return `${rule.triggerOffsetHours}h after ${fieldLabel}`;
  return `${Math.abs(rule.triggerOffsetHours)}h before ${fieldLabel}`;
}

const EMPTY_FORM = {
  name: "",
  isActive: true,
  triggerField: "check_in_date",
  triggerOffsetHours: 0,
  messageEn: "",
  messageMs: "",
  messageZh: "",
  cooldownHours: 24,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ScheduledMessagesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduledRule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: rules = [], isLoading, error } = useQuery<ScheduledRule[]>({
    queryKey: ["/api/scheduled-messages/rules"],
    retry: false,
  });

  const dbUnavailable = !!(error as any)?.message?.includes("503");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/scheduled-messages/rules"] });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/scheduled-messages/rules", body),
    onSuccess: () => {
      invalidate();
      toast({ title: "Rule Created", description: `"${form.name}" created.` });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to create rule", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiRequest("PUT", `/api/scheduled-messages/rules/${id}`, body),
    onSuccess: () => {
      invalidate();
      toast({ title: "Rule Updated" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update rule", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/scheduled-messages/rules/${id}/toggle`),
    onSuccess: invalidate,
    onError: () => toast({ title: "Error", description: "Failed to toggle rule", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scheduled-messages/rules/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Rule Deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete rule", variant: "destructive" }),
  });

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(rule: ScheduledRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      isActive: rule.isActive,
      triggerField: rule.triggerField,
      triggerOffsetHours: rule.triggerOffsetHours,
      messageEn: rule.messageEn,
      messageMs: rule.messageMs ?? "",
      messageZh: rule.messageZh ?? "",
      cooldownHours: rule.cooldownHours,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.messageEn.trim()) {
      toast({ title: "Validation Error", description: "Name and English message are required.", variant: "destructive" });
      return;
    }

    const body = {
      name: form.name.trim(),
      isActive: form.isActive,
      triggerField: form.triggerField,
      triggerOffsetHours: Number(form.triggerOffsetHours),
      messageEn: form.messageEn.trim(),
      messageMs: form.messageMs.trim() || null,
      messageZh: form.messageZh.trim() || null,
      cooldownHours: Number(form.cooldownHours),
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Scheduled Messages</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  Auto-send WhatsApp messages based on guest check-in / check-out dates
                </p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5" disabled={dbUnavailable || isLoading}>
              <Plus className="h-4 w-4" /> New Rule
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
            to enable scheduled messages.
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-gray-400 text-sm">Loading rules...</CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !dbUnavailable && rules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scheduled message rules yet.</p>
            <p className="text-xs mt-1">Click "New Rule" to create your first automated message.</p>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {!isLoading && !dbUnavailable && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={rule.isActive ? "" : "opacity-60"}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name + badge row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rule.name}</span>
                      <Badge
                        variant={rule.isActive ? "default" : "secondary"}
                        className={`text-xs ${rule.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {/* Trigger description */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{formatTrigger(rule)}</span>
                      {rule.cooldownHours > 0 && (
                        <span className="text-gray-400">· {rule.cooldownHours}h cooldown</span>
                      )}
                    </div>
                    {/* Message preview */}
                    <p className="text-xs text-gray-600 line-clamp-2">{rule.messageEn}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleMutation.mutate(rule.id)}
                      className="scale-75"
                      disabled={toggleMutation.isPending}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "New Scheduled Message Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <Label htmlFor="sm-name">Rule Name</Label>
              <Input
                id="sm-name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Welcome Message"
                className="mt-1"
              />
            </div>

            {/* Trigger */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trigger Field</Label>
                <Select
                  value={form.triggerField}
                  onValueChange={v => setForm({ ...form, triggerField: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in_date">Check-in Date</SelectItem>
                    <SelectItem value="check_out_date">Check-out Date</SelectItem>
                    <SelectItem value="booking_date">Booking Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sm-offset">Offset (hours)</Label>
                <Input
                  id="sm-offset"
                  type="number"
                  value={form.triggerOffsetHours}
                  onChange={e => setForm({ ...form, triggerOffsetHours: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">Negative = before, 0 = at, positive = after</p>
              </div>
            </div>

            {/* Message EN */}
            <div>
              <Label htmlFor="sm-en">Message (English) *</Label>
              <Textarea
                id="sm-en"
                value={form.messageEn}
                onChange={e => setForm({ ...form, messageEn: e.target.value })}
                rows={3}
                placeholder="English message..."
                className="mt-1 resize-none"
              />
            </div>

            {/* Message MS */}
            <div>
              <Label htmlFor="sm-ms">Message (Malay)</Label>
              <Textarea
                id="sm-ms"
                value={form.messageMs}
                onChange={e => setForm({ ...form, messageMs: e.target.value })}
                rows={3}
                placeholder="Malay message..."
                className="mt-1 resize-none"
              />
            </div>

            {/* Message ZH */}
            <div>
              <Label htmlFor="sm-zh">Message (Chinese)</Label>
              <Textarea
                id="sm-zh"
                value={form.messageZh}
                onChange={e => setForm({ ...form, messageZh: e.target.value })}
                rows={3}
                placeholder="Chinese message..."
                className="mt-1 resize-none"
              />
            </div>

            {/* Cooldown */}
            <div>
              <Label htmlFor="sm-cooldown">Cooldown (hours)</Label>
              <Input
                id="sm-cooldown"
                type="number"
                min={0}
                value={form.cooldownHours}
                onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })}
                className="mt-1 w-32"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum hours before the same rule fires again for the same contact (0 = no cooldown)
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
