import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowRight,
  Award,
  BookA,
  BookOpen,
  CheckSquare,
  FileUp,
  Flame,
  Layers,
  Maximize2,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import type {
  ActiveTab,
  SswExamTopic,
  StudyPart,
  StudyProgressState,
  UserProfile,
} from '../types/study';
import {
  getLevelInfo,
  getRecent7Days,
  getStreakBadge,
  getTodayKey,
} from '../hooks/useStudyProgress';
import {getUnlockedMilestoneEntries} from '../utils/trophyBadges';
import {getAllCbtQuestions} from '../utils/cbtExam';
import {CelebrationConfetti} from './CelebrationConfetti';
import {PerformanceAnalyticsCard} from './PerformanceAnalyticsCard';
import {StudyRoadmap} from './StudyRoadmap';
import {TrophyCase} from './TrophyCase';

interface DashboardTabProps {
  activeUser: UserProfile;
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenTotalVocabulary: () => void;
  onPracticeTopic: (topic: SswExamTopic) => void;
  onOpenSearch: () => void;
  onEnterFocusMode: () => void;
}

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

interface CelebratedSnapshot {
  level: number;
  unlockedIds: string[];
}

interface CelebrationNotice {
  title: string;
  subtitle: string;
}

const CELEBRATED_STORAGE_PREFIX = 'smart_study_celebrated_v1_';

