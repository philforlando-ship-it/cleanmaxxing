'use client';

// Silent timezone sync. Mounted once in app/(app)/layout.tsx so it
// runs on every authenticated render. On mount, reads the browser's
// IANA timezone via Intl.DateTimeFormat and POSTs to
// /api/profile/timezone if it differs from the value we already have
// stored. No UI; no toast; no blocking.
//
// The current persisted value is passed in as a prop so we can
// short-circuit the network round-trip when nothing has changed
// (the common case after first login).

import { useEffect, useRef } from 'react';

type Props = {
  current: string;
};

export function TimezoneSync({ current }: Props) {
  // Guard against double-fire under React strict mode dev double-mount.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return;
    }
    if (!detected || detected === current) return;

    void fetch('/api/profile/timezone', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ timezone: detected }),
    }).catch(() => {
      // Non-fatal — we'll try again on next mount.
    });
  }, [current]);

  return null;
}
