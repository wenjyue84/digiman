// Utility functions for guest table formatting and display

export function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export function truncateName(name: string): string {
  return name.length > 12 ? name.slice(0, 12) + '..' : name;
}

export function getFirstInitial(name: string): string {
  return name.charAt(0).toUpperCase();
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

export function formatShortDateTime(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  
  // Malaysian standard: day/month
  return `${day}/${month} ${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Malaysian standard: day/month
  return `${day}/${month}`;
}

export const ROW_HEIGHT = 56;