/**
 * White-label branding configuration.
 *
 * Central place for all white-label customizations. Change colors, theme, logo,
 * and metadata here; the app and design system consume these values.
 *
 * To white-label for a different client:
 * 1. Update logo (type, imageSrc or svgPath)
 * 2. Change brandName
 * 3. Update metadata for SEO and favicon
 * 4. Customize colors.primaryPalette (main color source). primary, primaryHover, primaryMuted
 *    are derived from it (600, 700, 100). Other semantic tokens (background, text, etc.) stay separate.
 * 5. Set termsOfServiceUrl, privacyPolicyUrl, supportUrl as needed
 * 6. Override typography.fontFamily and typography.fontFamilyHeading if desired
 *
 * @see design.json and design/design-system.json for semantic usage.
 */

export type LogoType = "svg" | "image";

export type PrimaryColorPalette = Record<
  "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900",
  string
>;

export interface LogoConfig {
  type: LogoType;
  imageSrc?: string;
  alt: string;
  backgroundColor?: string;
  svgViewBox?: string;
  /** Space-separated polygon/polyline points (for SVG type) */
  svgPath?: string;
}

export interface MetadataConfig {
  title: string;
  description: string;
  favicon?: string;
}

/** Semantic color tokens used by main.tsx for CSS variables and design system */
export interface SemanticColors {
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface BrandingConfig {
  logo: LogoConfig;
  brandName: string;
  metadata: MetadataConfig;
  theme: "light" | "dark";
  typography?: {
    fontFamily?: string;
    fontFamilyHeading?: string;
  };
  colors: {
    primaryPalette: PrimaryColorPalette;
  } & SemanticColors;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  supportUrl?: string;
}

/**
 * Main color palette (50–900) derived from design-system.json accent green.
 * Single source for primary colors:
 * - primary = 600 (buttons, links, active nav)
 * - primaryHover = 700 (hover state)
 * - primaryMuted = 100 (badges, inactive hover)
 */
const PRIMARY_PALETTE: PrimaryColorPalette = {
  "50": "#F0F5F0",
  "100": "#D9E6D9",
  "200": "#B3C9B3",
  "300": "#8BA38B",
  "400": "#6B8A6B",
  "500": "#5C7B5C",
  "600": "#4F6D4F",
  "700": "#596B5A",
  "800": "#3D553D",
  "900": "#2B3D2B",
};

export const BRANDING: BrandingConfig = {
  logo: {
    type: "image",
    imageSrc: "/logo.svg",
    alt: "ShowGroundsLive",
  },
  brandName: "ShowGroundsLive",
  metadata: {
    title: "ShowGroundsLive — Horse Farm Management",
    description:
      "Monitor show schedules, track horses and entries, and get real-time alerts for your equestrian farm.",
    favicon: "/favicon.svg",
  },
  theme: "light",
  typography: {
    fontFamily: "Inter, Open Sans, sans-serif",
    fontFamilyHeading: "Lora, Georgia, serif",
  },
  colors: {
    primaryPalette: PRIMARY_PALETTE,
    primary: PRIMARY_PALETTE["600"],
    primaryHover: PRIMARY_PALETTE["700"],
    primaryMuted: PRIMARY_PALETTE["100"],
    background: "#F7F7F7",
    surface: "#FFFFFF",
    surfaceElevated: "#FBFBFB",
    text: "#333333",
    textMuted: "#6B6B6B",
    border: "#E8E8E8",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
  },
  termsOfServiceUrl: undefined,
  privacyPolicyUrl: undefined,
  supportUrl: undefined,
};

export default BRANDING;
