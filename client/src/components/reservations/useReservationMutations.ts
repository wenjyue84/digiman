import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";

const API_BASE = "/api/reservations";

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function useReservationMutations(opts?: {
  onCreateSuccess?: () => void;
  onEditSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [API_BASE] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiCall(API_BASE, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (res) => {
      invalidate();
      toast({ title: "Reservation created", description: `Confirmation: ${res.confirmationNumber}` });
      opts?.onCreateSuccess?.();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiCall(`${API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Reservation updated" });
      opts?.onEditSuccess?.();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason?: string }) =>
      apiCall(`${API_BASE}/${id}/cancel`, { method: "POST", body: JSON.stringify({ cancelReason }) }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Reservation cancelled" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiCall(`${API_BASE}/${id}/convert`, { method: "POST" }),
    onSuccess: (res) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "Checked in!", description: `Guest ${res.guest.name} assigned to ${res.guest.unitNumber}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiCall(`${API_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Reservation deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return { createMutation, updateMutation, cancelMutation, convertMutation, deleteMutation };
}
