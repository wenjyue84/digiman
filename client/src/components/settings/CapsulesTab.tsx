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
import { Building, Plus, Edit, Trash2, Filter } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { type CapsuleProblem, type PaginatedResponse } from "@shared/schema";

// Schema for capsule form validation
const capsuleFormSchema = z.object({
  number: z.string()
    .min(1, "Capsule number is required")
    .regex(/^C\d+$/, "Capsule number must be in format like C1, C2, C24"),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }),
  toRent: z.boolean().default(true),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.string().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
});

type CapsuleFormData = z.infer<typeof capsuleFormSchema>;

export default function CapsulesTab({ capsules, queryClient, toast, labels }: any) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);
  const [problemsByCapsule, setProblemsByCapsule] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [toRentFilter, setToRentFilter] = useState<'all' | 'yes' | 'no'>('all');

  const allItems = Array.isArray(capsules) ? capsules : [];
  
  // Filter items based on toRent status
  const items = allItems.filter(capsule => {
    if (toRentFilter === 'all') return true;
    if (toRentFilter === 'yes') return capsule.toRent !== false; // Default to true if undefined
    if (toRentFilter === 'no') return capsule.toRent === false;
    return true;
  });

  // Fetch problems for capsules
  const { data: problemsResponse } = useQuery<PaginatedResponse<CapsuleProblem>>({
    queryKey: ["/api/problems"],
    enabled: true,
  });

  useEffect(() => {
    if (problemsResponse?.data) {
      const problemsMap: Record<string, any[]> = {};
      problemsResponse.data.forEach(problem => {
        if (!problemsMap[problem.capsuleNumber]) {
          problemsMap[problem.capsuleNumber] = [];
        }
        problemsMap[problem.capsuleNumber].push(problem);
      });
      setProblemsByCapsule(problemsMap);
    }
  }, [problemsResponse]);

  const createCapsuleForm = useForm<CapsuleFormData>({
    resolver: zodResolver(capsuleFormSchema),
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

  const editCapsuleForm = useForm<CapsuleFormData>({
    resolver: zodResolver(capsuleFormSchema),
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

  const createCapsuleMutation = useMutation({
    mutationFn: async (data: CapsuleFormData) => {
      const response = await apiRequest("POST", "/api/capsules", {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setCreateDialogOpen(false);
      createCapsuleForm.reset();
      toast({
        title: "Capsule Added",
        description: "The capsule has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add capsule",
        variant: "destructive",
      });
    },
  });

  const updateCapsuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CapsuleFormData }) => {
      const response = await apiRequest("PATCH", `/api/capsules/${id}`, {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setEditDialogOpen(false);
      setSelectedCapsule(null);
      editCapsuleForm.reset();
      toast({
        title: "Capsule Updated",
        description: "The capsule has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update capsule",
        variant: "destructive",
      });
    },
  });

  const deleteCapsuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/capsules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setDeleteDialogOpen(false);
      setSelectedCapsule(null);
      toast({
        title: "Capsule Deleted",
        description: "The capsule has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete capsule",
        variant: "destructive",
      });
    },
  });

  const handleCreateCapsule = (data: CapsuleFormData) => {
    createCapsuleMutation.mutate(data);
  };

  const handleEditCapsule = (capsule: any) => {
    setSelectedCapsule(capsule);
    editCapsuleForm.reset({
      number: capsule.number,
      section: capsule.section,
      toRent: capsule.toRent !== undefined ? capsule.toRent : true,
      color: capsule.color || "",
      purchaseDate: capsule.purchaseDate ? new Date(capsule.purchaseDate).toISOString().split('T')[0] : "",
      position: capsule.position || "",
      remark: capsule.remark || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCapsule = (data: CapsuleFormData) => {
    if (selectedCapsule) {
      updateCapsuleMutation.mutate({ id: selectedCapsule.id, data });
    }
  };

  const handleDeleteCapsule = (capsule: any) => {
    setSelectedCapsule(capsule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCapsule) {
      deleteCapsuleMutation.mutate(selectedCapsule.id);
    }
  };

  const getProblemsForCapsule = (capsuleNumber: string) => {
    return problemsByCapsule[capsuleNumber] || [];
  };

  const getActiveProblemsCount = (capsuleNumber: string) => {
    const problems = getProblemsForCapsule(capsuleNumber);
    return problems.filter(p => !p.isResolved).length;
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
            <div className="flex items-center gap-3">
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
              <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add {labels.singular}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No {labels.lowerPlural} found. Add your first {labels.lowerSingular} to get started.</p>
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
                            onClick={() => handleEditCapsule(c)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCapsule(c)}
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
                              onClick={() => handleEditCapsule(c)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCapsule(c)}
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
                                onClick={() => handleEditCapsule(c)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteCapsule(c)}
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

      {/* Create Capsule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New {labels.singular}</DialogTitle>
          </DialogHeader>
          <Form {...createCapsuleForm}>
            <form onSubmit={createCapsuleForm.handleSubmit((data: CapsuleFormData) => handleCreateCapsule(data))} className="space-y-4">
              <FormField
                control={createCapsuleForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capsule Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="C1, C2, C24..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createCapsuleForm.control}
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
                control={createCapsuleForm.control}
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
                        Check if this capsule is suitable for rent (uncheck if it has major maintenance issues)
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={createCapsuleForm.control}
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
                control={createCapsuleForm.control}
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
                control={createCapsuleForm.control}
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
                control={createCapsuleForm.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the capsule..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCapsuleMutation.isPending}>
                  {createCapsuleMutation.isPending ? "Adding..." : "Add Capsule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Capsule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {labels.singular}</DialogTitle>
          </DialogHeader>
          <Form {...editCapsuleForm}>
            <form onSubmit={editCapsuleForm.handleSubmit((data: CapsuleFormData) => handleUpdateCapsule(data))} className="space-y-4">
              <FormField
                control={editCapsuleForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capsule Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="C1, C2, C24..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editCapsuleForm.control}
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
                control={editCapsuleForm.control}
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
                        Check if this capsule is suitable for rent (uncheck if it has major maintenance issues)
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={editCapsuleForm.control}
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
                control={editCapsuleForm.control}
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
                control={editCapsuleForm.control}
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
                control={editCapsuleForm.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about the capsule..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCapsuleMutation.isPending}>
                  {updateCapsuleMutation.isPending ? "Updating..." : "Update Capsule"}
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
            <p>Are you sure you want to delete capsule <strong>{selectedCapsule?.number}</strong>?</p>
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
              disabled={deleteCapsuleMutation.isPending}
            >
              {deleteCapsuleMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}