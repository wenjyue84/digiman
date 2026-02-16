import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OptimizedPhotoUploader } from "@/components/OptimizedPhotoUploader";
import { Plus, FileText, DollarSign, Tag, Tags, Calendar, MessageSquare, Camera, Image, X } from "lucide-react";
import type { Expense as ExpenseType } from "@shared/schema";
import {
  expenseSchema,
  expenseCategories,
  DEFAULT_FORM_VALUES,
  type ExpenseFormData,
  type ExpenseCategoryKey,
} from "./expense-constants";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: ExpenseType | null;
  onSubmit: (data: ExpenseFormData, isEdit: boolean) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ExpenseForm({
  open,
  onOpenChange,
  editingExpense,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExpenseFormProps) {
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string>("");
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string>("");
  const [selectedFormCategory, setSelectedFormCategory] = useState<string>("other");

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  // Populate form when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      form.reset({
        description: editingExpense.description,
        amount: editingExpense.amount?.toString() || "",
        category: editingExpense.category as any,
        subcategory: editingExpense.subcategory || "",
        date: editingExpense.date,
        notes: editingExpense.notes || "",
        receiptPhotoUrl: editingExpense.receiptPhotoUrl || "",
        itemPhotoUrl: editingExpense.itemPhotoUrl || "",
      });
      setReceiptPhotoUrl(editingExpense.receiptPhotoUrl || "");
      setItemPhotoUrl(editingExpense.itemPhotoUrl || "");
      setSelectedFormCategory(editingExpense.category);
    }
  }, [editingExpense, form]);

  const handleReceiptPhotoUpload = (photoUrl: string) => {
    setReceiptPhotoUrl(photoUrl);
    form.setValue("receiptPhotoUrl", photoUrl);
  };

  const handleItemPhotoUpload = (photoUrl: string) => {
    setItemPhotoUrl(photoUrl);
    form.setValue("itemPhotoUrl", photoUrl);
  };

  const resetForm = () => {
    try {
      form.reset(DEFAULT_FORM_VALUES);
      setReceiptPhotoUrl("");
      setItemPhotoUrl("");
      setSelectedFormCategory("other");
    } catch (error) {
      console.error("Error in resetForm:", error);
    }
  };

  const handleFormSubmit = (data: ExpenseFormData) => {
    const payload = {
      ...data,
      receiptPhotoUrl: receiptPhotoUrl || data.receiptPhotoUrl || undefined,
      itemPhotoUrl: itemPhotoUrl || data.itemPhotoUrl || undefined,
    };
    onSubmit(payload, !!editingExpense);
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description *
            </Label>
            <Input
              id="description"
              placeholder="e.g., Plumber repair for C05"
              {...form.register("description")}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
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
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              onClick={(e) => (e.target as HTMLInputElement).select()}
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
            <Select value={selectedFormCategory} onValueChange={(value) => {
              form.setValue("category", value as any);
              setSelectedFormCategory(value);
              form.setValue("subcategory", "");
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
            {selectedFormCategory && expenseCategories[selectedFormCategory as ExpenseCategoryKey] ? (
              <Select onValueChange={(value) => form.setValue("subcategory", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subcategory</SelectItem>
                  {expenseCategories[selectedFormCategory as ExpenseCategoryKey].subcategories.map((subcat) => (
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReceiptPhotoUrl("");
                    form.setValue("receiptPhotoUrl", "");
                  }}
                  className="w-full h-8 text-xs text-red-600"
                >
                  <X className="mr-2 h-3 w-3" />
                  Remove Photo
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <OptimizedPhotoUploader
                  onPhotoSelected={handleReceiptPhotoUpload}
                  buttonText="Upload Receipt Photo"
                  className="w-full h-12 border-2 border-dashed border-gray-300"
                  uploadType="expense"
                />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setItemPhotoUrl("");
                    form.setValue("itemPhotoUrl", "");
                  }}
                  className="w-full h-8 text-xs text-red-600"
                >
                  <X className="mr-2 h-3 w-3" />
                  Remove Photo
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <OptimizedPhotoUploader
                  onPhotoSelected={handleItemPhotoUpload}
                  buttonText="Upload Item Photo"
                  className="w-full h-12 border-2 border-dashed border-gray-300"
                  uploadType="expense"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editingExpense
                ? (isSubmitting ? "Updating..." : "Update Expense")
                : (isSubmitting ? "Adding..." : "Add Expense")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
