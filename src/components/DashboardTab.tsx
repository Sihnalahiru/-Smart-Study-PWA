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
import {StudyRoadmap} from './StudyRoadmap';
import {TrophyCase} from './TrophyCase';

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
    <div className="space-y-5 sm:space-y-6">
      {/* Executive XP & Level Hero Banner (Mobile Portrait First) */}
      <section className="surface-hero rounded-2xl p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <span className="font-mono-tabular font-semibold text-amber-400">
                Level {levelInfo.level}
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-200">{levelInfo.rank}</span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-200">
                +{progress.daily.xpEarnedToday} XP today
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Study Command Center
            </h1>
            <p className="text-xs leading-relaxed text-slate-300/90 sm:text-sm">
              Warehouse &amp; Logistics Exam Prep · Japanese with Furigana &amp;
              Sinhala
            </p>
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

      {/* Dedicated Daily Streak & Streak Badge Card */}
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
                  : `Complete a card, quiz, or note today to ${progress.streakDays > 0 ? 'extend' : 'start'} your streak`}
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

      {/* 2x2 Portrait KPI Grid */}
      <section className="grid grid-cols-2 gap-3.5">
        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Exam Modules</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 text-blue-600">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {allParts.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.readPartNumbers.length} completed
          </p>
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
            {progress.daily.flashcardsReviewed} today
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Quiz Accuracy</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50/80 text-emerald-600">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {progress.attemptedQuizIds.length > 0 ? `${quizAccuracy}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.correctQuizIds.length}/{totalQuizQuestions} correct
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4 sm:p-4.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Studio Assets</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50/80 text-amber-600">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
          <p className="font-mono-tabular mt-2.5 text-2xl font-bold tracking-tight text-slate-900">
            {progress.savedTranscripts.length + progress.savedVisuals.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.savedTranscripts.length} voice ·{' '}
            {progress.savedVisuals.length} visuals
          </p>
        </div>
      </section>

      {/* Curriculum Study Roadmap */}
      <StudyRoadmap
        allParts={allParts}
        progress={progress}
        onSelectPartAndTab={onSelectPartAndTab}
      />

      {/* Achievement Trophy Case */}
      <TrophyCase
        allParts={allParts}
        progress={progress}
        onSelectPartAndTab={onSelectPartAndTab}
      />

      {/* Study Library */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
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
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
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
              No PDF parts processed yet.
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
                <li key={part.part_number} className="space-y-3.5 py-4 first:pt-4 last:pb-1">
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
                    <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900">
                      {part.title}
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

      {/* Quick Tools */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigateTab('audio')}
          className="surface-card-interactive flex items-start gap-3.5 rounded-2xl p-4.5 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
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
          className="surface-card-interactive flex items-start gap-3.5 rounded-2xl p-4.5 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Visual Studio (+20 XP)
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Generate or edit concept diagrams from prompts.
            </p>
          </div>
        </button>
      </section>

      {/* XP Reward Log */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            XP Reward Log
          </h2>
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
