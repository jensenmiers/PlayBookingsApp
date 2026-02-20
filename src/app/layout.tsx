import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SHARE_PREVIEW_TEXT = "Community courts, unlocked. Find a court. Book it. Go play.";
const OG_IMAGE_PATH = "/og-default-v2.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://playbookings.vercel.app"),
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
    url: "https://playbookings.vercel.app",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 390,
        height: 844,
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
