import { useState, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock, User, Calendar, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Plus, Wrench } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/lib/auth";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ViewToggle } from "@/components/ui/view-toggle";
import { MaintenanceFilters, type MaintenanceFilters as MaintenanceFiltersType } from "@/components/ui/maintenance-filters";
import { MaintenanceProblemCard } from "@/components/ui/maintenance-problem-card";
import type { Unit, UnitProblem, PaginatedResponse } from "@shared/schema";

export default function MaintenanceManage() {
  const [selectedUnit, setselectedUnit] = useState<string>("");
  const [problemDescription, setProblemDescription] = useState("");
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [problemToResolve, setProblemToResolve] = useState<UnitProblem | null>(null);
  const [showResolveConfirmation, setShowResolveConfirmation] = useState(false);
  const [isCondensedView, setIsCondensedView] = useState(false);
  const [filters, setFilters] = useState<MaintenanceFiltersType>({
    dateFrom: '',
    dateTo: '',
    unitNumber: '',
    reportedBy: '',
    showResolved: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: allProblemsResponse, isLoading: isLoadingProblems } = useQuery<PaginatedResponse<UnitProblem>>({
    queryKey: ["/api/problems"],
  });
  
  const allProblems = allProblemsResponse?.data || [];

  const { data: activeProblemsResponse } = useQuery<PaginatedResponse<UnitProblem>>({
    queryKey: ["/api/problems/active"],
  });
  
  const activeProblems = activeProblemsResponse?.data || [];

  // Filter problems based on current filters
  const filteredProblems = useMemo(() => {
    let problems = filters.showResolved ? allProblems : activeProblems;
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      problems = problems.filter(p => new Date(p.reportedAt) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      problems = problems.filter(p => new Date(p.reportedAt) <= toDate);
    }
    
    if (filters.unitNumber) {
      problems = problems.filter(p => p.unitNumber === filters.unitNumber);
    }
    
    if (filters.reportedBy) {
      problems = problems.filter(p => p.reportedBy === filters.reportedBy);
    }
    
    return problems;
  }, [allProblems, activeProblems, filters]);

  // Get unique reporters for filter dropdown
  const uniqueReporters = useMemo(() => {
    const reporters = new Set<string>();
    allProblems.forEach(p => reporters.add(p.reportedBy));
    return Array.from(reporters).sort();
  }, [allProblems]);

  const reportProblemMutation = useMutation({
    mutationFn: async ({ unitNumber, description }: { unitNumber: string; description: string }) => {
      const response = await apiRequest("POST", "/api/problems", {
        unitNumber,
        description,
        reportedBy: currentUser?.email || "Unknown",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/problems/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setselectedUnit("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
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
        notes: "", // Will be handled by the card component
      });
    }
  };

  const handleReportProblem = () => {
    if (!selectedUnit) {
      toast({
        title: "Error",
        description: "Please select a unit",
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
      unitNumber: selectedUnit,
      description: problemDescription,
    });
  };

  const handleResolveProblem = (problemId: string, notes?: string) => {
    resolveProblemMutation.mutate({
      problemId,
      notes,
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

  const availableUnits = units.filter(c => {
    const hasActiveProblem = activeProblems.some(p => p.unitNumber === c.number);
    return !hasActiveProblem;
  });

  const resolvedProblems = allProblems.filter(p => p.isResolved);
  const activeProblemsCount = activeProblems.length;
  const resolvedProblemsCount = resolvedProblems.length;

  // Render problems based on view mode
  const renderProblems = (problems: UnitProblem[]) => {
    if (isCondensedView) {
      return (
        <div className="space-y-3">
          {problems.map((problem) => (
            <div key={problem.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={problem.isResolved ? "outline" : "destructive"}>
                      {problem.unitNumber}
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
                  
                  {expandedProblems.has(problem.id) && !problem.isResolved && (
                    <div className="mt-3 pt-3 border-t">
                      <Label htmlFor={`notes-${problem.id}`} className="text-xs">Resolution Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${problem.id}`}
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
                {!problem.isResolved && (
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
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Detailed card view
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {problems.map((problem) => (
          <MaintenanceProblemCard
            key={problem.id}
            problem={problem}
            onResolve={handleResolveProblem}
            isResolving={resolveProblemMutation.isPending && resolveProblemMutation.variables?.problemId === problem.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
        <p className="text-gray-600 mt-1">Report and track unit maintenance issues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Report New Problem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Report New Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            <div>
              <Label htmlFor="unit">Select Unit</Label>
              <Select value={selectedUnit} onValueChange={setselectedUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a unit" />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.number}>
                      {unit.number} - {unit.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUnits.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">All units have active problems</p>
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
              disabled={reportProblemMutation.isPending || !selectedUnit || !problemDescription.trim()}
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Issues
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <ViewToggle
                    isCondensedView={isCondensedView}
                    onToggle={setIsCondensedView}
                  />
                  
                  <MaintenanceFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    units={units.map(c => ({ number: c.number, section: c.section }))}
                    reporters={uniqueReporters}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/problems/active"] });
                    }}
                    className="h-8 px-3"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active Problems ({activeProblemsCount})
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    Resolved ({resolvedProblemsCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  {filteredProblems.filter(p => !p.isResolved).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p>No active maintenance issues found</p>
                      {filters.dateFrom || filters.dateTo || filters.unitNumber || filters.reportedBy ? (
                        <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                      ) : null}
                    </div>
                  ) : (
                    renderProblems(filteredProblems.filter(p => !p.isResolved))
                  )}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4">
                  {filteredProblems.filter(p => p.isResolved).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No resolved issues found</p>
                      {filters.dateFrom || filters.dateTo || filters.unitNumber || filters.reportedBy ? (
                        <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                      ) : null}
                    </div>
                  ) : (
                    renderProblems(filteredProblems.filter(p => p.isResolved))
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
                <p className="text-2xl font-bold text-orange-600">{activeProblemsCount}</p>
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
                <p className="text-2xl font-bold text-blue-600">{resolvedProblemsCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affected Units</p>
                <p className="text-2xl font-bold text-gray-700">
                  {new Set(activeProblems.map(p => p.unitNumber)).size}
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
          description={`Are you sure you want to mark the maintenance issue for unit ${problemToResolve.unitNumber} as resolved?`}
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
