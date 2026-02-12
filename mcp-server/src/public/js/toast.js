/**
 * Display a toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info')
 */
export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  const colors = type === 'success' ? 'bg-success-500' : type === 'error' ? 'bg-danger-500' : 'bg-blue-500';
  el.className = `toast ${colors} text-white text-sm px-4 py-2 rounded-2xl shadow-medium`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
