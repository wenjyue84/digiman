import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mcpFetch } from "@/lib/mcp-api";

// ─── Types ───────────────────────────────────────────────────────────────

interface MultiLangResponse {
  en: string;
  ms: string;
  zh: string;
}

interface StaticEntry {
  intent: string;
  response: MultiLangResponse;
}

interface KnowledgeData {
  static: StaticEntry[];
  dynamic: Record<string, string>;
}

interface TemplatesData {
  [key: string]: MultiLangResponse;
}

interface RoutingData {
  [intent: string]: { action: string };
}

// ─── Sub-components ──────────────────────────────────────────────────────

function LangPreview({ response }: { response: MultiLangResponse }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div>
        <Badge variant="outline" className="mb-1 text-[10px]">EN</Badge>
        <p className="text-muted-foreground line-clamp-2">{response.en || <span className="italic">empty</span>}</p>
      </div>
      <div>
        <Badge variant="outline" className="mb-1 text-[10px]">MS</Badge>
        <p className="text-muted-foreground line-clamp-2">{response.ms || <span className="italic">empty</span>}</p>
      </div>
      <div>
        <Badge variant="outline" className="mb-1 text-[10px]">ZH</Badge>
        <p className="text-muted-foreground line-clamp-2">{response.zh || <span className="italic">empty</span>}</p>
      </div>
    </div>
  );
}

