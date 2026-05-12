import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Photo Policy — Cleanmaxxing',
  description:
    'What we capture, how AI processes it, who else sees it, and how to delete it. Plain English.',
};

const LAST_UPDATED = '2026-05-12';

// Standalone AI photo policy, linked from upload surfaces and the
// main privacy policy (when the latter exists). Every claim here
// must reflect what the code actually does — see the photo-pipeline
// audit. If a behavior changes, update this page in the same PR.

export default function PhotoPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 leading-relaxed text-zinc-800 dark:text-zinc-200">
      <p className="text-xs uppercase tracking-wider text-zinc-500">
        Last updated {LAST_UPDATED}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        AI photo policy
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Cleanmaxxing asks for photos at a few specific moments — a
        baseline at onboarding, optional milestone updates at 30, 90,
        and 180 days, hair-session photos, outfit photos, and any
        photos you choose to attach in chat with Mister P. This page
        is the full story on what we do with them, who sees them, and
        how to remove them. Plain English. No buried clauses.
      </p>

      <Section title="What we capture, and only when you upload it">
        <p>
          We do not pull photos from your camera roll, social
          accounts, or any external service. Every photo in your
          account is one you actively captured or uploaded through the
          app. The categories:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong>Baseline.</strong> One front-facing face photo is
            the only required photo in the entire app, and even that
            can be skipped at onboarding. Optional baseline extras:
            face close-up, face side profile, full-body front.
          </li>
          <li>
            <strong>Milestones.</strong> Voluntary face and body
            photos at the 30, 90, and 180-day marks, captured the same
            way as baseline.
          </li>
          <li>
            <strong>Hair sessions.</strong> If you start the hair
            journey, you can capture session photos at angles relevant
            to the journey — front, hairline, sides, crown, styled
            (or a single top-down view for shaved/bald).
          </li>
          <li>
            <strong>Outfit (fit) photos.</strong> Optional clothed
            photos for the style journey.
          </li>
          <li>
            <strong>Chat attachments.</strong> If you are on Pro, you
            can let Mister P see your baseline and latest progress
            photos when answering questions. This is opt-in per
            account and can be turned off by deleting the underlying
            photos.
          </li>
        </ul>
      </Section>

      <Section title="What happens to a photo after you upload it">
        <p>
          The pipeline is the same for every category:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong>Resized and re-encoded.</strong> The photo is
            resized so the long edge is at most 1600 pixels and
            re-saved as JPEG. The original file is not retained.
          </li>
          <li>
            <strong>Metadata stripped.</strong> EXIF data — including
            GPS location, device identifiers, and capture timestamps
            embedded in the file — is removed during re-encoding.
          </li>
          <li>
            <strong>Stored privately.</strong> The processed JPEG goes
            into a private storage bucket. There is no public URL.
            Every time you view your own photo in the app, the server
            mints a short-lived signed URL just for you.
          </li>
          <li>
            <strong>Row-level access control.</strong> Both the
            storage object and the database row are protected by
            row-level security policies that only return rows whose
            owner matches the requesting account. No other user can
            see your photos, and they cannot be enumerated by guessing
            URLs.
          </li>
        </ul>
      </Section>

      <Section title="How AI uses your photos">
        <p>
          AI features that involve photos are all Pro features.
          Nothing on the free tier sends a photo to an AI model.
          There are four distinct AI flows, and each is documented
          below in terms of what gets sent, what comes back, and what
          provider sees it.
        </p>

        <Subsection title="1. Progress comparison (face and hair)">
          <p>
            When you ask for a facial-analysis comparison or a hair
            comparison, two of your existing photos (an earlier
            timepoint and a later one) are sent to Anthropic&apos;s
            Claude model. The model returns qualitative, neutral
            observations — what visibly changed, what stayed the same.
          </p>
          <p className="mt-3">
            <strong>What it does not do:</strong> assign a score,
            ranking, attractiveness rating, or numeric grade. The
            system prompt explicitly forbids those outputs. If a model
            ever produces them despite the guardrails, please report
            it.
          </p>
          <p className="mt-3">
            Limited to five comparisons per category per day.
          </p>
        </Subsection>

        <Subsection title="2. Facial-structure feature extraction">
          <p>
            If you opt into the facial-structure journey, your
            baseline face photos are sent once to Claude for a
            single-timepoint categorical reading — values like
            &quot;jawline definition: clear / soft / obscured&quot; or
            &quot;asymmetry: flagged / not flagged.&quot; The output
            is a small set of categorical labels, not a face
            embedding, not a biometric template, not anything that can
            be reversed into a likeness.
          </p>
          <p className="mt-3">
            Those labels feed the recommendations in your facial-
            structure plan. The labels overwrite in place — only the
            latest extraction is kept.
          </p>
        </Subsection>

        <Subsection title="3. Try-on previews (hair and facial hair)">
          <p>
            Hair and facial-hair try-on uses OpenAI&apos;s image
            generation API. Your baseline face photo plus a text
            description of the style is sent; an image of you with the
            target style comes back. The generated preview is saved
            into your private bucket alongside your other photos so
            you can review it later, and it is subject to the same
            deletion controls.
          </p>
          <p className="mt-3">
            Limited to three previews per type per day.
          </p>
        </Subsection>

        <Subsection title="4. Mister P chat (Pro)">
          <p>
            When you chat with Mister P, the app may attach up to five
            of your existing photos to the model request — typically
            your baseline face, your latest face progress, your latest
            body progress, your latest outfit photo, and the anchor
            photo of your latest hair session. The model only sees
            photos you uploaded yourself. It cannot see other users
            and cannot store new photos.
          </p>
          <p className="mt-3">
            On the free tier, photo attachment is disabled entirely;
            chat answers are text-only and have no access to your
            photos.
          </p>
        </Subsection>

        <p className="mt-6">
          Across all four flows, photos are sent over a TLS-encrypted
          API call, processed for that single inference request, and
          not stored by the AI provider for training under their API
          terms. Cleanmaxxing has not enrolled any account or photo in
          any provider&apos;s model-improvement program.
        </p>
      </Section>

      <Section title="Third-party providers in scope">
        <p>
          Two providers process photo bytes on our behalf:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong>Anthropic</strong> — Claude model API. Receives
            photos for the comparison, structure-extraction, and chat
            flows above. Anthropic&apos;s API terms state that API
            inputs are not used to train models by default.
          </li>
          <li>
            <strong>OpenAI</strong> — image-generation API. Receives
            your baseline face photo for hair and facial-hair try-on
            previews. OpenAI&apos;s API terms state that API inputs
            are not used to train models by default.
          </li>
        </ul>
        <p className="mt-3">
          Photo storage itself is on Supabase (our infrastructure
          provider) in a private, per-user bucket. Supabase staff do
          not access user content as part of operating the service.
        </p>
        <p className="mt-3">
          No other vendor — analytics, advertising, social — receives
          your photos at any point.
        </p>
      </Section>

      <Section title="What we never do">
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            Score your appearance, rate your attractiveness, or
            generate a numeric ranking from your photos.
          </li>
          <li>
            Show your photos to other users. There is no social
            surface, no community gallery, no share link, no
            &quot;before/after&quot; public feed.
          </li>
          <li>
            Sell, license, or share your photos with advertisers, data
            brokers, or any third party not listed above.
          </li>
          <li>
            Use your photos to train or fine-tune any AI model.
          </li>
          <li>
            Allow Cleanmaxxing staff to view your photos in routine
            operations. Engineers may need to access a specific
            account&apos;s data to investigate a bug you have
            reported, with your knowledge.
          </li>
        </ul>
      </Section>

      <Section title="Retention, deletion, and what gets cleaned up">
        <p>
          Photos persist for as long as your account exists, because
          the progress-comparison feature depends on older photos
          being around to compare against. There is no auto-expiry.
        </p>
        <p className="mt-3">
          You can delete photos two ways:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>
            <strong>Single photo.</strong> Open{' '}
            <Link
              href="/photos"
              className="underline underline-offset-2"
            >
              /photos
            </Link>{' '}
            and remove an individual photo. Both the storage file and
            the database row are deleted.
          </li>
          <li>
            <strong>All photos at once.</strong> Same page, bulk
            &quot;delete all photos&quot; affordance.
          </li>
          <li>
            <strong>Account deletion.</strong> Deleting your account
            cascades — every photo, every AI analysis row, every try-
            on preview is removed.
          </li>
        </ul>
        <p className="mt-3">
          Deleting a photo also clears the AI observations derived
          from it. If you delete the front baseline face photo, any
          facial-analysis comparison that used that photo as a
          reference point is removed in the same operation, and the
          categorical structure labels extracted from it are cleared.
          Deleting a hair photo removes the hair comparison
          observations that referenced its session. Bulk-deleting all
          photos clears every AI observation in your account.
        </p>
      </Section>

      <Section title="State biometric laws (Illinois, Texas, Washington, and similar)">
        <p>
          Illinois&apos; Biometric Information Privacy Act and the
          equivalent statutes in Texas and Washington regulate the
          collection of biometric identifiers. The categorical labels
          we extract from facial photos are not face geometry, face
          templates, or face embeddings, so we do not believe BIPA
          applies in its strictest reading. We follow its disclosure
          and retention requirements anyway because they reflect what
          we consider table stakes for photo-based features.
        </p>
        <p className="mt-3">
          <strong>Purpose of collection:</strong> the photo categories
          and AI flows described above, and only those.
        </p>
        <p className="mt-3">
          <strong>Retention period:</strong> until you delete the
          photo, delete your account, or three years after your last
          activity in the app, whichever comes first.
        </p>
        <p className="mt-3">
          <strong>Destruction:</strong> at the end of the retention
          period, your photos and any AI analyses derived from them
          are permanently deleted from storage and database.
        </p>
        <p className="mt-3">
          If you are an Illinois resident and prefer not to have your
          face photos processed by AI at all, you can use the app
          without uploading any photo — every photo capture in the app
          is optional, and the non-photo features remain available.
        </p>
      </Section>

      <Section title="Minors">
        <p>
          Cleanmaxxing is for adults. Signup requires you to confirm
          you are at least 18 years old. We do not knowingly collect
          photos or any other data from anyone under 18. If you
          believe a minor has created an account, contact us and we
          will delete the account and all associated photos.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can, at any time:
        </p>
        <ul className="ml-6 mt-3 list-disc space-y-2">
          <li>Download your photos from the /photos page.</li>
          <li>Delete any individual photo or all of them.</li>
          <li>
            Delete your account, which removes every photo and every
            AI analysis tied to your account.
          </li>
          <li>
            Ask us what we have on you, and we will export it. Email
            the address below.
          </li>
        </ul>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we materially change how photos are captured, processed,
          shared, or retained, we will update this page and surface a
          notice in the app before the change takes effect. The{' '}
          <em>last updated</em> date at the top of this page reflects
          the most recent revision.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, deletion requests, or anything else about how
          your photos are handled:{' '}
          <a
            href="mailto:support@cleanmaxxing.com"
            className="underline underline-offset-2"
          >
            support@cleanmaxxing.com
          </a>
          .
        </p>
      </Section>

      <div className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        <Link href="/" className="underline underline-offset-2">
          Back to home
        </Link>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}
