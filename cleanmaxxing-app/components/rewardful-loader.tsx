'use client';

import Script from 'next/script';

/**
 * Rewardful client script loader (spec §9 Week 5 affiliate tracking).
 *
 * Drops the Rewardful cookie when a visitor lands with ?via=slug. On
 * Stripe Checkout, we read `window.Rewardful?.referral` and pass it as
 * `client_reference_id` so Rewardful can reconcile the purchase with the
 * referring affiliate via its Stripe integration.
 *
 * Gated on NEXT_PUBLIC_REWARDFUL_API_KEY — when unset (local dev or
 * pre-launch), the component renders nothing and Rewardful is a no-op
 * that downstream code handles gracefully (referral reads return null).
 *
 * Docs: https://developers.rewardful.com/
 */
export function RewardfulLoader() {
  const apiKey = process.env.NEXT_PUBLIC_REWARDFUL_API_KEY;
  if (!apiKey) return null;

  return (
    <>
      <Script id="rewardful-queue" strategy="beforeInteractive">
        {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}
      </Script>
      <Script
        id="rewardful-script"
        strategy="afterInteractive"
        src="https://r.wdfl.co/rw.js"
        data-rewardful={apiKey}
      />
    </>
  );
}
