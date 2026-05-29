/* Pure helpers for DealOwnerGraph. No React, no canvas. Tested in
   ownerGraph.helpers.test.js. */

/**
 * Derive a short (<=5 char) entity badge for the owner node from a deal's
 * entityType / owner_type. Previously the graph hardcoded 'LLC' for every
 * owner; this reads the real type so a Trust no longer reads "LLC".
 *
 * @param {{ entityType?: string, owner_type?: string }|null} deal
 * @returns {string} e.g. 'LLC' | 'CORP' | 'TRUST' | 'LP' | 'IND' | 'OWN'
 */
export function ownerEntityBadge(deal) {
  const rawValue = deal?.entityType || deal?.owner_type || '';
  const raw = String(rawValue).toLowerCase().trim();
  if (!raw || raw === 'null' || raw === 'undefined') return 'OWN';
  if (raw.includes('llc')) return 'LLC';
  if (raw.includes('corp') || raw.includes('inc')) return 'CORP';
  if (raw.includes('trust')) return 'TRUST';
  if (raw.includes('partner') || /\bl[lp]p?\b/.test(raw)) return 'LP';
  if (raw.includes('individual') || raw.includes('person')) return 'IND';
  if (raw.includes('estate')) return 'EST';
  if (raw.includes('govern') || raw.includes('muni')) return 'GOV';
  return raw.slice(0, 5).toUpperCase();
}
