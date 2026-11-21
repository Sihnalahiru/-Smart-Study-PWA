import React, {useMemo, useState} from 'react';
import {
  ArrowRight,
  BookA,
  BookOpen,
  ClipboardList,
  FileUp,
  Layers,
  Search,
} from 'lucide-react';
import {stripFurigana} from './FuriganaText';
import {getAllCbtQuestions} from '../utils/cbtExam';
import type {ActiveTab, StudyPart} from '../types/study';

interface LibraryTabProps {
  parts: StudyPart[];
  onOpenSearch: () => void;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
  onOpenTotalVocabulary?: () => void;
  onUploadPdf: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  parts,
  onOpenSearch,
  onSelectPartAndTab,
  onOpenTotalVocabulary,
  onUploadPdf,
}) => {
  const [query, setQuery] = useState('');

  const cbtCountByPart = useMemo(() => {
    const counts = new Map<number, number>();
    for (const q of getAllCbtQuestions(parts)) {
      counts.set(q.partNumber, (counts.get(q.partNumber) ?? 0) + 1);
    }
    return counts;
  }, [parts]);

  const totalVocabCount = useMemo(
    () =>
      parts.reduce(
        (sum, p) =>
          sum +
          p.flashcards.filter((fc) => (fc.id ?? '').includes('-fc-vocab-'))
            .length,
        0,
      ),
    [parts],
  );

  const totalCardsCount = useMemo(
    () => parts.reduce((sum, p) => sum + p.flashcards.length, 0),
    [parts],
  );

  const visibleParts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return parts;
    return parts.filter((part) =>
      `part ${part.part_number} ${stripFurigana(part.title)} ${part.english_title ?? ''} ${part.source_pdf}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [parts, query]);

  return (
    <section className="space-y-6">
      <header className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-600">Curriculum Index</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{parts.length} modules</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{totalCardsCount} flashcards</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Study Library
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Jump straight into illustrated bilingual notes, vocabulary decks, or CBT mock practice for any textbook part.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenTotalVocabulary && totalVocabCount > 0 && (
              <button
                type="button"
                onClick={onOpenTotalVocabulary}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100/80 whitespace-nowrap shrink-0"
              >
                <BookA className="h-4 w-4" aria-hidden="true" />
                <span>Total Vocabulary ({totalVocabCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={onUploadPdf}
              className="btn-primary-premium inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold whitespace-nowrap"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              <span>Add PDF</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 transition-colors focus-within:border-blue-500 focus-within:bg-white">
            <Search
              className="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter modules by part number, title, or topic..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="Search study modules"
            />
          </label>
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <span>Full Text Search</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {visibleParts.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No matching modules
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try another search term or clear your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleParts.map((part) => {
            const totalPartQuestions =
              cbtCountByPart.get(part.part_number) ?? part.quiz.length;
            const partVocabCount = part.flashcards.filter((fc) =>
              (fc.id ?? '').includes('-fc-vocab-'),
            ).length;

            return (
              <article
                key={part.part_number}
                className="surface-card-interactive flex flex-col justify-between rounded-2xl p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono-tabular font-bold text-blue-600">
                      Part {part.part_number}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {part.flashcards.length} cards
                    </span>
                    {partVocabCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {partVocabCount} vocab
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {totalPartQuestions} Qs
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-base font-bold leading-snug tracking-tight text-slate-900">
                    {part.english_title ?? stripFurigana(part.title)}
                  </h2>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onSelectPartAndTab(part.part_number, 'notes')}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 whitespace-nowrap"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectPartAndTab(part.part_number, 'flashcards')
                    }
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 whitespace-nowrap"
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPartAndTab(part.part_number, 'quiz')}
                    className="btn-dark-premium inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold whitespace-nowrap"
                  >
                    <ClipboardList
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>CBT</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
