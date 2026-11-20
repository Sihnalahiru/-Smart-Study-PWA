import React, {useEffect, useState} from 'react';
import {ImageOff, Maximize2} from 'lucide-react';
import {FuriganaText} from './FuriganaText';

interface QuestionFigureCardProps {
  src: string;
  alt: string;
  showFurigana: boolean;
  /**
   * When false (e.g. during an active timed CBT exam), displays a neutral
   * spoiler-free label so diagram answers are never leaked.
   * When true (review / after answering), displays the mapped PDF figure caption.
   */
  revealCaption: boolean;
  /**
   * 'side' renders compactly alongside text questions;
   * 'compact' renders smaller inside review cards;
   * 'prominent' centers larger diagrams for visual-judgment questions.
   */
  variant?: 'side' | 'compact' | 'prominent';
  badgeLabel?: string;
  onZoom?: (src: string, alt: string) => void;
}

export const QuestionFigureCard: React.FC<QuestionFigureCardProps> = ({
  src,
  alt,
  showFurigana,
  revealCaption,
  variant = 'side',
  badgeLabel,
  onZoom,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-5 text-center text-[11px] text-slate-500">
        <ImageOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span>Diagram unavailable</span>
      </div>
    );
  }

  const maxImgHeightClass =
    variant === 'prominent'
      ? 'max-h-[220px]'
      : variant === 'compact'
        ? 'max-h-[140px]'
        : 'max-h-[185px]';

  const safeZoomAlt = revealCaption ? alt : badgeLabel || 'Exam figure';

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/75 p-2.5 text-center shadow-2xs">
      <button
        type="button"
        onClick={() => onZoom?.(src, safeZoomAlt)}
        className="group relative mx-auto flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-white p-2 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="Enlarge textbook figure"
      >
        <img
          src={src}
          alt={safeZoomAlt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`${maxImgHeightClass} w-auto max-w-full rounded-md object-contain transition-transform duration-150 group-hover:scale-[1.02]`}
        />
        <span className="absolute right-1.5 bottom-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/90 bg-white/95 text-blue-600 shadow-2xs">
          <Maximize2 className="h-3 w-3" aria-hidden="true" />
        </span>
      </button>

      <figcaption className="mt-1.5 px-1 text-[11px] leading-snug text-slate-500">
        {revealCaption && alt ? (
          <span className="font-medium text-slate-700">
            <FuriganaText text={alt} showFurigana={showFurigana} />
          </span>
        ) : (
          <span>
            {badgeLabel || 'Mapped PDF Figure'} · Tap to enlarge
          </span>
        )}
      </figcaption>
    </figure>
  );
};
