function getAuthorInitials(fullName) {
  if (!fullName) return '—';
  const parts = fullName.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
}

/**
 * Merge deal notes, contacts, and AI thread into a single activity list.
 * Filters contacts to call + email only (excludes in_person, other).
 * Returns items sorted descending by created_at.
 *
 * @param {Array} dealNotes - Note items with id, created_at, note_text
 * @param {Array} contacts - Contact items with id, channel, created_at, notes
 * @param {Array} aiThread - AI items with id, type, created_at, text
 * @param {string} authorInitials - Author initials for notes/contacts (from subscriber.full_name)
 * @returns {Array} Merged and sorted activity items
 */
export function mergeActivityItems(dealNotes = [], contacts = [], aiThread = [], authorInitials = '—') {
  const items = [
    ...dealNotes.map(n => ({
      id: n.id,
      type: 'note',
      created_at: n.created_at,
      text: n.note_text,
      author: authorInitials,
    })),
    ...contacts
      .map(c => ({
        id: c.id,
        type: c.channel === 'phone' ? 'call' : c.channel === 'email' ? 'email' : null,
        created_at: c.created_at,
        text: c.notes || '',
        author: authorInitials,
      }))
      .filter(i => i.type), // Filter to call + email only
    ...aiThread,
  ];

  // Sort descending by created_at
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return items;
}

export { getAuthorInitials };
