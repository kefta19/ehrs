"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BRANDING, type Branding } from "@/lib/branding-shared";

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Branding;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
