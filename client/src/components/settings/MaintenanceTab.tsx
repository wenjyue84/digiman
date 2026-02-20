import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Edit, Trash2, ArrowUpDown, Share2 } from "lucide-react";
import { type CapsuleProblem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type SortField = "capsule" | "date" | "reportedBy";
type SortDirection = "asc" | "desc";

function extractCapsuleNumber(unitNumber: string): number {
  const match = unitNumber.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function sortProblems(problems: CapsuleProblem[], sortField: SortField, sortDirection: SortDirection): CapsuleProblem[] {
  return [...problems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "capsule":
        comparison = extractCapsuleNumber(a.unitNumber) - extractCapsuleNumber(b.unitNumber);
        break;
      case "date":
        comparison = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
        break;
      case "reportedBy":
        comparison = (a.reportedBy || "").localeCompare(b.reportedBy || "");
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

export default function MaintenanceTab({ problems, capsules, isLoading, queryClient, toast, labels }: any) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<CapsuleProblem | null>(null);
  const [concise, setConcise] = useState(true);
  const [sortField, setSortField] = useState<SortField>("capsule");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const createProblemForm = useForm({
    defaultValues: {
      unitNumber: "",
      description: "",
      reportedBy: "Staff",
    },
  });

  const resolveProblemForm = useForm({
    defaultValues: {
      resolvedBy: "Staff",
      notes: "",
    },
  });

  const editProblemForm = useForm({
    defaultValues: {
      unitNumber: "",
      description: "",
      reportedBy: "",
    },
  });

  const createProblemMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/problems", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setCreateDialogOpen(false);
      createProblemForm.reset();
      toast({
        title: "Problem Reported",
        description: `The ${labels.singular.toLowerCase()} problem has been reported successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report problem",
        variant: "destructive",
      });
    },
  });

  const updateProblemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/problems/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setEditDialogOpen(false);
      setSelectedProblem(null);
      editProblemForm.reset();
      toast({
        title: "Problem Updated",
        description: "The maintenance record has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update problem",
        variant: "destructive",
      });
    },
  });

  const resolveProblemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/problems/${id}/resolve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setResolveDialogOpen(false);
      setSelectedProblem(null);
      resolveProblemForm.reset();
      toast({
        title: "Problem Resolved",
        description: "The problem has been marked as resolved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve problem",
        variant: "destructive",
      });
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/problems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      toast({
        title: "Problem Deleted",
        description: "The problem has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete problem",
        variant: "destructive",
      });
    },
  });

  const handleEditProblem = (problem: CapsuleProblem) => {
    setSelectedProblem(problem);
    // Pre-populate the edit form with current problem data
    editProblemForm.reset({
      unitNumber: problem.unitNumber,
      description: problem.description,
      reportedBy: problem.reportedBy || "Staff",
    });
    setEditDialogOpen(true);
  };

  const handleResolveProblem = (problem: CapsuleProblem) => {
    setSelectedProblem(problem);
    setResolveDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const exportToWhatsApp = () => {
    const activeProblemsForExport = sortProblems(
      Array.isArray(problems) ? problems.filter((p: CapsuleProblem) => !p.isResolved) : [],
      "capsule",
      "asc"
    );
    
    if (activeProblemsForExport.length === 0) {
      toast({
        title: "No Issues to Export",
        description: "There are no active maintenance issues to export.",
      });
      return;
    }
    
    const today = new Date().toLocaleDateString("en-GB", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
    
    let message = `🔧 *${labels.singular} Maintenance Issues*\n`;
    message += `📅 ${today}\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    activeProblemsForExport.forEach((problem: CapsuleProblem, index: number) => {
      const reportedDate = new Date(problem.reportedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short"
      });
      
      message += `${index + 1}. *${problem.unitNumber}*\n`;
      message += `   📝 ${problem.description}\n`;
      message += `   👤 ${problem.reportedBy} | 📅 ${reportedDate}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `Total: ${activeProblemsForExport.length} active issue${activeProblemsForExport.length > 1 ? 's' : ''}`;
    
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Maintenance issues copied. You can now paste in WhatsApp.",
      });
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast({
        title: "Copied to Clipboard",
        description: "Maintenance issues copied. You can now paste in WhatsApp.",
      });
    });
  };

  const activeProblemsRaw = Array.isArray(problems) ? problems.filter((p: CapsuleProblem) => !p.isResolved) : [];
  const resolvedProblemsRaw = Array.isArray(problems) ? problems.filter((p: CapsuleProblem) => p.isResolved) : [];
  
  const activeProblem = useMemo(() => sortProblems(activeProblemsRaw, sortField, sortDirection), [activeProblemsRaw, sortField, sortDirection]);
  const resolvedProblems = useMemo(() => sortProblems(resolvedProblemsRaw, sortField, sortDirection), [resolvedProblemsRaw, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                {labels.singular} Maintenance
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Report Problem
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report {labels.singular} Problem</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createProblemForm.handleSubmit((data) => createProblemMutation.mutate(data))} className="space-y-4">
                      <div>
                        <Label htmlFor="unitNumber">{labels.singular} Number</Label>
                        <Select value={createProblemForm.watch("unitNumber")} onValueChange={(value) => createProblemForm.setValue("unitNumber", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${labels.singular.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(capsules) && capsules.map((capsule) => (
                              <SelectItem key={capsule.number} value={capsule.number}>
                                {capsule.number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="description">Problem Description</Label>
                        <Textarea {...createProblemForm.register("description", { required: true })} placeholder="Describe the problem (e.g., no light, keycard not working, door cannot open...)" className="min-h-20" />
                      </div>
                      <div>
                        <Label htmlFor="reportedBy">Reported By</Label>
                        <Input {...createProblemForm.register("reportedBy", { required: true })} />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createProblemMutation.isPending}>
                          {createProblemMutation.isPending ? "Reporting..." : "Report Problem"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant={concise ? "default" : "outline"} size="sm" onClick={() => setConcise(!concise)}>
                  {concise ? "Details View" : "Concise View"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToWhatsApp}
                  data-testid="export-whatsapp"
                  className="flex items-center gap-1"
                >
                  <Share2 className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                Sort by:
              </span>
              <Button
                variant={sortField === "capsule" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("capsule")}
                data-testid="sort-capsule"
              >
                Capsule{getSortIndicator("capsule")}
              </Button>
              <Button
                variant={sortField === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("date")}
                data-testid="sort-date"
              >
                Date{getSortIndicator("date")}
              </Button>
              <Button
                variant={sortField === "reportedBy" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort("reportedBy")}
                data-testid="sort-reported-by"
              >
                Reported By{getSortIndicator("reportedBy")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-4">Active Problems ({activeProblem.length})</h3>
              {activeProblem.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No active problems reported. All {labels.plural} are in good condition!</p>
                </div>
              ) : (
                concise ? (
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-2 text-left">{labels.singular}</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-left">Reported By</th>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProblem.map((problem: CapsuleProblem) => (
                          <tr key={problem.id} className="border-t">
                            <td className="px-4 py-2 font-medium">{problem.unitNumber}</td>
                            <td className="px-4 py-2">{problem.description}</td>
                            <td className="px-4 py-2">{problem.reportedBy}</td>
                            <td className="px-4 py-2">{new Date(problem.reportedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleEditProblem(problem)} title="Edit Details">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="default" onClick={() => handleResolveProblem(problem)} title="Mark Resolved" className="bg-green-600 hover:bg-green-700 text-white">
                                  ✓
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteProblemMutation.mutate(problem.id)} title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeProblem.map((problem: CapsuleProblem) => (
                      <Card key={problem.id} className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">{problem.unitNumber}</h4>
                              <Badge variant="destructive">Active Problem</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditProblem(problem)} title="Edit Details">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="default" onClick={() => handleResolveProblem(problem)} title="Mark Resolved" className="bg-green-600 hover:bg-green-700 text-white">
                                ✓
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteProblemMutation.mutate(problem.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{problem.description}</p>
                          <div className="text-xs text-gray-500">
                            <p>Reported by: {problem.reportedBy}</p>
                            <p>Date: {new Date(problem.reportedAt).toLocaleDateString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              )}
            </div>

            {resolvedProblems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-4">Recently Resolved ({resolvedProblems.length})</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {resolvedProblems.slice(0, 4).map((problem: CapsuleProblem) => (
                    <Card key={problem.id} className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{problem.unitNumber}</h4>
                            <Badge variant="default" className="bg-green-600">Resolved</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{problem.description}</p>
                        <div className="text-xs text-gray-500">
                          <p>Resolved by: {problem.resolvedBy}</p>
                          <p>Date: {problem.resolvedAt ? new Date(problem.resolvedAt).toLocaleDateString() : "N/A"}</p>
                          {problem.notes && <p>Notes: {problem.notes}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Problem Details Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record - {selectedProblem?.unitNumber}</DialogTitle>
          </DialogHeader>
          {selectedProblem && (
            <form onSubmit={editProblemForm.handleSubmit((data) => updateProblemMutation.mutate({ id: selectedProblem.id, data }))} className="space-y-4">
              <div>
                <Label htmlFor="unitNumber">{labels.singular} Number</Label>
                <Select value={editProblemForm.watch("unitNumber")} onValueChange={(value) => editProblemForm.setValue("unitNumber", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${labels.singular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(capsules) && capsules.map((capsule) => (
                      <SelectItem key={capsule.number} value={capsule.number}>
                        {capsule.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Problem Description</Label>
                <Textarea {...editProblemForm.register("description", { required: true })} placeholder="Describe the problem..." className="min-h-20" />
              </div>
              <div>
                <Label htmlFor="reportedBy">Reported By</Label>
                <Input {...editProblemForm.register("reportedBy", { required: true })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedProblem(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProblemMutation.isPending}>
                  {updateProblemMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Problem Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Problem - {selectedProblem?.unitNumber}</DialogTitle>
          </DialogHeader>
          {selectedProblem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">Problem:</p>
                <p className="text-sm text-gray-700">{selectedProblem.description}</p>
              </div>
              <form onSubmit={resolveProblemForm.handleSubmit((data) => resolveProblemMutation.mutate({ id: selectedProblem.id, data }))} className="space-y-4">
                <div>
                  <Label htmlFor="resolvedBy">Resolved By</Label>
                  <Input {...resolveProblemForm.register("resolvedBy", { required: true })} />
                </div>
                <div>
                  <Label htmlFor="notes">Resolution Notes (Optional)</Label>
                  <Textarea {...resolveProblemForm.register("notes")} placeholder="Describe what was done to fix the problem..." className="min-h-20" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setResolveDialogOpen(false); setSelectedProblem(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={resolveProblemMutation.isPending}>
                    {resolveProblemMutation.isPending ? "Resolving..." : "Mark as Resolved"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



