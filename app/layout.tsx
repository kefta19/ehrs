import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { BrandingProvider } from "@/components/branding-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingThemeToggle } from "@/components/theme-toggle";
import { getRequestBranding } from "@/lib/branding";
import { brandingStyleVars } from "@/lib/branding-shared";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});
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
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandingStyleVars(branding) as React.CSSProperties}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <BrandingProvider branding={branding}>
            {children}
            <FloatingThemeToggle />
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
