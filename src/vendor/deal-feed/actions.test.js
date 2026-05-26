import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installActionAdapters } from './actions.js';

function makeHost() {
  return {
    postFeedback: vi.fn(),
    saveNote: vi.fn(),
    updateStatus: vi.fn(),
    patchStage: vi.fn(),
    markRead: vi.fn(),
    toggleSave: vi.fn(),
    deleteDeal: vi.fn(),
    navigate: vi.fn(),
  };
}

describe('installActionAdapters', () => {
  let ND;
  beforeEach(() => {
    ND = {};
  });

  it('attaches ND.actions with all expected verbs', () => {
    installActionAdapters(ND, makeHost());
    expect(typeof ND.actions.toggleHot).toBe('function');
    expect(typeof ND.actions.toggleSave).toBe('function');
    expect(typeof ND.actions.saveNote).toBe('function');
    expect(typeof ND.actions.setStage).toBe('function');
    expect(typeof ND.actions.setStatus).toBe('function');
    expect(typeof ND.actions.markRead).toBe('function');
    expect(typeof ND.actions.deleteDeal).toBe('function');
    expect(typeof ND.actions.openDetail).toBe('function');
  });

  it('toggleHot flips null/other → "hot" and "hot" → null via postFeedback', () => {
    const host = makeHost();
    installActionAdapters(ND, host);

    ND.actions.toggleHot('deal-1', null);
    expect(host.postFeedback).toHaveBeenLastCalledWith('deal-1', 'hot');

    ND.actions.toggleHot('deal-1', 'cold');
    expect(host.postFeedback).toHaveBeenLastCalledWith('deal-1', 'hot');

    ND.actions.toggleHot('deal-1', 'hot');
    expect(host.postFeedback).toHaveBeenLastCalledWith('deal-1', null);

    expect(host.postFeedback).toHaveBeenCalledTimes(3);
  });

  it('toggleHot is a no-op when postFeedback is not provided', () => {
    installActionAdapters(ND, {});
    expect(() => ND.actions.toggleHot('deal-1', null)).not.toThrow();
  });

  it('saveNote proxies to host.saveNote(id, text)', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.saveNote('deal-1', 'remember me');
    expect(host.saveNote).toHaveBeenCalledWith('deal-1', 'remember me');
  });

  it('setStage proxies to host.patchStage(id, stage)', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.setStage('deal-1', 'Researching');
    expect(host.patchStage).toHaveBeenCalledWith('deal-1', 'Researching');
  });

  it('setStatus proxies to host.updateStatus(id, status)', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.setStatus('deal-1', 'archived');
    expect(host.updateStatus).toHaveBeenCalledWith('deal-1', 'archived');
  });

  it('markRead proxies to host.markRead(id)', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.markRead('deal-1');
    expect(host.markRead).toHaveBeenCalledWith('deal-1');
  });

  it('toggleSave proxies to host.toggleSave when present', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.toggleSave('deal-1', false);
    expect(host.toggleSave).toHaveBeenCalledWith('deal-1', false);
  });

  it('toggleSave is a silent no-op when not provided (parity with current feed)', () => {
    installActionAdapters(ND, {});
    expect(() => ND.actions.toggleSave('deal-1', false)).not.toThrow();
  });

  it('deleteDeal uses host.deleteDeal when present', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.deleteDeal('deal-1');
    expect(host.deleteDeal).toHaveBeenCalledWith('deal-1');
    expect(host.updateStatus).not.toHaveBeenCalled();
  });

  it('deleteDeal falls back to updateStatus(id, "archived") when host.deleteDeal absent', () => {
    const host = makeHost();
    delete host.deleteDeal;
    installActionAdapters(ND, host);
    ND.actions.deleteDeal('deal-1');
    expect(host.updateStatus).toHaveBeenCalledWith('deal-1', 'archived');
  });

  it('deleteDeal no-ops when neither primitive is provided', () => {
    installActionAdapters(ND, {});
    expect(() => ND.actions.deleteDeal('deal-1')).not.toThrow();
  });

  it('openDetail routes via navigate(`/deal/${id}`)', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    ND.actions.openDetail('uuid-abc');
    expect(host.navigate).toHaveBeenCalledWith('/deal/uuid-abc');
  });

  it('openDetail no-ops when navigate is not provided', () => {
    installActionAdapters(ND, {});
    expect(() => ND.actions.openDetail('uuid-abc')).not.toThrow();
  });

  it('returns a cleanup that restores a prior ND.actions value', () => {
    const sentinel = { sentinel: 'prior' };
    ND.actions = sentinel;
    const cleanup = installActionAdapters(ND, makeHost());
    expect(ND.actions).not.toBe(sentinel);
    cleanup();
    expect(ND.actions).toBe(sentinel);
  });

  it('cleanup removes ND.actions entirely when no prior value existed', () => {
    const cleanup = installActionAdapters(ND, makeHost());
    expect('actions' in ND).toBe(true);
    cleanup();
    expect('actions' in ND).toBe(false);
  });

  it('returns a no-op cleanup when ND is null', () => {
    const cleanup = installActionAdapters(null, makeHost());
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('does not invoke any host action at install time', () => {
    const host = makeHost();
    installActionAdapters(ND, host);
    expect(host.postFeedback).not.toHaveBeenCalled();
    expect(host.saveNote).not.toHaveBeenCalled();
    expect(host.patchStage).not.toHaveBeenCalled();
    expect(host.updateStatus).not.toHaveBeenCalled();
    expect(host.markRead).not.toHaveBeenCalled();
    expect(host.navigate).not.toHaveBeenCalled();
  });
});
