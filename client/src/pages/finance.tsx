import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Trash2, Edit, TrendingUp, TrendingDown, Calendar, FileText, Tag, Tags, MessageSquare, Camera, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

// Expense schema
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.enum(["salary", "utilities", "consumables", "maintenance", "equipment", "marketing", "operations", "other"]),
  subcategory: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  receiptPhotoUrl: z.string().optional(),
  itemPhotoUrl: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  notes?: string;
  receiptPhotoUrl?: string;
  itemPhotoUrl?: string;
  createdAt: string;
}

const expenseCategories = {
  salary: {
    label: "Salary & Wages",
    color: "bg-indigo-100 text-indigo-800",
    subcategories: ["Staff Salary", "Part-time Staff", "Overtime Pay", "EPF Contribution", "SOCSO", "Bonuses"]
  },
  utilities: {
    label: "Utilities",
    color: "bg-green-100 text-green-800",
    subcategories: ["SAJ (Water Bill)", "TNB (Electricity)", "Internet/WiFi", "Gas", "Waste Management", "Sewerage"]
  },
  consumables: {
    label: "Consumables",
    color: "bg-blue-100 text-blue-800",
    subcategories: ["Toilet Paper", "Shower Gel", "Shampoo", "Towels", "Bed Sheets", "Pillowcases", "Cleaning Supplies", "Detergent", "Disinfectant", "Air Freshener"]
  },
  maintenance: {
    label: "Maintenance & Repairs",
    color: "bg-red-100 text-red-800",
    subcategories: ["Plumbing Repair", "Electrical Repair", "AC Servicing", "Painting", "Pest Control", "Lock & Key Repair", "Furniture Repair", "Appliance Repair"]
  },
  equipment: {
    label: "Equipment & Furniture",
    color: "bg-purple-100 text-purple-800",
    subcategories: ["Capsule Beds", "Mattresses", "Lockers", "Curtains", "Lighting", "Fans", "Security Cameras", "WiFi Equipment"]
  },
  marketing: {
    label: "Marketing & Promotion",
    color: "bg-pink-100 text-pink-800",
    subcategories: ["Online Advertising", "Photography", "Website Maintenance", "Social Media Ads", "Booking Platform Commission", "Print Materials"]
  },
  operations: {
    label: "Daily Operations",
    color: "bg-yellow-100 text-yellow-800",
    subcategories: ["Laundry Service", "Reception Supplies", "Key Cards", "Stationery", "Printer Ink", "Cash Float", "Petty Cash"]
  },
  other: {
    label: "Other Expenses",
    color: "bg-gray-100 text-gray-800",
    subcategories: ["Insurance", "Legal Fees", "Accounting", "Banking Charges", "License Renewal", "Government Fees", "Miscellaneous"]
  }
};

