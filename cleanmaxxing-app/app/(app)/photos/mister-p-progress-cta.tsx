// Discoverability bridge from /photos → Mister P chat. The chat
// route auto-attaches baseline + latest milestone photos to every
// turn (lib/mister-p/user-state.ts) FOR PRO USERS ONLY. This card
// surfaces the capability and gates messaging on plan status so
// free users aren't pointed at a feature that won't fire for them.

import Link from 'next/link';

type Props = {
  isPremium: boolean;
};

export function MisterPProgressCta({ isPremium }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Want a read on your progress?
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Pro
        </span>
      </div>
      {isPremium ? (
        <>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Mister P can read your photos in chat. Ask &ldquo;do I look
            better than baseline?&rdquo; and he&rsquo;ll compare verbally —
            grounded in the shots, not a score. He won&rsquo;t volunteer
            observations; you have to ask.
          </p>
          <div className="mt-3">
            <Link
              href="/chat"
              className="text-[13px] font-medium text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Ask Mister P →
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            On Pro, Mister P reads your baseline + latest photos in chat
            — ask &ldquo;do I look better than baseline?&rdquo; and he
            compares verbally. Free chat answers without the photo
            context.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Upgrade to Pro
            </Link>
            <Link
              href="/chat"
              className="text-[13px] text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Ask without photo context →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
