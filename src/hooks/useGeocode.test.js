import { describe, it, expect } from 'vitest';
import { buildGeocodeUrl, parseGeocodeResponse } from './useGeocode.js';

describe('buildGeocodeUrl', () => {
  const token = 'pk_test_123';

  it('encodes query and includes required params', () => {
    const url = buildGeocodeUrl('123 Main St Austin TX', token);
    expect(url).toContain('https://api.mapbox.com/search/geocode/v6/forward');
    expect(url).toMatch(/q=[^&]+/);
    expect(url).toContain('access_token=pk_test_123');
    expect(url).toContain('country=us');
  });

  it('defaults to Austin TX proximity', () => {
    const url = buildGeocodeUrl('main st', token);
    expect(url).toContain('-97.7431');
    expect(url).toContain('30.2672');
    expect(url).toContain('proximity=');
  });

  it('defaults to limit=5', () => {
    const url = buildGeocodeUrl('main st', token);
    expect(url).toContain('limit=5');
  });

  it('includes types=address,street,place', () => {
    const url = buildGeocodeUrl('main st', token);
    expect(url).toContain('types=');
    expect(url).toContain('address');
    expect(url).toContain('street');
    expect(url).toContain('place');
  });

  it('allows opts to override limit', () => {
    const url = buildGeocodeUrl('main st', token, { limit: 10 });
    expect(url).toContain('limit=10');
  });

  it('allows opts to override proximity', () => {
    const url = buildGeocodeUrl('main st', token, { proximity: '-118.2437,34.0522' });
    expect(url).toContain('-118.2437');
    expect(url).toContain('34.0522');
  });

  it('allows opts to override country', () => {
    const url = buildGeocodeUrl('main st', token, { country: 'mx' });
    expect(url).toContain('country=mx');
  });

  it('URL-encodes special characters', () => {
    const url = buildGeocodeUrl('123 & 456', token);
    expect(url).toMatch(/q=[^&]*%26[^&]*/);
  });
});

describe('parseGeocodeResponse', () => {
  const validV6Response = {
    type: 'FeatureCollection',
    features: [
      {
        id: 'address-1',
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-97.7431, 30.2672],
        },
        properties: {
          name: '123 Main Street',
          place_formatted: 'Austin, Texas 78701, United States',
          full_address: '123 Main Street, Austin, Texas 78701, United States',
        },
      },
      {
        id: 'place-2',
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-97.7469, 30.2711],
        },
        properties: {
          name: 'Main Street',
          place_formatted: 'Austin, Texas, United States',
          full_address: 'Main Street, Austin, Texas, United States',
        },
      },
    ],
  };

  it('maps v6 features to suggestions, trimming the country suffix', () => {
    const suggestions = parseGeocodeResponse(validV6Response);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toEqual({
      id: 'address-1',
      label: '123 Main Street',
      address: '123 Main Street, Austin, Texas 78701',
      lat: 30.2672,
      lng: -97.7431,
    });
    expect(suggestions[1]).toEqual({
      id: 'place-2',
      label: 'Main Street',
      address: 'Main Street, Austin, Texas',
      lat: 30.2711,
      lng: -97.7469,
    });
  });

  it('falls back to name + place_formatted when full_address is absent', () => {
    const r = parseGeocodeResponse({ features: [
      { id: 'x', properties: { name: '500 W 2nd St', place_formatted: 'Austin, Texas' }, geometry: { coordinates: [-97.75, 30.27] } },
    ] });
    expect(r[0].address).toBe('500 W 2nd St, Austin, Texas');
  });

  it('returns empty array for null response', () => {
    expect(parseGeocodeResponse(null)).toEqual([]);
  });

  it('returns empty array for undefined response', () => {
    expect(parseGeocodeResponse(undefined)).toEqual([]);
  });

  it('returns empty array for missing features', () => {
    expect(parseGeocodeResponse({ type: 'FeatureCollection' })).toEqual([]);
  });

  it('returns empty array for non-array features', () => {
    expect(parseGeocodeResponse({ features: {} })).toEqual([]);
  });

  it('skips malformed features with missing geometry', () => {
    const malformed = {
      features: [
        { id: 'good', properties: { name: 'Test' }, geometry: { coordinates: [-97.7, 30.2] } },
        { id: 'bad', properties: { name: 'Missing Geometry' } },
      ],
    };
    const suggestions = parseGeocodeResponse(malformed);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe('good');
  });

  it('falls back to the bare name when no formatted address is present', () => {
    const response = {
      features: [
        {
          id: 'test-1',
          properties: { name: 'Just Name' },
          geometry: { coordinates: [-97.7, 30.2] },
        },
      ],
    };
    const suggestions = parseGeocodeResponse(response);
    expect(suggestions[0]).toEqual({
      id: 'test-1',
      label: 'Just Name',
      address: 'Just Name',
      lat: 30.2,
      lng: -97.7,
    });
  });
});

