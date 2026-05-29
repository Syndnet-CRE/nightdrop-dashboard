import { useState, useEffect, useRef } from 'react';

/**
 * Build a Mapbox Geocoding API v6 forward URL
 * @param {string} query - The search query
 * @param {string} token - Mapbox API token
 * @param {object} opts - Optional overrides { limit, proximity, country }
 * @returns {string} The full Mapbox Geocoding API URL
 */
export function buildGeocodeUrl(query, token, opts = {}) {
  const limit = opts.limit ?? 5;
  const proximity = opts.proximity ?? '-97.7431,30.2672';
  const country = opts.country ?? 'us';
  const types = 'address,street,place';

  const params = new URLSearchParams({
    q: query,
    access_token: token,
    country,
    limit: String(limit),
    types,
    proximity,
  });

  return `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
}

/**
 * Parse a Mapbox Geocoding API v6 FeatureCollection response
 * @param {object} json - The JSON response from Mapbox
 * @returns {array} Array of { id, label, address, lat, lng }
 */
export function parseGeocodeResponse(json) {
  if (!json || !Array.isArray(json.features)) {
    return [];
  }

  return json.features
    .map((feature) => {
      try {
        const { coordinates } = feature.geometry || {};
        if (!coordinates || coordinates.length < 2) {
          return null;
        }
        const [lng, lat] = coordinates;
        const props = feature.properties || {};
        // Mapbox Geocoding v6 exposes `full_address` and `place_formatted`
        // (not v5's `place_name`). Prefer the full address, fall back to
        // name + place_formatted, then v5 place_name, then bare name.
        const full =
          props.full_address ||
          (props.name && props.place_formatted ? `${props.name}, ${props.place_formatted}` : '') ||
          props.place_name ||
          props.name ||
          '';
        const address = full.replace(/,\s*United States$/i, '').trim();
        return {
          id: feature.id || props.mapbox_id || `${lat},${lng}`,
          label: props.name || address,
          address,
          lat,
          lng,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Geocode hook with debounce, caching, and request cancellation
 * @param {string} query - The search query
 * @param {object} opts - { token, enabled }
 * @returns {object} { suggestions, loading, error }
 */
export function useGeocode(query, { token = '', enabled = true } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const shouldFetch = trimmedQuery.length >= 3 && !!token && enabled;

    // Clear any pending debounce / in-flight request synchronously.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // All setState happens inside a scheduled callback (timeout/promise), not
    // synchronously in the effect body, per react-hooks/set-state-in-effect.
    if (!shouldFetch) {
      timeoutRef.current = setTimeout(() => {
        setSuggestions([]);
        setError(null);
        setLoading(false);
      }, 0);
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }

    if (cacheRef.current.has(trimmedQuery)) {
      timeoutRef.current = setTimeout(() => {
        setSuggestions(cacheRef.current.get(trimmedQuery));
        setError(null);
        setLoading(false);
      }, 0);
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }

    const ac = new AbortController();
    abortControllerRef.current = ac;

    timeoutRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(buildGeocodeUrl(trimmedQuery, token), { signal: ac.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((json) => {
          const parsed = parseGeocodeResponse(json);
          cacheRef.current.set(trimmedQuery, parsed);
          setSuggestions(parsed);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setSuggestions([]);
          setError(err.message || 'Geocoding failed');
          setLoading(false);
        });
    }, 350);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ac.abort();
    };
  }, [query, token, enabled]);

  return { suggestions, loading, error };
}
