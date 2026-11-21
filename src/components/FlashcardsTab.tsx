import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookA,
  CheckCircle2,
  Languages,
  LayoutGrid,
  Layers,
  RotateCcw,
  Search,
  Shuffle,
  X,
} from 'lucide-react';
import {extractSearchableText, FuriganaText} from './FuriganaText';
import type {FlashcardItem, StudyPart} from '../types/study';

export type FlashcardDeckFilter =
  | 'all'
  | 'total_vocab'
  | 'part_vocab'
  | 'visual';

interface FlashcardsTabProps {
  parts: StudyPart[];
  allParts: StudyPart[];
  reviewedFlashcardIds: string[];
  onMarkFlashcardMastered: (cardId: string, label: string) => void;
  focusCard?: {partNumber: number; cardIndex: number} | null;
  initialDeckMode?: FlashcardDeckFilter | null;
  onConsumeInitialDeckMode?: () => void;
}

interface IndexedFlashcard extends FlashcardItem {
  id: string;
  partNumber: number;
  partTitle: string;
  originalIndexInPart: number;
  isVocab: boolean;
}

type MasteryFilter = 'all' | 'unmastered' | 'mastered';
type FlashcardViewMode = 'cards' | 'list';

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  parts,
  allParts,
  reviewedFlashcardIds,
  onMarkFlashcardMastered,
  focusCard,
  initialDeckMode,
  onConsumeInitialDeckMode,
}) => {
  const mapPartCards = useCallback(
    (sourceParts: StudyPart[]): IndexedFlashcard[] =>
      sourceParts.flatMap((part) =>
        part.flashcards.map((fc, idx) => {
          const id = fc.id ?? `part-${part.part_number}-fc-${idx}`;
          return {
            ...fc,
            id,
            partNumber: part.part_number,
            partTitle: part.english_title ?? part.title,
            originalIndexInPart: idx,
            isVocab: id.includes('-fc-vocab-'),
          };
        }),
      ),
    [],
  );

  const scopedPartCards = useMemo<IndexedFlashcard[]>(
    () => mapPartCards(parts),
    [mapPartCards, parts],
  );

  const totalVocabCards = useMemo<IndexedFlashcard[]>(
    () => mapPartCards(allParts).filter((c) => c.isVocab),
    [mapPartCards, allParts],
  );

  const isSinglePartScope = parts.length === 1 && allParts.length > 1;
  const scopedVocabCount = useMemo(
    () => scopedPartCards.filter((c) => c.isVocab).length,
    [scopedPartCards],
  );
  const scopedVisualCount = useMemo(
    () => scopedPartCards.filter((c) => Boolean(c.image)).length,
    [scopedPartCards],
  );

  const [deckFilter, setDeckFilter] = useState<FlashcardDeckFilter>('all');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const [viewMode, setViewMode] = useState<FlashcardViewMode>('cards');
  const [vocabSearch, setVocabSearch] = useState('');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  useEffect(() => {
    if (initialDeckMode) {
      setDeckFilter(initialDeckMode);
      setMasteryFilter('all');
      setVocabSearch('');
      setViewMode('cards');
      onConsumeInitialDeckMode?.();
    }
  }, [initialDeckMode, onConsumeInitialDeckMode]);

  useEffect(() => {
    if (!isSinglePartScope && deckFilter === 'part_vocab') {
      setDeckFilter('total_vocab');
    }
  }, [isSinglePartScope, deckFilter]);

  useEffect(() => {
    if (focusCard) {
      setDeckFilter('all');
      setMasteryFilter('all');
      setViewMode('cards');
    }
  }, [focusCard]);

  const reviewedSet = useMemo(
    () => new Set(reviewedFlashcardIds),
    [reviewedFlashcardIds],
  );

  const baseDeckCards = useMemo<IndexedFlashcard[]>(() => {
    if (deckFilter === 'total_vocab') return totalVocabCards;
    if (deckFilter === 'part_vocab') {
      return scopedPartCards.filter((c) => c.isVocab);
    }
    if (deckFilter === 'visual') {
      return scopedPartCards.filter((c) => Boolean(c.image));
    }
    return scopedPartCards;
  }, [deckFilter, scopedPartCards, totalVocabCards]);

  const orderedCards = useMemo<IndexedFlashcard[]>(() => {
    let list = baseDeckCards;
    if (masteryFilter === 'unmastered') {
      list = list.filter((c) => !reviewedSet.has(c.id));
    } else if (masteryFilter === 'mastered') {
      list = list.filter((c) => reviewedSet.has(c.id));
    }
    const q = vocabSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const hay =
          `${extractSearchableText(c.question)} ${extractSearchableText(c.answer)} part ${c.partNumber} ${c.partTitle}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [baseDeckCards, masteryFilter, reviewedSet, vocabSearch]);

  const deckMasteredCount = useMemo(
    () => baseDeckCards.filter((c) => reviewedSet.has(c.id)).length,
    [baseDeckCards, reviewedSet],
  );

  useEffect(() => {
    setIsShuffled(false);
    setShuffledIndices(orderedCards.map((_, idx) => idx));
    if (focusCard) {
      const targetIdx = orderedCards.findIndex(
        (c) =>
          c.partNumber === focusCard.partNumber &&
          c.originalIndexInPart === focusCard.cardIndex,
      );
      setCurrentIndex(targetIdx >= 0 ? targetIdx : 0);
    } else {
      setCurrentIndex((prev) =>
        prev < orderedCards.length ? prev : 0,
      );
    }
    setIsFlipped(false);
  }, [orderedCards, focusCard]);

  const activeCards = useMemo(() => {
    if (!isShuffled || shuffledIndices.length !== orderedCards.length) {
      return orderedCards;
    }
    return shuffledIndices.map((idx) => orderedCards[idx]);
  }, [isShuffled, orderedCards, shuffledIndices]);

  const total = activeCards.length;
  const safeIndex = total > 0 ? Math.min(currentIndex, total - 1) : 0;
  const currentCard = activeCards[safeIndex];

  const handleNext = useCallback(() => {
    if (total === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < total ? prev + 1 : 0));
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleToggleShuffle = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      return;
    }
    const indices = orderedCards.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  useEffect(() => {
    if (viewMode !== 'cards') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev, viewMode]);

  const handleMasteredClick = () => {
    if (!currentCard) return;
    onMarkFlashcardMastered(
      currentCard.id,
      `Part ${currentCard.partNumber} · ${currentCard.isVocab ? 'Vocab' : `Card ${currentCard.originalIndexInPart + 1}`}`,
    );
    handleNext();
  };

  const deckHeading =
    deckFilter === 'total_vocab'
      ? 'Total Warehouse Vocabulary'
      : deckFilter === 'part_vocab'
        ? `Part ${parts[0]?.part_number ?? 1} Vocabulary`
        : deckFilter === 'visual'
          ? 'Visual Signs & Diagrams'
          : isSinglePartScope
            ? `Part ${parts[0]?.part_number ?? 1} Flashcards`
            : 'Complete Flashcard Deck';

  const deckMasteryPct =
    baseDeckCards.length > 0
      ? Math.round((deckMasteredCount / baseDeckCards.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Studio Deck Command Header */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-600">
                Active Recall Studio
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular font-medium text-slate-700">
                {deckMasteredCount}/{baseDeckCards.length} mastered ({deckMasteryPct}%)
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {deckHeading}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: 3D Flip vs Glossary List */}
            <div
              role="group"
              aria-label="Flashcard view mode"
              className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/75 p-1"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>3D Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Glossary</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFurigana((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                showFurigana
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ふりがな {showFurigana ? 'ON' : 'OFF'}</span>
            </button>

            {viewMode === 'cards' && (
              <>
                <button
                  type="button"
                  onClick={handleToggleShuffle}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isShuffled
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Restart flashcard deck"
                  title="Restart deck"
                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Deck Mode Tabs (Including Dedicated Total Vocabulary Option) */}
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Flashcard deck mode"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={deckFilter === 'all'}
              onClick={() => setDeckFilter('all')}
              className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                deckFilter === 'all'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                  : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSinglePartScope
                ? `Part ${parts[0].part_number} All (${scopedPartCards.length})`
                : `All Cards (${scopedPartCards.length})`}
            </button>

            {totalVocabCards.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={deckFilter === 'total_vocab'}
                onClick={() => setDeckFilter('total_vocab')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  deckFilter === 'total_vocab'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                    : 'border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70'
                }`}
              >
                <BookA className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Total Vocabulary ({totalVocabCards.length})</span>
              </button>
            )}

            {isSinglePartScope && scopedVocabCount > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={deckFilter === 'part_vocab'}
                onClick={() => setDeckFilter('part_vocab')}
                className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  deckFilter === 'part_vocab'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                Part {parts[0].part_number} Vocab ({scopedVocabCount})
              </button>
            )}

            {scopedVisualCount > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={deckFilter === 'visual'}
                onClick={() => setDeckFilter('visual')}
                className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  deckFilter === 'visual'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                Visual ({scopedVisualCount})
              </button>
            )}
          </div>

          {/* Mastery Status Filter */}
          <div
            role="group"
            aria-label="Filter by mastery status"
            className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 self-start sm:self-auto"
          >
            {(
              [
                {id: 'all', label: 'All'},
                {id: 'unmastered', label: 'To Learn'},
                {id: 'mastered', label: 'Mastered'},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMasteryFilter(opt.id)}
                className={`min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  masteryFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Quick Search Bar inside Glossary or Total Vocabulary */}
        {(viewMode === 'list' || deckFilter === 'total_vocab') && (
          <div className="mt-3.5">
            <label className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 transition-colors focus-within:border-blue-500 focus-within:bg-white">
              <Search
                className="h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={vocabSearch}
                onChange={(e) => setVocabSearch(e.target.value)}
                placeholder="Filter vocabulary by Japanese, Sinhala, or English..."
                aria-label="Filter flashcards"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm"
              />
              {vocabSearch && (
                <button
                  type="button"
                  onClick={() => setVocabSearch('')}
                  aria-label="Clear filter"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </label>
          </div>
        )}
      </section>

      {/* Empty State */}
      {total === 0 || !currentCard ? (
        <div className="surface-card space-y-3 rounded-2xl p-10 text-center">
          <p className="text-base font-bold text-slate-900">
            No flashcards match this filter
          </p>
          <p className="text-xs text-slate-500">
            {masteryFilter === 'unmastered'
              ? 'You have mastered every card in this deck.'
              : 'Try clearing your search or switching back to all cards.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {masteryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setMasteryFilter('all')}
                className="btn-primary-premium inline-flex min-h-[40px] items-center rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Show All Statuses
              </button>
            )}
            {(deckFilter !== 'all' || vocabSearch) && (
              <button
                type="button"
                onClick={() => {
                  setDeckFilter('all');
                  setMasteryFilter('all');
                  setVocabSearch('');
                }}
                className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* Scannable Multi-Column Vocabulary / Flashcard Glossary View */
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="font-mono-tabular font-semibold text-slate-700">
              Showing {activeCards.length} cards
            </span>
            <span>Click any item to practice in 3D card view</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeCards.map((card, idx) => {
              const mastered = reviewedSet.has(card.id);
              return (
                <article
                  key={card.id}
                  className="surface-card-interactive flex flex-col justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="font-mono-tabular font-semibold text-blue-600">
                        Part {card.partNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {card.isVocab
                          ? 'Vocabulary'
                          : card.image
                            ? 'Visual'
                            : 'Concept'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onMarkFlashcardMastered(
                          card.id,
                          `Part ${card.partNumber} · ${card.isVocab ? 'Vocab' : `Card ${card.originalIndexInPart + 1}`}`,
                        )
                      }
                      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                        mastered
                          ? 'text-emerald-600'
                          : 'text-slate-400 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{mastered ? 'Mastered' : 'Mark Done'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsFlipped(false);
                      setViewMode('cards');
                      window.scrollTo({top: 0, behavior: 'smooth'});
                    }}
                    className="font-jp flex-1 text-left"
                  >
                    <p className="text-sm font-bold leading-[2.0] text-slate-900 sm:text-base">
                      <FuriganaText
                        text={card.question}
                        showFurigana={showFurigana}
                      />
                    </p>
                    <p className="mt-1.5 whitespace-pre-line border-t border-slate-100 pt-2 text-xs leading-[1.9] text-slate-600 sm:text-[13px]">
                      <FuriganaText
                        text={card.answer}
                        showFurigana={showFurigana}
                      />
                    </p>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        /* Ultra-Premium 3D Active Recall Card Stage */
        <div className="mx-auto max-w-3xl space-y-5">
          {/* Progress Bar & Card Counter */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-sm font-bold text-slate-900">
                  {safeIndex + 1} / {total}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-medium text-slate-500">
                  Part {currentCard.partNumber}
                </span>
                {reviewedSet.has(currentCard.id) && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Mastered</span>
                    </span>
                  </>
                )}
              </div>
              <span className="hidden text-[11px] text-slate-400 sm:inline">
                Space to flip · ← / → to navigate
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80"
              role="progressbar"
              aria-valuenow={safeIndex + 1}
              aria-valuemin={1}
              aria-valuemax={total}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-200"
                style={{width: `${((safeIndex + 1) / total) * 100}%`}}
              />
            </div>
          </div>

          <div className="perspective-1200">
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              aria-pressed={isFlipped}
              className="group relative block h-[370px] w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:h-[420px]"
            >
              <div
                className={`preserve-3d relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Face */}
                <div className="surface-card backface-hidden absolute inset-0 flex flex-col justify-between rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span className="tracking-wide text-blue-600">
                      {currentCard.image
                        ? 'Visual Flashcard'
                        : currentCard.isVocab
                          ? 'Warehouse Vocabulary'
                          : 'Study Prompt'}
                    </span>
                    <span className="truncate">{currentCard.partTitle}</span>
                  </div>

                  <div className="font-jp my-auto flex flex-col items-center justify-center gap-4 overflow-y-auto py-2 text-center">
                    {currentCard.image && (
                      <div className="flex max-h-[155px] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:max-h-[180px]">
                        <img
                          src={currentCard.image}
                          alt={currentCard.imageAlt ?? 'Textbook visual flashcard'}
                          loading="lazy"
                          className="max-h-[135px] w-auto object-contain sm:max-h-[160px]"
                        />
                      </div>
                    )}
                    <p
                      className={`max-w-xl font-bold leading-[2.05] tracking-tight text-slate-900 ${
                        currentCard.image
                          ? 'text-lg sm:text-xl'
                          : 'text-xl sm:text-2xl'
                      }`}
                    >
                      <FuriganaText
                        text={currentCard.question}
                        showFurigana={showFurigana}
                      />
                    </p>
                  </div>

                  <div className="text-center text-xs font-medium text-slate-400">
                    Tap card or press Space to reveal Sinhala &amp; English answer
                  </div>
                </div>

                {/* Back Face */}
                <div className="surface-hero backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl p-6 text-white sm:p-8">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                    <span className="text-amber-300">
                      {currentCard.isVocab ? 'Meaning & Usage' : 'Answer'}
                    </span>
                    <span className="truncate">{currentCard.partTitle}</span>
                  </div>

                  <div className="font-jp my-auto flex items-center justify-center overflow-y-auto py-3 text-center">
                    <p className="max-w-xl whitespace-pre-line text-base font-medium leading-[2.15] text-slate-100 sm:text-lg [&_rt]:text-slate-400">
                      <FuriganaText
                        text={currentCard.answer}
                        showFurigana={showFurigana}
                      />
                    </p>
                  </div>

                  <div className="text-center text-xs font-medium text-slate-400">
                    Tap card to view front
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Action Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handlePrev}
              className="surface-card-interactive inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.99]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleMasteredClick}
              className="col-span-2 order-first inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-5 py-3 text-sm font-semibold text-emerald-800 transition-all hover:bg-emerald-100/80 active:scale-[0.99] sm:col-span-1 sm:order-none"
            >
              <CheckCircle2
                className="h-4 w-4 text-emerald-600"
                aria-hidden="true"
              />
              <span>
                {reviewedSet.has(currentCard.id)
                  ? 'Review Again (+2 XP)'
                  : 'Got It (+10 XP)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="btn-primary-premium inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
