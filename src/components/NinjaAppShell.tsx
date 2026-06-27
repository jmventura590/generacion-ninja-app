import React, { useState } from "react";
import NinjaBottomNav, { NinjaNavTab } from "./NinjaBottomNav";

interface NinjaAppShellProps {
  renderAvatar: () => React.ReactNode;
  renderEvolucion: () => React.ReactNode;
  renderMapa: () => React.ReactNode;
  renderShop: () => React.ReactNode;
  renderReporte: () => React.ReactNode;
  initialTab?: NinjaNavTab;
}

const NinjaAppShell: React.FC<NinjaAppShellProps> = ({
  renderAvatar,
  renderEvolucion,
  renderMapa,
  renderShop,
  renderReporte,
  initialTab = "avatar",
}) => {
  const [activeTab, setActiveTab] = useState<NinjaNavTab>(initialTab);

  const renderContent = () => {
    switch (activeTab) {
      case "avatar": return renderAvatar();
      case "evolucion": return renderEvolucion();
      case "mapa": return renderMapa();
      case "shop": return renderShop();
      case "reporte": return renderReporte();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17]">
      <main className="pb-24">{renderContent()}</main>
      <NinjaBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default NinjaAppShell;
