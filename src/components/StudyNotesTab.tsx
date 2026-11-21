import React, {useEffect, useMemo, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
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
  extractSearchableText,
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

interface ParsedSubtopic {
  id: string;
  title: string;
  markdown: string;
  imageCount: number;
}

interface ParsedMainTopic {
  id: string;
  title: string;
  preambleMarkdown: string;
  subtopics: ParsedSubtopic[];
}

interface ParsedPartNotes {
  introMarkdown: string;
  mainTopics: ParsedMainTopic[];
}

function getPageLabelFromSrc(src: string): string {
  const match = src.match(/page-0*(\d+)\./i);
  if (match) return `p.${match[1]}`;
  if (src.includes('diagram-')) {
    return 'Diagram';
  }
  return src.split('/').pop() || 'PDF Visual';
}

function countMarkdownImages(md: string): number {
  return (md.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
}

function extractPageRangeBadge(title: string): string | null {
  const match = title.match(/\(([^)]*p\.\d+(?:[–-]\d+)?[^)]*)\)\s*$/i);
  if (!match) return null;
  const pageMatch = match[1].match(/p\.\d+(?:[–-]\d+)?/i);
  return pageMatch ? pageMatch[0] : null;
}

function parsePartMarkdownHierarchy(markdown: string, partNumber: number): ParsedPartNotes {
  const lines = markdown.split(/\r?\n/);
  const introLines: string[] = [];
  const mainTopicDrafts: {title: string; lines: string[]}[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      mainTopicDrafts.push({
        title: line.replace(/^##\s+/, '').trim(),
        lines: [],
      });
    } else if (mainTopicDrafts.length > 0) {
      mainTopicDrafts[mainTopicDrafts.length - 1].lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  const mainTopics: ParsedMainTopic[] = mainTopicDrafts.map((draft, topicIdx) => {
    const preambleLines: string[] = [];
    const subtopicDrafts: {title: string; lines: string[]}[] = [];

    for (const line of draft.lines) {
      if (/^###\s+/.test(line)) {
        subtopicDrafts.push({
          title: line.replace(/^###\s+/, '').trim(),
          lines: [],
        });
      } else if (/^---\s*$/.test(line) && subtopicDrafts.length === 0) {
        // Skip trailing horizontal rules between main topics
      } else if (subtopicDrafts.length > 0) {
        subtopicDrafts[subtopicDrafts.length - 1].lines.push(line);
      } else {
        preambleLines.push(line);
      }
    }

    const subtopics: ParsedSubtopic[] = subtopicDrafts.map((sub, subIdx) => {
      const cleaned = sub.lines.join('\n').replace(/\n+---\s*$/g, '').trim();
      return {
        id: `p${partNumber}-t${topicIdx}-s${subIdx}`,
        title: sub.title,
        markdown: cleaned,
        imageCount: countMarkdownImages(cleaned),
      };
    });

    return {
      id: `p${partNumber}-t${topicIdx}`,
      title: draft.title,
      preambleMarkdown: preambleLines.join('\n').replace(/\n+---\s*$/g, '').trim(),
      subtopics,
    };
  });

  return {
    introMarkdown: introLines.join('\n').replace(/\n+---\s*$/g, '').trim(),
    mainTopics,
  };
}

function splitReactNodesByBr(children: React.ReactNode): React.ReactNode[][] {
  const flat = React.Children.toArray(children);
  const lines: React.ReactNode[][] = [[]];

  for (const node of flat) {
    if (React.isValidElement(node) && node.type === 'br') {
      lines.push([]);
      continue;
    }
    if (typeof node === 'string' && node.includes('\n')) {
      const parts = node.split('\n');
      parts.forEach((part, idx) => {
        if (idx > 0) {
          lines.push([]);
        }
        if (part.trim().length > 0) {
          lines[lines.length - 1].push(part);
        }
      });
      continue;
    }
    lines[lines.length - 1].push(node);
  }

  return lines.filter((lineNodes) =>
    lineNodes.some((n) => (typeof n === 'string' ? n.trim().length > 0 : true)),
  );
}

function isItalicEmphasisLine(lineNodes: React.ReactNode[]): boolean {
  const nonEmpty = lineNodes.filter((n) =>
    typeof n === 'string' ? n.trim().length > 0 : true,
  );
  return (
    nonEmpty.length === 1 &&
    React.isValidElement(nonEmpty[0]) &&
    nonEmpty[0].type === 'em'
  );
}

function hasSinhalaLine(lineNodes: React.ReactNode[]): boolean {
  return lineNodes.some((n) => {
    if (typeof n === 'string') return /[\u0D80-\u0DFF]/.test(n);
    if (React.isValidElement<{children?: React.ReactNode}>(n) && n.props.children) {
      return hasSinhalaLine(React.Children.toArray(n.props.children));
    }
    return false;
  });
}

function renderTrilingualLines(
  children: React.ReactNode,
  showFurigana: boolean,
  variant: 'list' | 'paragraph' | 'cell',
): React.ReactNode {
  const lines = splitReactNodesByBr(children);
  if (lines.length <= 1) {
    return renderChildrenWithFurigana(children, showFurigana);
  }

  const gapClass =
    variant === 'cell' ? 'space-y-1' : 'space-y-1.5';

  return (
    <div className={gapClass}>
      {lines.map((lineNodes, idx) => {
        const isRomaji = isItalicEmphasisLine(lineNodes);
        const isSinhala = !isRomaji && hasSinhalaLine(lineNodes);

        if (isRomaji) {
          return (
            <div
              key={idx}
              className={
                variant === 'cell'
                  ? 'text-[11px] leading-snug italic text-blue-700/90'
                  : 'text-xs leading-relaxed italic font-medium text-blue-700/90 sm:text-[13px]'
              }
            >
              {renderChildrenWithFurigana(lineNodes, showFurigana)}
            </div>
          );
        }

        if (isSinhala) {
          return (
            <div
              key={idx}
              className={
                variant === 'cell'
                  ? 'text-xs leading-relaxed text-slate-700'
                  : 'text-[13.5px] leading-relaxed text-slate-700 sm:text-sm'
              }
            >
              {renderChildrenWithFurigana(lineNodes, showFurigana)}
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={
              variant === 'cell'
                ? 'text-xs font-medium leading-relaxed text-slate-900 sm:text-[13px]'
                : 'text-[14.5px] leading-[1.95] text-slate-900 sm:text-[15.5px]'
            }
          >
            {renderChildrenWithFurigana(lineNodes, showFurigana)}
          </div>
        );
      })}
    </div>
  );
}

interface ParsedTableData {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}

function extractTableStructure(children: React.ReactNode): ParsedTableData | null {
  const headers: React.ReactNode[] = [];
  const rows: React.ReactNode[][] = [];

  React.Children.forEach(children, (sectionEl) => {
    if (!React.isValidElement<{children?: React.ReactNode}>(sectionEl)) return;
    const isThead = sectionEl.type === 'thead';
    const isTbody = sectionEl.type === 'tbody';
    if (!isThead && !isTbody) return;

    React.Children.forEach(sectionEl.props.children, (rowEl) => {
      if (!React.isValidElement<{children?: React.ReactNode}>(rowEl)) return;
      const cells: React.ReactNode[] = [];
      React.Children.forEach(rowEl.props.children, (cellEl) => {
        if (!React.isValidElement<{children?: React.ReactNode}>(cellEl)) return;
        cells.push(cellEl.props.children ?? null);
      });
      if (isThead && headers.length === 0) {
        headers.push(...cells);
      } else if (isTbody && cells.length > 0) {
        rows.push(cells);
      }
    });
  });

  if (headers.length === 0 && rows.length === 0) {
    return null;
  }
  return {headers, rows};
}

const ResponsiveMarkdownTable: React.FC<{
  children: React.ReactNode;
  showFurigana: boolean;
}> = ({children, showFurigana}) => {
  const parsed = useMemo(() => extractTableStructure(children), [children]);

  if (!parsed) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    );
  }

  const {headers, rows} = parsed;

  return (
    <div className="my-4">
      {/* Mobile Stacked Card Table (< 640px) — Zero Cramping */}
      <div className="space-y-2.5 sm:hidden">
        {rows.map((row, rowIdx) => {
          const isNumberLead =
            row.length >= 3 &&
            typeof row[0] === 'string' &&
            /^\d+(?:[-–]\d+)?$/.test(row[0].trim());

          const cardTitleNodes = isNumberLead ? row[1] : row[0];
          const cardBadgeNodes = isNumberLead ? row[0] : null;
          const detailStartIdx = isNumberLead ? 2 : 1;

          return (
            <div
              key={rowIdx}
              className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0 flex-1 text-sm font-bold leading-snug text-slate-900">
                  {renderTrilingualLines(cardTitleNodes, showFurigana, 'cell')}
                </div>
                {cardBadgeNodes !== null && (
                  <span className="font-mono-tabular shrink-0 rounded-lg border border-blue-200/80 bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    #{cardBadgeNodes}
                  </span>
                )}
              </div>

              <div className="mt-2.5 space-y-2">
                {row.slice(detailStartIdx).map((cellContent, offsetIdx) => {
                  const colIdx = detailStartIdx + offsetIdx;
                  const headerLabel = headers[colIdx];
                  return (
                    <div key={colIdx} className="space-y-0.5">
                      {headerLabel && (
                        <p className="text-[11px] font-semibold text-slate-500">
                          {renderChildrenWithFurigana(headerLabel, showFurigana)}
                        </p>
                      )}
                      <div className="text-xs leading-relaxed text-slate-800">
                        {renderTrilingualLines(cellContent, showFurigana, 'cell')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet & Desktop Full Table (>= 640px) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs sm:block">
        <table className="w-full table-auto border-collapse text-left text-sm">
          {headers.length > 0 && (
            <thead className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/70 text-xs font-semibold text-slate-700">
              <tr>
                {headers.map((headerCell, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3.5 py-2.5 font-semibold leading-snug text-slate-900"
                  >
                    {renderChildrenWithFurigana(headerCell, showFurigana)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="transition-colors hover:bg-slate-50/70"
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`border-t border-slate-100 px-3.5 py-2.5 align-top leading-relaxed text-slate-800 ${
                      cIdx === 0 ? 'font-mono-tabular whitespace-nowrap font-semibold text-slate-900' : ''
                    }`}
                  >
                    {renderTrilingualLines(cell, showFurigana, 'cell')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ResilientNoteImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  showFurigana,
  onZoom,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <figure className="my-3 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500">
          <ImageOff className="h-4 w-4" aria-hidden="true" />
        </div>
        <figcaption className="mt-2 text-xs text-slate-600">
          {alt || 'Extracted PDF diagram'} {src ? `(${src})` : ''}
        </figcaption>
      </figure>
    );
  }

  const pageLabel = getPageLabelFromSrc(src);

  return (
    <figure className="group my-3 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="relative bg-gradient-to-b from-slate-50/90 to-slate-100/40 p-2 sm:p-2.5">
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
            className="mx-auto max-h-[380px] w-auto max-w-full rounded-lg border border-slate-200/70 bg-white object-contain shadow-2xs transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <span className="font-mono-tabular absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
            <Maximize2 className="h-3 w-3 text-blue-600" aria-hidden="true" />
            <span>{pageLabel}</span>
          </span>
        </button>
      </div>
      {alt && (
        <figcaption className="border-t border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-600">
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
  const [selectedTopicByPart, setSelectedTopicByPart] = useState<
    Record<number, string>
  >({});
  const [openSubtopics, setOpenSubtopics] = useState<Record<string, boolean>>({});
  const [showAllScansDrawer, setShowAllScansDrawer] = useState<
    Record<number, boolean>
  >({});
  const [expandedGalleries, setExpandedGalleries] = useState<
    Record<number, boolean>
  >({});
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [zoomScale, setZoomScale] = useState<1 | 1.5 | 2>(1);

  const parsedParts = useMemo(
    () =>
      parts.map((part) => ({
        part,
        hierarchy: parsePartMarkdownHierarchy(part.notes_markdown, part.part_number),
      })),
    [parts],
  );

  // Automatically expand matching subtopics when a global search highlight is active
  useEffect(() => {
    if (!highlightQuery) return;
    const normalizedQ = highlightQuery.trim().toLowerCase();
    if (!normalizedQ) return;

    const nextOpen: Record<string, boolean> = {};
    for (const {part, hierarchy} of parsedParts) {
      for (const topic of hierarchy.mainTopics) {
        for (const sub of topic.subtopics) {
          const hay = extractSearchableText(
            `${sub.title}\n${sub.markdown}`,
          ).toLowerCase();
          if (hay.includes(normalizedQ)) {
            nextOpen[sub.id] = true;
          }
        }
      }
      if (focusPartNumber === part.part_number) {
        setSelectedTopicByPart((prev) => ({...prev, [part.part_number]: 'all'}));
      }
    }
    setOpenSubtopics((prev) => ({...prev, ...nextOpen}));
  }, [highlightQuery, focusPartNumber, parsedParts]);

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

  const toggleSubtopic = (subId: string, currentlyOpen: boolean) => {
    setOpenSubtopics((prev) => ({
      ...prev,
      [subId]: !currentlyOpen,
    }));
  };

  const setAllSubtopicsForTopics = (
    topics: ParsedMainTopic[],
    expanded: boolean,
  ) => {
    const patch: Record<string, boolean> = {};
    for (const topic of topics) {
      for (const sub of topic.subtopics) {
        patch[sub.id] = expanded;
      }
    }
    setOpenSubtopics((prev) => ({...prev, ...patch}));
  };

  const renderMarkdownBlock = (
    markdownContent: string,
    partImages: string[],
  ) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({children}) => (
          <h1 className="mt-5 mb-2.5 text-lg font-bold leading-snug tracking-tight text-slate-900">
            {renderChildrenWithFurigana(children, showFurigana)}
          </h1>
        ),
        h2: ({children}) => (
          <h2 className="mt-5 mb-2.5 text-base font-bold leading-snug tracking-tight text-slate-900">
            {renderChildrenWithFurigana(children, showFurigana)}
          </h2>
        ),
        h3: ({children}) => (
          <h3 className="mt-4 mb-2 text-sm font-bold leading-snug tracking-tight text-slate-900">
            {renderChildrenWithFurigana(children, showFurigana)}
          </h3>
        ),
        h4: ({children}) => (
          <h4 className="mt-4 mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-600">
            {renderChildrenWithFurigana(children, showFurigana)}
          </h4>
        ),
        p: ({children}) => {
          const childArr = React.Children.toArray(children);
          const isOnlyImage =
            childArr.length === 1 &&
            React.isValidElement(childArr[0]) &&
            childArr[0].type === 'img';
          if (isOnlyImage) {
            return <div className="my-2">{children}</div>;
          }
          return (
            <div className="my-2.5 rounded-xl border border-slate-200/70 bg-slate-50/50 px-3.5 py-3 sm:px-4">
              {renderTrilingualLines(children, showFurigana, 'paragraph')}
            </div>
          );
        },
        ul: ({children}) => (
          <ul className="my-3 list-none space-y-2.5 pl-0 text-slate-800">
            {children}
          </ul>
        ),
        ol: ({children}) => (
          <ol className="my-3 list-decimal space-y-2.5 pl-5 text-slate-800">
            {children}
          </ol>
        ),
        li: ({children}) => (
          <li className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3 shadow-2xs sm:px-4">
            {renderTrilingualLines(children, showFurigana, 'list')}
          </li>
        ),
        strong: ({children}) => (
          <strong className="font-bold text-slate-950">
            {renderChildrenWithFurigana(children, showFurigana)}
          </strong>
        ),
        blockquote: ({children}) => (
          <blockquote className="my-3 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-50/75 to-indigo-50/40 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-2xs">
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
          <pre className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-100 shadow-sm">
            {children}
          </pre>
        ),
        table: ({children}) => (
          <ResponsiveMarkdownTable showFurigana={showFurigana}>
            {children}
          </ResponsiveMarkdownTable>
        ),
        hr: () => <hr className="my-4 border-slate-200/80" />,
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
      {markdownContent}
    </ReactMarkdown>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Study Notes Toolbar */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-2.5">
        <span className="text-xs font-semibold tracking-tight text-slate-800">
          {parts.length === 1
            ? `Part ${parts[0].part_number} · Structured Topics`
            : `All ${parts.length} Parts · Complete Textbook`}
        </span>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
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
              className="surface-card-interactive inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 whitespace-nowrap"
            >
              <span className="font-mono-tabular text-blue-600">
                P{part.part_number}
              </span>
              <span className="max-w-[160px] truncate">{part.title}</span>
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
        {parsedParts.map(({part, hierarchy}) => {
          const isCompleted = readPartNumbers.includes(part.part_number);
          const partImages = part.images ?? [];
          const selectedTopicId = selectedTopicByPart[part.part_number] ?? 'all';
          const visibleTopics =
            selectedTopicId === 'all'
              ? hierarchy.mainTopics
              : hierarchy.mainTopics.filter((t) => t.id === selectedTopicId);

          const totalSubtopics = visibleTopics.reduce(
            (sum, t) => sum + t.subtopics.length,
            0,
          );
          const openCount = visibleTopics.reduce(
            (sum, t) =>
              sum +
              t.subtopics.filter((s, sIdx) =>
                openSubtopics[s.id] !== undefined
                  ? openSubtopics[s.id]
                  : sIdx === 0 && (selectedTopicId !== 'all' || t.id === hierarchy.mainTopics[0]?.id),
              ).length,
            0,
          );
          const allVisibleExpanded =
            totalSubtopics > 0 && openCount === totalSubtopics;
          const isAllScansOpen = Boolean(showAllScansDrawer[part.part_number]);
          const isGalleryExpanded = Boolean(
            expandedGalleries[part.part_number],
          );

          return (
            <article
              key={part.part_number}
              id={`part-${part.part_number}`}
              className="surface-card rounded-2xl p-4 sm:p-6"
            >
              <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-4">
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
                  {partImages.length > 0 && (() => {
                    const pageScans = partImages.filter((src) =>
                      /page-0*\d+/i.test(src),
                    );
                    const diagramsCount = partImages.length - pageScans.length;
                    const rangeText =
                      pageScans.length > 0
                        ? `${getPageLabelFromSrc(pageScans[0])}–${getPageLabelFromSrc(pageScans[pageScans.length - 1])}`
                        : `${partImages.length} visuals`;
                    return (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular inline-flex items-center gap-1 font-semibold text-slate-600">
                          <Images
                            className="h-3.5 w-3.5 text-blue-600"
                            aria-hidden="true"
                          />
                          <span>
                            {pageScans.length} PDF Pages ({rangeText})
                            {diagramsCount > 0 ? ` + ${diagramsCount} Diagrams` : ''}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                </div>

                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                  <FuriganaText text={part.title} showFurigana={showFurigana} />
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isCompleted}
                    onClick={() => onMarkPartRead(part.part_number, part.title)}
                    className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
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

                  {totalSubtopics > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAllSubtopicsForTopics(
                          visibleTopics,
                          !allVisibleExpanded,
                        )
                      }
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {allVisibleExpanded ? (
                        <ChevronsDownUp className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      )}
                      <span>
                        {allVisibleExpanded ? 'Collapse Subtopics' : 'Expand All Subtopics'}
                      </span>
                    </button>
                  )}

                  {partImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAllScansDrawer((prev) => ({
                          ...prev,
                          [part.part_number]: !prev[part.part_number],
                        }))
                      }
                      className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                        isAllScansOpen
                          ? 'border-blue-300 bg-blue-50/70 text-blue-700'
                          : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Images className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {isAllScansOpen ? 'Hide Full Scans' : `Browse All ${partImages.length} Visuals`}
                      </span>
                    </button>
                  )}
                </div>
              </header>

              {/* Optional On-Demand Full Visual Gallery (Collapsed by Default to Prevent Bloat) */}
              {isAllScansOpen && partImages.length > 0 && (
                <section
                  aria-label={`Original PDF pages for Part ${part.part_number}`}
                  className="mt-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        <FuriganaText
                          text="{原本|げんぽん}PDF{全|ぜん}ページ{一覧|いちらん} (Original Scans & Diagrams)"
                          showFurigana={showFurigana}
                        />
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tap any scan to zoom &amp; swipe across pages
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGalleries((prev) => ({
                          ...prev,
                          [part.part_number]: !prev[part.part_number],
                        }))
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      <Grid className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      <span>{isGalleryExpanded ? 'Compact Strip' : 'Grid View'}</span>
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

              {/* Interactive Main Topic Selector Bar */}
              {hierarchy.mainTopics.length > 1 && (
                <nav
                  aria-label={`Main topics for Part ${part.part_number}`}
                  className="mt-4 flex items-center gap-1.5 overflow-x-auto rounded-xl bg-slate-100/90 p-1.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTopicByPart((prev) => ({
                        ...prev,
                        [part.part_number]: 'all',
                      }))
                    }
                    className={`min-h-[38px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedTopicId === 'all'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Topics ({hierarchy.mainTopics.length})
                  </button>
                  {hierarchy.mainTopics.map((topic, tIdx) => {
                    const active = selectedTopicId === topic.id;
                    const compactLabel = topic.title.replace(/\s*\([^)]*\)\s*$/, '');
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setSelectedTopicByPart((prev) => ({
                            ...prev,
                            [part.part_number]: topic.id,
                          }));
                          if (topic.subtopics[0]) {
                            setOpenSubtopics((prev) => ({
                              ...prev,
                              [topic.subtopics[0].id]: true,
                            }));
                          }
                        }}
                        className={`min-h-[38px] max-w-[210px] shrink-0 truncate rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={compactLabel}
                      >
                        <span className="font-mono-tabular mr-1 text-[11px] opacity-70">
                          {tIdx + 1}.
                        </span>
                        <FuriganaText
                          text={compactLabel}
                          showFurigana={false}
                        />
                      </button>
                    );
                  })}
                </nav>
              )}

              {/* Intro Markdown (if any) */}
              {hierarchy.introMarkdown && (
                <div className="font-jp mt-4">
                  {renderMarkdownBlock(hierarchy.introMarkdown, partImages)}
                </div>
              )}

              {/* Structured Main Topics -> Subtopic Accordions */}
              <div className="font-jp mt-5 space-y-6">
                {visibleTopics.map((topic, tIdx) => {
                  const pageBadge = extractPageRangeBadge(topic.title);

                  return (
                    <section
                      key={topic.id}
                      className="space-y-3"
                      aria-label={topic.title}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200/80 pb-2">
                        <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
                          <FuriganaText
                            text={topic.title}
                            showFurigana={showFurigana}
                          />
                        </h3>
                        <span className="font-mono-tabular text-[11px] font-medium text-slate-500">
                          {topic.subtopics.length > 0
                            ? `${topic.subtopics.length} subtopics`
                            : 'Summary'}
                          {pageBadge ? ` · ${pageBadge}` : ''}
                        </span>
                      </div>

                      {topic.preambleMarkdown && (
                        <div>
                          {renderMarkdownBlock(topic.preambleMarkdown, partImages)}
                        </div>
                      )}

                      {topic.subtopics.length > 0 && (
                        <div className="space-y-2.5">
                          {topic.subtopics.map((sub, sIdx) => {
                            const isDefaultOpen =
                              sIdx === 0 &&
                              (selectedTopicId !== 'all' || tIdx === 0);
                            const isOpen =
                              openSubtopics[sub.id] !== undefined
                                ? openSubtopics[sub.id]
                                : isDefaultOpen;
                            const subPageBadge = extractPageRangeBadge(sub.title);

                            return (
                              <div
                                key={sub.id}
                                className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs transition-colors"
                              >
                                <button
                                  type="button"
                                  aria-expanded={isOpen}
                                  onClick={() => toggleSubtopic(sub.id, isOpen)}
                                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold leading-snug text-slate-900 sm:text-[15px]">
                                      <FuriganaText
                                        text={sub.title}
                                        showFurigana={showFurigana}
                                      />
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                                      {subPageBadge && (
                                        <span className="font-mono-tabular text-blue-600">
                                          {subPageBadge}
                                        </span>
                                      )}
                                      {sub.imageCount > 0 && (
                                        <>
                                          {subPageBadge && <span aria-hidden="true">·</span>}
                                          <span className="font-mono-tabular">
                                            {sub.imageCount} visual{sub.imageCount > 1 ? 's' : ''}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 ${
                                      isOpen
                                        ? 'rotate-180 border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                    }`}
                                  >
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                </button>

                                {isOpen && (
                                  <div className="border-t border-slate-100 bg-white px-3.5 py-3.5 sm:px-5 sm:py-4">
                                    {renderMarkdownBlock(sub.markdown, partImages)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
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
