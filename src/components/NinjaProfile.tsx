import React, { useMemo } from "react";

export interface BraceletEntry {
  id: string;
  color: string;
  label: string;
  dateAwarded: string;
}

export interface NinjaProfileData {
  name: string;
  birthday: string; // "MM-DD"
  currentBraceletColor: string;
  currentBraceletLabel: string;
  bracelets: BraceletEntry[];
  avatarImageUrl?: string;
}

interface NinjaProfileProps {
  profile: NinjaProfileData;
  today?: Date;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
};

const isBirthdayToday = (birthdayMMDD: string, reference: Date): boolean => {
  const [month, day] = birthdayMMDD.split("-").map(Number);
  if (!month || !day) return false;
  return reference.getMonth() + 1 === month && reference.getDate() === day;
};

const NinjaProfile: React.FC<NinjaProfileProps> = ({ profile, today }) => {
  const referenceDate = today ?? new Date();
  const showBirthdayBanner = useMemo(
    () => isBirthdayToday(profile.birthday, referenceDate),
    [profile.birthday, referenceDate]
  );
  const sortedBracelets = useMemo(
    () => [...profile.bracelets].sort((a, b) => new Date(b.dateAwarded).getTime() - new Date(a.dateAwarded).getTime()),
    [profile.bracelets]
  );

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] px-4 py-10">
      <div className="max-w-xl mx-auto">
        {showBirthdayBanner && (
          <div className="mb-6 relative overflow-hidden rounded-2xl border border-[#39FF14]/40 bg-gradient-to-r from-[#0E1420] via-[#11221A] to-[#0E1420] px-5 py-4 shadow-[0_0_30px_rgba(57,255,20,0.25)]">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label="Corona">👑</span>
              <div>
                <p className="text-[#39FF14] font-extrabold text-base leading-tight">¡Feliz cumpleaños, {profile.name}!</p>
                <p className="text-gray-300 text-sm leading-tight">Hoy es tu día. ¡Todo el dojo te felicita! 🎉</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[#1E2530] bg-[#0E1420] p-6 shadow-[0_0_40px_rgba(57,255,20,0.06)]">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {profile.avatarImageUrl ? (
                <img
                  src={profile.avatarImageUrl}
                  alt={`Avatar de ${profile.name}`}
                  className="w-[88px] h-[88px] rounded-full object-cover border-2 border-[#39FF14]/40"
                />
              ) : (
                <svg width="88" height="88" viewBox="0 0 88 88" aria-label={`Avatar de ${profile.name}`} role="img">
                  <circle cx="44" cy="30" r="16" fill="#D9A066" />
                  <path d="M14 86 C14 62 26 52 44 52 C62 52 74 62 74 86 Z" fill="#111418" stroke="#2A3140" strokeWidth="1" />
                  <image href="/assets/adn-logo.jpg" x="30" y="60" width="28" height="20" preserveAspectRatio="xMidYMid meet" />
                </svg>
              )}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0E1420] shadow-md"
                style={{ backgroundColor: profile.currentBraceletColor }}
                title={profile.currentBraceletLabel}
                aria-label={`Pulsera actual: ${profile.currentBraceletLabel}`}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: profile.currentBraceletColor }} />
                <span className="text-sm text-gray-300">{profile.currentBraceletLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-7">
            <h3 className="text-sm font-semibold text-gray-400 tracking-wide mb-3">Historial de pulseras</h3>
            {sortedBracelets.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Todavía no hay pulseras registradas.</p>
            ) : (
              <ul className="space-y-2">
                {sortedBracelets.map((bracelet) => (
                  <li key={bracelet.id} className="flex items-center justify-between rounded-lg border border-[#1E2530] bg-[#0B0F17] px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: bracelet.color }} />
                      <span className="text-sm font-medium text-white">{bracelet.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(bracelet.dateAwarded)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NinjaProfile;
