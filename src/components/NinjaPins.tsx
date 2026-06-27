import React from "react";

export type ObstacleKey = "palestra" | "pasamanos" | "pegboard" | "pelotas" | "tronco";

export interface ObstacleConfig {
  key: ObstacleKey;
  label: string;
  color: string;
}

export interface NinjaPinsProps {
  earnedStatus: Partial<Record<ObstacleKey, boolean>>;
  onSelect?: (obstacle: ObstacleKey) => void;
}

const OBSTACLES: ObstacleConfig[] = [
  { key: "palestra", label: "Palestra", color: "#39FF14" },
  { key: "pasamanos", label: "Pasamanos", color: "#00E0FF" },
  { key: "pegboard", label: "Pegboard", color: "#FF3CAC" },
  { key: "pelotas", label: "Pelotas", color: "#FFD60A" },
  { key: "tronco", label: "Tronco", color: "#FF7A1A" },
];

const LockIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="#6B7280" strokeWidth="1.8" />
    <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const NinjaPins: React.FC<NinjaPinsProps> = ({ earnedStatus, onSelect }) => {
  return (
    <div className="min-h-screen w-full bg-[#0B0F17] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-1">Obstáculos</h2>
        <p className="text-sm text-gray-400 mb-6">Tu progreso en cada estación del dojo</p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {OBSTACLES.map((obstacle) => {
            const earned = Boolean(earnedStatus[obstacle.key]);
            return (
              <button
                key={obstacle.key}
                type="button"
                onClick={() => onSelect?.(obstacle.key)}
                aria-pressed={earned}
                aria-label={`${obstacle.label}: ${earned ? "obtenido" : "pendiente"}`}
                className="flex flex-col items-center gap-2 group focus:outline-none"
              >
                <div
                  className={[
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 border-2",
                    earned ? "border-transparent group-hover:scale-105" : "bg-[#161B24] border-[#2A3140] group-hover:border-gray-500",
                  ].join(" ")}
                  style={earned ? { backgroundColor: obstacle.color, boxShadow: `0 0 18px ${obstacle.color}99` } : undefined}
                >
                  {earned ? <span className="text-[#0B0F17] font-extrabold text-lg">✓</span> : <LockIcon />}
                </div>
                <span className={["text-xs font-medium text-center leading-tight", earned ? "text-white" : "text-gray-500"].join(" ")}>
                  {obstacle.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NinjaPins;
