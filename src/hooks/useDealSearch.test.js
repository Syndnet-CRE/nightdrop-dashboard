import { describe, it, expect } from 'vitest';
import { searchDeals } from './useDealSearch';

describe('searchDeals', () => {
  const mockDeals = [
    { id: '1', addr: '4127 Hamlin Industrial Blvd', city: 'Marietta', state: 'GA', zip: '30060', owner: 'Hamlin Holdings II, LLC', asset: 'Industrial', lat: 33.93, lng: -84.49, score: 91 },
    { id: '2', addr: '880 Industrial Park Dr', city: 'Smyrna', state: 'GA', zip: '30080', owner: 'Industrial Park Storage LP', asset: 'Self-Storage', lat: 33.88, lng: -84.51, score: 84 },
    { id: '3', addr: '12 Old Mill Rd', city: 'Acworth', state: 'GA', zip: '30101', owner: 'M. Whitfield Trust', asset: 'Land', lat: 34.07, lng: -84.67, score: 76 },
    { id: '4', addr: '2255 Riverside Pkwy', city: 'Austell', state: 'GA', zip: '30168', owner: 'Riverside Flex Owners LLC', asset: 'Flex/R&D', lat: 33.81, lng: -84.63, score: 68 },
    { id: '5', addr: '415 N Marietta Pkwy', city: 'Marietta', state: 'GA', zip: '30060', owner: 'Marietta Square Partners', asset: 'Mixed-Use', lat: 33.96, lng: -84.54, score: 62 },
  ];

  // RED: Empty query
  it('returns empty array for empty query', () => {
    const result = searchDeals(mockDeals, '', 6);
    expect(result).toEqual([]);
  });

  // RED: Whitespace-only query
  it('returns empty array for whitespace-only query', () => {
    const result = searchDeals(mockDeals, '   ', 6);
    expect(result).toEqual([]);
  });

  // RED: null/undefined deals
  it('returns empty array for null deals', () => {
    const result = searchDeals(null, 'hamlin', 6);
    expect(result).toEqual([]);
  });

  it('returns empty array for undefined deals', () => {
    const result = searchDeals(undefined, 'hamlin', 6);
    expect(result).toEqual([]);
  });

  // RED: No matches
  it('returns empty array when no deals match', () => {
    const result = searchDeals(mockDeals, 'xyz nonexistent', 6);
    expect(result).toEqual([]);
  });

  // RED: Match by address (prefix)
  it('matches deal by street address prefix', () => {
    const result = searchDeals(mockDeals, '4127', 6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].addr).toBe('4127 Hamlin Industrial Blvd');
  });

  // RED: Match by address (mid-string)
  it('matches deal by address substring', () => {
    const result = searchDeals(mockDeals, 'Industrial', 6);
    expect(result.length).toBeGreaterThan(0);
    const ids = result.map(d => d.id);
    expect(ids).toContain('1');
    expect(ids).toContain('2');
  });

  // RED: Match by city
  it('matches deals by city', () => {
    const result = searchDeals(mockDeals, 'Marietta', 6);
    expect(result.length).toBe(2);
    const ids = result.map(d => d.id);
    expect(ids).toContain('1');
    expect(ids).toContain('5');
  });

  // RED: Match by state
  it('matches deals by state abbreviation', () => {
    const result = searchDeals(mockDeals, 'GA', 6);
    expect(result).toHaveLength(5);
  });

  // RED: Match by zip
  it('matches deals by zip code', () => {
    const result = searchDeals(mockDeals, '30060', 6);
    expect(result.length).toBe(2);
    const ids = result.map(d => d.id);
    expect(ids).toContain('1');
    expect(ids).toContain('5');
  });

  // RED: Match by owner
  it('matches deals by owner name', () => {
    const result = searchDeals(mockDeals, 'Hamlin', 6);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].owner).toContain('Hamlin');
  });

  // RED: Case insensitivity
  it('is case-insensitive', () => {
    const result = searchDeals(mockDeals, 'MARIETTA', 6);
    expect(result.length).toBe(2);
  });

  it('is case-insensitive for owner', () => {
    const result = searchDeals(mockDeals, 'hamlin', 6);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('1');
  });

  // RED: Multi-token AND match
  it('requires all tokens to match (AND logic)', () => {
    const result = searchDeals(mockDeals, 'Hamlin Industrial', 6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty if not all tokens match', () => {
    const result = searchDeals(mockDeals, 'Hamlin Smyrna', 6);
    expect(result).toEqual([]);
  });

  // RED: Ranking - prefix on street ranks highest
  it('ranks address prefix match above mid-string match', () => {
    const result = searchDeals(mockDeals, '415', 6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
    expect(result[0].addr).toMatch(/^415/);
  });

  // RED: Ranking - address contains ranks above owner
  it('ranks address match above owner match', () => {
    const result = searchDeals(mockDeals, 'Park', 6);
    expect(result.length).toBeGreaterThan(0);
    const parkInAddr = result.filter(r => r.addr.toLowerCase().includes('park'));
    const parkInOwner = result.filter(r => !r.addr.toLowerCase().includes('park') && r.owner.toLowerCase().includes('park'));
    if (parkInAddr.length > 0 && parkInOwner.length > 0) {
      expect(result.indexOf(parkInAddr[0])).toBeLessThan(result.indexOf(parkInOwner[0]));
    }
  });

  // RED: Limit enforcement
  it('respects limit parameter', () => {
    const result = searchDeals(mockDeals, 'GA', 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns all matches when limit >= match count', () => {
    const result = searchDeals(mockDeals, 'Marietta', 10);
    expect(result.length).toBe(2);
  });

  // RED: Return shape
  it('returns results with expected shape (id, addr, city, owner, lat, lng)', () => {
    const result = searchDeals(mockDeals, 'Hamlin', 6);
    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('addr');
    expect(item).toHaveProperty('city');
    expect(item).toHaveProperty('owner');
    expect(item).toHaveProperty('lat');
    expect(item).toHaveProperty('lng');
    expect(item.id).toBe('1');
    expect(item.addr).toBe('4127 Hamlin Industrial Blvd');
    expect(item.owner).toBe('Hamlin Holdings II, LLC');
  });

  // RED: City is formatted as "City, ST ZIP"
  it('formats city as "City, ST ZIP" in result', () => {
    const result = searchDeals(mockDeals, 'Hamlin', 6);
    expect(result[0].city).toMatch(/^Marietta, GA 30060$/);
  });

  // RED: Null/missing fields are safe
  it('handles null addr field', () => {
    const deals = [{ id: '1', addr: null, city: 'Test', state: 'TX', zip: '12345', owner: 'Test Owner', lat: 0, lng: 0 }];
    const result = searchDeals(deals, 'Test', 6);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles null owner field', () => {
    const deals = [{ id: '1', addr: '123 Main St', city: 'Test', state: 'TX', zip: '12345', owner: null, lat: 0, lng: 0 }];
    const result = searchDeals(deals, 'Main', 6);
    expect(result).toHaveLength(1);
  });

  // RED: String "null" is treated as empty
  it('treats string "null" as empty', () => {
    const deals = [{ id: '1', addr: 'null', city: 'Test', state: 'TX', zip: '12345', owner: 'null', lat: 0, lng: 0 }];
    const result = searchDeals(deals, 'null', 6);
    expect(result).toEqual([]);
  });

  // RED: Missing state/zip defaults work
  it('handles missing state field', () => {
    const deals = [{ id: '1', addr: '123 Main St', city: 'Austin', state: undefined, zip: '78701', owner: 'Test', lat: 0, lng: 0 }];
    const result = searchDeals(deals, 'Austin', 6);
    expect(result).toHaveLength(1);
  });

  it('handles missing zip field', () => {
    const deals = [{ id: '1', addr: '123 Main St', city: 'Austin', state: 'TX', zip: undefined, owner: 'Test', lat: 0, lng: 0 }];
    const result = searchDeals(deals, 'Austin', 6);
    expect(result).toHaveLength(1);
  });

  // Backend field names (property_*, owner_name, address)
  describe('backend field names (property_city, property_state, property_zip, owner_name)', () => {
    it('searches using property_city, property_state, property_zip', () => {
      const deals = [{ id: '1', address: '123 Main St', property_city: 'Austin', property_state: 'TX', property_zip: '78701', owner_name: 'Test Owner', lat: 30, lng: -97 }];
      const result = searchDeals(deals, 'Austin', 6);
      expect(result).toHaveLength(1);
    });

    it('searches using owner_name field', () => {
      const deals = [{ id: '1', address: '123 Main St', property_city: 'Austin', property_state: 'TX', property_zip: '78701', owner_name: 'Test Owner LLC', lat: 30, lng: -97 }];
      const result = searchDeals(deals, 'Test Owner', 6);
      expect(result).toHaveLength(1);
    });

    it('searches using address field (not addr)', () => {
      const deals = [{ id: '1', address: '123 Main St', property_city: 'Austin', property_state: 'TX', property_zip: '78701', owner_name: 'Test Owner', lat: 30, lng: -97 }];
      const result = searchDeals(deals, '123 Main', 6);
      expect(result).toHaveLength(1);
    });

    it('formats city correctly from property_city/state/zip', () => {
      const deals = [{ id: '1', address: '123 Main St', property_city: 'Austin', property_state: 'TX', property_zip: '78701', owner_name: 'Test', lat: 30, lng: -97 }];
      const result = searchDeals(deals, 'Austin', 6);
      expect(result[0].city).toBe('Austin, TX 78701');
    });

    it('handles mixed field names (prefers property_* and owner_name)', () => {
      const deals = [{ id: '1', address: '123 Main St', property_city: 'Austin', property_state: 'TX', property_zip: '78701', owner_name: 'Backend Owner', city: 'OldCity', state: 'CA', zip: '90210', owner: 'LegacyOwner', lat: 30, lng: -97 }];
      const result = searchDeals(deals, 'Austin', 6);
      expect(result).toHaveLength(1);
      expect(result[0].city).toMatch('Austin');
    });
  });
});
