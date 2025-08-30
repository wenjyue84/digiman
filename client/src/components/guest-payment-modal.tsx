"use client";

import React, { useState } from 'react';
import { DollarSign, CreditCard, Smartphone, Banknote, Building } from 'lucide-react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { formatCurrency, formatBalance } from '../lib/guest-balance-data';
import type { Guest } from '@shared/schema';
import { toast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

// Flexible guest interface that can handle both GuestBalance and transformed Guest types
interface PaymentGuest {
  id: string;
  guestName?: string; // From GuestBalance
  name?: string; // From Guest
  phone?: string; // From GuestBalance
  phoneNumber?: string; // From Guest
  email?: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

interface GuestPaymentModalProps {
  guest: PaymentGuest | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
}

export function GuestPaymentModal({ 
  guest, 
  isOpen, 
  onClose, 
  onPaymentComplete 
}: GuestPaymentModalProps) {
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Payment mutation to update guest record
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: {
      guestId: string;
      amount: number;
      paymentMethod: string;
      notes?: string;
    }) => {
      const { guestId, amount, paymentMethod: method, notes: paymentNotes } = paymentData;
      
      // Calculate new payment amount and remaining balance
      const newPaidAmount = guest!.paidAmount + amount;
      const newBalance = guest!.totalAmount - newPaidAmount;
      
      // Update the guest record with new payment info
      const response = await apiRequest("PATCH", `/api/guests/${guestId}`, {
        paymentAmount: newPaidAmount.toString(),
        paymentMethod: method,
        paymentCollector: "staff", // You might want to get this from current user context
        isPaid: newBalance <= 0,
        notes: `${guest!.notes || ''} | Payment: RM${amount.toFixed(2)} via ${method}${paymentNotes ? ` - ${paymentNotes}` : ''} | Balance: RM${Math.max(0, newBalance).toFixed(2)}`
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      
      toast({
        title: 'Payment recorded',
        description: `Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully`
      });
      
      // Reset form and close modal
      setPaymentAmount('');
      setTransactionId('');
      setNotes('');
      onPaymentComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to record payment. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive'
      });
      return;
    }
    
    if (amount > guest.balance) {
      toast({
        title: 'Error',
        description: 'Payment amount cannot exceed outstanding balance',
        variant: 'destructive'
      });
      return;
    }

    // Use the mutation to update the guest record
    paymentMutation.mutate({
      guestId: guest.id,
      amount,
      paymentMethod,
      notes: notes || undefined
    });
  };

  const handleClose = () => {
    if (!paymentMutation.isPending) {
      setPaymentAmount('');
      setTransactionId('');
      setNotes('');
      onClose();
    }
  };

  if (!guest) return null;

  const guestName = guest.guestName || guest.name || 'Unknown';
  const guestPhone = guest.phone || guest.phoneNumber || 'N/A';
  const remainingBalance = guest.balance - (parseFloat(paymentAmount) || 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record payment for {guestName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-2">Guest Details</div>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Name:</span> {guestName}</div>
              <div><span className="font-medium">Phone:</span> {guestPhone}</div>
              {guest.email && <div><span className="font-medium">Email:</span> {guest.email}</div>}
            </div>
          </div>

          {/* Balance Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-2">Balance Information</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(guest.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-medium text-green-600">{formatCurrency(guest.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className="font-medium text-red-600">{formatBalance(guest.balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount *</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={guest.balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="text-lg font-medium"
              required
            />
            {paymentAmount && (
              <div className="text-sm text-muted-foreground">
                Remaining balance after payment: {formatBalance(remainingBalance)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="tng">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Touch 'n Go / e-Wallet
                  </div>
                </SelectItem>
                <SelectItem value="bank">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="platform">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Platform/Online
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction ID */}
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter transaction ID if applicable"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this payment"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={paymentMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={paymentMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1"
            >
              {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}