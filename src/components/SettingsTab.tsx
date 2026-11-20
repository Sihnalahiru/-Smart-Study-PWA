import React, {useState} from 'react';
import {Eye, ShieldCheck, Sun, Trash2} from 'lucide-react';

interface SettingsTabProps {
  eyeComfortMode: boolean;
  onEyeComfortChange: (enabled: boolean) => void;
  onResetComplete: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  eyeComfortMode,
  onEyeComfortChange,
  onResetComplete,
}) => {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const verifyAndReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/verify-reset', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Admin authentication failed.');
        if (response.status === 503) throw new Error('Admin reset is not configured on the server yet.');
        throw new Error('Could not verify administrator. Please try again.');
      }
      setPassword('');
      setResetDialogOpen(false);
      onResetComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="surface-card rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Sun className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="mt-1 text-xs text-slate-500">Personalise your study experience.</p>
          </div>
        </div>
      </header>

      <section className="surface-card rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Eye Comfort Mode</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Use a warmer, softer background to reduce screen glare.</p>
              <p className="mt-2 text-xs font-semibold text-slate-600">{eyeComfortMode ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={eyeComfortMode}
            aria-label="Toggle Eye Comfort Mode"
            onClick={() => onEyeComfortChange(!eyeComfortMode)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${eyeComfortMode ? 'bg-emerald-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${eyeComfortMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      <section className="surface-card rounded-2xl border border-rose-100 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900">Reset Study Data</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Reset this profile’s XP, streak, quiz results, completed modules, flashcard progress and dashboard summary. Study content will not be deleted.
            </p>
            <button type="button" onClick={() => { setError(''); setResetDialogOpen(true); }} className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin reset
            </button>
          </div>
        </div>
      </section>

      {resetDialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-reset-title">
          <form onSubmit={verifyAndReset} className="surface-glass w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
              <ShieldCheck className="h-5 w-5 text-rose-600" aria-hidden="true" />
              <h2 id="admin-reset-title" className="text-base font-bold text-slate-900">Administrator Verification</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">Confirm administrator access before resetting this profile’s study progress.</p>
            <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="admin-reset-username">Username</label>
            <input id="admin-reset-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500" />
            <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor="admin-reset-password">Password</label>
            <input id="admin-reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500" />
            {error && <p role="alert" className="mt-3 text-xs font-medium text-rose-700">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => { setResetDialogOpen(false); setPassword(''); setError(''); }} className="min-h-[42px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={busy || !password.trim()} className="min-h-[42px] rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify & Reset'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
