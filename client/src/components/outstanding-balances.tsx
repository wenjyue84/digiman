"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  DollarSign,
  User,
  Phone,
  Mail,
  Calendar,
  Eye,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Separator } from './ui/separator';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { GuestPaymentModal } from './guest-payment-modal';
import { toast } from '../hooks/use-toast';
import type { Guest, PaginatedResponse } from '@shared/schema';
import { getGuestBalance } from '../lib/guest';

// Helper functions for guest data
const formatCurrency = (amount: number): string => {
  return `RM${amount.toFixed(2)}`;
};

const formatBalance = (balance: number): string => {
  return `${formatCurrency(balance)}`;
};

const getBalanceStatusColor = (balance: number): string => {
  if (balance === 0) return 'text-green-600';
  if (balance <= 50) return 'text-yellow-600';
  return 'text-red-600';
};

// Transform Guest data to match our balance structure
interface OutstandingGuest extends Guest {
  balance: number;
  totalAmount: number;
  paidAmount: number;
}

const transformGuestToOutstanding = (guest: Guest): OutstandingGuest => {
  const balance = getGuestBalance(guest);
  const paidAmount = guest.paymentAmount ? parseFloat(guest.paymentAmount) || 0 : 0;
  const totalAmount = balance + paidAmount;
  
  return {
    ...guest,
    balance,
    totalAmount,
    paidAmount
  };
};

export function OutstandingBalances() {
  const { user: currentUser, isLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedGuest, setSelectedGuest] = useState<OutstandingGuest | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGuestDetailOpen, setIsGuestDetailOpen] = useState(false);

  // Fetch checked-in guests from API
  const { data: guestsResponse, isLoading: isLoadingGuests } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
  });

  const guests = guestsResponse?.data || [];

  // Transform guests to outstanding structure
  const outstandingGuests: OutstandingGuest[] = useMemo(() => {
    return guests.map(transformGuestToOutstanding);
  }, [guests]);

  // Filter guests based on search and status
  const filteredGuests = useMemo(() => {
    let filtered = outstandingGuests;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(guest =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guest.phoneNumber && guest.phoneNumber.includes(searchQuery)) ||
        (guest.email && guest.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter === 'outstanding') {
      filtered = filtered.filter(guest => guest.balance > 0);
    } else if (statusFilter === 'paid') {
      filtered = filtered.filter(guest => guest.balance === 0 || guest.isPaid);
    }
    
    return filtered;
  }, [outstandingGuests, searchQuery, statusFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalGuests = outstandingGuests.length;
    const guestsWithOutstanding = outstandingGuests.filter(g => g.balance > 0).length;
    const totalOutstanding = outstandingGuests.reduce((sum, g) => sum + g.balance, 0);
    const totalPaid = outstandingGuests.reduce((sum, g) => sum + g.paidAmount, 0);
    
    return {
      totalGuests,
      guestsWithOutstanding,
      totalOutstanding,
      totalPaid
    };
  }, [outstandingGuests]);

  const handlePaymentClick = (guest: OutstandingGuest) => {
    if (guest.balance > 0) {
      setSelectedGuest(guest);
      setIsPaymentModalOpen(true);
    }
  };

  const handleGuestDetailClick = (guest: OutstandingGuest) => {
    setSelectedGuest(guest);
    setIsGuestDetailOpen(true);
  };

  const handlePaymentComplete = () => {
    // The real implementation would update the backend
    toast({
      title: 'Success',
      description: 'Guest balance updated successfully'
    });
  };

  const getStatusBadge = (guest: OutstandingGuest) => {
    if (guest.isPaid || guest.balance === 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Fully Paid</Badge>;
    } else if (guest.balance <= 50) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Balance</Badge>;
    } else {
      return <Badge variant="destructive">Outstanding</Badge>;
    }
  };

  // Safety check for loading states
  if (isLoading || isLoadingGuests) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Guests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              All checked-in guests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.guestsWithOutstanding}</div>
            <p className="text-xs text-muted-foreground">
              Need payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summaryStats.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount to collect
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Payments received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Guests</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guests</SelectItem>
                  <SelectItem value="outstanding">With Outstanding</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map(guest => (
                  <TableRow key={guest.id}>
                    {/* Guest Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={guest.phoneNumber ? `/api/rainbow/whatsapp/avatar/${guest.phoneNumber.replace(/[^0-9]/g, '')}` : ""} />
                          <AvatarFallback className="text-sm">
                            {guest.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{guest.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {guest.id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <div className="space-y-1">
                        {guest.phoneNumber && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {guest.phoneNumber}
                          </div>
                        )}
                        {guest.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {guest.email}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Unit Number */}
                    <TableCell>
                      <Badge variant="outline">{guest.unitNumber}</Badge>
                    </TableCell>

                    {/* Total Amount */}
                    <TableCell>
                      <div className="font-medium">{formatCurrency(guest.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(guest.checkinTime).toLocaleDateString()}
                      </div>
                    </TableCell>

                    {/* Amount Paid */}
                    <TableCell>
                      <div className="font-medium text-green-600">
                        {formatCurrency(guest.paidAmount)}
                      </div>
                      {guest.paymentMethod && (
                        <div className="text-xs text-muted-foreground">
                          via {guest.paymentMethod}
                        </div>
                      )}
                    </TableCell>

                    {/* Balance */}
                    <TableCell>
                      <div className={`font-medium ${getBalanceStatusColor(guest.balance)}`}>
                        {formatBalance(guest.balance)}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {getStatusBadge(guest)}
                    </TableCell>

                    {/* Payment Column - Clickable for outstanding balances */}
                    <TableCell>
                      {guest.balance > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePaymentClick(guest)}
                          className="w-full cursor-pointer hover:bg-green-50 hover:border-green-300"
                        >
                          <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                          Pay Now
                        </Button>
                      ) : (
                        <div className="text-center text-sm text-muted-foreground">
                          Fully Paid
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGuestDetailClick(guest)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredGuests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No guests found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <GuestPaymentModal
        guest={selectedGuest as any}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Guest Detail Modal */}
      <Dialog open={isGuestDetailOpen} onOpenChange={setIsGuestDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedGuest?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="text-sm">{selectedGuest.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Unit</Label>
                  <div className="text-sm">{selectedGuest.unitNumber}</div>
                </div>
                {selectedGuest.phoneNumber && (
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <div className="text-sm">{selectedGuest.phoneNumber}</div>
                  </div>
                )}
                {selectedGuest.email && (
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <div className="text-sm">{selectedGuest.email}</div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Check-in</Label>
                  <div className="text-sm">
                    {new Date(selectedGuest.checkinTime).toLocaleDateString()}
                  </div>
                </div>
                {selectedGuest.expectedCheckoutDate && (
                  <div>
                    <Label className="text-sm font-medium">Expected Checkout</Label>
                    <div className="text-sm">
                      {new Date(selectedGuest.expectedCheckoutDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(selectedGuest.totalAmount)}</div>
                  <div className="text-xs text-muted-foreground">Total Amount</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedGuest.paidAmount)}</div>
                  <div className="text-xs text-muted-foreground">Amount Paid</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{formatBalance(selectedGuest.balance)}</div>
                  <div className="text-xs text-muted-foreground">Outstanding</div>
                </div>
              </div>
              
              {selectedGuest.notes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <div className="text-sm text-muted-foreground">{selectedGuest.notes}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
