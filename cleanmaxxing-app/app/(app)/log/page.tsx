// /log retired in Slice 3 of the daily-check-in reframe (2026-05-11).
// Daily-basics logging now lives inline on /today behind the
// DailyBasicsSection disclosure. This file is the redirect for any
// bookmarks pointing at the old destination — keep for a few weeks,
// then delete in a cleanup pass.

import { redirect } from 'next/navigation';

export default function LogPage(): never {
  redirect('/today');
}
