import React from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Flame,
  Languages,
  Layers,
  X,
} from 'lucide-react';
import type {StudyProgressState, UserProfile} from '../types/study';
import {VOCAB_DAILY_TARGET} from '../data/vocabulary';
import {DAILY_ALPHABET_SESSIONS_TARGET} from '../data/kanaKanji';
import {playSfx} from '../utils/soundEffects';

export type DailyPlanLaunchAction =
  | 'kana'
  | 'vocab'
  | 'notes'
  | 'flashcards'
  | 'quiz'
  | 'mistakes';

interface DailyStudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  progress: StudyProgressState;
  onToggleHomeworkTask: (taskId: string) => void;
  onLaunchAction: (action: DailyPlanLaunchAction) => void;
}

export const DAILY_STUDY_TARGET_SECONDS = 180 * 60; // 3 hours (10,800s)

export function formatStudyDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const DailyStudyPlanModal: React.FC<DailyStudyPlanModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  progress,
  onToggleHomeworkTask,
  onLaunchAction,
}) => {
  if (!isOpen) return null;

  const {daily} = progress;
  const elapsedSeconds = daily.studySecondsToday ?? 0;
  const studyPct = Math.min(
    100,
    Math.round((elapsedSeconds / DAILY_STUDY_TARGET_SECONDS) * 100),
  );
  const completedIds = daily.completedHomeworkIdsToday ?? [];

  const blocks: {
    id: string;
    durationLabel: string;
    title: string;
    detail: string;
    statusText: string;
    autoDone: boolean;
    action: DailyPlanLaunchAction;
    buttonLabel: string;
    icon: React.ComponentType<{className?: string}>;
  }[] = [
    {
      id: 'hw-kana-kanji',
      durationLabel: '35 min',
      title: '2× Full Alphabet (Hiragana + Katakana) & Main Kanji',
      detail: 'Complete 2 full-alphabet shifts + drill core warehouse Kanji',
      statusText: `Shifts: ${daily.alphabetSessionsToday}/${DAILY_ALPHABET_SESSIONS_TARGET} · Kanji: ${daily.kanjiPracticedToday} today`,
      autoDone: daily.alphabetSessionsToday >= DAILY_ALPHABET_SESSIONS_TARGET,
      action: 'kana',
      buttonLabel: 'Open Kana & Kanji',
      icon: Languages,
    },
    {
      id: 'hw-vocab-25',
      durationLabel: '40 min',
      title: 'Unlimited Daily 25+ Logistics Words & 35 Counters',
      detail: 'Auto-renewing daily deck with JP + Romaji + Sinhala + audio',
      statusText: `${daily.vocabReviewedCount}/${VOCAB_DAILY_TARGET} words today`,
      autoDone: daily.vocabReviewedCount >= VOCAB_DAILY_TARGET,
      action: 'vocab',
      buttonLabel: 'Start Word Sprint',
      icon: BookMarked,
    },
    {
      id: 'hw-notes-cards',
      durationLabel: '45 min',
      title: 'Illustrated Textbook Notes & 3D Flashcards (Parts 1–6)',
      detail: 'Study figures, diagrams, tables & master 15+ flashcards',
      statusText: `${daily.notesCompleted} notes · ${daily.flashcardsReviewed} cards today`,
      autoDone: daily.flashcardsReviewed >= 15 || daily.notesCompleted >= 1,
      action: 'notes',
      buttonLabel: 'Study Notes',
      icon: BookOpen,
    },
    {
      id: 'hw-quiz-mock',
      durationLabel: '60 min',
      title: '50-Q CBT Mock Exam + Mistake Review Queue',
      detail: 'Practice from the 800-Q exam bank & clear missed items to zero',
      statusText: `${daily.quizAnswered} Qs today · ${progress.wrongQuizIds.length} queued mistakes`,
      autoDone: daily.quizAnswered >= 30 && progress.wrongQuizIds.length === 0,
      action: progress.wrongQuizIds.length > 0 ? 'mistakes' : 'quiz',
      buttonLabel:
        progress.wrongQuizIds.length > 0 ? 'Clear Mistakes' : 'Open Exam Bank',
      icon: CheckSquare,
    },
  ];

  const doneCount = blocks.filter(
    (b) => b.autoDone || completedIds.includes(b.id),
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Daily 3-Hour Exam Bootcamp & Tasks"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playSfx('click');
          onClose();
        }
      }}
    >
      <div className="surface-card flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Hero Header */}
        <div className="surface-hero flex items-start justify-between gap-3 p-5 text-white">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-amber-300">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>SSW EXAM PASS BOOTCAMP</span>
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-slate-200">{activeUser.name}&apos;s Shift</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Today&apos;s 3-Hour Study Routine &amp; Homework
            </h2>
            <p className="text-xs text-slate-300">
              Complete all 4 blocks (180 min) daily to master all 123 textbook pages, 219 Kana, 84 Main Kanji &amp; 800 exam questions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playSfx('click');
              onClose();
            }}
            aria-label="Close daily study plan"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* 3-Hour Live Study Timer Banner */}
          <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="text-xs font-bold text-slate-900">
                  Daily Active Study Timer (Goal: 03:00:00)
                </span>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-blue-700">
                {formatStudyDuration(elapsedSeconds)} / 03:00:00 ({studyPct}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                style={{width: `${studyPct}%`}}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Blocks checked/cleared today:{' '}
              <strong className="font-mono-tabular text-slate-700">
                {doneCount} / {blocks.length}
              </strong>{' '}
              · Timer runs automatically while you study.
            </p>
          </div>

          {/* 4 Structured Homework Blocks */}
          <div className="space-y-2.5">
            {blocks.map((block) => {
              const Icon = block.icon;
              const isChecked =
                block.autoDone || completedIds.includes(block.id);

              return (
                <div
                  key={block.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    isChecked
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200/90 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          playSfx(isChecked ? 'click' : 'complete');
                          onToggleHomeworkTask(block.id);
                        }}
                        aria-label={`Mark ${block.title} as ${isChecked ? 'incomplete' : 'complete'}`}
                        className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Circle className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          <span className="font-mono-tabular text-blue-700">
                            {block.durationLabel}
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className="text-slate-500">{block.statusText}</span>
                        </div>
                        <h3
                          className={`mt-0.5 text-xs font-bold sm:text-sm ${
                            isChecked ? 'text-emerald-900' : 'text-slate-900'
                          }`}
                        >
                          {block.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {block.detail}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx('click');
                        onLaunchAction(block.action);
                      }}
                      className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 whitespace-nowrap"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{block.buttonLabel}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => {
              playSfx('click');
              onLaunchAction('flashcards');
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Layers className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>3D Flashcards</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx('click');
              onClose();
            }}
            className="btn-primary-premium inline-flex min-h-[42px] items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold sm:text-sm"
          >
            <span>Start Today&apos;s Study Shift</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
