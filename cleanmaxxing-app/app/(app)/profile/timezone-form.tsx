'use client';

// Time-zone picker on /profile. Hydrates with the user's stored IANA
// timezone, lets them pick from a curated list of common zones, and
// persists via POST /api/profile/timezone. A "Use browser default"
// button re-runs Intl detection so users on a new device can match
// their hardware in one click.
//
// The list is intentionally short — covering 25-ish zones that
// account for the vast majority of users. Anything outside this set
// still works (the silent detect in components/timezone-sync.tsx
// writes whatever Intl resolves), it just won't render as a
// pre-selected option in the dropdown.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initial: string;
};

type ZoneOption = { value: string; label: string };

const ZONE_GROUPS: Array<{ region: string; zones: ZoneOption[] }> = [
  {
    region: 'United States & Canada',
    zones: [
      { value: 'America/New_York', label: 'Eastern (New York)' },
      { value: 'America/Chicago', label: 'Central (Chicago)' },
      { value: 'America/Denver', label: 'Mountain (Denver)' },
      { value: 'America/Phoenix', label: 'Arizona (no DST)' },
      { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
      { value: 'America/Anchorage', label: 'Alaska' },
      { value: 'Pacific/Honolulu', label: 'Hawaii' },
      { value: 'America/Toronto', label: 'Toronto' },
      { value: 'America/Vancouver', label: 'Vancouver' },
    ],
  },
  {
    region: 'United Kingdom & Europe',
    zones: [
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Dublin', label: 'Dublin' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Madrid', label: 'Madrid' },
      { value: 'Europe/Rome', label: 'Rome' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam' },
      { value: 'Europe/Stockholm', label: 'Stockholm' },
      { value: 'Europe/Athens', label: 'Athens' },
    ],
  },
  {
    region: 'Asia & Pacific',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { value: 'Asia/Shanghai', label: 'Shanghai' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Seoul' },
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
    ],
  },
];

export function TimezoneForm({ initial }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function persist(next: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/profile/timezone', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ timezone: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setValue(next);
        setSavedAt(Date.now());
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function detectFromBrowser() {
    let detected = '';
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      setError("Couldn't detect a timezone from this browser.");
      return;
    }
    if (!detected) {
      setError("Couldn't detect a timezone from this browser.");
      return;
    }
    persist(detected);
  }

  // The current value might be a zone that isn't in our curated
  // list (e.g. a fresh detect wrote 'Africa/Lagos'). Surface it as
  // an extra option at the top so the dropdown still reflects
  // reality instead of silently falling back to the first option.
  const knownValues = new Set(
    ZONE_GROUPS.flatMap((g) => g.zones).map((z) => z.value),
  );
  const showCustom = !knownValues.has(value);

  return (
    <div className="space-y-3">
      <label
        htmlFor="profile-timezone"
        className="block text-xs text-zinc-600 dark:text-zinc-400"
      >
        Time zone
      </label>
      <select
        id="profile-timezone"
        value={value}
        onChange={(e) => persist(e.target.value)}
        disabled={pending}
        className="w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {showCustom && (
          <option value={value}>{value} (auto-detected)</option>
        )}
        {ZONE_GROUPS.map((group) => (
          <optgroup key={group.region} label={group.region}>
            {group.zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={detectFromBrowser}
          disabled={pending}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Use browser default
        </button>
        {savedAt && !error && (
          <span className="text-zinc-500 dark:text-zinc-400">Saved.</span>
        )}
        {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Used to roll over your daily check-in, sleep, and workout logs at
        3 a.m. local. Auto-detected from your browser; edit if you&rsquo;re
        traveling or using a shared device.
      </p>
    </div>
  );
}
