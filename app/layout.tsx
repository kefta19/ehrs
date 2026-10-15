import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { BrandingProvider } from "@/components/branding-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingThemeToggle } from "@/components/theme-toggle";
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandingStyleVars(branding) as React.CSSProperties}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ethome_theme_preference');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.classList.remove('dark','theme-midnight','theme-warm','theme-light');if(t==='dark'){r.classList.add('dark');}else if(t==='midnight'){r.classList.add('dark','theme-midnight');}else if(t==='warm'){r.classList.add('theme-warm');}else{r.classList.add('theme-light');}r.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
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
