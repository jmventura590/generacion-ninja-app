import React from "react";

export type NinjaNavTab = "avatar" | "evolucion" | "mapa" | "reporte";

interface NinjaBottomNavProps {
  activeTab: NinjaNavTab;
  onTabChange: (tab: NinjaNavTab) => void;
}

interface NavItem {
  key: NinjaNavTab;
  label: string;
  icon: React.FC<{ active: boolean }>;
}

const AvatarIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" />
    <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const EvolucionIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 19V13M10 19V9M16 19V5M22 19V11" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MapaIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 4v14M15 6v14" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" />
  </svg>
);

const ReporteIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" />
    <path d="M12 12V5M12 12l5 3" stroke={active ? "#39FF14" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { key: "avatar", label: "Avatar", icon: AvatarIcon },
  { key: "evolucion", label: "Evolución", icon: EvolucionIcon },
  { key: "mapa", label: "Mapa", icon: MapaIcon },
  { key: "reporte", label: "Reporte", icon: ReporteIcon },
];

const NinjaBottomNav: React.FC<NinjaBottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F17] border-t border-[#1E2530] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch justify-between max-w-xl mx-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onTabChange(key)}
                aria-current={isActive ? "page" : undefined}
                className="w-full flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-150"
              >
                <span className={["flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150", isActive ? "bg-[#39FF14]/10" : ""].join(" ")}>
                  <Icon active={isActive} />
                </span>
                <span className={["text-[10px] font-semibold tracking-wide leading-none", isActive ? "text-[#39FF14]" : "text-gray-500"].join(" ")}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NinjaBottomNav;
