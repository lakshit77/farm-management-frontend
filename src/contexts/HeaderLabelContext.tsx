import { createContext } from "react";

/**
 * Context for the top bar label. Views (e.g. ScheduleView) can set a custom
 * label (e.g. show name); when unset, the tab name is shown.
 */
export const HeaderLabelContext = createContext<{
  headerLabel: string | null;
  setHeaderLabel: (label: string | null) => void;
}>(null as unknown as { headerLabel: string | null; setHeaderLabel: (label: string | null) => void });
