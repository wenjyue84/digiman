// Guest Balance Data Structure
export interface GuestBalance {
  id: string;
  guestName: string;
  phone: string;
  email?: string;
  totalAmount: number; // Total amount owed
  paidAmount: number; // Total amount paid
  balance: number; // Outstanding balance (calculated)
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestPayment {
  id: string;
  guestId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'ewallet' | 'bank-transfer';
  transactionId?: string;
  notes?: string;
  receivedBy: string; // staff id
  receivedAt: string;
}

// Sample guest balance data
export let guestBalances: GuestBalance[] = [
  {
    id: '1',
    guestName: 'Ahmad Rizal',
    phone: '+60123456789',
    email: 'ahmad.rizal@gmail.com',
    totalAmount: 150.00,
    paidAmount: 100.00,
    balance: 50.00,
    lastPaymentDate: '2024-08-23',
    lastPaymentAmount: 100.00,
    notes: 'Regular customer, prefers less sweet drinks',
    createdAt: '2024-08-20',
    updatedAt: '2024-08-23'
  },
  {
    id: '2',
    guestName: 'Sarah Lim',
    phone: '+60187654321',
    email: 'sarah.lim@outlook.com',
    totalAmount: 85.50,
    paidAmount: 0.00,
    balance: 85.50,
    notes: 'New customer',
    createdAt: '2024-08-22',
    updatedAt: '2024-08-22'
  },
  {
    id: '3',
    guestName: 'Rajesh Kumar',
    phone: '+60199876543',
    totalAmount: 200.00,
    paidAmount: 150.00,
    balance: 50.00,
    lastPaymentDate: '2024-08-21',
    lastPaymentAmount: 150.00,
    notes: 'VIP customer, always orders for office group',
    createdAt: '2024-08-18',
    updatedAt: '2024-08-21'
  },
  {
    id: '4',
    guestName: 'Michelle Tan',
    phone: '+60166543210',
    email: 'michelle.tan@yahoo.com',
    totalAmount: 120.00,
    paidAmount: 120.00,
    balance: 0.00,
    lastPaymentDate: '2024-08-21',
    lastPaymentAmount: 120.00,
    notes: 'Fully paid',
    createdAt: '2024-08-21',
    updatedAt: '2024-08-21'
  },
  {
    id: '5',
    guestName: 'David Wong',
    phone: '+60133334444',
    totalAmount: 75.00,
    paidAmount: 0.00,
    balance: 75.00,
    notes: 'Walk-in customer',
    createdAt: '2024-08-23',
    updatedAt: '2024-08-23'
  }
];

// Sample payment history
export let guestPayments: GuestPayment[] = [
  {
    id: '1',
    guestId: '1',
    amount: 100.00,
    paymentMethod: 'cash',
    notes: 'Partial payment',
    receivedBy: 'staff-1',
    receivedAt: '2024-08-23T10:30:00Z'
  },
  {
    id: '2',
    guestId: '3',
    amount: 150.00,
    paymentMethod: 'ewallet',
    notes: 'Full payment',
    receivedBy: 'staff-2',
    receivedAt: '2024-08-21T15:45:00Z'
  },
  {
    id: '3',
    guestId: '4',
    amount: 120.00,
    paymentMethod: 'card',
    notes: 'Full payment',
    receivedBy: 'staff-1',
    receivedAt: '2024-08-21T12:20:00Z'
  }
];

// Helper functions
export const getGuestById = (id: string): GuestBalance | undefined => {
  return guestBalances.find(guest => guest.id === id);
};

export const getGuestPayments = (guestId: string): GuestPayment[] => {
  return guestPayments.filter(payment => payment.guestId === guestId);
};

export const addGuestPayment = (payment: Omit<GuestPayment, 'id' | 'receivedAt'>): void => {
  const newPayment: GuestPayment = {
    ...payment,
    id: `payment-${Date.now()}`,
    receivedAt: new Date().toISOString()
  };
  
  guestPayments.push(newPayment);
  
  // Update guest balance
  const guest = getGuestById(payment.guestId);
  if (guest) {
    guest.paidAmount += payment.amount;
    guest.balance = guest.totalAmount - guest.paidAmount;
    guest.lastPaymentDate = new Date().toISOString();
    guest.lastPaymentAmount = payment.amount;
    guest.updatedAt = new Date().toISOString();
  }
};

export const addGuestBalance = (guest: Omit<GuestBalance, 'id' | 'balance' | 'createdAt' | 'updatedAt'>): void => {
  const newGuest: GuestBalance = {
    ...guest,
    id: `guest-${Date.now()}`,
    balance: guest.totalAmount - guest.paidAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  guestBalances.push(newGuest);
};

export const updateGuestBalance = (id: string, updates: Partial<GuestBalance>): void => {
  const guest = getGuestById(id);
  if (guest) {
    Object.assign(guest, updates);
    guest.balance = guest.totalAmount - guest.paidAmount;
    guest.updatedAt = new Date().toISOString();
  }
};

export const getGuestsWithOutstandingBalance = (): GuestBalance[] => {
  return guestBalances.filter(guest => guest.balance > 0);
};

export const formatCurrency = (amount: number): string => {
  return `RM${amount.toFixed(2)}`;
};

export const formatBalance = (balance: number): string => {
  return `Bal:${formatCurrency(balance)}`;
};

export const getPaymentMethodColor = (method: string): string => {
  const colors: Record<string, string> = {
    'cash': 'bg-green-100 text-green-800',
    'card': 'bg-blue-100 text-blue-800',
    'ewallet': 'bg-purple-100 text-purple-800',
    'bank-transfer': 'bg-orange-100 text-orange-800'
  };
  return colors[method] || 'bg-gray-100 text-gray-800';
};

export const getBalanceStatusColor = (balance: number): string => {
  if (balance === 0) return 'text-green-600';
  if (balance <= 50) return 'text-yellow-600';
  return 'text-red-600';
};