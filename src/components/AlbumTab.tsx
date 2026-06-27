import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALBUM, CARD_BY_ID, rollPack, type Rarity } from "@/lib/album";
import { Sparkles, Package } from "lucide-react";

type Pack = { id: string; created_at: string };
type CollectionRow = { card_id: string; count_common: number; count_gold: number };
type DrawnCard = { id: string; rarity: Rarity };

export default function AlbumTab({ studentId }: { studentId: string }) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collection, setCollection] = useState<Record<string, CollectionRow>>({});
  const [opening, setOpening] = useState<null | { packId: string; cards: DrawnCard[] }>(null);
  const [revealed, setRevealed] = useState(0);

  async function refresh() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("card_packs").select("id, created_at").eq("student_id", studentId).is("opened_at", null).order("created_at"),
      supabase.from("card_collection").select("card_id, count_common, count_gold").eq("student_id", studentId),
    ]);
    setPacks((p ?? []) as Pack[]);
    const map: Record<string, CollectionRow> = {};
    (c ?? []).forEach((row: any) => { map[row.card_id] = row; });
    setCollection(map);
  }

  useEffect(() => { refresh(); }, [studentId]);

  async function openPack(pack: Pack) {
    const cards = rollPack();
    setOpening({ packId: pack.id, cards });
    setRevealed(0);

    // Persist: mark pack opened + upsert counts
    const { error: pe } = await supabase
      .from("card_packs")
      .update({ opened_at: new Date().toISOString(), cards: cards as any })
      .eq("id", pack.id);
    if (pe) { toast.error("No se pudo abrir el paquete"); return; }

    // Aggregate increments per card
    const delta: Record<string, { c: number; g: number }> = {};
    cards.forEach((d) => {
      delta[d.id] ??= { c: 0, g: 0 };
      if (d.rarity === "gold") delta[d.id].g += 1; else delta[d.id].c += 1;
    });
    for (const [card_id, d] of Object.entries(delta)) {
      const prev = collection[card_id];
      if (prev) {
        await supabase.from("card_collection").update({
          count_common: prev.count_common + d.c,
          count_gold: prev.count_gold + d.g,
        }).eq("student_id", studentId).eq("card_id", card_id);
      } else {
        await supabase.from("card_collection").insert({
          student_id: studentId, card_id, count_common: d.c, count_gold: d.g,
        });
      }
    }
  }

  function closeOpening() {
    setOpening(null);
    setRevealed(0);
    refresh();
  }

  const totals = useMemo(() => {
    let owned = 0, total = 0;
    Object.values(collection).forEach((r) => { owned += r.count_common + r.count_gold; });
    Object.values(collection).forEach((r) => { if (r.count_common + r.count_gold > 0) total += 1; });
    return { owned, unique: total };
  }, [collection]);

  return (
    <div className="space-y-5">
      <div className="adn-card p-5">
        <div className="text-[10px] tracking-[0.3em] text-white/50">ÁLBUM NINJA</div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-xl font-black">{totals.unique}/27 únicas</div>
          <div className="text-xs text-white/50">{totals.owned} figuritas en total</div>
        </div>
      </div>

      {packs.length > 0 && (
        <div className="adn-card p-5">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3 flex items-center gap-2">
            <Sparkles size={12} className="text-[var(--adn-fluor)]" />
            PAQUETES PARA ABRIR · {packs.length}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {packs.map((p) => (
              <button
                key={p.id}
                onClick={() => openPack(p)}
                className="relative shrink-0 w-24 h-32 rounded-xl bg-gradient-to-br from-[#39FF14]/20 via-[#BF00FF]/20 to-black border-2 border-[var(--adn-fluor)] grid place-items-center hover:scale-105 transition-transform animate-pulse"
                style={{ boxShadow: "0 0 16px #39ff1466" }}
                aria-label="Abrir paquete"
              >
                <Package size={36} className="text-white" />
                <span className="absolute bottom-2 text-[9px] tracking-widest text-[var(--adn-fluor)] font-bold">ABRIR</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {ALBUM.map((c) => {
          const row = collection[c.id];
          const total = (row?.count_common ?? 0) + (row?.count_gold ?? 0);
          const hasGold = (row?.count_gold ?? 0) > 0;
          const owned = total > 0;
          return (
            <div key={c.id} className={`relative rounded-xl overflow-hidden border ${owned ? (hasGold ? "border-yellow-400" : "border-white/10") : "border-white/5"} bg-black/60`}>
              <div className="aspect-[3/4] relative">
                {owned ? (
                  <img src={c.img} alt={c.obstacle} loading="lazy" className={`w-full h-full object-cover ${hasGold ? "card-gold" : ""}`} />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-gradient-to-br from-white/[0.03] to-transparent">
                    <span className="text-4xl text-white/15">?</span>
                  </div>
                )}
                {total > 1 && (
                  <span className="absolute top-1 right-1 bg-black/80 text-[10px] font-bold text-white px-1.5 py-0.5 rounded">x{total}</span>
                )}
                {hasGold && (
                  <span className="absolute top-1 left-1 text-[9px] font-black bg-yellow-400 text-black px-1 rounded">DORADA</span>
                )}
              </div>
              <div className="p-1.5">
                <div className="text-[9px] font-bold text-white truncate">{owned ? c.obstacle : "???"}</div>
                <div className="text-[8px] text-white/40 truncate">{owned ? c.angle : "Sin descubrir"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {opening && (
        <PackOpeningOverlay
          cards={opening.cards}
          revealed={revealed}
          onReveal={() => setRevealed((r) => Math.min(r + 1, opening.cards.length))}
          onClose={closeOpening}
        />
      )}
    </div>
  );
}

function PackOpeningOverlay({
  cards, revealed, onReveal, onClose,
}: {
  cards: DrawnCard[]; revealed: number; onReveal: () => void; onClose: () => void;
}) {
  const done = revealed >= cards.length;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm grid place-items-center p-5 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <div className="text-[10px] tracking-[0.5em] text-white/50">PAQUETE ABIERTO</div>
          <div className="text-xl font-black text-white">{revealed} / {cards.length}</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {cards.map((d, i) => {
            const meta = CARD_BY_ID.get(d.id)!;
            const shown = i < revealed;
            const isGold = d.rarity === "gold";
            return (
              <div
                key={i}
                onClick={() => { if (i === revealed) onReveal(); }}
                className={`aspect-[3/4] rounded-xl overflow-hidden relative cursor-pointer ${shown ? "" : "border-2 border-[var(--adn-fluor)]/60 bg-gradient-to-br from-[#39FF14]/15 via-[#BF00FF]/15 to-black"} ${i === revealed && !shown ? "animate-pulse" : ""}`}
                style={{ boxShadow: shown && isGold ? "0 0 24px #facc15cc" : undefined, perspective: 600 }}
              >
                {shown ? (
                  <div className="w-full h-full animate-scale-in">
                    <img src={meta.img} alt={meta.obstacle} className={`w-full h-full object-cover ${isGold ? "card-gold" : ""}`} />
                    {isGold && <span className="absolute top-1 left-1 text-[9px] font-black bg-yellow-400 text-black px-1 rounded">¡DORADA!</span>}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                      <div className="text-[9px] font-bold text-white truncate">{meta.obstacle}</div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <Package size={32} className="text-[var(--adn-fluor)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-center">
          {done ? (
            <button onClick={onClose} className="adn-btn-primary px-8 py-3 text-sm">¡GENIAL!</button>
          ) : (
            <button onClick={onReveal} className="adn-btn-primary px-8 py-3 text-sm">Tocá para revelar</button>
          )}
        </div>
      </div>
    </div>
  );
}
