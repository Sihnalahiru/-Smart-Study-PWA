import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Eye,
  Languages,
  Layers,
  RotateCcw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import {
  buildDailyVocabDeck,
  getVocabByPart,
  VOCAB_DAILY_TARGET,
  WAREHOUSE_VOCABULARY,
} from '../data/vocabulary';
import type {FlashcardItem, StudyPart, VocabItem} from '../types/study';

export type FlashcardViewMode = 'cards' | 'vocab';

interface FlashcardsTabProps {
  parts: StudyPart[];
  reviewedFlashcardIds: string[];
  onMarkFlashcardMastered: (cardId: string, label: string) => void;
  focusCard?: {partNumber: number; cardIndex: number} | null;
  learnedVocabIds: string[];
  dailyVocabReviewedIds: string[];
  vocabDailyTarget?: number;
  onMarkVocabReviewed: (vocabId: string, label: string) => void;
  initialMode?: FlashcardViewMode;
  modeTriggerKey?: number;
}

interface IndexedFlashcard extends FlashcardItem {
  id: string;
  partNumber: number;
  partTitle: string;
  originalIndexInPart: number;
}

function renderMultilineTrilingual(
  rawText: string,
  showFurigana: boolean,
  variant: 'front' | 'back',
) {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-center">
      {lines.map((line, index) => {
        const isRomaji = line.startsWith('*') && line.endsWith('*');
        const cleanLine = isRomaji ? line.slice(1, -1).trim() : line;

        if (isRomaji) {
          return (
            <p
              key={index}
              className={`text-xs italic leading-relaxed sm:text-sm ${
                variant === 'back' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              {cleanLine}
            </p>
          );
        }

        const hasSinhala = /[\u0D80-\u0DFF]/.test(cleanLine);
        if (hasSinhala) {
          return (
            <p
              key={index}
              className={`text-sm font-medium leading-relaxed sm:text-base ${
                variant === 'back' ? 'text-amber-200' : 'text-slate-700'
              }`}
            >
              {cleanLine}
            </p>
          );
        }

        return (
          <p
            key={index}
            className={`font-jp font-bold leading-[2.05] tracking-tight ${
              variant === 'back'
                ? 'text-base text-white sm:text-lg [&_rt]:text-slate-300'
                : 'text-base text-slate-900 sm:text-xl'
            }`}
          >
            <FuriganaText text={cleanLine} showFurigana={showFurigana} />
          </p>
        );
      })}
    </div>
  );
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  parts,
  reviewedFlashcardIds,
  onMarkFlashcardMastered,
  focusCard,
  learnedVocabIds,
  dailyVocabReviewedIds,
  vocabDailyTarget = VOCAB_DAILY_TARGET,
  onMarkVocabReviewed,
  initialMode = 'cards',
  modeTriggerKey = 0,
}) => {
  const [mode, setMode] = useState<FlashcardViewMode>(initialMode);
  const [showFurigana, setShowFurigana] = useState(true);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, modeTriggerKey]);

  useEffect(() => {
    if (focusCard) {
      setMode('cards');
    }
  }, [focusCard]);

  // --- Study Flashcards State ---
  const orderedCards = useMemo<IndexedFlashcard[]>(() => {
    return parts.flatMap((part) =>
      part.flashcards.map((fc, idx) => ({
        ...fc,
        id: `part-${part.part_number}-fc-${idx}`,
        partNumber: part.part_number,
        partTitle: part.title,
        originalIndexInPart: idx,
      })),
    );
  }, [parts]);

  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

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
      setCurrentIndex(0);
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
  const currentCard = activeCards[currentIndex];

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

  // --- Daily 25 Vocab Sprint State ---
  const [vocabScope, setVocabScope] = useState<'daily25' | number>('daily25');
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabRevealed, setVocabRevealed] = useState(false);

  const vocabDeck = useMemo<VocabItem[]>(() => {
    if (vocabScope === 'daily25') {
      return buildDailyVocabDeck(learnedVocabIds, undefined, vocabDailyTarget);
    }
    return getVocabByPart(vocabScope);
  }, [vocabScope, learnedVocabIds, vocabDailyTarget]);

  useEffect(() => {
    setVocabIndex(0);
    setVocabRevealed(false);
  }, [vocabScope]);

  const safeVocabIndex =
    vocabDeck.length > 0 ? Math.min(vocabIndex, vocabDeck.length - 1) : 0;
  const currentVocab = vocabDeck[safeVocabIndex];

  const handleNextVocab = useCallback(() => {
    if (vocabDeck.length === 0) return;
    setVocabRevealed(false);
    setVocabIndex((prev) => (prev + 1 < vocabDeck.length ? prev + 1 : 0));
  }, [vocabDeck.length]);

  const handlePrevVocab = useCallback(() => {
    if (vocabDeck.length === 0) return;
    setVocabRevealed(false);
    setVocabIndex((prev) => (prev - 1 >= 0 ? prev - 1 : vocabDeck.length - 1));
  }, [vocabDeck.length]);

  useEffect(() => {
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
      if (mode === 'cards') {
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
      } else {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextVocab();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevVocab();
        } else if (e.key === ' ') {
          e.preventDefault();
          setVocabRevealed((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, handleNext, handlePrev, handleNextVocab, handlePrevVocab]);

  const dailyVocabPct = Math.min(
    100,
    Math.round((dailyVocabReviewedIds.length / vocabDailyTarget) * 100),
  );
  const dailyVocabComplete = dailyVocabReviewedIds.length >= vocabDailyTarget;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Mode Switcher Bar: Study Flashcards vs Daily 25 Vocab Sprint */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl p-2 sm:px-4 sm:py-2.5">
        <div
          role="tablist"
          aria-label="Flashcard Study Mode"
          className="grid flex-1 grid-cols-2 gap-1.5 sm:max-w-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'cards'}
            onClick={() => setMode('cards')}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'cards'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Study Cards ({total})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'vocab'}
            onClick={() => setMode('vocab')}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'vocab'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <BookMarked className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Daily 25 Vocab ({dailyVocabReviewedIds.length}/{vocabDailyTarget})
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
            showFurigana
              ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
              : 'border-slate-200/90 bg-white text-slate-600'
          }`}
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          <span>ふりがな</span>
        </button>
      </div>

      {mode === 'cards' ? (
        total === 0 || !currentCard ? (
          <div className="surface-card rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-600">
              No flashcards available in the selected part.
            </p>
          </div>
        ) : (
          <>
            <div className="surface-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono-tabular text-sm font-bold tracking-tight text-slate-900">
                  {currentIndex + 1} / {total}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Part {currentCard.partNumber}
                </span>
                {reviewedFlashcardIds.includes(currentCard.id) && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Mastered</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleShuffle}
                  className={`inline-flex min-h-[38px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
                    isShuffled
                      ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
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
                  className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-slate-200/60"
              role="progressbar"
              aria-valuenow={currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={total}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-200"
                style={{width: `${((currentIndex + 1) / total) * 100}%`}}
              />
            </div>

            <div className="perspective-1200">
              <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                aria-pressed={isFlipped}
                className="group relative block h-[370px] w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:h-[400px]"
              >
                <div
                  className={`preserve-3d relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front Face */}
                  <div className="surface-card backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                      <span className="tracking-wide text-blue-600">Question</span>
                      <span className="truncate">{currentCard.partTitle}</span>
                    </div>

                    <div className="my-auto flex max-h-[240px] items-center justify-center overflow-y-auto py-3">
                      {renderMultilineTrilingual(
                        currentCard.question,
                        showFurigana,
                        'front',
                      )}
                    </div>

                    <div className="text-center text-xs font-medium text-slate-400">
                      Tap card to reveal answer
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="surface-hero backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-2xl p-6 text-white sm:p-8">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                      <span className="text-amber-300">Answer</span>
                      <span className="truncate">{currentCard.partTitle}</span>
                    </div>

                    <div className="my-auto flex max-h-[250px] items-center justify-center overflow-y-auto py-3">
                      {renderMultilineTrilingual(
                        currentCard.answer,
                        showFurigana,
                        'back',
                      )}
                    </div>

                    <div className="text-center text-xs font-medium text-slate-400">
                      Tap card to view question
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onMarkFlashcardMastered(
                    currentCard.id,
                    `Part ${currentCard.partNumber} · Card ${currentCard.originalIndexInPart + 1}`,
                  );
                  handleNext();
                }}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50/70 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-2xs transition-all hover:border-emerald-300 hover:brightness-98 active:scale-[0.99]"
              >
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                <span>
                  {reviewedFlashcardIds.includes(currentCard.id)
                    ? 'Review Again (+2 XP)'
                    : 'Got It (+10 XP)'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3">
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
                  onClick={handleNext}
                  className="btn-primary-premium inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )
      ) : (
        /* Daily 25 Vocabulary Sprint */
        <div className="space-y-4">
          {/* Daily 25 Target Progress Card */}
          <section className="surface-card rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  Daily {vocabDailyTarget}-Word Logistics Target
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-mono-tabular font-semibold text-amber-700">
                    {dailyVocabReviewedIds.length} / {vocabDailyTarget}
                  </span>{' '}
                  today ·{' '}
                  <span className="font-mono-tabular font-semibold text-slate-700">
                    {learnedVocabIds.length} / {WAREHOUSE_VOCABULARY.length}
                  </span>{' '}
                  mastered · +30 XP bonus at 25/25
                </p>
              </div>

              {dailyVocabComplete && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>Daily 25 Target Complete</span>
                </span>
              )}
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  dailyVocabComplete
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{width: `${dailyVocabPct}%`}}
              />
            </div>

            {/* Scope Filters */}
            <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setVocabScope('daily25')}
                className={`min-h-[36px] rounded-xl border px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  vocabScope === 'daily25'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                Today&apos;s 25 Deck
              </button>
              {[1, 2, 3, 4, 5, 6].map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setVocabScope(pNum)}
                  className={`min-h-[36px] rounded-xl border px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    vocabScope === pNum
                      ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Part {pNum} (25)
                </button>
              ))}
            </div>
          </section>

          {currentVocab && (
            <>
              <section className="surface-card rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                  <span className="font-mono-tabular font-bold text-slate-900">
                    {safeVocabIndex + 1} / {vocabDeck.length}
                  </span>
                  <span>
                    Part {currentVocab.partNumber} · {currentVocab.category}
                  </span>
                  {learnedVocabIds.includes(currentVocab.id) && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Learned</span>
                    </span>
                  )}
                </div>

                <div className="my-6 text-center">
                  <p className="font-jp text-2xl font-bold leading-[1.9] tracking-tight text-slate-900 sm:text-3xl">
                    <FuriganaText
                      text={currentVocab.jp}
                      showFurigana={showFurigana}
                    />
                  </p>
                  <p className="mt-2 text-sm italic text-slate-500 sm:text-base">
                    {currentVocab.romaji}
                  </p>

                  {vocabRevealed ? (
                    <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-5">
                      <p className="text-lg font-bold text-blue-700 sm:text-xl">
                        {currentVocab.sinhala}
                      </p>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-left">
                        <p className="font-jp text-sm font-semibold leading-[2.0] text-slate-900 sm:text-base">
                          <FuriganaText
                            text={currentVocab.exampleJp}
                            showFurigana={showFurigana}
                          />
                        </p>
                        <p className="mt-1 text-xs italic text-slate-500">
                          {currentVocab.exampleRomaji}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-700 sm:text-sm">
                          {currentVocab.exampleSinhala}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVocabRevealed(true)}
                      className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>Reveal Meaning &amp; Example</span>
                    </button>
                  )}
                </div>
              </section>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onMarkVocabReviewed(
                      currentVocab.id,
                      `${currentVocab.romaji} (Part ${currentVocab.partNumber})`,
                    );
                    handleNextVocab();
                  }}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50/70 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-2xs transition-all hover:border-emerald-300 hover:brightness-98 active:scale-[0.99]"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>
                    {learnedVocabIds.includes(currentVocab.id)
                      ? 'Practice Word (+2 XP) & Next'
                      : 'Mark Learned (+5 XP) & Next'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handlePrevVocab}
                    className="surface-card-interactive inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.99]"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextVocab}
                    className="btn-primary-premium inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    <span>Skip / Next</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
