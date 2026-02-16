import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExpenseFormData } from "./expense-constants";

interface UseExpenseMutationsOptions {
  onAddSuccess?: () => void;
  onEditSuccess?: () => void;
}

export function useExpenseMutations(options: UseExpenseMutationsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      try {
        queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
        options.onAddSuccess?.();
        toast({
          title: "Expense Added",
          description: "Expense has been recorded successfully",
        });
      } catch (error) {
        console.error("Error in expense success handler:", error);
        toast({
          title: "Expense Added",
          description: "Expense recorded successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  // Edit expense mutation
  const editExpenseMutation = useMutation({
    mutationFn: async (data: { id: string } & ExpenseFormData) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PUT", `/api/expenses/${id}`, {
        ...updateData,
        amount: parseFloat(updateData.amount),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      options.onEditSuccess?.();
      toast({
        title: "Expense Updated",
        description: "Expense has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update expense",
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

  return {
    addExpenseMutation,
    editExpenseMutation,
    deleteExpenseMutation,
  };
}
