/**
 * Applies branding config to the document: metadata (title, description, favicon)
 * and CSS custom properties for semantic colors. Call once at app boot.
 */

import { BRANDING } from "./branding";

const CSS_VAR_PREFIX = "brand";

/**
 * Sets document title, meta description, and favicon from BRANDING.metadata.
 */
function applyMetadata(): void {
  const { title, description, favicon } = BRANDING.metadata;
  document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && description) {
    metaDesc.setAttribute("content", description);
  }
  if (favicon) {
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
}

/**
 * Injects semantic color tokens as CSS custom properties on :root for use by
 * design system or components that read var(--brand-*).
 */
function applyColorVariables(): void {
  const root = document.documentElement;
  const { colors } = BRANDING;
  root.style.setProperty(`--${CSS_VAR_PREFIX}-primary`, colors.primary);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-primary-hover`, colors.primaryHover);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-primary-muted`, colors.primaryMuted);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-background`, colors.background);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-surface`, colors.surface);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-surface-elevated`, colors.surfaceElevated);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-text`, colors.text);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-text-muted`, colors.textMuted);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-border`, colors.border);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-success`, colors.success);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-warning`, colors.warning);
  root.style.setProperty(`--${CSS_VAR_PREFIX}-error`, colors.error);
}

/**
 * Applies full branding: metadata and CSS variables. Call from main.tsx before render.
 */
export function applyBranding(): void {
  applyMetadata();
  applyColorVariables();
}
