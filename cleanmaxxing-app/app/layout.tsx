import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RewardfulLoader } from "@/components/rewardful-loader";
import { ThemeApplier } from "@/components/theme-applier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cleanmaxxing",
  description: "Structured, honest self-improvement for men who want to look and feel better — without the radioactive parts of looksmaxxing culture.",
};

// Inline script that runs before React hydrates so we set the correct
// theme class on <html> without flashing. Reads localStorage; falls
// back to OS preference when no explicit choice is stored. Kept small
// and dependency-free because this blocks first paint. The
// ThemeApplier component handles mid-session changes.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('cleanmaxxing:theme');
    var theme = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var effective = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    if (effective === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The no-FOUC script above mutates <html>'s className before
      // React hydrates, which React would otherwise flag as a
      // hydration mismatch. suppressHydrationWarning scopes the
      // suppression to this element only.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeApplier />
        <RewardfulLoader />
        {children}
      </body>
    </html>
  );
}
