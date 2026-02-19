import React from "react";
import { CalendarDays, PawPrint, ListChecks, X } from "lucide-react";

export type SidebarTab = "schedule" | "horses" | "notification-log";

export interface SidebarProps {
  /** Currently active tab. */
  activeTab: SidebarTab;
  /** Called when user selects a tab. */
  onTabChange: (tab: SidebarTab) => void;
  /** Mobile only: whether the sidebar overlay is open. */
  isMobileOpen: boolean;
  /** Mobile only: called to close the sidebar (e.g. after nav or backdrop click). */
  onMobileClose: () => void;
  /** Desktop: when true, sidebar shows only icons (narrow strip). */
  isCollapsed?: boolean;
}

const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: "schedule", label: "Schedule", icon: <CalendarDays className="size-5" aria-hidden /> },
  { id: "horses", label: "Horses", icon: <PawPrint className="size-5" aria-hidden /> },
  { id: "notification-log", label: "Notification log", icon: <ListChecks className="size-5" aria-hidden /> },
];

/**
 * Vertical sidebar navigation with Schedule, Horses, and Notification log.
 * Desktop: can be expanded (full width with labels) or collapsed (icon-only strip).
 * Mobile: overlay drawer; hamburger opens/closes. No bottom section.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isMobileOpen,
  onMobileClose,
  isCollapsed = false,
}) => {
  const handleTabClick = (tab: SidebarTab) => {
    onTabChange(tab);
    onMobileClose();
  };

  const collapsed = isCollapsed;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        role="presentation"
        aria-hidden
        className="fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden"
        style={{
          opacity: isMobileOpen ? 1 : 0,
          pointerEvents: isMobileOpen ? "auto" : "none",
        }}
        onClick={onMobileClose}
      />

      {/* Sidebar panel: full on mobile when open; on desktop width depends on collapsed */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full min-h-screen flex flex-col shrink-0
          bg-surface-card border-r border-border-card shadow-card
          transition-[width,transform] duration-200 ease-out
          md:relative md:z-auto md:translate-x-0 md:shadow-none
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          ${collapsed ? "md:w-16 md:min-w-16" : "md:w-64 md:min-w-64"}
        `}
        aria-label="Main navigation"
      >
        {/* Branding: same height as app header for alignment */}
        <div
          className={`
            h-16 min-h-16 flex items-center border-b border-border-card shrink-0
            ${collapsed ? "md:justify-center md:px-0" : "px-4 md:px-5"}
          `}
        >
          {collapsed ? (
            <span className="hidden md:flex items-center justify-center flex-1" aria-hidden>
              <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-md shrink-0" width={32} height={32} />
            </span>
          ) : (
            <>
              <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-md shrink-0 mr-3" width={32} height={32} aria-hidden />
              <span className="font-heading text-lg font-bold text-accent-green-dark">
                ShowGroundsLive
              </span>
              <button
                type="button"
                onClick={onMobileClose}
                className="md:hidden ml-auto p-2 -m-2 rounded-card text-text-secondary hover:text-text-primary hover:bg-surface-card-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2"
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </>
          )}
        </div>

        {/* Nav: clear spacing and bifurcation; active = light background */}
        <nav
          className={`
            flex-1 overflow-x-hidden overflow-y-auto
            ${collapsed ? "md:px-2 md:py-4" : "p-4 md:py-5 md:px-4"}
          `}
          aria-label="Tabs"
        >
          <ul className={collapsed ? "md:space-y-2" : "space-y-1"}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    title={collapsed ? tab.label : undefined}
                    className={`
                      w-full flex items-center rounded-card font-body text-sm font-medium
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2
                      transition-colors
                      ${collapsed ? "md:justify-center md:px-0 md:py-3 md:min-h-[2.75rem]" : "gap-3 px-4 py-3 text-left"}
                      ${isActive
                        ? "bg-accent-green/15 text-accent-green-dark"
                        : "text-text-secondary hover:bg-surface-card-alt hover:text-text-primary"
                      }
                    `}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? tab.label : undefined}
                  >
                    <span className="shrink-0 [&>svg]:size-5" aria-hidden>
                      {tab.icon}
                    </span>
                    {!collapsed && <span>{tab.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};
