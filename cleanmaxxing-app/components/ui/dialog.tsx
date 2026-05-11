'use client';

// Minimal modal-dialog primitive. No external deps. Portals to
// document.body so stacking contexts on the calling tree don't
// leak through. Backdrop click + Escape both close. Body scroll
// is locked while the dialog is open so the page underneath stays
// put. First focusable element receives focus on open.
//
// Deliberately not a full Radix Dialog — no inert background, no
// focus-trap loop. The launcher this is built for is short-lived
// and the chat panel inside takes the focus on open. Revisit if
// we need it for nested or complex flows.

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Aria label for the dialog as a whole. Required because the
  // dialog content varies and shouldn't have to remember to label
  // itself.
  ariaLabel: string;
  // Width cap. Defaults to a chat-friendly 640px; callers can
  // override per-dialog (e.g., narrow confirm prompts).
  maxWidthClass?: string;
};

export function Dialog({
  open,
  onClose,
  children,
  ariaLabel,
  maxWidthClass = 'max-w-2xl',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Body scroll lock while open. The previous overflow value is
  // captured so an outer modal stack doesn't permanently wedge the
  // scrollbar — restore exactly what was there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes. Listener registered only while open so an
  // unmounted dialog isn't intercepting keystrokes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus the first focusable child inside the panel on open. Skips
  // when the panel isn't there yet (SSR safety) or already contains
  // focus.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.contains(document.activeElement)) return;
    const focusable = panel.querySelector<HTMLElement>(
      'input, textarea, button, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close when the click is on the backdrop itself, not a
      // child that propagated up.
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-8 backdrop-blur-sm dark:bg-zinc-950/60"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`w-full ${maxWidthClass} rounded-xl bg-white shadow-xl outline-none dark:bg-zinc-900`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
