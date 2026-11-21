import React from 'react';
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Container,
  Forklift,
  HardHat,
  Images,
  Layers,
  Library,
  PackageCheck,
  Scale,
  Search,
  Warehouse,
} from 'lucide-react';
import type {ActiveTab, StudyPart, StudyProgressState} from '../types/study';
import {VOCAB_DAILY_TARGET, WAREHOUSE_VOCABULARY} from '../data/vocabulary';
import {FuriganaText} from './FuriganaText';

interface StudyLibraryTabProps {
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
  onOpenVocabSprint: () => void;
  onOpenSearch: () => void;
}

const PART_PAGE_RANGES: Record<number, {pages: string; chapter: string; hasDiagram: boolean}> = {
  1: {pages: 'p.1–34', chapter: '第1編 (前)', hasDiagram: true},
  2: {pages: 'p.35–53', chapter: '第1編 (後)', hasDiagram: false},
  3: {pages: 'p.54–63', chapter: '第2編 (前)', hasDiagram: false},
  4: {pages: 'p.64–89', chapter: '第2編 (後)', hasDiagram: true},
  5: {pages: 'p.90–113', chapter: '第3編', hasDiagram: true},
  6: {pages: 'p.114–123', chapter: '第4編', hasDiagram: true},
};

function getPartIcon(partNumber: number) {
  switch (partNumber) {
    case 1:
      return Warehouse;
    case 2:
      return ClipboardCheck;
    case 3:
      return Scale;
    case 4:
      return PackageCheck;
    case 5:
      return HardHat;
    case 6:
      return Forklift;
    default:
      return Container;
  }
}

export const StudyLibraryTab: React.FC<StudyLibraryTabProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
  onOpenVocabSprint,
  onOpenSearch,
}) => {
  const orderedParts = [...allParts].sort(
    (a, b) => a.part_number - b.part_number,
  );
  const totalCards = orderedParts.reduce(
    (sum, part) => sum + part.flashcards.length,
    0,
  );
  const totalQuizzes = orderedParts.reduce(
    (sum, part) => sum + part.quiz.length,
    0,
  );
  const totalVisuals = orderedParts.reduce(
    (sum, part) => sum + (part.images?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      {/* Warehouse Textbook Library Header */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 shadow-2xs">
              <Library className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                SSW Logistics Textbook Library
              </h1>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                <span className="font-mono-tabular font-semibold text-slate-800">
                  {orderedParts.length} Parts
                </span>{' '}
                ·{' '}
                <span className="font-mono-tabular">123 PDF Pages</span> ·{' '}
                <span className="font-mono-tabular">{totalCards} Cards</span> ·{' '}
                <span className="font-mono-tabular">{totalQuizzes} Questions</span> ·{' '}
                <span className="font-mono-tabular">{WAREHOUSE_VOCABULARY.length} Words</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="surface-card-interactive inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              <Search className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Search Syllabus</span>
            </button>

            <button
              type="button"
              onClick={onOpenVocabSprint}
              className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
            >
              <BookMarked className="h-4 w-4" aria-hidden="true" />
              <span>
                Daily {VOCAB_DAILY_TARGET} Vocab ({progress.daily.vocabReviewedCount}/{VOCAB_DAILY_TARGET})
              </span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
            <p className="text-[11px] font-medium text-slate-500">Notes Read</p>
            <p className="font-mono-tabular mt-0.5 text-base font-bold text-slate-900">
              {progress.readPartNumbers.length} / {orderedParts.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
            <p className="text-[11px] font-medium text-slate-500">Cards Known</p>
            <p className="font-mono-tabular mt-0.5 text-base font-bold text-slate-900">
              {progress.reviewedFlashcardIds.length} / {totalCards}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
            <p className="text-[11px] font-medium text-slate-500">Vocab Mastered</p>
            <p className="font-mono-tabular mt-0.5 text-base font-bold text-slate-900">
              {progress.learnedVocabIds.length} / {WAREHOUSE_VOCABULARY.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
            <p className="text-[11px] font-medium text-slate-500">PDF Visuals</p>
            <p className="font-mono-tabular mt-0.5 text-base font-bold text-slate-900">
              {totalVisuals} scans &amp; diagrams
            </p>
          </div>
        </div>
      </section>

      {/* Ordered Textbook Modules (Parts 1-6) */}
      <section aria-label="Textbook Modules" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {orderedParts.map((part) => {
          const PartIcon = getPartIcon(part.part_number);
          const meta = PART_PAGE_RANGES[part.part_number] ?? {
            pages: `${part.images?.length ?? 0}p`,
            chapter: `Part ${part.part_number}`,
            hasDiagram: false,
          };

          const notesDone = progress.readPartNumbers.includes(part.part_number);
          const cardsDone = part.flashcards.filter((_, idx) =>
            progress.reviewedFlashcardIds.includes(`part-${part.part_number}-fc-${idx}`),
          ).length;
          const quizDone = progress.completedQuizParts.includes(part.part_number);
          const visualCount = part.images?.length ?? 0;

          const notesPct = notesDone ? 100 : 0;
          const cardsPct =
            part.flashcards.length > 0
              ? Math.round((cardsDone / part.flashcards.length) * 100)
              : 0;
          const quizPct = quizDone ? 100 : 0;
          const modulePct = Math.round((notesPct + cardsPct + quizPct) / 3);

          return (
            <article
              key={part.part_number}
              className="surface-card flex flex-col justify-between rounded-2xl p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        modulePct === 100
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-blue-200/80 bg-blue-50/80 text-blue-700'
                      }`}
                    >
                      <PartIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono-tabular text-xs font-medium text-slate-500">
                        <span className="font-semibold text-blue-600">
                          Part {part.part_number}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{meta.chapter}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{meta.pages}</span>
                        {meta.hasDiagram && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-amber-700 font-semibold">Diagram</span>
                          </>
                        )}
                      </p>
                      <h2 className="mt-0.5 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                        <FuriganaText text={part.title} showFurigana />
                      </h2>
                    </div>
                  </div>

                  <span
                    className={`font-mono-tabular shrink-0 text-xs font-bold ${
                      modulePct === 100 ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {modulePct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      modulePct === 100
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{width: `${modulePct}%`}}
                  />
                </div>

                {/* Compact Metric Summary */}
                <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    {notesDone && (
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-emerald-600"
                        aria-hidden="true"
                      />
                    )}
                    <span>Notes {notesDone ? 'Done' : 'Unread'}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {cardsDone}/{part.flashcards.length} cards
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {part.quiz.length} questions {quizDone ? '✓' : ''}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular inline-flex items-center gap-1">
                    <Images className="h-3 w-3 text-slate-400" aria-hidden="true" />
                    <span>{visualCount} visuals</span>
                  </span>
                </div>
              </div>

              {/* 3 Direct Launch Actions */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-3.5">
                <button
                  type="button"
                  onClick={() => onSelectPartAndTab(part.part_number, 'notes')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelectPartAndTab(part.part_number, 'flashcards')
                  }
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPartAndTab(part.part_number, 'quiz')}
                  className="btn-primary-premium inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quiz</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
