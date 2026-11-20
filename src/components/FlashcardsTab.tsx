import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Languages,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import type {FlashcardItem, StudyPart} from '../types/study';

interface FlashcardsTabProps {
  parts: StudyPart[];
  reviewedFlashcardIds: string[];
  onMarkFlashcardMastered: (cardId: string, label: string) => void;
  focusCard?: {partNumber: number; cardIndex: number} | null;
}

interface IndexedFlashcard extends FlashcardItem {
  id: string;
  partNumber: number;
  partTitle: string;
  originalIndexInPart: number;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  parts,
  reviewedFlashcardIds,
  onMarkFlashcardMastered,
  focusCard,
}) => {
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
  const [showFurigana, setShowFurigana] = useState(true);

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
  }, [handleNext, handlePrev]);

  if (total === 0 || !currentCard) {
    return (
      <div className="surface-card rounded-2xl p-8 text-center">
        <p className="text-sm text-slate-600">
          No flashcards available in the selected part.
        </p>
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / total) * 100;
  const isCardMastered = reviewedFlashcardIds.includes(currentCard.id);

  const handleMasteredClick = () => {
    onMarkFlashcardMastered(
      currentCard.id,
      `Part ${currentCard.partNumber} · Card ${currentCard.originalIndexInPart + 1}`,
    );
    handleNext();
  };

  return (
    <div className="space-y-5">
      <div className="surface-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
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
          {isCardMastered && (
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
            onClick={() => setShowFurigana((prev) => !prev)}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
              showFurigana
                ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
                : 'border-slate-200/90 bg-white text-slate-600'
            }`}
          >
            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ふりがな</span>
          </button>

          <button
            type="button"
            onClick={handleToggleShuffle}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
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
            className="inline-flex min-h-[36px] items-center justify-center rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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
          style={{width: `${progressPercent}%`}}
        />
      </div>

      <div className="perspective-1200">
        <button
          type="button"
          onClick={() => setIsFlipped((prev) => !prev)}
          aria-pressed={isFlipped}
          className="group relative block h-[360px] w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:h-[400px]"
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

              <div className="font-jp my-auto flex items-center justify-center py-4 text-center">
                <p className="max-w-lg text-lg font-semibold leading-[2.15] tracking-tight text-slate-900 sm:text-xl">
                  <FuriganaText
                    text={currentCard.question}
                    showFurigana={showFurigana}
                  />
                </p>
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

              <div className="font-jp my-auto flex items-center justify-center overflow-y-auto py-3 text-center">
                <p className="max-w-lg whitespace-pre-line text-base font-medium leading-[2.15] text-slate-100 sm:text-lg [&_rt]:text-slate-400">
                  <FuriganaText
                    text={currentCard.answer}
                    showFurigana={showFurigana}
                  />
                </p>
              </div>

              <div className="text-center text-xs font-medium text-slate-400">
                Tap card to view question
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Portrait Thumb-Friendly Action Row */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleMasteredClick}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50/70 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-2xs transition-all hover:border-emerald-300 hover:brightness-98 active:scale-[0.99]"
        >
          <CheckCircle2
            className="h-4 w-4 text-emerald-600"
            aria-hidden="true"
          />
          <span>
            {isCardMastered ? 'Review Again (+2 XP)' : 'Got It (+10 XP)'}
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
    </div>
  );
};
