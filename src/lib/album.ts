// Álbum Ninja — catalog of 27 collectible cards (9 obstacles × 3 angles).
// Images are NEW illustrations, distinct from the Evolución medallero.

import spider1 from "@/assets/cards/spider_1.jpg";
import spider2 from "@/assets/cards/spider_2.jpg";
import spider3 from "@/assets/cards/spider_3.jpg";
import pasamanos1 from "@/assets/cards/pasamanos_1.jpg";
import pasamanos2 from "@/assets/cards/pasamanos_2.jpg";
import pasamanos3 from "@/assets/cards/pasamanos_3.jpg";
import muro1 from "@/assets/cards/muro_1.jpg";
import muro2 from "@/assets/cards/muro_2.jpg";
import muro3 from "@/assets/cards/muro_3.jpg";
import palestra1 from "@/assets/cards/palestra_1.jpg";
import palestra2 from "@/assets/cards/palestra_2.jpg";
import palestra3 from "@/assets/cards/palestra_3.jpg";
import tronco1 from "@/assets/cards/tronco_1.jpg";
import tronco2 from "@/assets/cards/tronco_2.jpg";
import tronco3 from "@/assets/cards/tronco_3.jpg";
import escalera1 from "@/assets/cards/escalera_1.jpg";
import escalera2 from "@/assets/cards/escalera_2.jpg";
import escalera3 from "@/assets/cards/escalera_3.jpg";
import escalones1 from "@/assets/cards/escalones_1.jpg";
import escalones2 from "@/assets/cards/escalones_2.jpg";
import escalones3 from "@/assets/cards/escalones_3.jpg";
import pegboard1 from "@/assets/cards/pegboard_1.jpg";
import pegboard2 from "@/assets/cards/pegboard_2.jpg";
import pegboard3 from "@/assets/cards/pegboard_3.jpg";
import pelotas1 from "@/assets/cards/pelotas_1.jpg";
import pelotas2 from "@/assets/cards/pelotas_2.jpg";
import pelotas3 from "@/assets/cards/pelotas_3.jpg";

export type Rarity = "common" | "gold";

export type Card = {
  id: string;
  obstacle: string;
  angle: string;
  img: string;
};

export const ALBUM: Card[] = [
  { id: "spider_1",    obstacle: "Salto de la Araña",  angle: "De espaldas",        img: spider1 },
  { id: "spider_2",    obstacle: "Salto de la Araña",  angle: "Gesto de esfuerzo",  img: spider2 },
  { id: "spider_3",    obstacle: "Salto de la Araña",  angle: "Salto lateral",      img: spider3 },
  { id: "pasamanos_1", obstacle: "Pasamanos",          angle: "Desde abajo",        img: pasamanos1 },
  { id: "pasamanos_2", obstacle: "Pasamanos",          angle: "Lateral en swing",   img: pasamanos2 },
  { id: "pasamanos_3", obstacle: "Pasamanos",          angle: "Primer agarre",      img: pasamanos3 },
  { id: "muro_1",      obstacle: "Muro Curvado",       angle: "Corriendo de espaldas", img: muro1 },
  { id: "muro_2",      obstacle: "Muro Curvado",       angle: "En la cima",         img: muro2 },
  { id: "muro_3",      obstacle: "Muro Curvado",       angle: "Festejo al saltar",  img: muro3 },
  { id: "palestra_1",  obstacle: "Palestra",           angle: "Escalando de espaldas", img: palestra1 },
  { id: "palestra_2",  obstacle: "Palestra",           angle: "Mano en presa",      img: palestra2 },
  { id: "palestra_3",  obstacle: "Palestra",           angle: "A mitad de camino",  img: palestra3 },
  { id: "tronco_1",    obstacle: "Tronco Giratorio",   angle: "Vista cenital",      img: tronco1 },
  { id: "tronco_2",    obstacle: "Tronco Giratorio",   angle: "Equilibrio lateral", img: tronco2 },
  { id: "tronco_3",    obstacle: "Tronco Giratorio",   angle: "Mirada concentrada", img: tronco3 },
  { id: "escalera_1",  obstacle: "Escalera Invertida", angle: "Desde abajo",        img: escalera1 },
  { id: "escalera_2",  obstacle: "Escalera Invertida", angle: "Cruzando la cima",   img: escalera2 },
  { id: "escalera_3",  obstacle: "Escalera Invertida", angle: "Agarre fuerte",      img: escalera3 },
  { id: "escalones_1", obstacle: "5 Escalones",        angle: "Salto lateral",      img: escalones1 },
  { id: "escalones_2", obstacle: "5 Escalones",        angle: "Llegada de espaldas",img: escalones2 },
  { id: "escalones_3", obstacle: "5 Escalones",        angle: "Salto desde abajo",  img: escalones3 },
  { id: "pegboard_1",  obstacle: "Pegboard",           angle: "Lateral con peg",    img: pegboard1 },
  { id: "pegboard_2",  obstacle: "Pegboard",           angle: "Manos en pegs",      img: pegboard2 },
  { id: "pegboard_3",  obstacle: "Pegboard",           angle: "Llegada festejo",    img: pegboard3 },
  { id: "pelotas_1",   obstacle: "Pelotas Colgantes",  angle: "Swing lateral",      img: pelotas1 },
  { id: "pelotas_2",   obstacle: "Pelotas Colgantes",  angle: "Mano en la pelota",  img: pelotas2 },
  { id: "pelotas_3",   obstacle: "Pelotas Colgantes",  angle: "Última pelota",      img: pelotas3 },
];

export const CARD_BY_ID = new Map(ALBUM.map((c) => [c.id, c] as const));

export const GOLD_PROBABILITY = 0.1;

export function rollCard(): { id: string; rarity: Rarity } {
  const card = ALBUM[Math.floor(Math.random() * ALBUM.length)];
  const rarity: Rarity = Math.random() < GOLD_PROBABILITY ? "gold" : "common";
  return { id: card.id, rarity };
}

export function rollPack(): { id: string; rarity: Rarity }[] {
  return [rollCard(), rollCard(), rollCard()];
}
