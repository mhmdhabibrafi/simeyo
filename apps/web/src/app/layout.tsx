import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Simeyo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Simeyo" },
  icons: { apple: "/icons/icon-192.png" },
  title: {
    default: "Simeyo",
    template: "%s | Simeyo",
  },
  description:
    "Ruang percakapan untuk komunitas kampus yang terverifikasi. Kenali teman, temukan perspektif, dan bagikan cerita.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101010" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Lewati ke konten
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
