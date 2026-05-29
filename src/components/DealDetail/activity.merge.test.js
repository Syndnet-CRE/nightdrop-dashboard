import { describe, it, expect } from 'vitest';
import { mergeActivityItems, getAuthorInitials } from './activity.merge';

describe('mergeActivityItems', () => {
  it('returns empty array when all inputs are empty', () => {
    const items = mergeActivityItems([], [], [], 'MC');
    expect(items).toEqual([]);
  });

  it('merges notes and contacts into single list', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'Note 1' }
    ];
    const contacts = [
      { id: '2', channel: 'phone', created_at: '2026-05-20T11:00:00Z', notes: 'Called owner' }
    ];

    const items = mergeActivityItems(notes, contacts, [], 'MC');

    expect(items).toHaveLength(2);
    expect(items[0].type).toBe('call'); // most recent first
    expect(items[1].type).toBe('note');
  });

  it('converts phone channel to call type', () => {
    const contacts = [
      { id: '1', channel: 'phone', created_at: '2026-05-20T10:00:00Z', notes: 'Called' }
    ];

    const items = mergeActivityItems([], contacts, [], 'MC');

    expect(items[0].type).toBe('call');
  });

  it('converts email channel to email type', () => {
    const contacts = [
      { id: '1', channel: 'email', created_at: '2026-05-20T10:00:00Z', notes: 'Emailed' }
    ];

    const items = mergeActivityItems([], contacts, [], 'MC');

    expect(items[0].type).toBe('email');
  });

  it('filters out in_person and other channels', () => {
    const contacts = [
      { id: '1', channel: 'phone', created_at: '2026-05-20T10:00:00Z', notes: 'Phone' },
      { id: '2', channel: 'in_person', created_at: '2026-05-20T11:00:00Z', notes: 'In person' },
      { id: '3', channel: 'other', created_at: '2026-05-20T12:00:00Z', notes: 'Other' }
    ];

    const items = mergeActivityItems([], contacts, [], 'MC');

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('call');
  });

  it('interleaves AI thread items by created_at', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'Note' }
    ];
    const aiThread = [
      { id: '2', type: 'ai_question', created_at: '2026-05-20T11:00:00Z', text: 'Question' },
      { id: '3', type: 'ai', created_at: '2026-05-20T11:30:00Z', text: 'Answer' }
    ];

    const items = mergeActivityItems(notes, [], aiThread, 'MC');

    expect(items).toHaveLength(3);
    expect(items[0].created_at).toBe('2026-05-20T11:30:00Z'); // most recent
    expect(items[1].created_at).toBe('2026-05-20T11:00:00Z');
    expect(items[2].created_at).toBe('2026-05-20T10:00:00Z');
  });

  it('sorts all items descending by created_at', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'Old' }
    ];
    const contacts = [
      { id: '2', channel: 'phone', created_at: '2026-05-20T12:00:00Z', notes: 'Recent' }
    ];
    const aiThread = [
      { id: '3', type: 'ai', created_at: '2026-05-20T11:00:00Z', text: 'Middle' }
    ];

    const items = mergeActivityItems(notes, contacts, aiThread, 'MC');

    expect(items[0].created_at).toBe('2026-05-20T12:00:00Z');
    expect(items[1].created_at).toBe('2026-05-20T11:00:00Z');
    expect(items[2].created_at).toBe('2026-05-20T10:00:00Z');
  });

  it('assigns author initials to notes and contacts', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'Note' }
    ];
    const contacts = [
      { id: '2', channel: 'phone', created_at: '2026-05-20T11:00:00Z', notes: 'Call' }
    ];

    const items = mergeActivityItems(notes, contacts, [], 'BR');

    expect(items.every(i => i.author === 'BR')).toBe(true);
  });

  it('uses default author if not provided', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'Note' }
    ];

    const items = mergeActivityItems(notes, [], []);

    expect(items[0].author).toBe('—');
  });

  it('handles contact without notes field', () => {
    const contacts = [
      { id: '1', channel: 'phone', created_at: '2026-05-20T10:00:00Z' }
      // no notes field
    ];

    const items = mergeActivityItems([], contacts, [], 'MC');

    expect(items[0].text).toBe('');
  });

  it('preserves all original properties in items', () => {
    const notes = [
      { id: 'note-1', created_at: '2026-05-20T10:00:00Z', note_text: 'My note' }
    ];

    const items = mergeActivityItems(notes, [], [], 'MC');

    expect(items[0]).toEqual({
      id: 'note-1',
      type: 'note',
      created_at: '2026-05-20T10:00:00Z',
      text: 'My note',
      author: 'MC'
    });
  });

  it('handles mixed array of 2 notes and 1 contact', () => {
    const notes = [
      { id: '1', created_at: '2026-05-20T10:00:00Z', note_text: 'First note' },
      { id: '2', created_at: '2026-05-20T11:00:00Z', note_text: 'Second note' }
    ];
    const contacts = [
      { id: '3', channel: 'phone', created_at: '2026-05-20T09:00:00Z', notes: 'Call' }
    ];

    const items = mergeActivityItems(notes, contacts, [], 'MC');

    expect(items).toHaveLength(3);
    expect(items[0].id).toBe('2'); // most recent note
    expect(items[1].id).toBe('1'); // older note
    expect(items[2].id).toBe('3'); // oldest contact
  });
});

describe('getAuthorInitials', () => {
  it('returns first and last initials for full name', () => {
    expect(getAuthorInitials('Marcus Chen')).toBe('MC');
    expect(getAuthorInitials('Brady Irwin')).toBe('BI');
  });

  it('returns initials with multiple words (first + last)', () => {
    expect(getAuthorInitials('Mary Jane Watson')).toBe('MW');
  });

  it('returns first 2 chars for single word name', () => {
    expect(getAuthorInitials('Alice')).toBe('AL');
  });

  it('returns em-dash for empty string', () => {
    expect(getAuthorInitials('')).toBe('—');
  });

  it('returns em-dash for null', () => {
    expect(getAuthorInitials(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(getAuthorInitials(undefined)).toBe('—');
  });
});
