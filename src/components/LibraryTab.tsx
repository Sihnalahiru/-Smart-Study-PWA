import React, {useMemo, useState} from 'react';
import {BookOpen, FileUp, Layers, Search, ClipboardList} from 'lucide-react';
import type {ActiveTab, StudyPart} from '../types/study';

interface LibraryTabProps {
  parts: StudyPart[];
  onOpenSearch: () => void;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
  onUploadPdf: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  parts,
  onOpenSearch,
  onSelectPartAndTab,
  onUploadPdf,
}) => {
  const [query, setQuery] = useState('');
  const visibleParts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return parts;
    return parts.filter((part) =>
      `part ${part.part_number} ${part.title} ${part.source_pdf}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [parts, query]);

  return (
    <section className="space-y-4">
      <header className="surface-card rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Study Library</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Choose a module to open illustrated study notes, flashcards, or CBT exam practice.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <label className="flex min-h-[42px] min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search study modules..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="Search study modules"
            />
          </label>
          <button type="button" onClick={onUploadPdf} className="btn-primary-premium inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Add PDF
          </button>
        </div>
      </header>

      {visibleParts.length === 0 ? (
        <div className="surface-card rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">No matching modules</p>
          <p className="mt-1 text-xs text-slate-500">Try another search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleParts.map((part) => (
            <article key={part.part_number} className="surface-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                <span className="font-mono-tabular font-semibold text-blue-600">Part {part.part_number}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{part.flashcards.length} cards</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{part.quiz.length} questions</span>
              </div>
              <h2 className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
                {part.english_title ?? part.title}
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onSelectPartAndTab(part.part_number, 'notes')} className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Notes
                </button>
                <button type="button" onClick={() => onSelectPartAndTab(part.part_number, 'flashcards')} className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Cards
                </button>
                <button type="button" onClick={() => onSelectPartAndTab(part.part_number, 'quiz')} className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> CBT Exam
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={onOpenSearch} className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
        Open full study search
      </button>
    </section>
  );
};
