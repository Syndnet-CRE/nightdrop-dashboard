import { describe, it, expect } from 'vitest';
import { ownerEntityBadge } from './ownerGraph.helpers.js';

/**
 * Item (C): the owner node in DealOwnerGraph previously hardcoded the badge
 * text 'LLC' for every owner regardless of the real entity type. This helper
 * derives a short (<=5 char) badge from the deal's entityType / owner_type so
 * a Trust no longer reads "LLC".
 */
describe('ownerEntityBadge', () => {
  it('maps LLC variants to LLC', () => {
    expect(ownerEntityBadge({ entityType: 'LLC' })).toBe('LLC');
    expect(ownerEntityBadge({ entityType: 'LLC/Corp' })).toBe('LLC');
    expect(ownerEntityBadge({ owner_type: 'llc' })).toBe('LLC');
  });

  it('maps corporations and inc to CORP', () => {
    expect(ownerEntityBadge({ entityType: 'Corporation' })).toBe('CORP');
    expect(ownerEntityBadge({ owner_type: 'corporate' })).toBe('CORP');
    expect(ownerEntityBadge({ entityType: 'Acme Inc' })).toBe('CORP');
  });

  it('maps trusts to TRUST', () => {
    expect(ownerEntityBadge({ entityType: 'Family Trust' })).toBe('TRUST');
    expect(ownerEntityBadge({ owner_type: 'trust' })).toBe('TRUST');
  });

  it('maps partnerships / LP / LLP to LP', () => {
    expect(ownerEntityBadge({ entityType: 'Partnership' })).toBe('LP');
    expect(ownerEntityBadge({ entityType: 'LP' })).toBe('LP');
    expect(ownerEntityBadge({ entityType: 'LLP' })).toBe('LP');
  });

  it('maps individuals to IND', () => {
    expect(ownerEntityBadge({ entityType: 'Individual' })).toBe('IND');
    expect(ownerEntityBadge({ owner_type: 'individual' })).toBe('IND');
  });

  it('prefers entityType over owner_type', () => {
    expect(ownerEntityBadge({ entityType: 'Trust', owner_type: 'llc' })).toBe('TRUST');
  });

  it('falls back to OWN when entity type is missing or unknown-empty', () => {
    expect(ownerEntityBadge({})).toBe('OWN');
    expect(ownerEntityBadge({ entityType: '' })).toBe('OWN');
    expect(ownerEntityBadge({ entityType: 'null' })).toBe('OWN');
    expect(ownerEntityBadge(null)).toBe('OWN');
  });

  it('uppercases a short unknown type rather than guessing', () => {
    expect(ownerEntityBadge({ entityType: 'REIT' })).toBe('REIT');
  });
});
