import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Expense as ExpenseType, PaginatedResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import { OutstandingBalances } from "@/components/outstanding-balances";
import {
  ExpenseForm,
  ExpenseTable,
  ExpenseDateFilter,
  ExpenseAnalytics,
  useExpenseFilters,
  useExpenseMutations,
  expenseCategories,
  type ExpenseFormData,
} from "@/components/finance";

export default function Finance() {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);

  // Fetch expenses
  const { data: expenseResponse, isLoading } = useQuery<PaginatedResponse<ExpenseType>>({
    queryKey: ["/api/expenses"],
  });

  const expenses = Array.isArray(expenseResponse?.data) ? expenseResponse.data : [];

  // Filters & analytics
  const filters = useExpenseFilters(expenses);

  // CRUD mutations
  const { addExpenseMutation, editExpenseMutation, deleteExpenseMutation } = useExpenseMutations({
    onAddSuccess: () => {
      setShowAddExpense(false);
      setEditingExpense(null);
    },
    onEditSuccess: () => {
      setShowAddExpense(false);
      setEditingExpense(null);
    },
  });

  // Form submission handler
  const handleFormSubmit = useCallback((data: ExpenseFormData, isEdit: boolean) => {
    if (isEdit && editingExpense) {
      editExpenseMutation.mutate({ id: editingExpense.id, ...data });
    } else {
      addExpenseMutation.mutate(data);
    }
  }, [editingExpense, editExpenseMutation, addExpenseMutation]);

  // Start editing an expense
  const handleEdit = useCallback((expense: ExpenseType) => {
    setEditingExpense(expense);
    setShowAddExpense(true);
  }, []);

  // Cancel form
  const handleCancel = useCallback(() => {
    setShowAddExpense(false);
    setEditingExpense(null);
  }, []);

  // Handle dialog open change (reset editing state when closing)
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowAddExpense(open);
    if (!open) {
      setEditingExpense(null);
    }
  }, []);

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
            <div className="text-2xl font-bold">RM {filters.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM {filters.monthlyExpenses.toFixed(2)}</div>
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
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
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
                <ExpenseForm
                  open={showAddExpense}
                  onOpenChange={handleDialogOpenChange}
                  editingExpense={editingExpense}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancel}
                  isSubmitting={addExpenseMutation.isPending || editExpenseMutation.isPending}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseDateFilter
                selectedCategory={filters.selectedCategory}
                setSelectedCategory={filters.setSelectedCategory}
                dateFilter={filters.dateFilter}
                dateFrom={filters.dateFrom}
                setDateFrom={filters.setDateFrom}
                dateTo={filters.dateTo}
                setDateTo={filters.setDateTo}
                setDateFilter={filters.setDateFilter}
                setDateRange={filters.setDateRange}
                amountMin={filters.amountMin}
                setAmountMin={filters.setAmountMin}
                amountMax={filters.amountMax}
                setAmountMax={filters.setAmountMax}
                sortBy={filters.sortBy}
                setSortBy={filters.setSortBy}
                sortOrder={filters.sortOrder}
                setSortOrder={filters.setSortOrder}
                clearAllFilters={filters.clearAllFilters}
                hasActiveFilters={filters.hasActiveFilters}
              />

              <ExpenseTable
                expenses={filters.filteredExpenses}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={(id) => deleteExpenseMutation.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-4">
          <OutstandingBalances />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ExpenseAnalytics
            monthlyBreakdowns={filters.monthlyBreakdowns}
            currentMonthCategories={filters.currentMonthCategories}
            monthlyExpenses={filters.monthlyExpenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
