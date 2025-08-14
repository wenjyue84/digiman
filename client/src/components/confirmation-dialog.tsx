import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info, Trash2, UserMinus, CheckCircle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "info" | "success";
  icon?: ReactNode;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "danger",
  icon,
  isLoading = false,
}: ConfirmationDialogProps) {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case "danger":
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />;
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "warning":
        return "bg-orange-600 hover:bg-orange-700 text-white";
      case "info":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white";
      default:
        return "bg-red-600 hover:bg-red-700 text-white";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-3">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={getConfirmButtonClass()}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Pre-configured confirmation dialogs for common actions
export function CheckoutConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  guestName,
  capsuleNumber,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  guestName: string;
  capsuleNumber: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Guest Checkout"
      description={`Are you sure you want to check out ${guestName} from capsule ${capsuleNumber}? This action cannot be undone.`}
      confirmText="Check Out"
      cancelText="Cancel"
      onConfirm={onConfirm}
      variant="warning"
      icon={<UserMinus className="h-6 w-6 text-orange-600" />}
      isLoading={isLoading}
    />
  );
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType = "item",
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={onConfirm}
      variant="danger"
      icon={<Trash2 className="h-6 w-6 text-red-600" />}
      isLoading={isLoading}
    />
  );
}