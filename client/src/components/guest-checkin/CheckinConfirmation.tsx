import React, { useRef } from 'react';
import { InsertGuest } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Copy, Phone } from 'lucide-react';

interface CheckinConfirmationProps {
  guest: InsertGuest;
}

const CheckinConfirmation: React.FC<CheckinConfirmationProps> = ({ guest }) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const pdfRef = useRef<HTMLDivElement>(null);

  const generateWhatsAppText = () => {
    return `
*Guest Check-in Confirmation* 👋

*Name:* ${guest.name}
*Capsule:* 🛌 ${guest.capsuleNumber}
*Payment:* 💳 RM ${guest.paymentAmount} via ${guest.paymentMethod}
*Check-in Date:* 📅 ${guest.checkInDate}
*Expected Checkout:* 📅 ${guest.expectedCheckoutDate}
${guest.notes ? `*Notes:* 📝 ${guest.notes}` : ''}
    `.trim();
  };

  const handleCopyToClipboard = () => {
    toast({
      title: 'Copied to Clipboard',
      description: 'Check-in details copied successfully.',
    });
  };

  const handleShareAsPdf = () => {
    const input = pdfRef.current;
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${guest.name}-checkin.pdf`);
      });
    }
  };

  return (
    <div>
      <div ref={pdfRef} className="p-4 border rounded-md">
        <h3 className="font-bold text-lg mb-2">{guest.name}</h3>
        <ul>
          <li><strong>Capsule:</strong> {guest.capsuleNumber}</li>
          <li><strong>Payment:</strong> RM {guest.paymentAmount} via {guest.paymentMethod}</li>
          <li><strong>Check-in Date:</strong> {guest.checkInDate}</li>
          <li><strong>Expected Checkout:</strong> {guest.expectedCheckoutDate}</li>
          {guest.nationality && <li><strong>Nationality:</strong> {guest.nationality}</li>}
          {guest.phoneNumber && (
            <li>
              <strong>Phone:</strong> 
              <a href={`tel:${guest.phoneNumber}`} className="text-blue-600 hover:underline ml-1">
                {guest.phoneNumber}
              </a>
            </li>
          )}
          {guest.notes && (
            <li className="mt-2">
              <strong>Notes:</strong>
              <p className="whitespace-pre-wrap">{guest.notes}</p>
            </li>
          )}
        </ul>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        {isMobile && (
          <CopyToClipboard text={generateWhatsAppText()} onCopy={handleCopyToClipboard}>
            <Button variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy for WhatsApp
            </Button>
          </CopyToClipboard>
        )}
        <Button onClick={handleShareAsPdf}>Share as PDF</Button>
      </div>
    </div>
  );
};

export default CheckinConfirmation;