import { createContext } from "react";

/**
 * Context for the top bar: label and class monitoring last run.
 * Views (e.g. DashboardView) set header label (e.g. show name) and
 * class monitoring last run (from schedule view API) for display in the header.
 */
export type HeaderLabelContextValue = {
  headerLabel: string | null;
  setHeaderLabel: (label: string | null) => void;
  classMonitoringLastRun: string | null;
  setClassMonitoringLastRun: (value: string | null) => void;
};

export const HeaderLabelContext = createContext<HeaderLabelContextValue>(
  null as unknown as HeaderLabelContextValue
);
