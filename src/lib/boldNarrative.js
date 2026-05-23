// Frontend regex-bold for LLM-produced narrative prose.
// Wraps dollar amounts, square footage / acreage, 4-digit years, and
// supplied geo tokens (deal.city / county / state / msa / submarket) in
// <strong> tags so the eye can scan numbers + place names without reading
// every word.

import { createElement } from 'react';

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function boldNarrative(text, geoTokens) {
  if (!text || typeof text !== 'string') return null;
  const patterns = [
    /\$[\d,]+(?:\.\d+)?\s*[KMB]?/g,
    /\b[\d,]+(?:\.\d+)?\s*(?:sf|sq\s*ft|acres?|ac)\b/gi,
    /\b(?:19|20)\d{2}\b/g,
  ];
  const geoSet = (geoTokens || [])
    .filter((t) => typeof t === 'string' && t.trim().length > 1)
    .map((t) => new RegExp(`\\b${escapeRegex(t.trim())}\\b`, 'gi'));
  const matches = [];
  [...patterns, ...geoSet].forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const deduped = [];
  for (const m of matches) {
    const last = deduped[deduped.length - 1];
    if (!last || m.start >= last.end) deduped.push(m);
  }
  if (!deduped.length) return text;
  const out = [];
  let cursor = 0;
  deduped.forEach((m, i) => {
    if (cursor < m.start) out.push(text.slice(cursor, m.start));
    out.push(createElement('strong', { key: `b-${i}` }, m.text));
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
