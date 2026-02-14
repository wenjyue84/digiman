/**
 * Static Replies Filter Module
 * Handles search and category filtering for static replies in the Responses tab
 */

// Module-level state: active filter category
let currentStaticPhase = 'all';

/**
 * Filter static replies by search term and category
 * Searches within intent names and reply content
 * Hides phase groups with no matching items
 */
export function filterStaticReplies() {
  const searchTerm = document.getElementById('static-search-input')?.value.toLowerCase() || '';

  // Filter phase groups and their reply items
  const phaseGroups = document.querySelectorAll('#static-intent-replies .reply-phase-group');
  phaseGroups.forEach(group => {
    const phase = group.dataset.phase;
    const matchesPhase = currentStaticPhase === 'all' || phase === currentStaticPhase;

    if (!matchesPhase) {
      group.style.display = 'none';
      return;
    }

    // Within visible groups, filter by search
    const items = group.querySelectorAll('.reply-item');
    let visibleCount = 0;
    items.forEach(item => {
      const content = item.textContent.toLowerCase();
      const matchesSearch = searchTerm === '' || content.includes(searchTerm);
      item.style.display = matchesSearch ? '' : 'none';
      if (matchesSearch) visibleCount++;
    });

    // Hide the entire group if no items match search
    group.style.display = visibleCount > 0 ? '' : 'none';
  });
}

/**
 * Filter static replies by category (guest journey phase)
 * Updates button styles to show active category
 * @param {string} category - Phase category ('all' or specific phase name)
 */
export function filterStaticCategory(category) {
  currentStaticPhase = category;

  // Update button styles
  document.querySelectorAll('.static-category-btn').forEach(btn => {
    const isActive = btn.dataset.category === category;
    btn.className = 'static-category-btn text-xs px-3 py-1.5 rounded-full border transition ' +
      (isActive ? 'bg-primary-500 text-white border-primary-500' : 'border-neutral-300 hover:bg-neutral-50');
  });

  // Apply filter
  filterStaticReplies();
}
