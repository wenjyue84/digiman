import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building, Plus, Edit, Trash2, Filter, Download } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { type Unit, type UnitProblem, type PaginatedResponse } from "@shared/schema";

// Schema for Unit form validation
const UnitFormSchema = z.object({
  number: z.string()
    .min(1, "Unit number is required")
    .regex(/^C\d+$/, "Unit number must be in format like C1, C2, C24"),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }),
  toRent: z.boolean().default(true),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.string().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
});

type UnitFormData = z.infer<typeof UnitFormSchema>;

interface UnitsTabProps {
  units: Unit[];
  queryClient: any;
  toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  labels: {
    singular: string;
    plural: string;
    lowerSingular: string;
    lowerPlural: string;
  };
}

export default function UnitsTab({ units, queryClient, toast, labels }: UnitsTabProps) {
  console.log('UnitsTab rendered with:', { units: units?.length, labels });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [problemsByUnit, setProblemsByUnit] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [toRentFilter, setToRentFilter] = useState<'all' | 'yes' | 'no'>('all');

  const allItems = Array.isArray(units) ? units : [];
  
  // Helper function to extract numeric part from Unit number for natural sorting
  const extractUnitNumber = (unitNumber: string): number => {
    const match = unitNumber.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };
  
  // Filter items based on toRent status and sort by Unit number ascending
  const items = allItems
    .filter(Unit => {
      if (toRentFilter === 'all') return true;
      if (toRentFilter === 'yes') return Unit.toRent !== false; // Default to true if undefined
      if (toRentFilter === 'no') return Unit.toRent === false;
      return true;
    })
    .sort((a, b) => extractUnitNumber(a.number) - extractUnitNumber(b.number));

  // Fetch problems for Units
  const { data: problemsResponse } = useQuery<PaginatedResponse<UnitProblem>>({
    queryKey: ["/api/problems"],
    enabled: true,
  });

  useEffect(() => {
    if (problemsResponse?.data) {
      const problemsMap: Record<string, any[]> = {};
      problemsResponse.data.forEach(problem => {
        if (!problemsMap[problem.unitNumber]) {
          problemsMap[problem.unitNumber] = [];
        }
        problemsMap[problem.unitNumber].push(problem);
      });
      setProblemsByUnit(problemsMap);
    }
  }, [problemsResponse]);

  const createUnitForm = useForm<UnitFormData>({
    resolver: zodResolver(UnitFormSchema),
    defaultValues: {
      number: "",
      section: "middle",
      toRent: true,
      color: "",
      purchaseDate: "",
      position: undefined,
      remark: "",
    },
  });

  const editUnitForm = useForm<UnitFormData>({
    resolver: zodResolver(UnitFormSchema),
    defaultValues: {
      number: "",
      section: "middle",
      toRent: true,
      color: "",
      purchaseDate: "",
      position: undefined,
      remark: "",
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const response = await apiRequest("POST", "/api/units", {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setCreateDialogOpen(false);
      createUnitForm.reset();
      toast({
        title: "Unit Added",
        description: "The Unit has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add Unit",
        variant: "destructive",
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      const response = await apiRequest("PATCH", `/api/units/${id}`, {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setEditDialogOpen(false);
      setSelectedUnit(null);
      editUnitForm.reset();
      toast({
        title: "Unit Updated",
        description: "The Unit has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Unit",
        variant: "destructive",
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setDeleteDialogOpen(false);
      setSelectedUnit(null);
      toast({
        title: "Unit Deleted",
        description: "The Unit has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Unit",
        variant: "destructive",
      });
    },
  });

  const handleCreateUnit = (data: UnitFormData) => {
    createUnitMutation.mutate(data);
  };

  const handleEditUnit = (Unit: any) => {
    setSelectedUnit(Unit);
    editUnitForm.reset({
      number: Unit.number,
      section: Unit.section,
      toRent: Unit.toRent !== undefined ? Unit.toRent : true,
      color: Unit.color || "",
      purchaseDate: Unit.purchaseDate ? new Date(Unit.purchaseDate).toISOString().split('T')[0] : "",
      position: Unit.position || "",
      remark: Unit.remark || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUnit = (data: UnitFormData) => {
    if (selectedUnit) {
      updateUnitMutation.mutate({ id: selectedUnit.id, data });
    }
  };

  const handleDeleteUnit = (Unit: any) => {
    setSelectedUnit(Unit);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUnit) {
      deleteUnitMutation.mutate(selectedUnit.id);
    }
  };

  const getProblemsForUnit = (unitNumber: string) => {
    return problemsByUnit[unitNumber] || [];
  };

  const getActiveProblemsCount = (unitNumber: string) => {
    const problems = getProblemsForUnit(unitNumber);
    return problems.filter(p => !p.isResolved).length;
  };

  const exportUnitsToCSV = () => {
    console.log('Export button clicked, items:', items.length);
    if (items.length === 0) {
      toast({
        title: "No Data",
        description: "There are no Units to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const csvHeaders = [
      "Unit Number",
      "Section", 
      "Position",
      "To Rent",
      "Color",
      "Purchase Date",
      "Remark",
      "Active Problems"
    ];

    const csvData = items.map(Unit => [
      Unit.number,
      Unit.section,
      Unit.position || "",
      Unit.toRent !== false ? "Yes" : "No",
      Unit.color || "",
      Unit.purchaseDate ? new Date(Unit.purchaseDate).toLocaleDateString() : "",
      Unit.remark || "",
      getActiveProblemsCount(Unit.number)
    ]);

    // Combine headers and data
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Units_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${items.length} Units to CSV file.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {labels.plural} ({items.length})
            </CardTitle>
            {/* Debug info */}
            <div className="text-xs text-gray-500">Debug: {items.length} items</div>
            <div className="flex items-center gap-4">
              {/* To Rent Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <Select value={toRentFilter} onValueChange={(value: 'all' | 'yes' | 'no') => setToRentFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">To Rent: Yes</SelectItem>
                    <SelectItem value="no">To Rent: No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  type="button"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  <div className="grid grid-cols-2 gap-1 w-4 h-4">
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3"
                >
                  <div className="flex flex-col gap-1 w-4 h-4">
                    <div className="w-full h-1 bg-current rounded-sm"></div>
                    <div className="w-full h-1 bg-current rounded-sm"></div>
                    <div className="w-full h-1 bg-current rounded-sm"></div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                  </div>
                </Button>
              </div>
              
              {/* Export Button */}
              <Button 
                variant="outline" 
                onClick={exportUnitsToCSV} 
                className="flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 font-bold px-6 py-3 text-lg"
                disabled={items.length === 0}
                style={{ minWidth: '150px', border: '3px solid red' }}
              >
                <Download className="h-6 w-6" />
                EXPORT CSV
              </Button>
              
              <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add {labels.singular}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
              <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {labels.lowerPlural} yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Add your first {labels.lowerSingular} to start managing guests. This takes about 2 minutes.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Your First {labels.singular}
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                💡 Tip: You can edit details like type, price, and capacity anytime.
              </p>
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((c: any) => (
                    <Card key={c.number} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-lg font-semibold">{c.number}</div>
                            <div className="text-sm text-gray-600">Section: {c.section}</div>
                            {c.position && (
                              <div className="text-xs text-gray-500">Position: {c.position}</div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge variant={c.toRent !== false ? "default" : "destructive"}>
                              To Rent: {c.toRent !== false ? "Yes" : "No"}
                            </Badge>
                            {getActiveProblemsCount(c.number) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {getActiveProblemsCount(c.number)} Problem{getActiveProblemsCount(c.number) > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {c.color && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.color }}></div>
                            <span className="text-sm text-gray-600">{c.color}</span>
                          </div>
                        )}
                        
                        {c.purchaseDate && (
                          <div className="text-xs text-gray-500">
                            Purchased: {new Date(c.purchaseDate).toLocaleDateString()}
                          </div>
                        )}
                        
                        {c.remark && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {c.remark}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUnit(c)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUnit(c)}
                            className="flex-1"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {items.map((c: any) => (
                    <Card key={c.number} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600">{c.number}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">{c.number}</span>
                              <Badge variant="outline" className="text-xs">
                                {c.section}
                              </Badge>
                              {c.position && (
                                <Badge variant="outline" className="text-xs">
                                  {c.position}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              {c.color && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.color }}></div>
                                  <span>{c.color}</span>
                                </div>
                              )}
                              {c.purchaseDate && (
                                <span>Purchased: {new Date(c.purchaseDate).toLocaleDateString()}</span>
                              )}
                            </div>
                            {c.remark && (
                              <div className="text-sm text-gray-500 mt-1">{c.remark}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={c.toRent !== false ? "default" : "destructive"}>
                              To Rent: {c.toRent !== false ? "Yes" : "No"}
                            </Badge>
                            {getActiveProblemsCount(c.number) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {getActiveProblemsCount(c.number)} Problem{getActiveProblemsCount(c.number) > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUnit(c)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUnit(c)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Number</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Section</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Position</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">To Rent</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Problems</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Color</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Purchase Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c: any) => (
                        <tr key={c.number} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900">{c.number}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize">
                              {c.section}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {c.position ? (
                              <Badge variant="outline" className="capitalize">
                                {c.position}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${c.toRent !== false ? "text-green-600" : "text-red-600"}`}>
                              {c.toRent !== false ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getActiveProblemsCount(c.number) > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                {getActiveProblemsCount(c.number)} Problem{getActiveProblemsCount(c.number) > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.color ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.color }}></div>
                                <span className="text-sm">{c.color}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.purchaseDate ? (
                              <span className="text-sm text-gray-600">
                                {new Date(c.purchaseDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUnit(c)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUnit(c)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Unit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New {labels.singular}</DialogTitle>
          </DialogHeader>
          <Form {...createUnitForm}>
            <form onSubmit={createUnitForm.handleSubmit((data: UnitFormData) => handleCreateUnit(data))} className="space-y-4">
              <FormField
                control={createUnitForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="C1, C2, C24..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="back">Back</SelectItem>
                        <SelectItem value="middle">Middle</SelectItem>
                        <SelectItem value="front">Front</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="toRent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        To Rent
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Check if this Unit is suitable for rent (uncheck if it has major maintenance issues)
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blue, Red, Green..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the Unit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUnitMutation.isPending}>
                  {createUnitMutation.isPending ? "Adding..." : "Add Unit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {labels.singular}</DialogTitle>
          </DialogHeader>
          <Form {...editUnitForm}>
            <form onSubmit={editUnitForm.handleSubmit((data: UnitFormData) => handleUpdateUnit(data))} className="space-y-4">
              <FormField
                control={editUnitForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="C1, C2, C24..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="back">Back</SelectItem>
                        <SelectItem value="middle">Middle</SelectItem>
                        <SelectItem value="front">Front</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="toRent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        To Rent
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Check if this Unit is suitable for rent (uncheck if it has major maintenance issues)
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blue, Red, Green..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the Unit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUnitMutation.isPending}>
                  {updateUnitMutation.isPending ? "Updating..." : "Update Unit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {labels.singular}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete Unit <strong>{selectedUnit?.number}</strong>?</p>
            <p className="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteUnitMutation.isPending}
            >
              {deleteUnitMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
