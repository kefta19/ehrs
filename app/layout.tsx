import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { BrandingProvider } from "@/components/branding-provider";
import { getRequestBranding } from "@/lib/branding";
import { brandingStyleVars } from "@/lib/branding-shared";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const b = await getRequestBranding();
  return {
    title: { default: b.companyName, template: `%s | ${b.companyName}` },
    description: `${b.companyName} – online auction marketplace`,
    icons: b.faviconUrl ? { icon: b.faviconUrl } : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const branding = await getRequestBranding();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandingStyleVars(branding) as React.CSSProperties}
    >
      <body className="min-h-full bg-background text-foreground">
        <BrandingProvider branding={branding}>{children}</BrandingProvider>
      </body>
    </html>
  );
}
