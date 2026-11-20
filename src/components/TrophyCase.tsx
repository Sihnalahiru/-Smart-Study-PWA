import React, {useMemo, useState} from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  PackageCheck,
  ShieldCheck,
  Trophy,
  Wrench,
} from 'lucide-react';
import type {ActiveTab, StudyPart, StudyProgressState} from '../types/study';
import {computeSyllabusNodes} from '../utils/syllabusProgress';

interface TrophyCaseProps {
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
}

type TrophyFilter = 'all' | 'unlocked' | 'locked';

interface TrophyBadge {
  id: string;
  title: string;
  requirement: string;
  moduleRef: string;
  unlocked: boolean;
  progressPercent: number;
  targetPartNumber: number;
  targetTab: ActiveTab;
  accentGradient: string;
  iconBg: string;
  icon: React.ComponentType<{className?: string}>;
}

export const TrophyCase: React.FC<TrophyCaseProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
}) => {
  const [filter, setFilter] = useState<TrophyFilter>('all');

  const badges = useMemo<TrophyBadge[]>(() => {
    const nodes = computeSyllabusNodes(allParts, progress);
    const byCode = new Map(nodes.map((n) => [n.code, n]));

    const getRecommendedTab = (
      partNumber: number,
      cardsDone: number,
      cardsTotal: number,
    ): ActiveTab => {
      if (!progress.readPartNumbers.includes(partNumber)) return 'notes';
      if (cardsDone < cardsTotal) return 'flashcards';
      return 'quiz';
    };

    const modA = byCode.get('A');
    const modB = byCode.get('B');
    const modC = byCode.get('C');
    const modD = byCode.get('D');
    const modE = byCode.get('E');
    const modF = byCode.get('F');

    const part1Notes = progress.readPartNumbers.includes(1);
    const part1Quiz = progress.completedQuizParts.includes(1);
    const part1Pct = (part1Notes ? 50 : 0) + (part1Quiz ? 50 : 0);

    const coreNodes = [modA, modB, modC, modD, modE, modF].filter(
      (n): n is NonNullable<typeof n> => Boolean(n),
    );
    const masterPct =
      coreNodes.length > 0
        ? Math.round(
            coreNodes.reduce((sum, n) => sum + n.percent, 0) / coreNodes.length,
          )
        : 0;
    const masterUnlocked =
      coreNodes.length === 6 &&
      coreNodes.every((n) => n.status === 'completed');

    const firstIncompleteNode =
      coreNodes.find((n) => n.status !== 'completed' && n.partAvailable) ??
      coreNodes[0];

    return [
      {
        id: 'safety-first',
        title: 'Safety First',
        requirement: 'Finish Health & Safety module (PPE, Hazards & LOTO)',
        moduleRef: 'Module A · Part 1',
        unlocked: modA?.status === 'completed',
        progressPercent: modA?.percent ?? 0,
        targetPartNumber: 1,
        targetTab: getRecommendedTab(
          1,
          modA?.cardsDone ?? 0,
          modA?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60',
        iconBg:
          'border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs',
        icon: ShieldCheck,
      },
      {
        id: 'warehouse-pro',
        title: 'Warehouse Pro',
        requirement: 'Master Operations & Workflows (PO, GRN, Picking)',
        moduleRef: 'Module B · Part 1',
        unlocked: modB?.status === 'completed',
        progressPercent: modB?.percent ?? 0,
        targetPartNumber: 1,
        targetTab: getRecommendedTab(
          1,
          modB?.cardsDone ?? 0,
          modB?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60',
        iconBg:
          'border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs',
        icon: PackageCheck,
      },
      {
        id: 'stock-controller',
        title: 'Stock Controller',
        requirement: 'Complete Inventory Control (FIFO, FEFO & ABC)',
        moduleRef: 'Module C · Part 2',
        unlocked: modC?.status === 'completed',
        progressPercent: modC?.percent ?? 0,
        targetPartNumber: 2,
        targetTab: getRecommendedTab(
          2,
          modC?.cardsDone ?? 0,
          modC?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60',
        iconBg:
          'border-indigo-200 bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs',
        icon: Layers,
      },
      {
        id: 'forklift-ace',
        title: 'Forklift Ace',
        requirement: 'Complete Equipment & Material Handling checks',
        moduleRef: 'Module D · Part 2',
        unlocked: modD?.status === 'completed',
        progressPercent: modD?.percent ?? 0,
        targetPartNumber: 2,
        targetTab: getRecommendedTab(
          2,
          modD?.cardsDone ?? 0,
          modD?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60',
        iconBg:
          'border-amber-200 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs',
        icon: Wrench,
      },
      {
        id: 'wms-specialist',
        title: 'WMS & Docs Specialist',
        requirement: 'Finish Tech & Documentation (WMS, RFID, BOL, SDS)',
        moduleRef: 'Module E · Part 2',
        unlocked: modE?.status === 'completed',
        progressPercent: modE?.percent ?? 0,
        targetPartNumber: 2,
        targetTab: getRecommendedTab(
          2,
          modE?.cardsDone ?? 0,
          modE?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/60',
        iconBg:
          'border-sky-200 bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-xs',
        icon: Cpu,
      },
      {
        id: 'kpi-analyst',
        title: 'KPI Analyst',
        requirement: 'Master Numeracy & Warehouse KPI calculations',
        moduleRef: 'Module F · Part 2',
        unlocked: modF?.status === 'completed',
        progressPercent: modF?.percent ?? 0,
        targetPartNumber: 2,
        targetTab: getRecommendedTab(
          2,
          modF?.cardsDone ?? 0,
          modF?.cardsTotal ?? 0,
        ),
        accentGradient:
          'border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60',
        iconBg:
          'border-teal-200 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs',
        icon: BarChart3,
      },
      {
        id: 'part-1-graduate',
        title: 'Part 1 Graduate',
        requirement: 'Complete Part 1 Study Notes & Japanese Quiz',
        moduleRef: 'Part 1 Full Clear',
        unlocked: part1Notes && part1Quiz,
        progressPercent: part1Pct,
        targetPartNumber: 1,
        targetTab: !part1Notes ? 'notes' : 'quiz',
        accentGradient:
          'border-amber-200/90 bg-gradient-to-br from-amber-50/85 via-white to-yellow-50/60',
        iconBg:
          'border-amber-200 bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-xs',
        icon: Award,
      },
      {
        id: 'certified-logistics-master',
        title: 'Certified Master',
        requirement: 'Unlock all 6 core warehouse exam modules (A–F)',
        moduleRef: 'Full Curriculum',
        unlocked: masterUnlocked,
        progressPercent: masterPct,
        targetPartNumber: firstIncompleteNode?.partNumber ?? 1,
        targetTab: 'notes',
        accentGradient:
          'border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/80',
        iconBg:
          'border-amber-300 bg-gradient-to-br from-slate-900 to-slate-800 text-amber-400 shadow-xs',
        icon: Trophy,
      },
    ];
  }, [allParts, progress]);

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
                Trophy Case
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Unlock milestone badges by completing exam modules
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
                className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
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
              : 'All syllabus badges unlocked!'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === 'unlocked'
              ? 'Complete a module’s notes, flashcards, and quiz to earn your first trophy.'
              : 'You have mastered every module in the trophy case.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {visibleBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() =>
                  onSelectPartAndTab(badge.targetPartNumber, badge.targetTab)
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
