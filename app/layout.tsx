import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FloatingThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETHome - Online Property & Asset Auction Marketplace",
  description:
    "Transparent, secure property, vehicle, and asset auction bidding platform with escrow settlement and real-time live bidding.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem("ethome_theme_preference");
                var d = document.documentElement;
                if (t === "dark") { d.classList.add("dark"); d.setAttribute("data-theme","dark"); }
                else if (t === "midnight") { d.classList.add("dark", "theme-midnight"); d.setAttribute("data-theme","midnight"); }
                else if (t === "warm") { d.classList.add("theme-warm"); d.setAttribute("data-theme","warm"); }
                else if (!t && window.matchMedia("(prefers-color-scheme: dark)").matches) { d.classList.add("dark"); d.setAttribute("data-theme","dark"); }
                else { d.classList.add("theme-light"); d.setAttribute("data-theme","light"); }
              } catch(e){}
            })()`,
          }}
        />
      </head>
      <body className="min-h-full bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>
          {children}
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
