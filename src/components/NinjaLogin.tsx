import React, { useState } from "react";

interface NinjaLoginProps {
  onLogin?: (data: { method: "gmail" | "credentials"; username?: string }) => void;
  isLoading?: boolean;
}

const NinjaLogin: React.FC<NinjaLoginProps> = ({ onLogin, isLoading = false }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGmailLogin = () => {
    setError(null);
    onLogin?.({ method: "gmail" });
  };

  const handleCredentialsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Completá usuario y clave para continuar.");
      return;
    }
    setError(null);
    onLogin?.({ method: "credentials", username: username.trim() });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0F17] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1E2530] bg-[#0E1420] shadow-[0_0_40px_rgba(57,255,20,0.08)] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#0B0F17] border-2 border-[#39FF14] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(57,255,20,0.45)] overflow-hidden">
            <img src="/assets/adn-logo.jpg" alt="ADN" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Generación Ninja</h1>
          <p className="text-sm text-gray-400 mt-1">Iniciá sesión para entrenar</p>
        </div>

        <button
          type="button"
          onClick={handleGmailLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2A3140] bg-[#11171F] hover:bg-[#161D27] hover:border-[#39FF14]/50 transition-colors duration-200 py-3 px-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M5.27 9.55c.6-1.8 2.3-3.1 4.4-3.1 1.3 0 2.4.45 3.3 1.3l2.5-2.4C13.9 3.8 12.2 3 10 3 6.6 3 3.7 5.1 2.4 8.1l2.87 1.45z" />
            <path fill="#34A853" d="M10 21c2.2 0 4.05-.73 5.4-1.97l-2.65-2.05c-.73.5-1.67.82-2.75.82-2.1 0-3.8-1.3-4.4-3.1L2.73 16.1C4 19.1 6.9 21 10 21z" />
            <path fill="#4A90E2" d="M19.5 10.2c0-.6-.06-1.18-.16-1.7H10v3.2h5.4c-.24 1.15-.93 2.1-1.95 2.75l2.65 2.05c1.55-1.43 2.4-3.55 2.4-6.3z" />
            <path fill="#FBBC05" d="M5.6 12.2c-.16-.45-.25-.93-.25-1.45s.09-1 .25-1.45L2.73 7.85C2.27 8.85 2 9.9 2 11s.27 2.15.73 3.15L5.6 12.2z" />
          </svg>
          Continuar con Gmail
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-[#1E2530]" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">o con tu cuenta</span>
          <div className="h-px flex-1 bg-[#1E2530]" />
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label htmlFor="ninja-username" className="block text-sm font-medium text-gray-300 mb-1.5">Usuario</label>
            <input
              id="ninja-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tu.usuario"
              autoComplete="username"
              className="w-full rounded-lg bg-[#0B0F17] border border-[#2A3140] text-white placeholder-gray-500 px-4 py-2.5 outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/40 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="ninja-password" className="block text-sm font-medium text-gray-300 mb-1.5">Clave</label>
            <input
              id="ninja-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-lg bg-[#0B0F17] border border-[#2A3140] text-white placeholder-gray-500 px-4 py-2.5 outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/40 transition-colors"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#39FF14] text-[#0B0F17] font-bold py-3 mt-2 hover:bg-[#2EE60F] active:scale-[0.98] transition-all duration-150 shadow-[0_0_25px_rgba(57,255,20,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Ingresando..." : "Entrar al Dojo"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NinjaLogin;
