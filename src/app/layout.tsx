import type { Metadata } from "next";
import { CalSansUI } from "@calcom/cal-sans-ui/ui";
import { CalSansGeo } from "@calcom/cal-sans-ui/geo";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers/providers";
import { AgentationProvider } from "@/components/providers/agentation-provider";
import "./globals.css";

config.autoAddCss = false;

const SHARE_PREVIEW_TEXT = "Community courts, unlocked. Find a court. Book it. Go play.";
const OG_IMAGE_PATH = "/og-default-v3.jpg";
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.playbookings.com"),
  title: {
    default: SHARE_PREVIEW_TEXT,
    template: "%s | Play Bookings",
  },
  description:
    SHARE_PREVIEW_TEXT,
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Play Bookings",
    title: SHARE_PREVIEW_TEXT,
    description: SHARE_PREVIEW_TEXT,
    url: "https://www.playbookings.com",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Play Bookings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_PREVIEW_TEXT,
    description: SHARE_PREVIEW_TEXT,
    images: [OG_IMAGE_PATH],
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${CalSansUI.variable} ${CalSansGeo.variable}`}
    >
      <body className={`${CalSansUI.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <AgentationProvider />
        <Analytics />
      </body>
    </html>
  );
}
