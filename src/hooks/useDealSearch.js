import { useMemo } from 'react';

/**
 * Pure search function for filtering and ranking deals by address, city, state, zip, and owner.
 * Handles both current backend field names (addr, property_city, property_state, property_zip, owner_name)
 * and legacy names (address, city, state, zip, owner).
 *
 * @param {Array|null|undefined} deals - Array of deal objects
 * @param {string} query - Search query (space-separated tokens)
 * @param {number} limit - Maximum results to return (default 6)
 * @returns {Array} Ranked deal results with shape { id, addr, city, owner, lat, lng }
 */
export function searchDeals(deals, query, limit = 6) {
  // Handle null/undefined deals or empty query
  if (!deals || !Array.isArray(deals)) {
    return [];
  }

  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    return [];
  }

  // Split query into tokens (all must match)
  const tokens = trimmedQuery.split(/\s+/).map(t => t.toLowerCase());

  // Score and filter deals
  const scored = deals
    .map(deal => ({
      deal,
      score: scoreMatch(deal, tokens),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ deal }) => ({
      id: deal.id,
      addr: extractAddr(deal),
      city: extractCity(deal),
      owner: extractOwner(deal),
      lat: deal.lat,
      lng: deal.lng,
    }));

  return scored;
}

/**
 * Thin React hook wrapping searchDeals with useMemo.
 *
 * @param {string} query - Search query
 * @param {Array} deals - Array of deals
 * @param {number} limit - Max results (default 6)
 * @returns {Array} Memoized search results
 */
export function useDealSearch(query, deals, limit = 6) {
  return useMemo(() => searchDeals(deals, query, limit), [deals, query, limit]);
}

/**
 * Extract address from deal, trying both current and legacy field names.
 */
function extractAddr(deal) {
  const addr = deal.addr || deal.address || '';
  return cleanValue(addr);
}

/**
 * Extract city as "City, ST ZIP" from deal, handling both backend shapes.
 * Tries: (property_city, property_state, property_zip) first, then (city, state, zip).
 */
function extractCity(deal) {
  const city = deal.property_city || deal.city || '';
  const state = deal.property_state || deal.state || '';
  const zip = deal.property_zip || deal.zip || '';

  return formatCity(cleanValue(city), cleanValue(state), cleanValue(zip));
}

/**
 * Extract owner name from deal, trying both current and legacy field names.
 */
function extractOwner(deal) {
  const owner = deal.owner_name || deal.owner || '';
  return cleanValue(owner);
}

/**
 * Score a single deal against all query tokens.
 * All tokens must match somewhere (AND logic).
 *
 * Scoring tiers:
 * 1. Address prefix match: +1000
 * 2. Address contains match: +500
 * 3. City/state/zip match: +100
 * 4. Owner match: +50
 */
function scoreMatch(deal, tokens) {
  const addr = extractAddr(deal).toLowerCase();
  const city = (deal.property_city || deal.city || '').toLowerCase();
  const state = (deal.property_state || deal.state || '').toLowerCase();
  const zip = (deal.property_zip || deal.zip || '').toLowerCase();
  const owner = extractOwner(deal).toLowerCase();

  let totalScore = 0;

  for (const token of tokens) {
    if (!token) continue;

    let tokenScore = 0;

    // Address prefix
    if (addr.startsWith(token)) {
      tokenScore = 1000;
    }
    // Address contains
    else if (addr.includes(token)) {
      tokenScore = 500;
    }
    // City match
    else if (city.includes(token)) {
      tokenScore = 100;
    }
    // State match
    else if (state.includes(token)) {
      tokenScore = 100;
    }
    // Zip match
    else if (zip.includes(token)) {
      tokenScore = 100;
    }
    // Owner match
    else if (owner.includes(token)) {
      tokenScore = 50;
    }

    // If token didn't match anywhere, AND fails
    if (tokenScore === 0) {
      return 0;
    }

    totalScore += tokenScore;
  }

  return totalScore;
}

/**
 * Clean value: null, undefined, or string "null" becomes empty string.
 */
function cleanValue(val) {
  if (val === null || val === undefined || val === 'null') {
    return '';
  }
  return String(val).trim();
}

/**
 * Format city as "City, ST ZIP" or handle missing parts gracefully.
 */
function formatCity(city, state, zip) {
  const c = city.trim();
  const s = state.trim();
  const z = zip.trim();

  const parts = [c];
  if (s) {
    parts.push(s);
  }
  if (z) {
    if (s) {
      parts[1] = `${s} ${z}`;
    } else {
      parts.push(z);
    }
  }

  return parts.filter(Boolean).join(', ');
}