export default function Finance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string>("");
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string>("");
  const [selectedFormCategory, setSelectedFormCategory] = useState<string>("");

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "other",
      subcategory: "",
      date: new Date().toISOString().split('T')[0],
      notes: "",
      receiptPhotoUrl: "",
      itemPhotoUrl: "",
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const response = await apiRequest("POST", "/api/expenses", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setShowAddExpense(false);
      resetForm();
      toast({
        title: "Expense Added",
        description: "Expense has been recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/expenses/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Expense Deleted",
        description: "Expense has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Photo upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to get upload parameters");
      }
      const params = await response.json();
      return {
        method: "PUT" as const,
        url: params.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      throw error;
    }
  };

  const handleReceiptPhotoUpload = (result: UploadResult) => {
    const fileData = result.successful[0];
    if (fileData && fileData.uploadURL) {
      const url = fileData.uploadURL;
      setReceiptPhotoUrl(url);
      form.setValue("receiptPhotoUrl", url);
      toast({
        title: "Receipt Photo Uploaded",
        description: "Receipt photo has been uploaded successfully",
      });
    }
  };

  const handleItemPhotoUpload = (result: UploadResult) => {
    const fileData = result.successful[0];
    if (fileData && fileData.uploadURL) {
      const url = fileData.uploadURL;
      setItemPhotoUrl(url);
      form.setValue("itemPhotoUrl", url);
      toast({
        title: "Item Photo Uploaded",
        description: "Item photo has been uploaded successfully",
      });
    }
  };

  const onSubmit = (data: ExpenseFormData) => {
    const payload = {
      ...data,
      receiptPhotoUrl: receiptPhotoUrl || data.receiptPhotoUrl || undefined,
      itemPhotoUrl: itemPhotoUrl || data.itemPhotoUrl || undefined,
    };
    addExpenseMutation.mutate(payload);
  };

  const resetForm = () => {
    form.reset();
    setReceiptPhotoUrl("");
    setItemPhotoUrl("");
    setSelectedFormCategory("");
  };

  // Calculate totals and analytics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyExpenses = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate monthly breakdowns for the last 6 months
  const monthlyBreakdowns = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === month && expDate.getFullYear() === year;
    });
    
    const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryTotals = monthExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    monthlyBreakdowns.push({
      month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
      total,
      categoryTotals,
      expenseCount: monthExpenses.length
    });
  }

  // Calculate category totals for current month
  const currentMonthCategories = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    })
    .reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    if (selectedCategory && selectedCategory !== "all" && expense.category !== selectedCategory) return false;
    
    if (dateFilter === "month") {
      const expDate = new Date(expense.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM {totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM {monthlyExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(expenseCategories).length}</div>
            <p className="text-xs text-muted-foreground">Expense types tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expense Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Expense Management</CardTitle>
                  <p className="text-sm text-gray-600">Track repair costs, consumables, utilities, and other business expenses</p>
                </div>
                <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="description" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Description *
                        </Label>
                        <Input
                          id="description"
                          placeholder="e.g., Plumber repair for C05"
                          {...form.register("description")}
                        />
                        {form.formState.errors.description && (
                          <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="amount" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Amount (RM) *
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...form.register("amount")}
                        />
                        {form.formState.errors.amount && (
                          <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="category" className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Category *
                        </Label>
                        <Select onValueChange={(value) => {
                          form.setValue("category", value as any);
                          setSelectedFormCategory(value);
                          form.setValue("subcategory", ""); // Reset subcategory when category changes
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(expenseCategories).map(([key, cat]) => (
                              <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="subcategory" className="flex items-center gap-2">
                          <Tags className="h-4 w-4" />
                          Subcategory
                        </Label>
                        {selectedFormCategory && expenseCategories[selectedFormCategory as keyof typeof expenseCategories] ? (
                          <Select onValueChange={(value) => form.setValue("subcategory", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcategory (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No subcategory</SelectItem>
                              {expenseCategories[selectedFormCategory as keyof typeof expenseCategories].subcategories.map((subcat) => (
                                <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="subcategory"
                            placeholder="Select a category first"
                            disabled
                            value=""
                          />
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="date" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          {...form.register("date")}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="notes" className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Notes
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Additional details..."
                          {...form.register("notes")}
                        />
                      </div>

                      {/* Receipt Photo Upload (Optional) */}
                      <div>
                        <Label className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Receipt Photo (Optional)
                        </Label>
                        {receiptPhotoUrl ? (
                          <div className="mt-2 space-y-2">
                            <div className="relative border-2 border-green-300 rounded-lg p-2 bg-green-50">
                              <img 
                                src={receiptPhotoUrl} 
                                alt="Receipt" 
                                className="w-full h-32 object-cover rounded"
                              />
                              <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded-full">
                                ✓
                              </div>
                            </div>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760} // 10MB
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleReceiptPhotoUpload}
                              buttonClassName="w-full h-8 text-xs"
                              directFileUpload={true}
                              showCameraOption={true}
                            >
                              <Camera className="mr-2 h-3 w-3" />
                              Change Receipt Photo
                            </ObjectUploader>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760} // 10MB
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleReceiptPhotoUpload}
                              buttonClassName="w-full h-12 border-2 border-dashed border-gray-300 hover:border-gray-400"
                              directFileUpload={true}
                              showCameraOption={true}
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Upload Receipt Photo (Optional)
                            </ObjectUploader>
                          </div>
                        )}
                        {form.formState.errors.receiptPhotoUrl && (
                          <p className="text-sm text-red-600 mt-1">{form.formState.errors.receiptPhotoUrl.message}</p>
                        )}
                      </div>

                      {/* Item Photo Upload (Optional) */}
                      <div>
                        <Label className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Item Photo (Optional)
                        </Label>
                        {itemPhotoUrl ? (
                          <div className="mt-2 space-y-2">
                            <div className="relative border-2 border-blue-300 rounded-lg p-2 bg-blue-50">
                              <img 
                                src={itemPhotoUrl} 
                                alt="Item" 
                                className="w-full h-32 object-cover rounded"
                              />
                              <div className="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-full">
                                ✓
                              </div>
                            </div>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760} // 10MB
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleItemPhotoUpload}
                              buttonClassName="w-full h-8 text-xs"
                              directFileUpload={true}
                              showCameraOption={true}
                            >
                              <Image className="mr-2 h-3 w-3" />
                              Change Item Photo
                            </ObjectUploader>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760} // 10MB
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleItemPhotoUpload}
                              buttonClassName="w-full h-12 border-2 border-dashed border-gray-300 hover:border-gray-400"
                              directFileUpload={true}
                              showCameraOption={true}
                            >
                              <Image className="mr-2 h-4 w-4" />
                              Upload Item Photo (Optional)
                            </ObjectUploader>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addExpenseMutation.isPending}>
                          {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(expenseCategories).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expenses Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {isLoading ? "Loading expenses..." : "No expenses recorded yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {new Date(expense.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.description}
                            {expense.notes && (
                              <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={expenseCategories[expense.category as keyof typeof expenseCategories]?.color}>
                              {expenseCategories[expense.category as keyof typeof expenseCategories]?.label}
                            </Badge>
                            {expense.subcategory && (
                              <div className="text-xs text-gray-500 mt-1">{expense.subcategory}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {expense.receiptPhotoUrl && (
                                <div className="group relative">
                                  <img 
                                    src={expense.receiptPhotoUrl} 
                                    alt="Receipt" 
                                    className="w-8 h-8 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                                    onClick={() => window.open(expense.receiptPhotoUrl!, '_blank')}
                                    title="Click to view full receipt"
                                  />
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    Receipt
                                  </div>
                                </div>
                              )}
                              {expense.itemPhotoUrl && (
                                <div className="group relative">
                                  <img 
                                    src={expense.itemPhotoUrl} 
                                    alt="Item" 
                                    className="w-8 h-8 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                                    onClick={() => window.open(expense.itemPhotoUrl!, '_blank')}
                                    title="Click to view full item photo"
                                  />
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    Item
                                  </div>
                                </div>
                              )}
                              {!expense.receiptPhotoUrl && !expense.itemPhotoUrl && (
                                <span className="text-gray-400 text-xs">No photos</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            RM {expense.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteExpenseMutation.mutate(expense.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expense Trends</CardTitle>
              <p className="text-sm text-gray-600">Track your expenses over the last 6 months</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {monthlyBreakdowns.map((month, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-gray-600">{month.monthShort}</div>
                      <div className="text-xl font-bold text-gray-900">RM {month.total.toFixed(0)}</div>
                      <div className="text-xs text-gray-500">{month.expenseCount} items</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Month Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Current Month Category Breakdown</CardTitle>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} spending by category
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(currentMonthCategories).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No expenses recorded for this month yet
                  </div>
                ) : (
                  Object.entries(currentMonthCategories)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => {
                      const categoryInfo = expenseCategories[category as keyof typeof expenseCategories];
                      const percentage = monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0;
                      return (
                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge className={categoryInfo?.color}>
                              {categoryInfo?.label || category}
                            </Badge>
                            <div className="text-sm text-gray-600">
                              {percentage.toFixed(1)}% of monthly total
                            </div>
                          </div>
                          <div className="font-semibold">RM {amount.toFixed(2)}</div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Monthly History */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly History Details</CardTitle>
              <p className="text-sm text-gray-600">Detailed breakdown for each month</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {monthlyBreakdowns.slice().reverse().map((month, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{month.month}</h3>
                      <div className="text-right">
                        <div className="font-bold text-lg">RM {month.total.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{month.expenseCount} expenses</div>
                      </div>
                    </div>
                    {Object.keys(month.categoryTotals).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(month.categoryTotals).map(([category, amount]) => {
                          const categoryInfo = expenseCategories[category as keyof typeof expenseCategories];
                          return (
                            <div key={category} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                              <span className="text-gray-600">{categoryInfo?.label || category}</span>
                              <span className="font-medium">RM {amount.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No expenses recorded</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}