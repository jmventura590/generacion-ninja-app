// Belt + obstacle helpers shared across ADN routes.

export type BeltKey = "white" | "green" | "blue" | "red" | "black";

export const BELTS: { key: BeltKey; label: string; subtitle: string; min: number; hex: string }[] = [
  { key: "white", label: "Muñequera Blanca", subtitle: "Nivel Inicial",        min: 0,    hex: "#ffffff" },
  { key: "green", label: "Muñequera Verde",  subtitle: "Constancia Inicial",   min: 400,  hex: "#39ff14" },
  { key: "blue",  label: "Muñequera Azul",   subtitle: "Compromiso Avanzado",  min: 1000, hex: "#3aa0ff" },
  { key: "red",   label: "Muñequera Roja",   subtitle: "Elite Ninja",          min: 2000, hex: "#ff2d55" },
  { key: "black", label: "Muñequera Negra",  subtitle: "Maestro del Circuito", min: 4000, hex: "#222222" },
];

export function beltFromXp(xp: number) {
  let current = BELTS[0];
  for (const b of BELTS) if (xp >= b.min) current = b;
  const next = BELTS.find((b) => b.min > xp);
  const span = next ? next.min - current.min : 1;
  const pct = next ? Math.max(0, Math.min(100, ((xp - current.min) / span) * 100)) : 100;
  return { current, next, pct };
}

export const SKILLS = [
  { key: "jump_xp",         label: "Salto" },
  { key: "grip_xp",         label: "Agarre" },
  { key: "coordination_xp", label: "Coordinación" },
  { key: "agility_xp",      label: "Agilidad" },
  { key: "strength_xp",     label: "Fuerza" },
] as const;
export type SkillKey = (typeof SKILLS)[number]["key"];

import muroImg from "@/assets/adn-muro.png";
import pasamanosImg from "@/assets/adn-pasamanos.png";
import puenteImg from "@/assets/adn-puente.png";

export const OBSTACLES: {
  name: string;
  img: string;
  unlockSkill: SkillKey;
  unlockAt: number;
  caption: string;
}[] = [
  { name: "Muro Curvado",   img: muroImg,      unlockSkill: "jump_xp",    unlockAt: 150, caption: "Corré pared arriba" },
  { name: "Pasamanos",      img: pasamanosImg, unlockSkill: "grip_xp",    unlockAt: 150, caption: "Colgate y avanzá"   },
  { name: "Puente Colgante",img: puenteImg,    unlockSkill: "agility_xp", unlockAt: 150, caption: "Mantené el equilibrio" },
];
