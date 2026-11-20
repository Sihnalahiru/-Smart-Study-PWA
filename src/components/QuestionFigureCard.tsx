import React, {useEffect, useState} from 'react';
import {Image as ImageIcon, ImageOff, Maximize2} from 'lucide-react';
import type {
  QuestionImageCategory,
  QuizImageField,
} from '../types/study';
import {normalizeQuizImageField} from '../utils/pdfVisualResolver';
import {FuriganaText} from './FuriganaText';

interface QuestionFigureCardProps {
  /** Standardized MCQ image field (asset path string or QuizQuestionImage metadata object) */
  image?: QuizImageField;
  /** Optional fallback alt text when `image` is passed as a plain string path */
  fallbackAlt?: string;
  showFurigana: boolean;
  /**
   * When false (active CBT exam), displays a spoiler-free category header so
   * diagram identification answers are never leaked.
   * When true (review / after answering), displays the full mapped textbook caption.
   */
  revealCaption: boolean;
  /**
   * 'side' renders responsively alongside text questions;
   * 'compact' renders neatly inside review cards;
   * 'prominent' gives extra visual prominence for Practical diagram judgment questions.
   */
  variant?: 'side' | 'compact' | 'prominent';
  badgeLabel?: string;
  onZoom?: (src: string, alt: string) => void;
}

const CATEGORY_META: Record<
  QuestionImageCategory,
  {label: string; accentClass: string}
> = {
  sign: {
    label: 'Cargo Sign',
    accentClass: 'text-indigo-700',
  },
  label: {
    label: 'Hazard / Label',
    accentClass: 'text-amber-700',
  },
  hazard: {
    label: 'Safety Visual',
    accentClass: 'text-rose-700',
  },
  equipment: {
    label: 'Equipment Figure',
    accentClass: 'text-blue-700',
  },
  diagram: {
    label: 'Technical Diagram',
    accentClass: 'text-teal-700',
  },
  reference: {
    label: 'Textbook Figure',
    accentClass: 'text-slate-700',
  },
};

export const QuestionFigureCard: React.FC<QuestionFigureCardProps> = ({
  image,
  fallbackAlt,
  showFurigana,
  revealCaption,
  variant = 'side',
  badgeLabel,
  onZoom,
}) => {
  const normalized = normalizeQuizImageField(image, fallbackAlt);
  const src = normalized?.path ?? '';
  const alt = normalized?.alt ?? fallbackAlt ?? 'Exam figure';
  const category = normalized?.category ?? 'reference';
  const categoryInfo = CATEGORY_META[category];

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Conditionally render nothing when the MCQ has no image path
  if (!src) {
    return null;
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-3 py-6 text-center text-xs text-slate-500">
        <ImageOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span>Figure unavailable</span>
      </div>
    );
  }

  const maxImgHeightClass =
    variant === 'prominent'
      ? 'max-h-[230px] sm:max-h-[215px]'
      : variant === 'compact'
        ? 'max-h-[145px]'
        : 'max-h-[200px] sm:max-h-[190px]';

  const headerLabel = badgeLabel || categoryInfo.label;
  const safeZoomAlt = revealCaption ? alt : headerLabel;

  return (
    <figure className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-slate-50 via-white to-indigo-50/35 p-2.5 shadow-xs ring-1 ring-indigo-500/5">
      {/* Visually distinct figure header bar */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-tight ${categoryInfo.accentClass}`}
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{headerLabel}</span>
        </span>
        {onZoom && (
          <button
            type="button"
            onClick={() => onZoom(src, safeZoomAlt)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/90 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
            aria-label="Zoom question figure"
          >
            <Maximize2 className="h-2.5 w-2.5" aria-hidden="true" />
            <span>Zoom</span>
          </button>
        )}
      </div>

      {/* Crisp isolated white diagram viewport for maximum contrast */}
      <button
        type="button"
        onClick={() => onZoom?.(src, safeZoomAlt)}
        className="group relative flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs transition-colors hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Enlarge ${headerLabel}`}
      >
        <img
          src={src}
          alt={safeZoomAlt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`${maxImgHeightClass} w-auto max-w-full rounded-md object-contain transition-transform duration-150 group-hover:scale-[1.02]`}
        />
      </button>

      {/* Spoiler-free exam hint OR revealed Furigana textbook caption */}
      <figcaption className="mt-2 px-1 text-center text-[11px] leading-snug text-slate-500">
        {revealCaption && alt ? (
          <span className="font-medium text-slate-700">
            <FuriganaText text={alt} showFurigana={showFurigana} />
          </span>
        ) : (
          <span>Tap image to inspect details</span>
        )}
      </figcaption>
    </figure>
  );
};
