import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, BookOpen, Layers, Search, X} from 'lucide-react';
import {extractSearchableText, stripFurigana} from './FuriganaText';
import type {SearchNavigationTarget, StudyPart} from '../types/study';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: StudyPart[];
  onNavigate: (target: SearchNavigationTarget) => void;
}

type SearchFilter = 'all' | 'notes' | 'flashcards';

interface SearchResultItem {
  id: string;
  kind: 'notes' | 'flashcards';
  partNumber?: number;
  cardIndex?: number;
  title: string;
  subtitle: string;
  snippet: string;
}

function stripMarkdown(md: string): string {
  return stripFurigana(md)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSnippet(text: string, query: string, maxLen = 180): string {
  const clean = text;
  const lower = clean.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    return clean.slice(0, maxLen) + (clean.length > maxLen ? '...' : '');
  }
  const start = Math.max(0, idx - 55);
  const end = Math.min(clean.length, idx + query.length + 115);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

function HighlightedText({text, query}: {text: string; query: string}) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const segments = text.split(regex);
  return (
    <>
      {segments.map((segment, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-amber-200/80 px-0.5 font-semibold text-slate-950"
          >
            {segment}
          </mark>
        ) : (
          <React.Fragment key={i}>{segment}</React.Fragment>
        ),
      )}
    </>
  );
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  parts,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResultItem[] = [];

    for (const part of parts) {
      const displayPartTitle = part.english_title ?? stripFurigana(part.title);
      const cleanNotes = stripMarkdown(part.notes_markdown || '');
      const searchableNotes = extractSearchableText(part.notes_markdown || '');
      const titleMatch = extractSearchableText(
        `${part.title} ${part.english_title ?? ''}`,
      )
        .toLowerCase()
        .includes(q);
      const rawLines = (part.notes_markdown || '').split(/\n+/);
      const matchingRawLine = rawLines.find((line) =>
        extractSearchableText(line).toLowerCase().includes(q),
      );

      if (
        titleMatch ||
        matchingRawLine ||
        searchableNotes.toLowerCase().includes(q)
      ) {
        const cleanMatchingLine = matchingRawLine
          ? stripMarkdown(matchingRawLine)
          : cleanNotes;
        matches.push({
          id: `note-${part.part_number}`,
          kind: 'notes',
          partNumber: part.part_number,
          title: `Part ${part.part_number}: ${displayPartTitle}`,
          subtitle: `Markdown Study Notes · ${part.source_pdf}`,
          snippet: extractSnippet(cleanMatchingLine || cleanNotes, query.trim()),
        });
      }

      part.flashcards.forEach((card, cardIdx) => {
        const qMatch = extractSearchableText(card.question)
          .toLowerCase()
          .includes(q);
        const aMatch = extractSearchableText(card.answer)
          .toLowerCase()
          .includes(q);
        if (qMatch || aMatch) {
          matches.push({
            id: `fc-${part.part_number}-${cardIdx}`,
            kind: 'flashcards',
            partNumber: part.part_number,
            cardIndex: cardIdx,
            title: stripFurigana(card.question),
            subtitle: `Flashcard #${cardIdx + 1} · Part ${part.part_number}: ${displayPartTitle}`,
            snippet: extractSnippet(stripFurigana(card.answer), query.trim()),
          });
        }
      });
    }

    return matches;
  }, [parts, query]);

  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter((r) => r.kind === filter);
  }, [results, filter]);

  const counts = useMemo(() => {
    return {
      all: results.length,
      notes: results.filter((r) => r.kind === 'notes').length,
      flashcards: results.filter((r) => r.kind === 'flashcards').length,
    };
  }, [results]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-3 pt-12 backdrop-blur-sm sm:p-6 sm:pt-20"
      role="dialog"
      aria-modal="true"
      aria-label="Global study search"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface-glass w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl">
        {/* Search Input Row */}
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-white/60 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Markdown study notes and flashcards..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Bar */}
        {query.trim() && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200/70 bg-slate-50/70 px-4 py-2">
            {(
              [
                {id: 'all', label: `All (${counts.all})`},
                {id: 'notes', label: `Study Notes (${counts.notes})`},
                {id: 'flashcards', label: `Flashcards (${counts.flashcards})`},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[34px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto bg-white/50 p-3 sm:p-4">
          {!query.trim() ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                Search across all {parts.length} SSW Logistics{' '}
                {parts.length === 1 ? 'module' : 'modules'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Type Japanese, Romaji, Sinhala, or English terms to jump
                straight to matching study notes or flashcards.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                No matches found for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try a shorter keyword or switch result filters above.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredResults.map((item) => {
                const Icon = item.kind === 'notes' ? BookOpen : Layers;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate({
                          tab: item.kind,
                          partNumber: item.partNumber,
                          cardIndex: item.cardIndex,
                          query: query.trim(),
                        });
                        onClose();
                      }}
                      className="surface-card-interactive group flex w-full items-start justify-between gap-3 rounded-xl p-3.5 text-left"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                            <HighlightedText
                              text={item.title}
                              query={query.trim()}
                            />
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.subtitle}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                            <HighlightedText
                              text={item.snippet}
                              query={query.trim()}
                            />
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
