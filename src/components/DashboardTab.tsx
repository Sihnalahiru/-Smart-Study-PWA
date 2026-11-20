import React, {useEffect, useMemo, useState} from 'react';
import {
  Award,
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
  const totalExamBankQuestions = useMemo(
    () => getAllCbtQuestions(allParts).length,
    [allParts],
  );
  const quizAccuracy =
    progress.attemptedQuizIds.length > 0
      ? Math.round(
          (progress.correctQuizIds.length / progress.attemptedQuizIds.length) *
            100,
        )
      : 0;
  const examCoveragePct =
    totalExamBankQuestions > 0
      ? Math.round(
          (progress.correctQuizIds.length / totalExamBankQuestions) * 100,
        )
      : 0;

  const dailyQuests = [
    {
      label: 'Review 5 flashcards today',
      current: Math.min(5, progress.daily.flashcardsReviewed),
      target: 5,
      reward: '+50 XP potential',
    },
    {
      label: 'Answer 10 CBT exam questions today',
      current: Math.min(10, progress.daily.quizAnswered),
      target: 10,
      reward: '+100 XP potential',
    },
    {
      label: 'Complete 1 study note section',
      current: Math.min(1, progress.daily.notesCompleted),
      target: 1,
      reward: '+25 XP',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <CelebrationConfetti
        burstKey={confettiBurstKey}
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
      />

      {celebrationNotice && (
        <section
          role="status"
          aria-live="polite"
          className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300/90 bg-gradient-to-r from-amber-50 via-white to-blue-50/70 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
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

      {/* Executive XP & Level Hero Banner (100% English, Isolated Per User) */}
      <section className="surface-hero rounded-2xl p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
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
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Welcome back, {activeUser.name}
              </h1>
              <p className="text-xs leading-relaxed text-slate-300/90 sm:text-sm">
                SSW Logistics Warehousing CBT Exam Prep · Personal Profile
              </p>
            </div>

            {avatarFailed ? (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${activeUser.accentGradient} text-base font-bold text-white ring-2 ring-white/25`}
              >
                {activeUser.name.slice(0, 1)}
              </div>
            ) : (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-white/25 shadow-sm"
              />
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 ring-1 ring-amber-400/30">
                  <Award className="h-4 w-4 text-amber-400" aria-hidden="true" />
                </div>
                <span className="font-mono-tabular text-2xl font-bold tracking-tight text-white">
                  {progress.xp} XP
                </span>
              </div>
              <span className="font-mono-tabular text-xs font-medium text-slate-300">
                {levelInfo.xpToNext} XP to Lv.{levelInfo.level + 1}
              </span>
            </div>

            <div
              className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/5"
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
        </div>
      </section>

      {/* Dedicated Daily Streak Card */}
      <section className="surface-streak rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs ${
                progress.streakDays > 0
                  ? 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-100/70 text-amber-600'
                  : 'border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/70 text-slate-400'
              }`}
            >
              <Flame className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tabular text-2xl font-bold tracking-tight text-slate-900">
                  {progress.streakDays}
                </span>
                <span className="text-sm font-semibold tracking-tight text-slate-700">
                  Day Daily Streak
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {studiedToday
                  ? `Studied today · Best streak: ${progress.bestStreak} day${progress.bestStreak === 1 ? '' : 's'}`
                  : `Complete a card, exam, or note today to ${progress.streakDays > 0 ? 'extend' : 'start'} your streak`}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs shrink-0 ${streakBadge.toneClass}`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{streakBadge.title}</span>
          </div>
        </div>

        {/* 7-Day Consistency Strip */}
        <div className="mt-4 grid grid-cols-7 gap-2 border-t border-amber-200/40 pt-4">
          {recent7Days.map((day) => {
            const isActive = progress.activeDates.includes(day.key);
            return (
              <div
                key={day.key}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`text-[11px] font-semibold tracking-wide ${
                    day.isToday ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {day.label}
                </span>
                <div
                  title={day.key}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                    isActive
                      ? 'border-amber-400 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs'
                      : day.isToday
                        ? 'border-blue-300 bg-blue-50/90 text-blue-600'
                        : 'border-slate-200/80 bg-white/80 text-slate-300'
                  }`}
                >
                  {isActive ? (
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    '·'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2x2 Portrait KPI Grid (100% English) */}
      <section className="grid grid-cols-2 gap-3.5">
        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Study Modules</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 text-blue-600">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {progress.readPartNumbers.length}
            <span className="text-sm font-medium text-slate-400">
              /{allParts.length}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Sections completed</p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Cards Mastered</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 text-blue-600">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {progress.reviewedFlashcardIds.length}
            <span className="text-sm font-medium text-slate-400">
              /{totalFlashcards}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.daily.flashcardsReviewed} reviewed today
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Exam Accuracy</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50/80 text-emerald-600">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {progress.attemptedQuizIds.length > 0 ? `${quizAccuracy}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.correctQuizIds.length}/{totalExamBankQuestions} mastered
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>CBT Mock Status</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50/80 text-amber-600">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {latestExam
              ? `${Math.round((latestExam.totalCorrect / Math.max(1, latestExam.totalQuestions)) * 100)}%`
              : `${examCoveragePct}%`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {latestExam
              ? `Last: ${latestExam.passedOverall ? 'PASS' : 'Review'} (${latestExam.totalCorrect}/${latestExam.totalQuestions})`
              : `${cbtHistory.length} CBT exams taken`}
          </p>
        </div>
      </section>

      {/* 100% English Performance Analytics Directly on Dashboard */}
      <PerformanceAnalyticsCard
        allParts={allParts}
        correctQuizIds={progress.correctQuizIds}
        attemptedQuizIds={progress.attemptedQuizIds}
        quizQuestionStats={progress.quizQuestionStats}
        cbtExamHistory={cbtHistory}
        onPracticeTopic={() => onNavigateTab('quiz')}
      />

      {/* Curriculum Study Roadmap (100% English) */}
      <StudyRoadmap
        allParts={allParts}
        progress={progress}
        onSelectPartAndTab={onSelectPartAndTab}
      />

      {/* Achievement Trophy Case (100% English) */}
      <TrophyCase
        allParts={allParts}
        progress={progress}
        onSelectPartAndTab={onSelectPartAndTab}
      />

      {/* Study Library (100% English Titles & Clean Actions) */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Study Library
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Open illustrated study notes, flashcards, or mock CBT exams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
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
              className="btn-primary-premium inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
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
              className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload First PDF</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {allParts.map((part) => {
              const isRead = progress.readPartNumbers.includes(
                part.part_number,
              );
              return (
                <li
                  key={part.part_number}
                  className="space-y-3.5 py-4 first:pt-4 last:pb-1"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-blue-600">
                        Part {part.part_number}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {part.flashcards.length} cards
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {part.quiz.length} questions
                      </span>
                      {isRead && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-600">
                            Completed
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900">
                      {part.english_title ?? part.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'notes')
                      }
                      className="min-h-[40px] rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:text-slate-900"
                    >
                      Notes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'flashcards')
                      }
                      className="min-h-[40px] rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:text-slate-900"
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'quiz')
                      }
                      className="min-h-[40px] rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110"
                    >
                      CBT Exam
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Daily Study Goals */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-200/70 pb-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Target className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Daily Study Goals
          </h2>
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      done
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{width: `${pct}%`}}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Study Shortcuts */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            onNavigateTab('quiz');
            onEnterFocusMode();
          }}
          className="surface-card-interactive flex items-start gap-3.5 rounded-2xl p-4.5 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
            <Maximize2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Full CBT Mock Exam
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              50 mixed questions (30 Academic + 20 Practical) in 80-minute timed
              Focus Mode.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('notes')}
          className="surface-card-interactive flex items-start gap-3.5 rounded-2xl p-4.5 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Illustrated Study Notes
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Read structured textbook notes with inline figures, signs &amp;
              diagrams (+25 XP/part).
            </p>
          </div>
        </button>
      </section>

      {/* XP Reward Log */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Activity &amp; XP Log
          </h2>
          <span className="font-mono-tabular text-xs font-medium text-slate-500">
            {progress.activities.length} recent
          </span>
        </div>

        {progress.activities.length === 0 ? (
          <p className="py-6 text-center text-xs leading-relaxed text-slate-500">
            No XP earned yet. Review a flashcard, take a CBT exam, or complete a
            study note section to start your streak!
          </p>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {progress.activities.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3.5 first:pt-3.5 last:pb-1"
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
  );
};
