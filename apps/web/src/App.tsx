import React, { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  services?: {
    database: string;
    redis: string;
  };
}

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
              EO
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">EventOps</h1>
              <p className="text-xs text-slate-400">Community & Event Collaboration Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              MVP Phase 0: Scaffolding
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col justify-center items-center">
        <div className="max-w-2xl w-full bg-slate-900/60 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to EventOps</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Discover communities, collaborate on events, request sponsorships and venues, and safely reach audiences with strict permission-based outreach.
          </p>

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/70 mb-6">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">API Health Check</span>
              <span className="text-xs font-mono text-slate-500">GET /api/health</span>
            </div>

            {loading && (
              <div className="text-slate-400 text-sm animate-pulse">Connecting to backend service...</div>
            )}

            {error && (
              <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded">
                API Connection pending: {error} (Ensure backend is running on :4000)
              </div>
            )}

            {health && (
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-semibold">{health.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-slate-200">{health.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime:</span>
                  <span className="text-slate-200">{Math.round(health.uptime)}s</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
            <div className="p-3 bg-slate-950/40 rounded border border-slate-800/60">
              <span className="font-semibold text-slate-300 block mb-1">Architecture</span>
              Modular Monolith + Express + React + Tailwind
            </div>
            <div className="p-3 bg-slate-950/40 rounded border border-slate-800/60">
              <span className="font-semibold text-slate-300 block mb-1">Data Model</span>
              PostgreSQL + Prisma ORM (17 domain entities)
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        EventOps MVP &copy; 2026. Built with permission-based privacy by design.
      </footer>
    </div>
  );
}

export default App;
