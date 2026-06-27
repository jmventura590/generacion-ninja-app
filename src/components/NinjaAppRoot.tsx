import React, { useState } from "react";
import NinjaModeSwitch, { NinjaAppMode } from "./NinjaModeSwitch";

interface NinjaAppRootProps {
  studentName: string;
  renderNinjaView: () => React.ReactNode;
  renderFamiliaView: () => React.ReactNode;
}

const NinjaAppRoot: React.FC<NinjaAppRootProps> = ({ studentName, renderNinjaView, renderFamiliaView }) => {
  const [mode, setMode] = useState<NinjaAppMode>("ninja");

  return (
    <div className="min-h-screen bg-[#0B0F17]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#1E2530]">
        <div>
          <p className="text-[13px] font-semibold tracking-wide text-gray-400">Familia</p>
          <h1 className="text-lg font-bold text-white tracking-tight">{studentName}</h1>
        </div>
        <NinjaModeSwitch mode={mode} onModeChange={setMode} />
      </header>
      {mode === "ninja" ? renderNinjaView() : renderFamiliaView()}
    </div>
  );
};

export default NinjaAppRoot;
