/* ============================================
   ACTIONS — install adapters on ND.actions that proxy bundle
   verbs into host (useDeals / useReadState / useNavigate) primitives.
   See notes/bmad/deal-feed-excel/architecture.md
   §"One-way flow: bundle → host (actions)".
   ============================================ */

const noop = () => {};

/**
 * Install bundle-facing action adapters on window.ND.actions.
 *
 * @param {object} ND  window.ND from the bundle.
 * @param {object} hostActions  Host primitives. Each may be undefined; the
 *   corresponding adapter becomes a no-op so the bundle never blows up on
 *   actions not implemented in the current host (toggleSave is the prime
 *   example — present in the bundle UI, absent from useDeals today).
 *
 *   Expected keys (all optional):
 *     postFeedback(id, feedback)   useDeals().postFeedback
 *     saveNote(id, text)           useDeals().saveNote
 *     updateStatus(id, status)     useDeals().updateStatus
 *     patchStage(id, stage)        host primitive that PATCHes /:id/stage
 *     markRead(id)                 useReadState().markRead
 *     toggleSave(id, currentSaved) host primitive — optional
 *     deleteDeal(id)               host primitive — optional (Story 2.12)
 *     navigate(path)               useNavigate()
 *
 * @returns {() => void} cleanup — restores ND.actions to its prior value.
 */
export function installActionAdapters(ND, hostActions = {}) {
  if (!ND) return noop;

  const had = Object.prototype.hasOwnProperty.call(ND, 'actions');
  const prior = ND.actions;

  const {
    postFeedback,
    saveNote,
    updateStatus,
    patchStage,
    markRead,
    toggleSave,
    deleteDeal,
    navigate,
  } = hostActions;

  ND.actions = {
    toggleHot(id, currentFeedback) {
      if (typeof postFeedback !== 'function') return;
      const next = currentFeedback === 'hot' ? null : 'hot';
      postFeedback(id, next);
    },
    toggleSave(id, currentSaved) {
      if (typeof toggleSave === 'function') {
        toggleSave(id, currentSaved);
      }
    },
    saveNote(id, text) {
      if (typeof saveNote === 'function') saveNote(id, text);
    },
    setStage(id, stage) {
      if (typeof patchStage === 'function') patchStage(id, stage);
    },
    setStatus(id, status) {
      if (typeof updateStatus === 'function') updateStatus(id, status);
    },
    markRead(id) {
      if (typeof markRead === 'function') markRead(id);
    },
    deleteDeal(id) {
      if (typeof deleteDeal === 'function') {
        deleteDeal(id);
      } else if (typeof updateStatus === 'function') {
        // Per locked recommendation (architecture.md open question):
        // Delete from context menu = soft-archive via updateStatus.
        updateStatus(id, 'archived');
      }
    },
    openDetail(id) {
      if (typeof navigate === 'function') navigate(`/deal/${id}`);
    },
  };

  return function cleanup() {
    if (had) {
      ND.actions = prior;
    } else {
      delete ND.actions;
    }
  };
}
