import jsPDF from 'jspdf';
import type { Guest } from '@shared/schema';
import { isGuestPaid } from '@/lib/guest';
import { BusinessConfig } from '@shared/business-config';

interface ReceiptData {
  guest: Guest;
  receiptNumber?: string;
  issuedOn?: Date;
  business: BusinessConfig;
}

export function generateReceipt(data: ReceiptData): void {
  const { guest, business } = data;
  const doc = new jsPDF();
  
  // Generate receipt number if not provided
  const receiptNumber = data.receiptNumber || generateReceiptNumber(business.receiptPrefix);
  const issuedOn = data.issuedOn || new Date();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Colors
  const primaryColor = business.primaryColor || '#2c3e50';
  const secondaryColor = '#7f8c8d';
  
  let yPosition = 20;
  
  // Header - Business Name (centered, large)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text(business.name, pageWidth / 2, yPosition, { align: 'center' });
  
  // Address and contact info (centered, small)
  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(business.address, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.text(`Phone: ${business.phone} • Email: ${business.email} • Website: ${business.website}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // RECEIPT title (centered, bold)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  
  // Receipt metadata (Receipt No and Issued On)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Left side - Receipt No
  doc.setTextColor(secondaryColor);
  doc.text('Receipt No.', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(receiptNumber, margin + 35, yPosition);
  
  // Right side - Issued On
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  const issuedText = 'Issued On';
  const issuedTextWidth = doc.getTextWidth(issuedText);
  doc.text(issuedText, pageWidth - margin - 80, yPosition);
  
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDateTime(issuedOn), pageWidth - margin - 80 + issuedTextWidth + 5, yPosition);
  
  yPosition += 8;
  
  // Collected By and Status
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Collected By', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.paymentCollector || 'N/A', margin + 35, yPosition);
  
  // Status
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  const statusText = 'Status';
  const statusTextWidth = doc.getTextWidth(statusText);
  doc.text(statusText, pageWidth - margin - 80, yPosition);
  
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const paymentStatus = isGuestPaid(guest) ? 'Paid' : 'Outstanding';
  doc.text(paymentStatus, pageWidth - margin - 80 + statusTextWidth + 5, yPosition);
  
  yPosition += 15;
  
  // Guest Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Guest Details', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(9);
  
  // Full Name and Nationality
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Full Name', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.name, margin + 35, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Nationality', pageWidth / 2 + 10, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.nationality || 'N/A', pageWidth / 2 + 45, yPosition);
  
  yPosition += 8;
  
  // ID Number and Phone
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('ID Number', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.idNumber || 'N/A', margin + 35, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Phone', pageWidth / 2 + 10, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.phoneNumber || 'N/A', pageWidth / 2 + 45, yPosition);
  
  yPosition += 8;
  
  // Gender and Age
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Gender', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const genderDisplay = guest.gender ? guest.gender.charAt(0).toUpperCase() + guest.gender.slice(1) : 'N/A';
  doc.text(genderDisplay, margin + 35, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Age', pageWidth / 2 + 10, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.age || 'N/A', pageWidth / 2 + 45, yPosition);
  
  yPosition += 15;
  
  // Stay Details Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Stay Details', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(9);
  
  // Unit and Duration
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  const accommodationLabel = business.accommodationType.charAt(0).toUpperCase() + business.accommodationType.slice(1);
  doc.text(accommodationLabel, margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(guest.unitNumber, margin + 35, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Duration', pageWidth / 2 + 10, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const duration = calculateDuration(guest.checkinTime, guest.checkoutTime);
  doc.text(duration, pageWidth / 2 + 45, yPosition);
  
  yPosition += 8;
  
  // Check-in and Checkout/Expected Checkout
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Check-in', margin, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCheckInDateTime(guest.checkinTime), margin + 35, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  // Show actual checkout if available, otherwise expected checkout
  const checkoutLabel = guest.checkoutTime ? 'Checkout' : 'Expected Checkout';
  doc.text(checkoutLabel, pageWidth / 2 + 10, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const checkoutValue = guest.checkoutTime 
    ? formatCheckInDateTime(guest.checkoutTime) // Use time-inclusive formatter for actual checkout
    : (guest.expectedCheckoutDate 
        ? formatDate(new Date(guest.expectedCheckoutDate.toString())) // Use date-only for expected
        : 'N/A');
  doc.text(checkoutValue, pageWidth / 2 + 45, yPosition);
  
  yPosition += 15;
  
  // Payment Summary Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Payment Summary', margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(9);
  
  // Amount
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Amount', margin + 15, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`RM ${parseFloat(guest.paymentAmount || '0').toFixed(2)}`, margin + 45, yPosition);
  
  yPosition += 8;
  
  // Method
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Method', margin + 15, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const methodDisplay = formatPaymentMethod(guest.paymentMethod || 'cash');
  doc.text(methodDisplay, margin + 45, yPosition);
  
  yPosition += 8;
  
  // Status
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Status', margin + 15, yPosition);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(paymentStatus, margin + 45, yPosition);
  
  yPosition += 15;
  
  // Notes section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  const notesText = `Notes: This receipt confirms payment received for accommodation at ${business.name}. Please retain for your`;
  doc.text(notesText, margin, yPosition);
  yPosition += 4;
  doc.text(`records and claims. For assistance, contact us at ${business.phone}.`, margin, yPosition);
  
  yPosition += 10;
  
  // Thank you message (centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Thank you for staying with us!', pageWidth / 2, yPosition, { align: 'center' });
  
  // Generate filename and save
  const filename = `Receipt_${guest.name.replace(/\s+/g, '_')}_${formatDateForFilename(issuedOn)}_${Date.now()}.pdf`;
  doc.save(filename);
}

function generateReceiptNumber(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomStr}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCheckInDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' at');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function calculateDuration(checkinTime: string | Date, checkoutTime?: string | Date | null): string {
  const checkin = new Date(checkinTime);
  const checkout = checkoutTime ? new Date(checkoutTime) : new Date();
  
  const diffMs = checkout.getTime() - checkin.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  }
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
}

function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'cash': 'Cash',
    'tng': 'Touch \'n Go',
    'bank': 'Bank Transfer',
    'platform': 'Online Platform'
  };
  return methodMap[method.toLowerCase()] || method;
}
