import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = "(max-width: 639px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    // No redundant setIsMobile here — the useState initializer already reads
    // the correct value synchronously, so a second set would cause an
    // unnecessary re-render that can remount children and reset their state.
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