function readCelebratedSnapshot(userId: string): CelebratedSnapshot | null {
  try {
    const raw = localStorage.getItem(`${CELEBRATED_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CelebratedSnapshot>;
    return {
      level: typeof parsed.level === 'number' ? parsed.level : 1,
      unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : [],
    };
  } catch {
    return null;
  }
}

function writeCelebratedSnapshot(
  userId: string,
  snapshot: CelebratedSnapshot,
): void {
  try {
    localStorage.setItem(
      `${CELEBRATED_STORAGE_PREFIX}${userId}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore storage write error
  }
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  activeUser,
  allParts,
  progress,
  onSelectPartAndTab,
  onNavigateTab,
  onOpenTotalVocabulary,
  onPracticeTopic,
  onOpenSearch,
  onEnterFocusMode,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [celebrationNotice, setCelebrationNotice] =
    useState<CelebrationNotice | null>(null);

  const levelInfo = getLevelInfo(progress.xp);
  const streakBadge = getStreakBadge(progress.streakDays);
  const recent7Days = getRecent7Days();
  const studiedToday = progress.lastActiveDate === getTodayKey();
  const cbtHistory = progress.cbtExamHistory ?? [];
  const latestExam = cbtHistory[0] ?? null;

  const unlockedEntries = useMemo(
    () => getUnlockedMilestoneEntries(allParts, progress, streakBadge),
    [allParts, progress, streakBadge],
  );
  const unlockedSignature = useMemo(
    () => unlockedEntries.map((entry) => entry.id).join('|'),
    [unlockedEntries],
  );

  useEffect(() => {
    setAvatarFailed(false);
    setConfettiActive(false);
    setCelebrationNotice(null);
  }, [activeUser.id]);

  useEffect(() => {
    const currentIds = unlockedEntries.map((entry) => entry.id);
    const seen = readCelebratedSnapshot(activeUser.id);

    if (!seen) {
      writeCelebratedSnapshot(activeUser.id, {
        level: levelInfo.level,
        unlockedIds: currentIds,
      });
      return;
    }

    const leveledUp = levelInfo.level > seen.level;
    const newlyUnlocked = unlockedEntries.filter(
      (entry) => !seen.unlockedIds.includes(entry.id),
    );

    if (leveledUp || newlyUnlocked.length > 0) {
      writeCelebratedSnapshot(activeUser.id, {
        level: Math.max(seen.level, levelInfo.level),
        unlockedIds: Array.from(new Set([...seen.unlockedIds, ...currentIds])),
      });

      const badgeNames = newlyUnlocked.map((entry) => entry.label).join(', ');
      let title = '';
      let subtitle = '';

      if (leveledUp && newlyUnlocked.length > 0) {
        title = `Level ${levelInfo.level} & New Badge Unlocked`;
        subtitle = `Reached ${levelInfo.rank} and unlocked ${badgeNames}.`;
      } else if (leveledUp) {
        title = `Level Up · Level ${levelInfo.level} (${levelInfo.rank})`;
        subtitle = `${activeUser.name} reached ${progress.xp} XP in exam prep.`;
      } else {
        title =
          newlyUnlocked.length === 1
            ? `Badge Unlocked · ${newlyUnlocked[0].label}`
            : `${newlyUnlocked.length} New Badges Unlocked`;
        subtitle =
          newlyUnlocked.length === 1
            ? `${activeUser.name} earned a new milestone badge.`
            : `Unlocked: ${badgeNames}.`;
      }

      setCelebrationNotice({title, subtitle});
      setConfettiBurstKey((prev) => prev + 1);
      setConfettiActive(true);
    }
  }, [
    activeUser.id,
    activeUser.name,
    levelInfo.level,
    levelInfo.rank,
    progress.xp,
    unlockedSignature,
    unlockedEntries,
  ]);

  const totalFlashcards = allParts.reduce(
    (sum, p) => sum + p.flashcards.length,
    0,
  );
  const totalVocabCount = useMemo(
    () =>
      allParts.reduce(
        (sum, p) =>
          sum +
          p.flashcards.filter((fc) => (fc.id ?? '').includes('-fc-vocab-'))
            .length,
        0,
      ),
    [allParts],
  );
  const vocabMasteredCount = useMemo(
    () =>
      progress.reviewedFlashcardIds.filter((id) => id.includes('-fc-vocab-'))
        .length,
    [progress.reviewedFlashcardIds],
  );

  const allCbtQuestions = useMemo(
    () => getAllCbtQuestions(allParts),
    [allParts],
  );
  const totalExamBankQuestions = allCbtQuestions.length;
  const cbtCountByPart = useMemo(() => {
    const map = new Map<number, number>();
    for (const q of allCbtQuestions) {
      map.set(q.partNumber, (map.get(q.partNumber) ?? 0) + 1);
    }
    return map;
  }, [allCbtQuestions]);

  const quizAccuracy = useMemo(() => {
    const statValues = Object.values(progress.quizQuestionStats ?? {});
    const statAttempts = statValues.reduce((sum, s) => sum + s.attempts, 0);
    const statCorrect = statValues.reduce((sum, s) => sum + s.correct, 0);
    if (statAttempts > 0) {
      return Math.round((statCorrect / statAttempts) * 100);
    }
    return progress.attemptedQuizIds.length > 0
      ? Math.round(
          (progress.correctQuizIds.length / progress.attemptedQuizIds.length) *
            100,
        )
      : 0;
  }, [
    progress.quizQuestionStats,
    progress.attemptedQuizIds.length,
    progress.correctQuizIds.length,
  ]);

  const examCoveragePct =
    totalExamBankQuestions > 0
      ? Math.round(
          (progress.correctQuizIds.length / totalExamBankQuestions) * 100,
        )
      : 0;

  const modulesPct =
    allParts.length > 0
      ? Math.round((progress.readPartNumbers.length / allParts.length) * 100)
      : 0;
  const cardsPct =
    totalFlashcards > 0
      ? Math.round(
          (progress.reviewedFlashcardIds.length / totalFlashcards) * 100,
        )
      : 0;

  const nextUnreadPart =
    allParts.find((p) => !progress.readPartNumbers.includes(p.part_number)) ??
    allParts[0];

  const dailyQuests = [
    {
      label: 'Review 5 flashcards today',
      current: Math.min(5, progress.daily.flashcardsReviewed),
      target: 5,
      reward: '+50 XP',
    },
    {
      label: 'Answer 10 CBT exam questions today',
      current: Math.min(10, progress.daily.quizAnswered),
      target: 10,
      reward: '+100 XP',
    },
    {
      label: 'Complete 1 study note section',
      current: Math.min(1, progress.daily.notesCompleted),
      target: 1,
      reward: '+25 XP',
    },
  ];

  return (
    <div className="space-y-6">
      <CelebrationConfetti
        burstKey={confettiBurstKey}
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
      />

      {celebrationNotice && (
        <section
          role="status"
          aria-live="polite"
          className="surface-card flex items-start justify-between gap-3 rounded-2xl border-amber-300/90 bg-gradient-to-r from-amber-50/90 via-white to-blue-50/60 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                {celebrationNotice.title}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                {celebrationNotice.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCelebrationNotice(null);
              setConfettiActive(false);
            }}
            aria-label="Dismiss celebration"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      )}

      {/* ROW 1: Executive Command Hero + Daily Consistency Studio (12-Col Split) */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Dominant Focal Anchor: Executive Profile & Exam Readiness Hero */}
        <section className="surface-hero flex flex-col justify-between rounded-3xl p-6 text-white sm:p-7 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
                <span className="font-mono-tabular font-semibold text-amber-400">
                  Level {levelInfo.level}
                </span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-200">{levelInfo.rank}</span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono-tabular text-slate-200">
                  +{progress.daily.xpEarnedToday} XP today
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome back, {activeUser.name}
              </h1>
              <p className="max-w-lg text-xs leading-relaxed text-slate-300/90 sm:text-sm">
                SSW Logistics Warehousing CBT Preparation · 6 Illustrated
                Modules, {totalFlashcards} Flashcards &amp;{' '}
                {totalExamBankQuestions} Exam Questions
              </p>
            </div>

            {avatarFailed ? (
              <div
                className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${activeUser.accentGradient} text-lg font-bold text-white ring-2 ring-white/20`}
              >
                {activeUser.name.slice(0, 1)}
              </div>
            ) : (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-13 w-13 shrink-0 rounded-2xl object-cover ring-2 ring-white/20"
              />
            )}
          </div>

          {/* XP Meter */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <span className="font-mono-tabular text-2xl font-bold tracking-tight text-white">
                  {progress.xp} XP
                </span>
              </div>
              <span className="font-mono-tabular text-xs font-medium text-slate-300">
                {levelInfo.xpToNext} XP to Level {levelInfo.level + 1}
              </span>
            </div>

            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/90"
              role="progressbar"
              aria-valuenow={levelInfo.currentLevelXp}
              aria-valuemin={0}
              aria-valuemax={levelInfo.xpPerLevel}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 transition-all duration-300"
                style={{width: `${levelInfo.progressPercent}%`}}
              />
            </div>
          </div>

          {/* Primary Action + Quiet Secondary Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('quiz')}
              className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold sm:text-sm whitespace-nowrap"
            >
              <span>Start CBT Mock Exam</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenTotalVocabulary}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/15 sm:text-sm whitespace-nowrap"
            >
              <BookA className="h-4 w-4 text-blue-300" aria-hidden="true" />
              <span>Total Vocabulary ({totalVocabCount})</span>
            </button>

            {nextUnreadPart && (
              <button
                type="button"
                onClick={() =>
                  onSelectPartAndTab(nextUnreadPart.part_number, 'notes')
                }
                className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white whitespace-nowrap"
              >
                <span>Continue Part {nextUnreadPart.part_number}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        {/* Daily Streak & 7-Day Consistency Studio */}
        <section className="surface-streak flex flex-col justify-between rounded-3xl p-6 sm:p-7 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    progress.streakDays > 0
                      ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <Flame className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-tabular text-3xl font-bold tracking-tight text-slate-900">
                      {progress.streakDays}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      Day Streak
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {studiedToday
                      ? `Active today · Best ${progress.bestStreak}d`
                      : `Best ${progress.bestStreak}d · Study today to keep streak`}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 shrink-0">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{streakBadge.title}</span>
              </span>
            </div>

            {/* 7-Day Consistency Strip */}
            <div className="mt-6 grid grid-cols-7 gap-2 border-t border-slate-200/70 pt-5">
              {recent7Days.map((day) => {
                const isActive = progress.activeDates.includes(day.key);
                return (
                  <div
                    key={day.key}
                    className="flex flex-col items-center gap-2"
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        day.isToday ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    >
                      {day.label}
                    </span>
                    <div
                      title={day.key}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                        isActive
                          ? 'border-amber-400 bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                          : day.isToday
                            ? 'border-blue-300 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      {isActive ? (
                        <Flame className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        '·'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vocabulary Mastery Highlight Footer */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4 text-xs">
            <div>
              <p className="font-semibold text-slate-900">
                Warehouse Vocabulary Mastery
              </p>
              <p className="font-mono-tabular mt-0.5 text-slate-500">
                {vocabMasteredCount} / {totalVocabCount} terms mastered across
                Parts 1–6
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTotalVocabulary}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              <span>Drill Vocab</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      {/* ROW 2: Full-Width 4-Column Executive KPI Strip (100% English) */}
      <section
        aria-label="Key Study Metrics"
        className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
      >
        <div className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Study Modules</span>
            <BookOpen className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {progress.readPartNumbers.length}
            <span className="text-sm font-medium text-slate-400">
              /{allParts.length}
            </span>
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{width: `${modulesPct}%`}}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {modulesPct}% notes completed
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Cards Mastered</span>
            <Layers className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {progress.reviewedFlashcardIds.length}
            <span className="text-sm font-medium text-slate-400">
              /{totalFlashcards}
            </span>
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{width: `${cardsPct}%`}}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {progress.daily.flashcardsReviewed} reviewed today
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Exam Accuracy</span>
            <CheckSquare
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono-tabular mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {progress.attemptedQuizIds.length > 0 ? `${quizAccuracy}%` : '—'}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                quizAccuracy >= 60 ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              style={{width: `${quizAccuracy}%`}}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {progress.correctQuizIds.length}/{totalExamBankQuestions} mastered
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>CBT Readiness</span>
            <TrendingUp className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {latestExam
              ? `${Math.round((latestExam.totalCorrect / Math.max(1, latestExam.totalQuestions)) * 100)}%`
              : `${examCoveragePct}%`}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{
                width: `${
                  latestExam
                    ? Math.round(
                        (latestExam.totalCorrect /
                          Math.max(1, latestExam.totalQuestions)) *
                          100,
                      )
                    : examCoveragePct
                }%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {latestExam
              ? `Last: ${latestExam.passedOverall ? 'PASS' : 'Review'} (${latestExam.totalCorrect}/${latestExam.totalQuestions})`
              : `${cbtHistory.length} CBT exams taken`}
          </p>
        </div>
      </section>

      {/* ROW 3: 12-Col Analytics & Daily Execution Split */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PerformanceAnalyticsCard
            allParts={allParts}
            correctQuizIds={progress.correctQuizIds}
            attemptedQuizIds={progress.attemptedQuizIds}
            quizQuestionStats={progress.quizQuestionStats}
            cbtExamHistory={cbtHistory}
            onPracticeTopic={onPracticeTopic}
          />
        </div>

        <div className="space-y-5 lg:col-span-5">
          {/* Daily Study Goals */}
          <section className="surface-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Daily Study Goals
                </h2>
              </div>
              <span className="font-mono-tabular text-xs text-slate-500">
                {dailyQuests.filter((q) => q.current >= q.target).length}/3 done
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {dailyQuests.map((quest) => {
                const pct = Math.round((quest.current / quest.target) * 100);
                const done = quest.current >= quest.target;
                return (
                  <div key={quest.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          done ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {quest.label}
                      </span>
                      <span className="font-mono-tabular text-slate-500 shrink-0">
                        {quest.current}/{quest.target} · {quest.reward}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          done ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Launch Studio */}
          <section className="surface-card rounded-2xl p-5 sm:p-6">
            <h2 className="border-b border-slate-200/70 pb-3.5 text-base font-bold tracking-tight text-slate-900">
              Quick Study Launchpad
            </h2>
            <div className="mt-3.5 divide-y divide-slate-100">
              <button
                type="button"
                onClick={onOpenTotalVocabulary}
                className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-blue-700 first:pt-1"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BookA className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      Total Vocabulary Deck
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      All {totalVocabCount} Japanese + Sinhala warehouse terms
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateTab('quiz');
                  onEnterFocusMode();
                }}
                className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-blue-700"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      80-Min CBT Focus Simulation
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      30 Academic + 20 Practical in distraction-free mode
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('notes')}
                className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-blue-700 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                      Illustrated Bilingual Notes
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      105 textbook figures with Japanese + Sinhala notes
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>

          {/* Activity & XP Log */}
          <section className="surface-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Recent Activity
              </h2>
              <span className="font-mono-tabular text-xs font-medium text-slate-500">
                {progress.activities.length} logged
              </span>
            </div>

            {progress.activities.length === 0 ? (
              <p className="py-6 text-center text-xs leading-relaxed text-slate-500">
                No XP earned yet. Review a flashcard, take a CBT exam, or
                complete a study note section to start your log.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {progress.activities.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-3 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {item.action}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {item.detail}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono-tabular text-xs font-bold text-amber-600">
                        +{item.xp} XP
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ROW 4: Curriculum Roadmap & Trophy Case (12-Col Split) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <StudyRoadmap
            allParts={allParts}
            progress={progress}
            onSelectPartAndTab={onSelectPartAndTab}
          />
        </div>
        <div className="lg:col-span-5">
          <TrophyCase
            allParts={allParts}
            progress={progress}
            onSelectPartAndTab={onSelectPartAndTab}
          />
        </div>
      </div>

      {/* ROW 5: Full-Width Study Library Matrix (3-Column Desktop Grid) */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Study Library
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Direct access to illustrated notes, flashcards, and CBT questions
              for every module
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap"
            >
              <Search
                className="h-3.5 w-3.5 text-slate-500"
                aria-hidden="true"
              />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="btn-primary-premium inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add PDF</span>
            </button>
          </div>
        </div>

        {allParts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No study modules loaded yet.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="btn-dark-premium mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload First PDF</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allParts.map((part) => {
              const isRead = progress.readPartNumbers.includes(
                part.part_number,
              );
              const qCount =
                cbtCountByPart.get(part.part_number) ?? part.quiz.length;

              return (
                <article
                  key={part.part_number}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/85 bg-slate-50/45 p-4 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono-tabular font-bold text-blue-600">
                        Part {part.part_number}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {part.flashcards.length} cards
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{qCount} Qs</span>
                      {isRead && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-600">
                            Completed
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-bold leading-snug tracking-tight text-slate-900">
                      {part.english_title ?? part.title}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'notes')
                      }
                      className="min-h-[38px] rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                    >
                      Notes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'flashcards')
                      }
                      className="min-h-[38px] rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'quiz')
                      }
                      className="btn-dark-premium min-h-[38px] rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    >
                      CBT
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