function LangEditor({
  value,
  onChange,
}: {
  value: MultiLangResponse;
  onChange: (v: MultiLangResponse) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <Label className="text-xs">English</Label>
        <Textarea
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          rows={3}
          className="text-xs mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Malay</Label>
        <Textarea
          value={value.ms}
          onChange={(e) => onChange({ ...value, ms: e.target.value })}
          rows={3}
          className="text-xs mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Chinese</Label>
        <Textarea
          value={value.zh}
          onChange={(e) => onChange({ ...value, zh: e.target.value })}
          rows={3}
          className="text-xs mt-1"
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function StaticRepliesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Editing state
  const [editingIntent, setEditingIntent] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<MultiLangResponse>({ en: "", ms: "", zh: "" });

  // Dialog state
  const [addReplyOpen, setAddReplyOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "reply" | "template"; key: string } | null>(null);

  // Add form state
  const [newReply, setNewReply] = useState({ intent: "", en: "", ms: "", zh: "" });
  const [newTemplate, setNewTemplate] = useState({ key: "", en: "", ms: "", zh: "" });

  // ─── Queries ───────────────────────────────────────────────────────────

  const { data: knowledge, isLoading: knowledgeLoading } = useQuery<KnowledgeData>({
    queryKey: ["mcp", "knowledge"],
    queryFn: () => mcpFetch("/knowledge"),
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<TemplatesData>({
    queryKey: ["mcp", "templates"],
    queryFn: () => mcpFetch("/templates"),
  });

  const { data: routing } = useQuery<RoutingData>({
    queryKey: ["mcp", "routing"],
    queryFn: () => mcpFetch("/routing"),
  });

  // ─── Mutations ─────────────────────────────────────────────────────────

  const saveKnowledgeMut = useMutation({
    mutationFn: ({ intent, response }: { intent: string; response: MultiLangResponse }) =>
      mcpFetch(`/knowledge/${intent}`, { method: "PUT", body: JSON.stringify({ response }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "knowledge"] });
      setEditingIntent(null);
      toast({ title: "Reply saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addKnowledgeMut = useMutation({
    mutationFn: (data: { intent: string; response: MultiLangResponse }) =>
      mcpFetch("/knowledge", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "knowledge"] });
      setAddReplyOpen(false);
      setNewReply({ intent: "", en: "", ms: "", zh: "" });
      toast({ title: "Reply added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteKnowledgeMut = useMutation({
    mutationFn: (intent: string) => mcpFetch(`/knowledge/${intent}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "knowledge"] });
      toast({ title: "Reply deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveTemplateMut = useMutation({
    mutationFn: ({ key, ...body }: { key: string; en: string; ms: string; zh: string }) =>
      mcpFetch(`/templates/${key}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "templates"] });
      setEditingTemplate(null);
      toast({ title: "Template saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTemplateMut = useMutation({
    mutationFn: (data: { key: string; en: string; ms: string; zh: string }) =>
      mcpFetch("/templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "templates"] });
      setAddTemplateOpen(false);
      setNewTemplate({ key: "", en: "", ms: "", zh: "" });
      toast({ title: "Template added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (key: string) => mcpFetch(`/templates/${key}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────

  const getRoutingWarning = (intent: string) => {
    const rule = routing?.[intent];
    if (rule && rule.action !== "static_reply") {
      return `Routed to "${rule.action}" — this static reply won't be used`;
    }
    return null;
  };

  const formatKey = (key: string) =>
    key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // ─── Loading ───────────────────────────────────────────────────────────

  if (knowledgeLoading || templatesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const staticEntries = knowledge?.static || [];
  const templateEntries = templates ? Object.entries(templates) : [];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Intent Replies ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Intent Replies
            </h2>
            <p className="text-sm text-muted-foreground">
              Static responses sent when an intent is matched ({staticEntries.length} entries)
            </p>
          </div>
          <Button size="sm" onClick={() => setAddReplyOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Reply
          </Button>
        </div>

        {staticEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No intent replies configured yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {staticEntries.map((entry) => {
              const isEditing = editingIntent === entry.intent;
              const warning = getRoutingWarning(entry.intent);

              return (
                <Card key={entry.intent}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {entry.intent}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{formatKey(entry.intent)}</span>
                      </div>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                saveKnowledgeMut.mutate({ intent: entry.intent, response: editValue })
                              }
                              disabled={saveKnowledgeMut.isPending}
                            >
                              {saveKnowledgeMut.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingIntent(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingIntent(entry.intent);
                                setEditValue({ ...entry.response });
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ type: "reply", key: entry.intent })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {warning && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {warning}
                      </div>
                    )}

                    {isEditing ? (
                      <LangEditor value={editValue} onChange={setEditValue} />
                    ) : (
                      <LangPreview response={entry.response} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Section 2: System Messages ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Messages
            </h2>
            <p className="text-sm text-muted-foreground">
              Templates for system-generated messages ({templateEntries.length} entries)
            </p>
          </div>
          <Button size="sm" onClick={() => setAddTemplateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Template
          </Button>
        </div>

        {templateEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No system message templates configured yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templateEntries.map(([key, value]) => {
              const isEditing = editingTemplate === key;

              return (
                <Card key={key}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {key}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{formatKey(key)}</span>
                      </div>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                saveTemplateMut.mutate({ key, ...editValue })
                              }
                              disabled={saveTemplateMut.isPending}
                            >
                              {saveTemplateMut.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingTemplate(key);
                                setEditValue({ ...value });
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ type: "template", key })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <LangEditor value={editValue} onChange={setEditValue} />
                    ) : (
                      <LangPreview response={value} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Add Reply Dialog ─────────────────────────────────────────── */}
      <Dialog open={addReplyOpen} onOpenChange={setAddReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Intent Reply</DialogTitle>
            <DialogDescription>Create a new static reply for an intent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Intent Key</Label>
              <Input
                placeholder="e.g., wifi, breakfast_info"
                value={newReply.intent}
                onChange={(e) => setNewReply((p) => ({ ...p, intent: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>English</Label>
              <Textarea
                placeholder="English response..."
                value={newReply.en}
                onChange={(e) => setNewReply((p) => ({ ...p, en: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Malay</Label>
              <Textarea
                placeholder="Respons Bahasa Melayu..."
                value={newReply.ms}
                onChange={(e) => setNewReply((p) => ({ ...p, ms: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Chinese</Label>
              <Textarea
                placeholder="中文回复..."
                value={newReply.zh}
                onChange={(e) => setNewReply((p) => ({ ...p, zh: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddReplyOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  addKnowledgeMut.mutate({
                    intent: newReply.intent,
                    response: { en: newReply.en, ms: newReply.ms, zh: newReply.zh },
                  })
                }
                disabled={addKnowledgeMut.isPending || !newReply.intent.trim()}
              >
                {addKnowledgeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add Template Dialog ──────────────────────────────────────── */}
      <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add System Message</DialogTitle>
            <DialogDescription>Create a new message template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Key</Label>
              <Input
                placeholder="e.g., welcome_message, checkout_reminder"
                value={newTemplate.key}
                onChange={(e) => setNewTemplate((p) => ({ ...p, key: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>English</Label>
              <Textarea
                placeholder="English message..."
                value={newTemplate.en}
                onChange={(e) => setNewTemplate((p) => ({ ...p, en: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Malay</Label>
              <Textarea
                placeholder="Mesej Bahasa Melayu..."
                value={newTemplate.ms}
                onChange={(e) => setNewTemplate((p) => ({ ...p, ms: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Chinese</Label>
              <Textarea
                placeholder="中文消息..."
                value={newTemplate.zh}
                onChange={(e) => setNewTemplate((p) => ({ ...p, zh: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddTemplateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addTemplateMut.mutate(newTemplate)}
                disabled={addTemplateMut.isPending || !newTemplate.key.trim()}
              >
                {addTemplateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type === "reply" ? "Intent Reply" : "Template"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteConfirm?.key}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm?.type === "reply") {
                  deleteKnowledgeMut.mutate(deleteConfirm.key);
                } else if (deleteConfirm?.type === "template") {
                  deleteTemplateMut.mutate(deleteConfirm.key);
                }
                setDeleteConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
