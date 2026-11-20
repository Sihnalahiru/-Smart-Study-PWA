import React, {useEffect, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid,
  ImageOff,
  Images,
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
  gallery: string[];
  index: number;
}

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  showFurigana: boolean;
  onZoom?: (src: string, alt: string) => void;
}

function getPageLabelFromSrc(src: string): string {
  const match = src.match(/page-0*(\d+)\./i);
  return match ? `p.${match[1]}` : src.split('/').pop() || 'PDF Page';
}

const ResilientNoteImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  showFurigana,
  onZoom,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <figure className="my-5 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        </div>
        <figcaption className="mt-2.5 text-xs text-slate-600">
          {alt || 'Extracted PDF diagram'} {src ? `(${src})` : ''}
        </figcaption>
      </figure>
    );
  }

  const pageLabel = getPageLabelFromSrc(src);

  return (
    <figure className="group my-5 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
      <div className="relative bg-gradient-to-b from-slate-50/90 to-slate-100/40 p-2.5 sm:p-3">
        <button
          type="button"
          onClick={() => onZoom?.(src, alt || pageLabel)}
          className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Zoom ${alt || pageLabel}`}
        >
          <img
            src={src}
            alt={alt || `Original PDF ${pageLabel}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="mx-auto max-h-[440px] w-auto max-w-full rounded-lg border border-slate-200/70 bg-white object-contain shadow-2xs transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <span className="font-mono-tabular absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
            <Maximize2 className="h-3 w-3 text-blue-600" aria-hidden="true" />
            <span>{pageLabel}</span>
          </span>
        </button>
      </div>
      {alt && (
        <figcaption className="border-t border-slate-200/80 bg-white px-4 py-2.5 text-xs font-medium text-slate-600">
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
  const [expandedGalleries, setExpandedGalleries] = useState<
    Record<number, boolean>
  >({});
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
      } else if (e.key === 'ArrowRight' && lightbox.gallery.length > 1) {
        setLightbox((prev) => {
          if (!prev) return null;
          const nextIdx = (prev.index + 1) % prev.gallery.length;
          const nextSrc = prev.gallery[nextIdx];
          return {
            ...prev,
            index: nextIdx,
            src: nextSrc,
            alt: `Original PDF ${getPageLabelFromSrc(nextSrc)}`,
          };
        });
      } else if (e.key === 'ArrowLeft' && lightbox.gallery.length > 1) {
        setLightbox((prev) => {
          if (!prev) return null;
          const nextIdx =
            (prev.index - 1 + prev.gallery.length) % prev.gallery.length;
          const nextSrc = prev.gallery[nextIdx];
          return {
            ...prev,
            index: nextIdx,
            src: nextSrc,
            alt: `Original PDF ${getPageLabelFromSrc(nextSrc)}`,
          };
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  if (parts.length === 0) {
    return null;
  }

  const openLightbox = (src: string, alt: string, partImages: string[]) => {
    const gallery = partImages.length > 0 ? partImages : [src];
    const idx = Math.max(0, gallery.indexOf(src));
    setZoomScale(1);
    setLightbox({
      src,
      alt,
      gallery,
      index: idx,
    });
  };

  const stepLightbox = (delta: number) => {
    setLightbox((prev) => {
      if (!prev || prev.gallery.length <= 1) return prev;
      const nextIdx =
        (prev.index + delta + prev.gallery.length) % prev.gallery.length;
      const nextSrc = prev.gallery[nextIdx];
      return {
        ...prev,
        index: nextIdx,
        src: nextSrc,
        alt: `Original PDF ${getPageLabelFromSrc(nextSrc)}`,
      };
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Glassmorphic Study Notes Toolbar */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-3">
        <div className="text-xs font-medium text-slate-600">
          <span className="font-semibold tracking-tight text-slate-900">
            日本語 (ふりがな) + සිංහල + 原本PDF図解
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            showFurigana
              ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
              : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
          <span>ふりがな: {showFurigana ? 'ON' : 'OFF'}</span>
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
              <span className="max-w-[180px] truncate">{part.title}</span>
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
          const partImages = part.images ?? [];
          const isGalleryExpanded = Boolean(
            expandedGalleries[part.part_number],
          );

          return (
            <article
              key={part.part_number}
              id={`part-${part.part_number}`}
              className="surface-card rounded-2xl p-5 sm:p-7"
            >
              <header className="flex flex-col gap-3.5 border-b border-slate-200/80 pb-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="font-mono-tabular font-semibold text-blue-600">
                    Part {part.part_number}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <FileText
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{part.source_pdf}</span>
                  </span>
                  {partImages.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular inline-flex items-center gap-1 font-semibold text-slate-600">
                        <Images
                          className="h-3.5 w-3.5 text-blue-600"
                          aria-hidden="true"
                        />
                        <span>
                          {partImages.length} Original Pages (
                          {getPageLabelFromSrc(partImages[0])}–
                          {getPageLabelFromSrc(
                            partImages[partImages.length - 1],
                          )}
                          )
                        </span>
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  <FuriganaText text={part.title} showFurigana={showFurigana} />
                </h2>

                <button
                  type="button"
                  disabled={isCompleted}
                  onClick={() => onMarkPartRead(part.part_number, part.title)}
                  className={`inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:w-auto sm:self-start ${
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

              {/* Original PDF Full Visual Page Gallery for this Part */}
              {partImages.length > 0 && (
                <section
                  aria-label={`Original PDF pages for Part ${part.part_number}`}
                  className="mt-5 rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Images className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          <FuriganaText
                            text="{原本|げんぽん}PDF{全|ぜん}ページ{図解|ずかい} (Original Textbook Pages)"
                            showFurigana={showFurigana}
                          />
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Tap any page to zoom &amp; swipe · {partImages.length}{' '}
                          pages ({getPageLabelFromSrc(partImages[0])}–
                          {getPageLabelFromSrc(
                            partImages[partImages.length - 1],
                          )}
                          )
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGalleries((prev) => ({
                          ...prev,
                          [part.part_number]: !prev[part.part_number],
                        }))
                      }
                      className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      <Grid className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      <span>{isGalleryExpanded ? 'Compact Strip' : 'Show All Grid'}</span>
                    </button>
                  </div>

                  <div
                    className={
                      isGalleryExpanded
                        ? 'mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4'
                        : 'mt-3 flex items-stretch gap-2.5 overflow-x-auto pb-1.5'
                    }
                  >
                    {partImages.map((imgSrc, idx) => {
                      const pageLabel = getPageLabelFromSrc(imgSrc);
                      return (
                        <button
                          key={imgSrc}
                          type="button"
                          onClick={() =>
                            openLightbox(
                              imgSrc,
                              `Part ${part.part_number} · Original PDF ${pageLabel}`,
                              partImages,
                            )
                          }
                          className={`group relative overflow-hidden rounded-lg border border-slate-200/90 bg-white p-1 text-left shadow-2xs transition-all hover:border-blue-400 hover:shadow-xs ${
                            isGalleryExpanded
                              ? 'w-full'
                              : 'w-24 shrink-0 sm:w-28'
                          }`}
                          aria-label={`View original textbook ${pageLabel}`}
                        >
                          <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-slate-100">
                            <img
                              src={imgSrc}
                              alt={`Original textbook ${pageLabel}`}
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between px-1">
                            <span className="font-mono-tabular text-[10px] font-bold text-slate-700">
                              {pageLabel}
                            </span>
                            <span className="font-mono-tabular text-[10px] text-slate-400">
                              #{idx + 1}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

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
                    p: ({children}) => (
                      <p className="leading-[2.15] text-slate-800">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </p>
                    ),
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
                      <blockquote className="my-4 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50/75 to-indigo-50/40 px-4 py-3.5 text-sm leading-[1.95] text-slate-800 shadow-2xs">
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
                      <div className="my-5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                        <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({children}) => (
                      <thead className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 text-xs font-semibold text-slate-700">
                        {children}
                      </thead>
                    ),
                    th: ({children}) => (
                      <th className="px-3.5 py-2.5 font-semibold leading-relaxed text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </th>
                    ),
                    td: ({children}) => (
                      <td className="border-t border-slate-100 px-3.5 py-2.5 leading-[2.0] text-slate-700">
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
                      <ResilientNoteImage
                        src={src}
                        alt={alt}
                        showFurigana={showFurigana}
                        onZoom={(resolvedSrc, resolvedAlt) =>
                          openLightbox(resolvedSrc, resolvedAlt, partImages)
                        }
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

      {/* Interactive Fullscreen Original PDF Image Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Original PDF Page Viewer"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <div
            className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono-tabular text-xs font-bold text-blue-300">
                {getPageLabelFromSrc(lightbox.src)} · ({lightbox.index + 1}/
                {lightbox.gallery.length})
              </p>
              <p className="truncate text-xs text-slate-200">
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
            className="flex-1 overflow-auto p-3 sm:p-6"
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
                  width: `${zoomScale * 100}%`,
                  maxWidth: zoomScale === 1 ? '680px' : 'none',
                }}
                className="rounded-xl border border-white/15 bg-white shadow-2xl transition-all duration-150"
              />
            </div>
          </div>

          {lightbox.gallery.length > 1 && (
            <div
              className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950/85 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => stepLightbox(-1)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Prev Page</span>
              </button>

              <span className="font-mono-tabular text-xs font-semibold text-slate-300">
                {getPageLabelFromSrc(lightbox.src)}
              </span>

              <button
                type="button"
                onClick={() => stepLightbox(1)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20"
              >
                <span>Next Page</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
