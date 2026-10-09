export type Branding = {
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

export const DEFAULT_TENANT_SLUG = "default";

export const DEFAULT_BRANDING: Branding = {
  companyName: "ETHome",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  backgroundColor: "#F8FAFC",
  textColor: "#1E293B",
};

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Inline CSS variables for <html style>. Values are validated HEX on write. */
export function brandingStyleVars(b: Branding): Record<string, string> {
  return {
    "--primary-color": b.primaryColor,
    "--secondary-color": b.secondaryColor,
    "--background-color": b.backgroundColor,
    "--text-color": b.textColor,
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
