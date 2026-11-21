import React, {createContext, useContext, useEffect, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  ImageOff,
  Languages,
  Maximize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  FuriganaText,
  renderChildrenWithFurigana,
} from './FuriganaText';
import type {StudyPart} from '../types/study';

interface StudyNotesTabProps {
  parts: StudyPart[];
  isCombinedView: boolean;
  readPartNumbers: number[];
  onMarkPartRead: (partNumber: number, title: string) => void;
  focusPartNumber?: number | null;
  highlightQuery?: string;
  onClearSearchHighlight?: () => void;
}

interface LightboxState {
  src: string;
  alt: string;
}

const InsideTableContext = createContext(false);

interface InlineFigureProps {
  src?: string;
  alt?: string;
  showFurigana: boolean;
  onZoom?: (src: string, alt: string) => void;
}

const InlineTextbookFigure: React.FC<InlineFigureProps> = ({
  src,
  alt,
  showFurigana,
  onZoom,
}) => {
  const insideTable = useContext(InsideTableContext);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{alt || 'Textbook illustration'}</span>
      </span>
    );
  }

  // Inside Markdown tables (Care Marks, GHS Pictograms, Equipment/Taping/Stacking visual rows)
  if (insideTable) {
    return (
      <button
        type="button"
        onClick={() => onZoom?.(src, alt || 'Textbook Figure')}
        className="group relative mx-auto flex items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Enlarge ${alt || 'illustration'}`}
      >
        <img
          src={src}
          alt={alt || 'Textbook illustration'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="max-h-[118px] min-h-[56px] w-auto max-w-[150px] rounded-md object-contain transition-transform duration-150 group-hover:scale-[1.03] sm:max-h-[136px] sm:max-w-[180px]"
        />
      </button>
    );
  }

  // Standalone inline textbook figure card
  return (
    <figure className="group my-4 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="relative bg-slate-50/70 p-3">
        <button
          type="button"
          onClick={() => onZoom?.(src, alt || 'Textbook Figure')}
          className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Zoom ${alt || 'illustration'}`}
        >
          <img
            src={src}
            alt={alt || 'Textbook illustration'}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="mx-auto max-h-[260px] w-auto max-w-full rounded-lg bg-white object-contain p-1 transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <span className="absolute right-2 bottom-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/90 bg-white/90 text-slate-600 shadow-2xs backdrop-blur-xs">
            <Maximize2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
          </span>
        </button>
      </div>
      {alt && (
        <figcaption className="border-t border-slate-200/70 bg-white px-4 py-2 text-xs font-medium text-slate-600">
          <FuriganaText text={alt} showFurigana={showFurigana} />
        </figcaption>
      )}
    </figure>
  );
};

export const StudyNotesTab: React.FC<StudyNotesTabProps> = ({
  parts,
  isCombinedView,
  readPartNumbers,
  onMarkPartRead,
  focusPartNumber,
  highlightQuery,
  onClearSearchHighlight,
}) => {
  const [showFurigana, setShowFurigana] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [zoomScale, setZoomScale] = useState<1 | 1.5 | 2>(1);

  useEffect(() => {
    if (!focusPartNumber) return;
    const el = document.getElementById(`part-${focusPartNumber}`);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [focusPartNumber, parts]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  if (parts.length === 0) {
    return null;
  }

  const openLightbox = (src: string, alt: string) => {
    setZoomScale(1);
    setLightbox({src, alt});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Clean Minimal Textbook Toolbar (No Language Tag Clutter) */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-3">
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">
            Illustrated Study Notes
          </p>
          <p className="text-[11px] text-slate-500">
            Textbook notes with inline diagrams, equipment &amp; safety signs · Tap any figure to zoom
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            showFurigana
              ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
              : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Furigana: {showFurigana ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {isCombinedView && parts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {parts.map((part) => (
            <a
              key={part.part_number}
              href={`#part-${part.part_number}`}
              className="surface-card-interactive inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 whitespace-nowrap"
            >
              <span className="font-mono-tabular text-blue-600">
                P{part.part_number}
              </span>
              <span className="max-w-[190px] truncate">
                {part.english_title ?? part.title}
              </span>
            </a>
          ))}
        </div>
      )}

      {highlightQuery && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 px-4 py-2.5 text-xs font-medium text-blue-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>
              Search match:{' '}
              <strong className="font-semibold">
                &ldquo;{highlightQuery}&rdquo;
              </strong>
            </span>
          </div>
          {onClearSearchHighlight && (
            <button
              type="button"
              onClick={onClearSearchHighlight}
              aria-label="Dismiss search banner"
              className="rounded-lg p-1 text-blue-700 transition-colors hover:bg-blue-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {parts.map((part) => {
          const isCompleted = readPartNumbers.includes(part.part_number);
          const displayTitle = part.english_title ?? part.title;

          return (
            <article
              key={part.part_number}
              id={`part-${part.part_number}`}
              className="surface-card rounded-2xl p-5 sm:p-7"
            >
              <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono-tabular text-xs font-semibold text-blue-600">
                    Part {part.part_number}
                  </p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {displayTitle}
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={isCompleted}
                  onClick={() => onMarkPartRead(part.part_number, displayTitle)}
                  className={`inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    isCompleted
                      ? 'border border-emerald-200 bg-gradient-to-b from-emerald-50 to-teal-50/70 text-emerald-700'
                      : 'bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-xs hover:brightness-110'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isCompleted ? 'Completed' : 'Mark Complete (+25 XP)'}
                  </span>
                </button>
              </header>

              <div className="font-jp mt-6 max-w-none space-y-4 text-[15px] leading-[2.15] text-slate-800 sm:text-base">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => (
                      <h1 className="mt-7 mb-3 text-xl font-bold leading-snug tracking-tight text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h1>
                    ),
                    h2: ({children}) => (
                      <h2 className="mt-7 mb-3 border-b border-slate-200/70 pb-2 text-lg font-bold leading-snug tracking-tight text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h2>
                    ),
                    h3: ({children}) => (
                      <h3 className="mt-6 mb-2 text-base font-bold leading-snug tracking-tight text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h3>
                    ),
                    h4: ({children}) => (
                      <h4 className="mt-5 mb-2 text-sm font-bold text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h4>
                    ),
                    p: ({node, children}) => {
                      const hasStandaloneImage = Boolean(
                        node?.children?.some(
                          (child) =>
                            child.type === 'element' && child.tagName === 'img',
                        ),
                      );
                      if (hasStandaloneImage) {
                        return (
                          <div className="my-2">
                            {renderChildrenWithFurigana(children, showFurigana)}
                          </div>
                        );
                      }
                      return (
                        <p className="leading-[2.15] text-slate-800">
                          {renderChildrenWithFurigana(children, showFurigana)}
                        </p>
                      );
                    },
                    ul: ({children}) => (
                      <ul className="my-3.5 list-disc space-y-2.5 pl-5 text-slate-800">
                        {children}
                      </ul>
                    ),
                    ol: ({children}) => (
                      <ol className="my-3.5 list-decimal space-y-2.5 pl-5 text-slate-800">
                        {children}
                      </ol>
                    ),
                    li: ({children}) => (
                      <li className="leading-[2.1]">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </li>
                    ),
                    strong: ({children}) => (
                      <strong className="font-bold text-slate-950">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </strong>
                    ),
                    blockquote: ({children}) => (
                      <blockquote className="my-2.5 rounded-xl border border-slate-200/80 bg-slate-50/85 px-4 py-2.5 text-[13.5px] leading-[1.9] text-slate-700 sm:text-sm">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </blockquote>
                    ),
                    code: ({className, children}) => {
                      const isBlock = Boolean(className);
                      if (isBlock) {
                        return (
                          <code className="font-mono-tabular text-xs text-slate-100 sm:text-sm">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="font-mono-tabular rounded-md border border-slate-200/90 bg-slate-100/80 px-1.5 py-0.5 text-[0.85em] text-slate-900">
                          {children}
                        </code>
                      );
                    },
                    pre: ({children}) => (
                      <pre className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 shadow-sm">
                        {children}
                      </pre>
                    ),
                    table: ({children}) => (
                      <InsideTableContext.Provider value={true}>
                        <div className="my-5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                          <table className="w-full min-w-[440px] border-collapse text-left text-xs sm:text-sm">
                            {children}
                          </table>
                        </div>
                      </InsideTableContext.Provider>
                    ),
                    thead: ({children}) => (
                      <thead className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 text-xs font-semibold text-slate-700">
                        {children}
                      </thead>
                    ),
                    th: ({children}) => (
                      <th className="px-3 py-2.5 font-semibold leading-relaxed text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </th>
                    ),
                    td: ({children}) => (
                      <td className="border-t border-slate-100 px-3 py-2.5 align-middle leading-[1.95] text-slate-700">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </td>
                    ),
                    hr: () => <hr className="my-6 border-slate-200/80" />,
                    a: ({href, children}) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
                      >
                        {children}
                      </a>
                    ),
                    img: ({src, alt}) => (
                      <InlineTextbookFigure
                        src={src}
                        alt={alt}
                        showFurigana={showFurigana}
                        onZoom={openLightbox}
                      />
                    ),
                  }}
                >
                  {part.notes_markdown}
                </ReactMarkdown>
              </div>
            </article>
          );
        })}
      </div>

      {/* Inline Textbook Figure Zoom Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Textbook Figure Viewer"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <div
            className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-100">
                <FuriganaText text={lightbox.alt} showFurigana={showFurigana} />
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setZoomScale((prev) =>
                    prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1,
                  )
                }
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/20"
                aria-label="Toggle zoom scale"
              >
                {zoomScale > 1 ? (
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="font-mono-tabular">{zoomScale}x</span>
              </button>

              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20"
                aria-label="Close viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto p-4 sm:p-6"
            onClick={() => setLightbox(null)}
          >
            <div
              className="mx-auto flex min-h-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.src}
                alt={lightbox.alt}
                style={{
                  width: zoomScale === 1 ? 'auto' : `${zoomScale * 70}%`,
                  maxWidth: zoomScale === 1 ? '620px' : 'none',
                }}
                className="max-h-[82vh] rounded-xl border border-white/15 bg-white p-3 shadow-2xl transition-all duration-150 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
