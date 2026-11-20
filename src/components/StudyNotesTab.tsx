import React, {useEffect, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  FileText,
  ImageOff,
  Languages,
  Search,
  X,
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

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

const ResilientNoteImage: React.FC<ResilientImageProps> = ({src, alt}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <figure className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        </div>
        <figcaption className="mt-2.5 text-xs text-slate-600">
          {alt || 'Extracted PDF diagram'} {src ? `(${src})` : ''}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-50 p-3">
        <img
          src={src}
          alt={alt || 'Extracted PDF diagram'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="mx-auto max-h-[380px] w-auto max-w-full rounded-lg object-contain"
        />
      </div>
      {alt && (
        <figcaption className="border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          {alt}
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

  useEffect(() => {
    if (!focusPartNumber) return;
    const el = document.getElementById(`part-${focusPartNumber}`);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [focusPartNumber, parts]);

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Compact Study Notes Toolbar (Furigana toggle + Jump Pills) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-medium text-slate-600">
          <span className="font-semibold text-slate-900">
            日本語 (ふりがな) + සිංහල
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            showFurigana
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap"
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-950">
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
              className="rounded p-1 text-blue-700 hover:bg-blue-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {parts.map((part) => {
          const isCompleted = readPartNumbers.includes(part.part_number);
          return (
            <article
              key={part.part_number}
              id={`part-${part.part_number}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
            >
              <header className="flex flex-col gap-3.5 border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="font-mono-tabular font-semibold text-blue-600">
                    Part {part.part_number}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{part.source_pdf}</span>
                  </span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  <FuriganaText text={part.title} showFurigana={showFurigana} />
                </h2>

                <button
                  type="button"
                  disabled={isCompleted}
                  onClick={() => onMarkPartRead(part.part_number, part.title)}
                  className={`inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors sm:w-auto sm:self-start ${
                    isCompleted
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isCompleted ? 'Completed' : 'Mark Complete (+25 XP)'}
                  </span>
                </button>
              </header>

              <div className="font-jp mt-5 max-w-none space-y-4 text-[15px] leading-[2.1] text-slate-800 sm:text-base">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => (
                      <h1 className="mt-7 mb-3 text-xl font-bold leading-snug tracking-tight text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h1>
                    ),
                    h2: ({children}) => (
                      <h2 className="mt-7 mb-3 border-b border-slate-100 pb-2 text-lg font-bold leading-snug tracking-tight text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h2>
                    ),
                    h3: ({children}) => (
                      <h3 className="mt-6 mb-2 text-base font-bold leading-snug text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h3>
                    ),
                    h4: ({children}) => (
                      <h4 className="mt-5 mb-2 text-sm font-bold text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </h4>
                    ),
                    p: ({children}) => (
                      <p className="leading-[2.1] text-slate-800">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </p>
                    ),
                    ul: ({children}) => (
                      <ul className="my-3 list-disc space-y-2.5 pl-5 text-slate-800">
                        {children}
                      </ul>
                    ),
                    ol: ({children}) => (
                      <ol className="my-3 list-decimal space-y-2.5 pl-5 text-slate-800">
                        {children}
                      </ol>
                    ),
                    li: ({children}) => (
                      <li className="leading-[2.05]">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </li>
                    ),
                    strong: ({children}) => (
                      <strong className="font-bold text-slate-950">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </strong>
                    ),
                    blockquote: ({children}) => (
                      <blockquote className="my-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm leading-[1.9] text-slate-800">
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
                        <code className="font-mono-tabular rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-900">
                          {children}
                        </code>
                      );
                    },
                    pre: ({children}) => (
                      <pre className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                        {children}
                      </pre>
                    ),
                    table: ({children}) => (
                      <div className="my-5 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({children}) => (
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                        {children}
                      </thead>
                    ),
                    th: ({children}) => (
                      <th className="px-3 py-2.5 font-semibold leading-relaxed text-slate-900">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </th>
                    ),
                    td: ({children}) => (
                      <td className="border-t border-slate-100 px-3 py-2.5 leading-[2.0] text-slate-700">
                        {renderChildrenWithFurigana(children, showFurigana)}
                      </td>
                    ),
                    hr: () => <hr className="my-6 border-slate-200" />,
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
                      <ResilientNoteImage src={src} alt={alt} />
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
    </div>
  );
};
