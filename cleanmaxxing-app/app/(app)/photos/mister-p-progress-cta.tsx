// Discoverability bridge from /photos → Mister P chat. The chat
// route auto-attaches baseline + latest milestone photos to every
// turn (lib/mister-p/user-state.ts), so users can ask "do I look
// better than baseline?" or "is my recession stabilizing?" and get
// a verbal comparison. The mechanism exists; this card tells users
// it does and gives them a one-click path to the chat.

import Link from 'next/link';

export function MisterPProgressCta() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Want a read on your progress?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Mister P sees your baseline + latest photos automatically. Ask
        him &ldquo;do I look better than baseline?&rdquo; or &ldquo;is
        my recession stabilizing?&rdquo; and he&rsquo;ll do the
        comparison verbally — grounded in the photos, not a score. He
        won&rsquo;t volunteer observations; you have to ask.
      </p>
      <div className="mt-3">
        <Link
          href="/today#mister-p"
          className="text-[13px] font-medium text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          Ask Mister P →
        </Link>
      </div>
    </section>
  );
}
