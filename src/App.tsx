import React, { useState } from "react";
import { HeaderLabelContext } from "./contexts/HeaderLabelContext";
import { DashboardView } from "./views";

/**
 * Root app: single-page dashboard layout with a top header bar.
 * The old sidebar + tab routing has been replaced by DashboardView's
 * internal tab bar and shared filter.
 */
function App(): React.ReactElement {
  const [headerLabel, setHeaderLabel] = useState<string | null>(null);

  return (
    <HeaderLabelContext.Provider value={{ headerLabel, setHeaderLabel }}>
      <div className="min-h-screen bg-background-primary flex flex-col">
        {/* Branding header */}
        <header className="h-14 min-h-14 flex items-center gap-3 px-4 sm:px-6 bg-surface-card border-b border-border-card shadow-card shrink-0">
          <img
            src="/favicon.svg"
            alt=""
            className="w-7 h-7 rounded-md shrink-0"
            width={28}
            height={28}
            aria-hidden
          />
          <span className="font-heading text-lg font-bold text-accent-green-dark">
            ShowGroundsLive
          </span>
          {headerLabel && (
            <>
              <span className="text-border-card mx-1 hidden sm:block">/</span>
              <span className="font-body text-sm font-medium text-warm-orange-brown truncate hidden sm:block">
                {headerLabel}
              </span>
            </>
          )}
        </header>

        <main className="flex-1 min-w-0 min-h-0" id="main-content" role="main">
          <DashboardView />
        </main>
      </div>
    </HeaderLabelContext.Provider>
  );
}

export default App;
