// Belt + obstacle helpers shared across ADN routes.

export type BeltKey = "white" | "green" | "blue" | "red" | "black";

// Belt thresholds expressed as LEVELS reached using the exponential XP curve.
// xp_required_for_level(n) = round(100 * 1.15^n); level is cumulative.
export const BELTS: { key: BeltKey; label: string; subtitle: string; minLevel: number; hex: string }[] = [
  { key: "white", label: "Muñequera Blanca", subtitle: "Nivel Inicial",        minLevel: 0,  hex: "#ffffff" },
  { key: "green", label: "Muñequera Verde",  subtitle: "Constancia Inicial",   minLevel: 5,  hex: "#39ff14" },
  { key: "blue",  label: "Muñequera Azul",   subtitle: "Compromiso Avanzado",  minLevel: 10, hex: "#3aa0ff" },
  { key: "red",   label: "Muñequera Roja",   subtitle: "Elite Ninja",          minLevel: 15, hex: "#ff2d55" },
  { key: "black", label: "Muñequera Negra",  subtitle: "Maestro del Circuito", minLevel: 20, hex: "#222222" },
];

export function xpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.15, level));
}

export function levelForXp(xp: number): { level: number; acc: number; nextStep: number; intoLevel: number } {
  if (!xp || xp <= 0) return { level: 0, acc: 0, nextStep: xpRequiredForLevel(1), intoLevel: 0 };
  let lvl = 0;
  let acc = 0;
  while (lvl < 200) {
    const step = xpRequiredForLevel(lvl + 1);
    if (acc + step > xp) return { level: lvl, acc, nextStep: step, intoLevel: xp - acc };
    acc += step;
    lvl += 1;
  }
  return { level: lvl, acc, nextStep: xpRequiredForLevel(lvl + 1), intoLevel: 0 };
}

export function beltFromXp(xp: number) {
  const { level, nextStep, intoLevel } = levelForXp(xp);
  let current = BELTS[0];
  for (const b of BELTS) if (level >= b.minLevel) current = b;
  const next = BELTS.find((b) => b.minLevel > level);
  const pct = nextStep > 0 ? Math.max(0, Math.min(100, (intoLevel / nextStep) * 100)) : 100;
  return { current, next, pct, level };
}

export const SKILLS = [
  { key: "jump_xp",         label: "Salto" },
  { key: "grip_xp",         label: "Agarre" },
  { key: "coordination_xp", label: "Coordinación" },
  { key: "strength_xp",     label: "Fuerza" },
  { key: "resistance_xp",   label: "Resistencia" },
  { key: "speed_xp",        label: "Velocidad" },
  { key: "balance_xp",      label: "Equilibrio" },
] as const;
export type SkillKey = (typeof SKILLS)[number]["key"];


import muroImg from "@/assets/adn-muro.png";
import pasamanosImg from "@/assets/adn-pasamanos.png";
import puenteImg from "@/assets/obstacles/puente.png";

export const OBSTACLES: {
  name: string;
  img: string;
  unlockSkill: SkillKey;
  unlockAt: number;
  caption: string;
}[] = [
  { name: "Muro Curvado",   img: muroImg,      unlockSkill: "jump_xp",    unlockAt: 150, caption: "Corré pared arriba" },
  { name: "Pasamanos",      img: pasamanosImg, unlockSkill: "grip_xp",    unlockAt: 150, caption: "Colgate y avanzá"   },
  { name: "Puente Colgante",img: puenteImg,    unlockSkill: "balance_xp", unlockAt: 150, caption: "Mantené el equilibrio" },
];
