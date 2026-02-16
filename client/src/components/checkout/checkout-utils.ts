/**
 * Shared utility functions for checkout components.
 * These are pure helper functions with no React dependencies.
 */

export function formatDuration(checkinTime: string): string {
  const checkin = new Date(checkinTime);
  const now = new Date();
  const diff = now.getTime() - checkin.getTime();

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  // If stay is 24 hours or more, show days and hours
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (remainingHours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
    }
  }

  // For stays less than 24 hours, show hours and minutes
  if (totalHours === 0) {
    return `${minutes}m`;
  }

  return `${totalHours}h ${minutes}m`;
}

export function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export function getGenderIcon(gender?: string) {
  if (gender === 'female') {
    return { icon: '♀', bgColor: 'bg-pink-100', textColor: 'text-pink-600' };
  } else if (gender === 'male') {
    return { icon: '♂', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
  }
  // For other/unspecified/no gender - use purple
  return { icon: null, bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
}

export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getToday(): string {
  return getDateString(new Date());
}

export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateString(date);
}

export function getTomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getDateString(date);
}

export function getLengthOfStayDays(checkinTime: string): number {
  const checkin = new Date(checkinTime);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - checkin.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function isDateToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return dateStr.slice(0, 10) === todayStr;
  } catch {
    return false;
  }
}
