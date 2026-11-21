import React, {useMemo, useState} from 'react';
import {
  ArrowRight,
  Award,
  Flame,
  KeyRound,
  Lock,
  ShieldCheck,
  Warehouse,
  X,
} from 'lucide-react';
import {
  getLevelInfo,
  loadProgressForUser,
} from '../hooks/useStudyProgress';
import type {UserId, UserProfile} from '../types/study';
import {getUserPin, setUserPin, USER_PROFILES} from '../utils/userProfiles';

interface LoginScreenProps {
  onLogin: (userId: UserId) => void;
}

const ProfileAvatar: React.FC<{profile: UserProfile; sizeClass?: string}> = ({
  profile,
  sizeClass = 'h-16 w-16',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${profile.accentGradient} text-xl font-bold text-white shadow-sm`}
      >
        {profile.name.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={profile.avatarUrl}
      alt={`${profile.name} (${profile.genderLabel})`}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${sizeClass} shrink-0 rounded-2xl object-cover shadow-sm ring-2 ring-white`}
    />
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({onLogin}) => {
  const [pinModalUser, setPinModalUser] = useState<UserProfile | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | 'setup'>('unlock');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinRefreshTick, setPinRefreshTick] = useState(0);

  const previews = useMemo(() => {
    void pinRefreshTick;
    return USER_PROFILES.map((profile) => {
      const progress = loadProgressForUser(profile.id);
      const level = getLevelInfo(progress.xp);
      const hasPin = Boolean(getUserPin(profile.id));
      return {profile, progress, level, hasPin};
    });
  }, [pinRefreshTick]);

  const handleCardClick = (profile: UserProfile, hasPin: boolean) => {
    if (hasPin) {
      setPinModalUser(profile);
      setPinMode('unlock');
      setPinInput('');
      setPinError('');
      return;
    }
    onLogin(profile.id);
  };

  const handleOpenPinSetup = (
    e: React.MouseEvent,
    profile: UserProfile,
    hasPin: boolean,
  ) => {
    e.stopPropagation();
    if (hasPin) {
      // Require current PIN before removing or changing, or prompt unlock first
      setPinModalUser(profile);
      setPinMode('unlock');
      setPinInput('');
      setPinError('Enter current 4-digit PIN to sign in or manage PIN.');
      return;
    }
    setPinModalUser(profile);
    setPinMode('setup');
    setPinInput('');
    setPinError('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser) return;

    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('Please enter a 4-digit numeric PIN.');
      return;
    }

    if (pinMode === 'setup') {
      setUserPin(pinModalUser.id, pinInput);
      setPinRefreshTick((t) => t + 1);
      setPinModalUser(null);
      onLogin(pinModalUser.id);
      return;
    }

    const stored = getUserPin(pinModalUser.id);
    if (stored && stored !== pinInput) {
      setPinError('Incorrect PIN. Try again.');
      return;
    }

    setPinModalUser(null);
    onLogin(pinModalUser.id);
  };

  const handleRemovePin = () => {
    if (!pinModalUser) return;
    const stored = getUserPin(pinModalUser.id);
    if (stored && pinInput !== stored) {
      setPinError('Enter your current PIN first to remove it.');
      return;
    }
    setUserPin(pinModalUser.id, null);
    setPinRefreshTick((t) => t + 1);
    setPinModalUser(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 shadow-sm">
            <Warehouse className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Smart Study PWA
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
            SSW Logistics &amp; Warehouse Exam Prep
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Select your profile to track XP, daily 25 vocab &amp; mock exams
          </p>
        </div>

        {/* 2-Person Profile Login Cards: Haruto (Boy) & Sakura (Lady) */}
        <div className="space-y-3.5">
          {previews.map(({profile, progress, level, hasPin}) => (
            <div
              key={profile.id}
              className="surface-card-interactive relative overflow-hidden rounded-2xl p-4.5 sm:p-5"
            >
              <button
                type="button"
                onClick={() => handleCardClick(profile, hasPin)}
                className="flex w-full items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <ProfileAvatar profile={profile} sizeClass="h-16 w-16" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {profile.genderLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-jp">{profile.japaneseName}</span>
                    {hasPin && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          <span>PIN</span>
                        </span>
                      </>
                    )}
                  </div>

                  <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
                    {profile.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Award
                        className="h-3.5 w-3.5 text-amber-500"
                        aria-hidden="true"
                      />
                      <span className="font-mono-tabular">
                        Lv.{level.level} · {progress.xp} XP
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flame
                        className={`h-3.5 w-3.5 ${
                          progress.streakDays > 0
                            ? 'text-amber-500'
                            : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-mono-tabular">
                        {progress.streakDays}d streak
                      </span>
                    </span>
                  </div>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>

              <div className="mt-3.5 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs">
                <span className="font-mono-tabular text-slate-500">
                  {progress.readPartNumbers.length} notes ·{' '}
                  {progress.correctQuizIds.length} quiz solved
                </span>
                <button
                  type="button"
                  onClick={(e) => handleOpenPinSetup(e, profile, hasPin)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 transition-colors hover:text-blue-600"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{hasPin ? 'PIN Active' : 'Set 4-Digit PIN'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span>
            Each profile keeps separate XP, streaks, quiz scores, and trophies
            offline.
          </span>
        </p>
      </div>

      {/* Optional 4-Digit PIN Modal */}
      {pinModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${pinModalUser.name} PIN authentication`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPinModalUser(null);
          }}
        >
          <div className="surface-glass w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProfileAvatar profile={pinModalUser} sizeClass="h-12 w-12" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {pinMode === 'setup'
                      ? `Set PIN for ${pinModalUser.name}`
                      : `Sign in as ${pinModalUser.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pinModalUser.genderLabel} · {pinModalUser.japaneseName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinModalUser(null)}
                aria-label="Close PIN dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="profile-pin-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  4-Digit Numeric PIN
                </label>
                <input
                  id="profile-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  placeholder="••••"
                  className="font-mono-tabular mt-2 block min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl tracking-[0.5em] text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                {pinError && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {pinError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary-premium min-h-[46px] w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                {pinMode === 'setup' ? 'Save PIN & Sign In' : 'Unlock & Sign In'}
              </button>

              {pinMode === 'unlock' && (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Remove PIN Lock (Requires Current PIN)
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
