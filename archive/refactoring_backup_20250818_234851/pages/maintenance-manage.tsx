import { useState, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock, User, Calendar, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/lib/auth";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { Capsule, CapsuleProblem, PaginatedResponse } from "@shared/schema";

export default function MaintenanceManage() {
  const [selectedCapsule, setSelectedCapsule] = useState<string>("");
  const [problemDescription, setProblemDescription] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [problemToResolve, setProblemToResolve] = useState<CapsuleProblem | null>(null);
  const [showResolveConfirmation, setShowResolveConfirmation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules"],
  });

  const { data: allProblemsResponse, isLoading: isLoadingProblems } = useQuery<PaginatedResponse<CapsuleProblem>>({
    queryKey: ["/api/problems"],
  });
  
  const allProblems = allProblemsResponse?.data || [];

  const { data: activeProblemsResponse } = useQuery<PaginatedResponse<CapsuleProblem>>({
    queryKey: ["/api/problems/active"],
  });
  
  const activeProblems = activeProblemsResponse?.data || [];

  const reportProblemMutation = useMutation({
    mutationFn: async ({ capsuleNumber, description }: { capsuleNumber: string; description: string }) => {
      const response = await apiRequest("POST", "/api/problems", {
        capsuleNumber,
        description,
        reportedBy: currentUser?.username || currentUser?.email || "Unknown",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/problems/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setSelectedCapsule("");
      setProblemDescription("");
      toast({
        title: "Problem Reported",
        description: "The maintenance issue has been recorded successfully.",
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

  const resolveProblemMutation = useMutation({
    mutationFn: async ({ problemId, notes }: { problemId: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/problems/${problemId}/resolve`, {
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/problems/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setResolutionNotes("");
      setProblemToResolve(null);
      setShowResolveConfirmation(false);
      toast({
        title: "Problem Resolved",
        description: "The maintenance issue has been marked as resolved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve problem",
        variant: "destructive",
      });
    },
  });

  const confirmResolveProblem = () => {
    if (problemToResolve) {
      resolveProblemMutation.mutate({
        problemId: problemToResolve.id,
        notes: resolutionNotes,
      });
    }
  };

  const handleReportProblem = () => {
    if (!selectedCapsule) {
      toast({
        title: "Error",
        description: "Please select a capsule",
        variant: "destructive",
      });
      return;
    }
    if (!problemDescription.trim()) {
      toast({
        title: "Error",
        description: "Please describe the problem",
        variant: "destructive",
      });
      return;
    }
    reportProblemMutation.mutate({
      capsuleNumber: selectedCapsule,
      description: problemDescription,
    });
  };

  const toggleProblemExpansion = (problemId: string) => {
    const newExpanded = new Set(expandedProblems);
    if (newExpanded.has(problemId)) {
      newExpanded.delete(problemId);
    } else {
      newExpanded.add(problemId);
    }
    setExpandedProblems(newExpanded);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableCapsules = capsules.filter(c => {
    const hasActiveProblem = activeProblems.some(p => p.capsuleNumber === c.number);
    return !hasActiveProblem;
  });

  const resolvedProblems = allProblems.filter(p => p.isResolved);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
        <p className="text-gray-600 mt-1">Report and track capsule maintenance issues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Report New Problem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Report New Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            <div>
              <Label htmlFor="capsule">Select Capsule</Label>
              <Select value={selectedCapsule} onValueChange={setSelectedCapsule}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a capsule" />
                </SelectTrigger>
                <SelectContent>
                  {availableCapsules.map((capsule) => (
                    <SelectItem key={capsule.id} value={capsule.number}>
                      {capsule.number} - {capsule.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableCapsules.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">All capsules have active problems</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Problem Description</Label>
              <Textarea
                id="description"
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the maintenance issue..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <Button 
              onClick={handleReportProblem}
              disabled={reportProblemMutation.isPending || !selectedCapsule || !problemDescription.trim()}
              className="w-full h-12 sm:h-10 text-sm sm:text-base"
            >
              {reportProblemMutation.isPending ? "Reporting..." : "Report Problem"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Problems & History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active Problems ({activeProblems.length})
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    Resolved ({resolvedProblems.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  {activeProblems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p>No active maintenance issues</p>
                    </div>
                  ) : (
                    activeProblems.map((problem) => (
                      <div key={problem.id} className="border rounded-lg">
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">
                                  {problem.capsuleNumber}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {problem.reportedBy}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(problem.reportedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{problem.description}</p>
                              
                              {expandedProblems.has(problem.id) && (
                                <div className="mt-3 pt-3 border-t">
                                  <Label htmlFor={`notes-${problem.id}`} className="text-xs">Resolution Notes (Optional)</Label>
                                  <Textarea
                                    id={`notes-${problem.id}`}
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Add any notes about the resolution..."
                                    className="mt-1 min-h-[60px] text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setProblemToResolve(problem);
                                      setShowResolveConfirmation(true);
                                    }}
                                    disabled={resolveProblemMutation.isPending}
                                    className="mt-2"
                                  >
                                    {resolveProblemMutation.isPending ? "Resolving..." : "Mark as Resolved"}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleProblemExpansion(problem.id)}
                            >
                              {expandedProblems.has(problem.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4">
                  {resolvedProblems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No resolved issues in history</p>
                    </div>
                  ) : (
                    resolvedProblems.map((problem) => (
                      <div key={problem.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {problem.capsuleNumber}
                              </Badge>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-2">{problem.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                              <div>
                                <span className="font-medium">Reported:</span>
                                <div className="flex items-center gap-1 mt-1">
                                  <User className="h-3 w-3" />
                                  {problem.reportedBy}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(problem.reportedAt)}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Resolved:</span>
                                <div className="flex items-center gap-1 mt-1">
                                  <User className="h-3 w-3" />
                                  {problem.resolvedBy || "Unknown"}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {problem.resolvedAt ? formatDate(problem.resolvedAt) : "N/A"}
                                </div>
                              </div>
                            </div>
                            
                            {problem.notes && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium text-gray-600">Resolution Notes:</p>
                                <p className="text-xs text-gray-500 mt-1">{problem.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Issues</p>
                <p className="text-2xl font-bold text-orange-600">{activeProblems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {resolvedProblems.filter(p => {
                    if (!p.resolvedAt) return false;
                    const today = new Date();
                    const resolvedDate = new Date(p.resolvedAt);
                    return resolvedDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Resolved</p>
                <p className="text-2xl font-bold text-blue-600">{resolvedProblems.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affected Capsules</p>
                <p className="text-2xl font-bold text-gray-700">
                  {new Set(activeProblems.map(p => p.capsuleNumber)).size}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolve Problem Confirmation Dialog */}
      {problemToResolve && (
        <ConfirmationDialog
          open={showResolveConfirmation}
          onOpenChange={setShowResolveConfirmation}
          title="Resolve Maintenance Issue"
          description={`Are you sure you want to mark the maintenance issue for capsule ${problemToResolve.capsuleNumber} as resolved? ${resolutionNotes ? 'Your resolution notes will be saved.' : ''}`}
          confirmText="Resolve Issue"
          cancelText="Cancel"
          onConfirm={confirmResolveProblem}
          variant="success"
          icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
          isLoading={resolveProblemMutation.isPending}
        />
      )}
    </div>
  );
}