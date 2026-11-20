import React, {useMemo, useState} from 'react';
import {
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layers,
  Map as MapIcon,
  Play,
} from 'lucide-react';
import type {ActiveTab, StudyPart, StudyProgressState} from '../types/study';
import {
  computeSyllabusNodes,
  type ComputedRoadmapNode,
} from '../utils/syllabusProgress';

interface StudyRoadmapProps {
  allParts: StudyPart[];
  progress: StudyProgressState;
  onSelectPartAndTab: (partNumber: number, tab: ActiveTab) => void;
}

export const StudyRoadmap: React.FC<StudyRoadmapProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
}) => {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const nodes = useMemo<ComputedRoadmapNode[]>(
    () => computeSyllabusNodes(allParts, progress),
    [allParts, progress],
  );

  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const inProgressCount = nodes.filter((n) => n.status === 'in_progress').length;
  const overallPercent =
    nodes.length > 0
      ? Math.round(
          nodes.reduce((sum, n) => sum + n.percent, 0) / nodes.length,
        )
      : 0;

  const firstActiveNode =
    nodes.find((n) => n.status === 'in_progress') ??
    nodes.find((n) => n.status === 'not_started' && n.partAvailable) ??
    nodes[0];

  return (
    <section
      aria-labelledby="study-roadmap-heading"
      className="surface-card rounded-2xl p-5 sm:p-6"
    >
      {/* Roadmap Header & Overall Mastery Meter */}
      <div className="border-b border-slate-200/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
              <MapIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="study-roadmap-heading"
                className="text-base font-bold tracking-tight text-slate-900"
              >
                Study Roadmap
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Core Warehouse Exam Syllabus · Modules A–{nodes[nodes.length - 1]?.code ?? 'F'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono-tabular text-lg font-bold tracking-tight text-slate-900">
              {overallPercent}%
            </span>
            <p className="font-mono-tabular text-[11px] font-medium text-slate-500">
              {completedCount}/{nodes.length} mastered
            </p>
          </div>
        </div>

        {/* Segmented Overview Strip */}
        <div className="mt-4 space-y-2">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${Math.max(nodes.length, 1)}, minmax(0, 1fr))`,
            }}
            aria-label={`Overall syllabus completion ${overallPercent}%`}
          >
            {nodes.map((node) => {
              const barColor =
                node.status === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : node.status === 'in_progress'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    : 'bg-slate-200/80';
              return (
                <div
                  key={node.code}
                  title={`Module ${node.code}: ${node.title} (${node.percent}%)`}
                  className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{
                      width: `${node.status === 'not_started' || node.status === 'unavailable' ? 0 : node.percent}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
            <span>
              {completedCount} completed · {inProgressCount} in progress ·{' '}
              {nodes.length - completedCount - inProgressCount} remaining
            </span>
            {firstActiveNode && firstActiveNode.partAvailable && (
              <button
                type="button"
                onClick={() =>
                  onSelectPartAndTab(firstActiveNode.partNumber, 'notes')
                }
                className="inline-flex items-center gap-1 font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                <span>Resume Module {firstActiveNode.code}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Syllabus Timeline */}
      <ol className="relative mt-5 space-y-0">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const isExpanded = expandedCode === node.code;

          const nodeCircleClass =
            node.status === 'completed'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs'
              : node.status === 'in_progress'
                ? 'border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs ring-4 ring-blue-500/15'
                : 'border-slate-300 bg-white text-slate-600';

          const statusLabel =
            node.status === 'completed'
              ? 'Completed'
              : node.status === 'in_progress'
                ? 'In Progress'
                : node.status === 'unavailable'
                  ? 'Upload PDF'
                  : 'Not Started';

          const statusTextClass =
            node.status === 'completed'
              ? 'text-emerald-700'
              : node.status === 'in_progress'
                ? 'text-blue-600'
                : 'text-slate-500';

          return (
            <li key={node.code} className="relative flex gap-3.5 pb-5 last:pb-0">
              {/* Vertical Connector Line */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute top-9 bottom-0 left-[17px] w-[2px] -translate-x-1/2 ${
                    node.status === 'completed'
                      ? 'bg-gradient-to-b from-emerald-400 to-emerald-200'
                      : node.status === 'in_progress'
                        ? 'bg-gradient-to-b from-blue-400 to-slate-200'
                        : 'bg-slate-200/80'
                  }`}
                />
              )}

              {/* Step Node Marker */}
              <div className="relative z-10 shrink-0 pt-0.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-all ${nodeCircleClass}`}
                >
                  {node.status === 'completed' ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span className="font-mono-tabular">{node.code}</span>
                  )}
                </div>
              </div>

              {/* Module Content */}
              <div
                className={`min-w-0 flex-1 rounded-xl border transition-all ${
                  isExpanded
                    ? 'border-blue-200/90 bg-gradient-to-b from-blue-50/40 to-white shadow-2xs'
                    : 'border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 hover:border-slate-300/90'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedCode((prev) =>
                      prev === node.code ? null : node.code,
                    )
                  }
                  className="flex min-h-[44px] w-full items-start justify-between gap-2.5 p-3.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <span className={`font-semibold ${statusTextClass}`}>
                        {statusLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Weight {node.examWeight}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Part {node.partNumber}
                      </span>
                    </div>

                    <h3 className="mt-1 text-sm font-bold tracking-tight text-slate-900">
                      {node.title}
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {node.subtitle}
                    </p>

                    {/* Micro Progress Bar & Checkpoint Summary */}
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            node.status === 'completed'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                          }`}
                          style={{width: `${node.percent}%`}}
                        />
                      </div>
                      <span className="font-mono-tabular text-[11px] font-semibold text-slate-700 shrink-0">
                        {node.percent}%
                      </span>
                    </div>
                  </div>

                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200/70 px-3.5 pt-3 pb-3.5">
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {node.topics.map((topic) => (
                        <li key={topic} className="flex items-start gap-2">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
                            aria-hidden="true"
                          />
                          <span className="leading-relaxed">{topic}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="font-mono-tabular mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                      <span
                        className={
                          node.notesRead ? 'text-emerald-700 font-semibold' : ''
                        }
                      >
                        Notes: {node.notesRead ? 'Done' : 'Pending'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Cards: {node.cardsDone}/{node.cardsTotal}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Quiz (JP): {node.quizDone}/{node.quizTotal}
                      </span>
                    </div>

                    {node.partAvailable && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectPartAndTab(node.partNumber, 'notes')
                          }
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                          <span>Notes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectPartAndTab(node.partNumber, 'flashcards')
                          }
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Layers className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                          <span>Cards</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectPartAndTab(node.partNumber, 'quiz')
                          }
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 px-2.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110"
                        >
                          <CheckSquare className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                          <span>Quiz</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
