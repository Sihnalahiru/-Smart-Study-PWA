import React, {useMemo, useState} from 'react';
import {CheckCircle2, Lock, Trophy} from 'lucide-react';
import type {ActiveTab, StudyPart, StudyProgressState} from '../types/study';
import {computeTrophyBadges, type TrophyBadge} from '../utils/trophyBadges';

interface TrophyCaseProps {
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (
    partNumber: number,
    tab: ActiveTab,
    actionMode?: 'vocab' | 'mistakes',
  ) => void;
}

type TrophyFilter = 'all' | 'unlocked' | 'locked';

export const TrophyCase: React.FC<TrophyCaseProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
}) => {
  const [filter, setFilter] = useState<TrophyFilter>('all');

  const badges = useMemo<TrophyBadge[]>(
    () => computeTrophyBadges(allParts, progress),
    [allParts, progress],
  );

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const unlockPct = Math.round((unlockedCount / badges.length) * 100);

  const visibleBadges = useMemo(() => {
    if (filter === 'unlocked') return badges.filter((b) => b.unlocked);
    if (filter === 'locked') return badges.filter((b) => !b.unlocked);
    return badges;
  }, [badges, filter]);

  return (
    <section
      aria-labelledby="trophy-case-heading"
      className="surface-card rounded-2xl p-5 sm:p-6"
    >
      {/* Header & Filter Controls */}
      <div className="border-b border-slate-200/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600">
              <Trophy className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="trophy-case-heading"
                className="text-base font-bold tracking-tight text-slate-900"
              >
                Warehouse Trophy Case
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Earn SSW certifications across docks, daily 25 vocab &amp; zero-defect checks
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono-tabular text-base font-bold tracking-tight text-slate-900">
              {unlockedCount} / {badges.length}
            </span>
            <p className="font-mono-tabular text-[11px] font-medium text-slate-500">
              {unlockPct}% unlocked
            </p>
          </div>
        </div>

        {/* Trophy Collection Bar + Interactive Segmented Filter */}
        <div className="mt-3.5 space-y-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 transition-all duration-300"
              style={{width: `${unlockPct}%`}}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
            {(
              [
                {id: 'all', label: `All (${badges.length})`},
                {id: 'unlocked', label: `Unlocked (${unlockedCount})`},
                {
                  id: 'locked',
                  label: `Locked (${badges.length - unlockedCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] rounded-lg px-2 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Badge Grid */}
      {visibleBadges.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold tracking-tight text-slate-700">
            {filter === 'unlocked'
              ? 'No badges unlocked yet'
              : 'All warehouse badges unlocked!'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === 'unlocked'
              ? 'Complete a module’s notes, flashcards, and quiz to earn your first badge.'
              : 'You have mastered every badge in the warehouse trophy case.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() =>
                  onSelectPartAndTab(
                    badge.targetPartNumber,
                    badge.targetTab,
                    badge.actionMode,
                  )
                }
                className={`group flex min-h-[144px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                  badge.unlocked
                    ? `${badge.accentGradient} shadow-xs hover:shadow-sm`
                    : 'border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white opacity-90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      badge.unlocked
                        ? badge.iconBg
                        : 'border-slate-200 bg-slate-100 text-slate-400'
                    }`}
                  >
                    {badge.unlocked ? (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>

                  {badge.unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="font-mono-tabular text-[11px] font-semibold text-slate-500">
                      {badge.progressPercent}%
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h3
                    className={`text-xs font-bold tracking-tight sm:text-sm ${
                      badge.unlocked ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {badge.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {badge.requirement}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5">
                  {!badge.unlocked && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                        style={{width: `${badge.progressPercent}%`}}
                      />
                    </div>
                  )}
                  <p className="font-mono-tabular text-[10px] font-medium text-slate-400">
                    {badge.moduleRef}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
