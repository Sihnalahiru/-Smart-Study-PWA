import React from 'react';
import {
  Award,
  BookOpen,
  CheckSquare,
  FileUp,
  Flame,
  Image as ImageIcon,
  Layers,
  Mic,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import type {
  ActiveTab,
  StudyPart,
  StudyProgressState,
} from '../types/study';
import {
  getLevelInfo,
  getRecent7Days,
  getStreakBadge,
  getTodayKey,
} from '../hooks/useStudyProgress';

interface DashboardTabProps {
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
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

export const DashboardTab: React.FC<DashboardTabProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
  onNavigateTab,
  onOpenSearch,
}) => {
  const levelInfo = getLevelInfo(progress.xp);
  const streakBadge = getStreakBadge(progress.streakDays);
  const recent7Days = getRecent7Days();
  const studiedToday = progress.lastActiveDate === getTodayKey();

  const totalFlashcards = allParts.reduce(
    (sum, p) => sum + p.flashcards.length,
    0,
  );
  const totalQuizQuestions = allParts.reduce(
    (sum, p) => sum + p.quiz.length,
    0,
  );
  const quizAccuracy =
    progress.attemptedQuizIds.length > 0
      ? Math.round(
          (progress.correctQuizIds.length / progress.attemptedQuizIds.length) *
            100,
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
      label: 'Answer 3 quiz questions today',
      current: Math.min(3, progress.daily.quizAnswered),
      target: 3,
      reward: '+75 XP potential',
    },
    {
      label: 'Transcribe 1 voice study note',
      current: Math.min(1, progress.daily.audioTranscribed),
      target: 1,
      reward: '+20 XP',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Executive XP & Level Hero Banner (Mobile Portrait First) */}
      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <span className="font-mono-tabular text-amber-400">
                Level {levelInfo.level}
              </span>
              <span aria-hidden="true">·</span>
              <span>{levelInfo.rank}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-200">
                +{progress.daily.xpEarnedToday} XP today
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Study Command Center
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              Warehouse &amp; Logistics Exam Prep · Japanese with Furigana &amp;
              Sinhala
            </p>
          </div>

          <div className="rounded-xl border border-slate-700/80 bg-slate-800/70 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <span className="font-mono-tabular text-2xl font-bold text-white">
                  {progress.xp} XP
                </span>
              </div>
              <span className="font-mono-tabular text-xs text-slate-300">
                {levelInfo.xpToNext} XP to Lv.{levelInfo.level + 1}
              </span>
            </div>

            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700"
              role="progressbar"
              aria-valuenow={levelInfo.currentLevelXp}
              aria-valuemin={0}
              aria-valuemax={levelInfo.xpPerLevel}
            >
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{width: `${levelInfo.progressPercent}%`}}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Daily Streak & Streak Badge Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
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
                <span className="font-mono-tabular text-2xl font-bold text-slate-900">
                  {progress.streakDays}
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Day Daily Streak
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {studiedToday
                  ? `Studied today · Best streak: ${progress.bestStreak} day${progress.bestStreak === 1 ? '' : 's'}`
                  : `Complete a card, quiz, or note today to ${progress.streakDays > 0 ? 'extend' : 'start'} your streak`}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shrink-0 ${streakBadge.toneClass}`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{streakBadge.title}</span>
          </div>
        </div>

        {/* 7-Day Consistency Strip */}
        <div className="mt-4 grid grid-cols-7 gap-2 border-t border-slate-100 pt-4">
          {recent7Days.map((day) => {
            const isActive = progress.activeDates.includes(day.key);
            return (
              <div
                key={day.key}
                className="flex flex-col items-center gap-1.5"
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isActive
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : day.isToday
                        ? 'border-blue-300 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
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

      {/* 2x2 Portrait KPI Grid */}
      <section className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Exam Modules</span>
            <BookOpen className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {allParts.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {progress.readPartNumbers.length} completed
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cards Mastered</span>
            <Layers className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {progress.reviewedFlashcardIds.length}
            <span className="text-sm font-medium text-slate-400">
              /{totalFlashcards}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {progress.daily.flashcardsReviewed} today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Quiz Accuracy</span>
            <CheckSquare
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {progress.attemptedQuizIds.length > 0 ? `${quizAccuracy}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {progress.correctQuizIds.length}/{totalQuizQuestions} correct
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Studio Assets</span>
            <TrendingUp
              className="h-4 w-4 text-amber-600"
              aria-hidden="true"
            />
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-slate-900">
            {progress.savedTranscripts.length + progress.savedVisuals.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {progress.savedTranscripts.length} voice ·{' '}
            {progress.savedVisuals.length} visuals
          </p>
        </div>
      </section>

      {/* Study Library */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Study Library
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tap any module for Notes, Flashcards, or Japanese Quiz
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add PDF</span>
            </button>
          </div>
        </div>

        {allParts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No PDF parts processed yet.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('upload')}
              className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload First PDF</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {allParts.map((part) => {
              const isRead = progress.readPartNumbers.includes(
                part.part_number,
              );
              return (
                <li key={part.part_number} className="space-y-3 py-4">
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
                        {part.quiz.length} quiz
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
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {part.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'notes')
                      }
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Notes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'flashcards')
                      }
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPartAndTab(part.part_number, 'quiz')
                      }
                      className="min-h-[40px] rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Quiz (JP)
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Daily Study Goals */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
          <Target className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900">
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
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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

      {/* Quick Tools */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigateTab('audio')}
          className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Voice Notes (+20 XP)
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Record audio with your mic and transcribe instantly.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('studio')}
          className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Visual Studio (+20 XP)
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Generate or edit concept diagrams from prompts.
            </p>
          </div>
        </button>
      </section>

      {/* XP Reward Log */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h2 className="text-base font-bold text-slate-900">XP Reward Log</h2>
          <span className="font-mono-tabular text-xs font-medium text-slate-500">
            {progress.activities.length} recent
          </span>
        </div>

        {progress.activities.length === 0 ? (
          <p className="py-6 text-center text-xs leading-relaxed text-slate-500">
            No XP earned yet. Review a flashcard, answer a quiz question, or
            mark a study section complete to start your streak!
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {progress.activities.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
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
                  <p className="text-[11px] text-slate-400">
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
