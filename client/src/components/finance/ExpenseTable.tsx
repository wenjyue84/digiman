import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import type { Expense as ExpenseType } from "@shared/schema";
import { expenseCategories, parseAmount, type ExpenseCategoryKey } from "./expense-constants";

interface ExpenseTableProps {
  expenses: ExpenseType[];
  isLoading: boolean;
  onEdit: (expense: ExpenseType) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTable({ expenses, isLoading, onEdit, onDelete }: ExpenseTableProps) {
  return (
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
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                {isLoading ? "Loading expenses..." : "No expenses recorded yet"}
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  {expense.date && !isNaN(new Date(expense.date).getTime()) ? new Date(expense.date).toLocaleDateString() : "No Date"}
                </TableCell>
                <TableCell className="font-medium">
                  {expense.description}
                  {expense.notes && (
                    <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={expenseCategories[expense.category as ExpenseCategoryKey]?.color}>
                    {expenseCategories[expense.category as ExpenseCategoryKey]?.label}
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
                  RM {parseAmount(expense.amount).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(expense)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(expense.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
