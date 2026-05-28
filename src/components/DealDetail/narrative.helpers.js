/**
 * Get narrative from deal with fallback chain.
 * Priority: narrative > briefJson.narrative > brief_json.narrative > brief
 *
 * @param {object} deal - Deal object
 * @returns {string|null} Narrative text or null
 */
export function getNarrative(deal) {
  if (!deal) return null;

  return (
    deal.narrative ??
    deal.briefJson?.narrative ??
    deal.brief_json?.narrative ??
    deal.brief ??
    null
  );
}

/**
 * Get tags array from deal.
 * Priority: briefJson.tags > brief_json.tags
 *
 * @param {object} deal - Deal object
 * @returns {Array} Tags array (empty if not found)
 */
export function getTags(deal) {
  if (!deal) return [];

  return deal.briefJson?.tags ?? deal.brief_json?.tags ?? [];
}

/**
 * Get recommendation from deal.
 * Priority: briefJson.recommendation > brief_json.recommendation
 *
 * @param {object} deal - Deal object
 * @returns {string|null} Recommendation text or null
 */
export function getRecommendation(deal) {
  if (!deal) return null;

  return deal.briefJson?.recommendation ?? deal.brief_json?.recommendation ?? null;
}

/**
 * Get offer range from deal.
 * Priority: briefJson.offer_range > brief_json.offer_range
 *
 * @param {object} deal - Deal object
 * @returns {string|null} Offer range or null
 */
export function getOfferRange(deal) {
  if (!deal) return null;

  return deal.briefJson?.offer_range ?? deal.brief_json?.offer_range ?? null;
}
