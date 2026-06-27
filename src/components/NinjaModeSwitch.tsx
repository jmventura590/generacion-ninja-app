import React from "react";

export type NinjaAppMode = "ninja" | "familia";

interface NinjaModeSwitchProps {
  mode: NinjaAppMode;
  onModeChange: (mode: NinjaAppMode) => void;
}

const NinjaModeSwitch: React.FC<NinjaModeSwitchProps> = ({ mode, onModeChange }) => {
  return (
    <div role="radiogroup" aria-label="Seleccionar modo de visualización" className="inline-flex rounded-full border border-[#1E2530] bg-[#0E1420] p-1">
      <button
        type="button"
        role="radio"
        aria-checked={mode === "ninja"}
        onClick={() => onModeChange("ninja")}
        className={["px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150", mode === "ninja" ? "bg-[#39FF14] text-[#0B0F17]" : "text-gray-400 hover:text-white"].join(" ")}
      >
        Modo Ninja
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "familia"}
        onClick={() => onModeChange("familia")}
        className={["px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150", mode === "familia" ? "bg-[#39FF14] text-[#0B0F17]" : "text-gray-400 hover:text-white"].join(" ")}
      >
        Modo Familia
      </button>
    </div>
  );
};

export default NinjaModeSwitch;
