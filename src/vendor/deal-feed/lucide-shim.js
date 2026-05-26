/* ============================================
   LUCIDE SHIM
   The vendor bundle expects window.lucide.createIcons(opts[, root])
   in the lucide-react@1.14.0 (CDN) style. lucide@1.14.0 (npm)
   exports createIcons that requires { icons } in its options object
   and reads root only from the options. This shim bridges both gaps.

   Story 2.4 of notes/bmad/deal-feed-excel/stories.md.
   ============================================ */

import { createIcons as lucideCreateIcons, icons as lucideIcons } from 'lucide';

/**
 * Install a window.lucide shim that satisfies the bundle's call shape.
 *
 * Bundle call sites:
 *   feed.js:38          window.lucide.createIcons({ attrs: {...} })
 *   sidebar-tweaks.js:57 window.lucide.createIcons({ attrs: {...} }, brandMark)
 *
 * The shim:
 *   - injects `icons` from the pinned lucide@1.14.0 package
 *   - forwards `opts` keys (attrs, nameAttr, etc.) verbatim
 *   - accepts an optional second positional `root` arg and maps it to opts.root
 *
 * @param {object} [globalRef=globalThis] Object to attach `lucide` to. Tests
 *   pass a mock; the wrapper passes `window`.
 * @returns {() => void} cleanup — restores prior `globalRef.lucide` or deletes
 *   the key if none existed before.
 */
export function installLucideShim(globalRef = globalThis) {
  const hadPrev = Object.prototype.hasOwnProperty.call(globalRef, 'lucide');
  const prev = globalRef.lucide;

  globalRef.lucide = {
    icons: lucideIcons,
    createIcons(opts, root) {
      const merged = {
        icons: lucideIcons,
        ...(opts || {}),
      };
      if (root !== undefined && merged.root === undefined) {
        merged.root = root;
      }
      return lucideCreateIcons(merged);
    },
  };

  return function cleanup() {
    if (hadPrev) {
      globalRef.lucide = prev;
    } else {
      delete globalRef.lucide;
    }
  };
}
