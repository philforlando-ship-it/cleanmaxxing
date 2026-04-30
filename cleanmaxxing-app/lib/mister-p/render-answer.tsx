// Tiny renderer for Mister P chat answers. Converts inline markdown
// POV links — [Doc title](/povs/<slug>) — into clickable anchor tags
// while leaving all other text alone. The chat surfaces use
// whitespace-pre-wrap, so newlines are preserved automatically by
// keeping non-link runs as plain strings.
//
// Scope is intentionally narrow: only /povs/<slug> hrefs are
// recognized. We deliberately do NOT render arbitrary markdown
// (bold, italics, headers, lists, external links) — Mister P's
// answers were authored for plain prose, and broader markdown
// rendering would change appearance for many existing turns. If
// other internal link types are needed later (e.g. /goals/<id>),
// add them to LINK_PATTERN's href-side group.

import Link from 'next/link';
import { Fragment } from 'react';

const LINK_PATTERN = /\[([^\]]+)\]\((\/povs\/[a-z0-9-]+)\)/g;

export function renderAnswerText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const [full, label, href] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>,
      );
    }
    nodes.push(
      <Link
        key={key++}
        href={href}
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {label}
      </Link>,
    );
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}
