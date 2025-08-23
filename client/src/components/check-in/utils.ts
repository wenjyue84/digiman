import type { Guest, Capsule } from "@shared/schema";

// Date and time utilities
export function getCurrentDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateString = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  return { timeString, dateString };
}

export function getNextDayDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Guest name utilities
export function getNextGuestNumber(existingGuests: Guest[]): string {
  const guestNumbers = existingGuests
    .map(guest => {
      const match = guest.name.match(/^Guest(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  const maxNumber = guestNumbers.length > 0 ? Math.max(...guestNumbers) : 0;
  return `Guest${maxNumber + 1}`;
}

// User utilities
export function getDefaultCollector(user: any): string {
  if (!user) return "";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email === "admin@pelangi.com") {
    return "Admin";
  }
  return user.email || "";
}

// Gender-based capsule assignment logic
export function getRecommendedCapsule(gender: string, availableCapsules: any[]): string {
  console.log('🔍 Smart Assignment Debug:', {
    gender,
    totalCapsules: availableCapsules?.length || 0,
    capsules: availableCapsules?.map(c => ({
      number: c.number,
      section: c.section,
      position: c.position,
      cleaningStatus: c.cleaningStatus,
      isAvailable: c.isAvailable,
      toRent: c.toRent,
      canAssign: c.canAssign
    }))
  });

  if (!availableCapsules || availableCapsules.length === 0) {
    console.warn('❌ No available capsules for smart assignment');
    return "";
  }
  
  // Filter for capsules that can be assigned
  const assignableCapsules = availableCapsules.filter(capsule => 
    capsule.cleaningStatus === "cleaned" && 
    capsule.isAvailable && 
    capsule.toRent !== false &&
    (capsule.canAssign !== false)
  );
  
  console.log('✅ Assignable capsules:', assignableCapsules.length);
  
  if (assignableCapsules.length === 0) {
    console.warn('❌ No assignable capsules found after filtering');
    return "";
  }
  
  // Parse capsule numbers for sorting
  const capsulesWithNumbers = assignableCapsules.map(capsule => {
    const match = capsule.number.match(/C(\d+)/);
    const numericValue = match ? parseInt(match[1]) : 0;
    return { ...capsule, numericValue, originalNumber: capsule.number };
  });

  let recommendedCapsule = "";
  
  if (gender === "female") {
    // For females: back capsules with lowest number first
    const backCapsules = capsulesWithNumbers
      .filter(c => c.section === "back")
      .sort((a, b) => a.numericValue - b.numericValue);
    
    console.log('👩 Female assignment - Back capsules found:', backCapsules.map(c => c.originalNumber));
    
    if (backCapsules.length > 0) {
      recommendedCapsule = backCapsules[0].originalNumber;
      console.log('✅ Female assigned to back capsule:', recommendedCapsule);
    } else {
      console.warn('⚠️ No back capsules available for female, will use fallback');
    }
  } else {
    // For non-females: front capsules with lowest number first
    const frontCapsules = capsulesWithNumbers
      .filter(c => c.section === "front")
      .sort((a, b) => a.numericValue - b.numericValue);
    
    console.log('👨 Male assignment - Front capsules found:', frontCapsules.map(c => c.originalNumber));
    
    if (frontCapsules.length > 0) {
      recommendedCapsule = frontCapsules[0].originalNumber;
      console.log('✅ Male assigned to front capsule:', recommendedCapsule);
    } else {
      console.warn('⚠️ No front capsules available for male, will use fallback');
    }
  }

  // Fallback: any available capsule in sequential order
  if (!recommendedCapsule) {
    const sortedCapsules = capsulesWithNumbers.sort((a, b) => a.numericValue - b.numericValue);
    recommendedCapsule = sortedCapsules[0]?.originalNumber || "";
    console.log('🔄 Using fallback capsule (lowest number):', recommendedCapsule);
  }

  console.log('🎯 Final recommendation:', recommendedCapsule);
  return recommendedCapsule;
}