import React from "react";
import { LayoutDashboard, BookOpen, LayoutGrid, Bell, Grid3x3 } from "lucide-react";

export type MobileTab = "overview" | "classes" | "rings" | "board" | "notifications";

const TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="size-5" /> },
  { id: "classes", label: "Classes", icon: <BookOpen className="size-5" /> },
  { id: "rings", label: "Rings", icon: <LayoutGrid className="size-5" /> },
  { id: "board", label: "Board", icon: <Grid3x3 className="size-5" /> },
  { id: "notifications", label: "Alerts", icon: <Bell className="size-5" /> },
];

interface BottomTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  notificationCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  notificationCount = 0,
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-border-card safe-area-bottom"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-14">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative touch-manipulation transition-colors ${
                isActive
                  ? "text-accent-green-dark"
                  : "text-text-secondary active:text-text-primary"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent-green-dark rounded-b" />
              )}
              <span className="relative">
                {tab.icon}
                {tab.id === "notifications" && notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center bg-warm-orange-brown text-white text-[10px] font-bold rounded-full px-1 tabular-nums">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium font-body leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
