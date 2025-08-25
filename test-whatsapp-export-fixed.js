// Test fixed WhatsApp export format
function testWhatsAppExportFixed() {
  // Mock data similar to what the component would have
  const allCapsules = [
    // Back section
    { number: 'C11', section: 'back' },
    { number: 'C12', section: 'back' },
    { number: 'C13', section: 'back' },
    { number: 'C14', section: 'back' },
    { number: 'C15', section: 'back' },
    { number: 'C16', section: 'back' },
    { number: 'C17', section: 'back' },
    { number: 'C18', section: 'back' },
    { number: 'C19', section: 'back' },
    { number: 'C20', section: 'back' },
    { number: 'C21', section: 'back' },
    { number: 'C22', section: 'back' },
    { number: 'C23', section: 'back' },
    { number: 'C24', section: 'back' },
    
    // Front section (Room)
    { number: 'C1', section: 'front' },
    { number: 'C2', section: 'front' },
    { number: 'C3', section: 'front' },
    { number: 'C4', section: 'front' },
    { number: 'C5', section: 'front' },
    { number: 'C6', section: 'front' },
    
    // Living Room
    { number: 'C25', section: 'middle' },
    { number: 'C26', section: 'middle' },
  ];

  const checkedInGuests = [
    // Back section guests
    { 
      name: 'hookann liang', 
      capsuleNumber: 'C11', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-26',
      paymentAmount: '100'
    },
    { 
      name: 'David', 
      capsuleNumber: 'C12', 
      isPaid: false, 
      expectedCheckoutDate: null,
      paymentAmount: '0'
    },
    { 
      name: 'chan', 
      capsuleNumber: 'C13', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-06',
      paymentAmount: '100'
    },
    { 
      name: 'khoo', 
      capsuleNumber: 'C14', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-24',
      paymentAmount: '100'
    },
    { 
      name: 'yachao', 
      capsuleNumber: 'C15', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-27',
      paymentAmount: '100'
    },
    { 
      name: 'kwang', 
      capsuleNumber: 'C16', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-27',
      paymentAmount: '100'
    },
    { 
      name: 'jackson', 
      capsuleNumber: 'C17', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-01',
      paymentAmount: '100'
    },
    { 
      name: 'long', 
      capsuleNumber: 'C18', 
      isPaid: false, 
      expectedCheckoutDate: '2024-08-26',
      paymentAmount: '70'
    },
    { 
      name: 'amer', 
      capsuleNumber: 'C19', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-17',
      paymentAmount: '100'
    },
    { 
      name: 'Henry tung', 
      capsuleNumber: 'C20', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-29',
      paymentAmount: '100'
    },
    { 
      name: 'nichs', 
      capsuleNumber: 'C22', 
      isPaid: true, 
      expectedCheckoutDate: '2024-09-14',
      paymentAmount: '100'
    },
    { 
      name: 'john', 
      capsuleNumber: 'C24', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-26',
      paymentAmount: '100'
    },
    
    // Room guests
    { 
      name: 'haibo', 
      capsuleNumber: 'C1', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-27',
      paymentAmount: '100'
    },
    { 
      name: 'kakar', 
      capsuleNumber: 'C4', 
      isPaid: true, 
      expectedCheckoutDate: '2024-07-07',
      paymentAmount: '100'
    },
    
    // Living Room guests
    { 
      name: 'sarah', 
      capsuleNumber: 'C25', 
      isPaid: true, 
      expectedCheckoutDate: '2024-08-30',
      paymentAmount: '100'
    },
    { 
      name: 'mike', 
      capsuleNumber: 'C26', 
      isPaid: false, 
      expectedCheckoutDate: '2024-08-28',
      paymentAmount: '50'
    }
  ];

  // Mock functions
  const isGuestPaid = (guest) => guest.isPaid;
  const getGuestBalance = (guest) => {
    if (guest.isPaid) return 0;
    return parseInt(guest.paymentAmount) || 0;
  };
  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${day}/${month}`;
  };

  // Generate WhatsApp text
  let whatsappText = "🏨 *PELANGI CAPSULE STATUS* 🏨\n\n";
  
  // Group capsules by section and handle special cases
  const sections = ['back', 'middle', 'front'];
  
  sections.forEach(section => {
    const sectionCapsules = allCapsules
      .filter(capsule => capsule.section === section)
      .sort((a, b) => {
        const aNum = parseInt(a.number.replace('C', ''));
        const bNum = parseInt(b.number.replace('C', ''));
        return aNum - bNum;
      });
    
    if (sectionCapsules.length > 0) {
      whatsappText += `📍 *${section.toUpperCase()} SECTION* 📍\n`;
      
      sectionCapsules.forEach(capsule => {
        const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
        
        if (guest) {
          // Guest is checked in
          const isPaid = isGuestPaid(guest);
          const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
          const paymentStatus = isPaid ? '✅' : '❌';
          
          // Check for outstanding balance
          const balance = getGuestBalance(guest);
          const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
          
          whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
        } else {
          // Empty capsule
          whatsappText += `${capsule.number.replace('C', '')})\n`;
        }
      });
      
      whatsappText += '\n';
    }
  });
  
  // Handle special sections - Living Room (capsules 25, 26)
  whatsappText += '🏠 *LIVING ROOM* 🏠\n';
  const livingRoomCapsules = allCapsules.filter(capsule => {
    const num = parseInt(capsule.number.replace('C', ''));
    return num === 25 || num === 26;
  }).sort((a, b) => {
    const aNum = parseInt(a.number.replace('C', ''));
    const bNum = parseInt(b.number.replace('C', ''));
    return aNum - bNum;
  });
  
  livingRoomCapsules.forEach(capsule => {
    const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
    if (guest) {
      const isPaid = isGuestPaid(guest);
      const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
      const paymentStatus = isPaid ? '✅' : '❌';
      const balance = getGuestBalance(guest);
      const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
      whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
    } else {
      whatsappText += `${capsule.number.replace('C', '')})\n`;
    }
  });
  
  // Handle special sections - Room (capsules 1-6)
  whatsappText += '\n🛏️ *ROOM* 🛏️\n';
  const roomCapsules = allCapsules.filter(capsule => {
    const num = parseInt(capsule.number.replace('C', ''));
    return num >= 1 && num <= 6;
  }).sort((a, b) => {
    const aNum = parseInt(a.number.replace('C', ''));
    const bNum = parseInt(b.number.replace('C', ''));
    return aNum - bNum;
  });
  
  roomCapsules.forEach(capsule => {
    const guest = checkedInGuests.find(g => g.capsuleNumber === capsule.number);
    if (guest) {
      const isPaid = isGuestPaid(guest);
      const checkoutDate = guest.expectedCheckoutDate ? formatShortDate(guest.expectedCheckoutDate) : '';
      const paymentStatus = isPaid ? '✅' : '❌';
      const balance = getGuestBalance(guest);
      const outstandingText = balance > 0 ? ` (Outstanding RM${balance})` : '';
      whatsappText += `${capsule.number.replace('C', '')}) ${guest.name} ${paymentStatus}${checkoutDate}${outstandingText}\n`;
    } else {
      whatsappText += `${capsule.number.replace('C', '')})\n`;
    }
  });
  
  whatsappText += '\n——————————————\n';
  whatsappText += '📅 *Last Updated:* ' + new Date().toLocaleDateString('en-GB') + '\n';
  whatsappText += '⏰ *Time:* ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  console.log('Fixed WhatsApp Export Format:');
  console.log('=============================');
  console.log(whatsappText);
  
  return whatsappText;
}

// Run the test
testWhatsAppExportFixed();
