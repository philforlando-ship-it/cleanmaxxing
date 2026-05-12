'use client';

// Collapsible wrapper for the daily-log cards on /today (Slice 3 of
// the daily-check-in reframe, 2026-05-11). The /log destination was
// retired in this slice — sleep / workout / nutrition logging now
// lives inline on /today, behind a disclosure header.
//
// Default state is expanded. The user's collapse choice persists via
// localStorage so it sticks across visits.
//
// Implementation note: the children are HIDDEN via CSS rather than
// unmounted on collapse. Each log card carries internal form state
// (sleep duration, workout exercises, food entries) and unmounting
// would wipe it. CSS hiding keeps mid-entry data intact when a user
// collapses + re-expands.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cm.daily_basics.collapsed';

// Anchor IDs the section contains. When the URL hash matches one of
// these on load, force the section open regardless of the stored
// collapse preference — otherwise primary-action CTAs that scroll
// here would land inside a hidden region.
const SECTION_ANCHORS = ['#sleep-log', '#workout-log', '#nutrition-log'];

export function DailyBasicsSection({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default expanded on first paint. Hydration may flip to collapsed
  // after reading localStorage. We accept a one-frame flash on first
  // visit for users who previously collapsed — it's better than
  // dimming the section while we wait for hydration.
  const [collapsed, setCollapsed] = useState(false);

  // Read the persisted preference on mount. The set-state-in-effect
  // lint rule fires here, but the pattern is correct for client-only
  // state that depends on a browser API: SSR + first paint default
  // to false (matches server), then hydration syncs to localStorage.
  // The alternative (useSyncExternalStore) needs custom event
  // wiring because `storage` events don't fire in the writing window.
  //
  // Hash override: if the URL points at (or navigates to) one of
  // this section's anchors — e.g. a primary-action CTA on the same
  // page navigating to #nutrition-log — force the section open and
  // re-scroll. Without this, the CTA would scroll into a hidden
  // region when the user has collapsed the section.
  useEffect(() => {
    function handleHashCandidate(hash: string) {
      if (!SECTION_ANCHORS.includes(hash)) return false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(false);
      // Layout shift from the expansion can leave the anchor out of
      // view — re-scroll on the next frame.
      requestAnimationFrame(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
      return true;
    }

    // Initial mount: hash takes priority over the saved pref.
    const overridden = handleHashCandidate(window.location.hash);
    if (!overridden) {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCollapsed(true);
        }
      } catch {
        // localStorage unavailable (private mode, etc.) — stay expanded.
      }
    }

    // Subsequent in-page hash navigations (CTA click while already
    // on /today) don't re-fire this effect, so listen explicitly.
    function onHashChange() {
      handleHashCandidate(window.location.hash);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // best-effort persistence
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="daily-basics-body"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
      >
        <div>
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            Log today&rsquo;s basics
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
            Sleep, training, food — the inputs your reports read.
          </p>
        </div>
        <span
          aria-hidden
          className={`text-zinc-400 transition-transform duration-200 ${
            collapsed ? '' : 'rotate-90'
          }`}
        >
          ›
        </span>
      </button>
      <div
        id="daily-basics-body"
        className={`space-y-4 border-t border-zinc-200 p-5 dark:border-zinc-800 ${
          collapsed ? 'hidden' : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
}
