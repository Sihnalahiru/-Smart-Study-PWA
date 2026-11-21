import React, {useMemo, useState} from 'react';
import {
  BookOpen,
  Check,
  CheckSquare,
  ClipboardCheck,
  Container,
  Crown,
  Forklift,
  HardHat,
  Layers,
  Map as MapIcon,
  PackageCheck,
  Play,
  Scale,
  Warehouse,
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

const CURVE_OFFSETS = [0, 44, 60, 20, -44, -60, -20];

function getNodeIcon(partNumber: number) {
  switch (partNumber) {
    case 1:
      return Warehouse;
    case 2:
      return ClipboardCheck;
    case 3:
      return Scale;
    case 4:
      return PackageCheck;
    case 5:
      return HardHat;
    case 6:
      return Forklift;
    default:
      return Container;
  }
}

export const StudyRoadmap: React.FC<StudyRoadmapProps> = ({
  allParts,
  progress,
  onSelectPartAndTab,
}) => {
  const nodes = useMemo<ComputedRoadmapNode[]>(
    () => computeSyllabusNodes(allParts, progress),
    [allParts, progress],
  );

  const firstActiveNode =
    nodes.find((n) => n.status === 'in_progress') ??
    nodes.find((n) => n.status === 'not_started' && n.partAvailable) ??
    nodes[0];

  const [selectedCode, setSelectedCode] = useState<string | null>(
    firstActiveNode?.code ?? nodes[0]?.code ?? null,
  );

  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const overallPercent =
    nodes.length > 0
      ? Math.round(
          nodes.reduce((sum, n) => sum + n.percent, 0) / nodes.length,
        )
      : 0;

  const selectedNode =
    nodes.find((n) => n.code === selectedCode) ?? firstActiveNode ?? nodes[0];

  return (
    <section
      aria-labelledby="study-roadmap-heading"
      className="surface-card rounded-2xl p-5 sm:p-6"
    >
      {/* Logistics Path Header */}
      <div className="border-b border-slate-200/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700">
              <MapIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="study-roadmap-heading"
                className="text-base font-bold tracking-tight text-slate-900"
              >
                SSW Logistics Path
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tap any dock station along the S-route to launch study drills
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="font-mono-tabular text-lg font-bold tracking-tight text-slate-900">
              {overallPercent}%
            </span>
            <p className="font-mono-tabular text-[11px] font-medium text-slate-500">
              {completedCount}/{nodes.length} docks
            </p>
          </div>
        </div>

        {/* Segmented Path Bar */}
        <div className="mt-3.5 flex items-center gap-1.5">
          {nodes.map((node) => {
            const barColor =
              node.status === 'completed'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : node.status === 'in_progress'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-slate-200/80';
            return (
              <div
                key={node.code}
                title={`Dock ${node.code}: ${node.title} (${node.percent}%)`}
                className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{width: `${node.percent}%`}}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Duolingo-Style Winding S-Curve Stepping Path */}
      <div className="relative mx-auto mt-6 max-w-md py-2">
        <div className="flex flex-col items-center">
          {nodes.map((node, index) => {
            const offsetX = CURVE_OFFSETS[index % CURVE_OFFSETS.length];
            const nextOffsetX =
              index < nodes.length - 1
                ? CURVE_OFFSETS[(index + 1) % CURVE_OFFSETS.length]
                : offsetX;

            const Icon = getNodeIcon(node.partNumber);
            const isSelected = selectedNode?.code === node.code;
            const isCurrentTarget = firstActiveNode?.code === node.code;
            const isCompleted = node.status === 'completed';
            const isInProgress = node.status === 'in_progress';

            // Outer SVG circular progress ring geometry
            const radius = 37;
            const circumference = 2 * Math.PI * radius;
            const dashOffset =
              circumference - (node.percent / 100) * circumference;

            const buttonColors = isCompleted
              ? 'border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_5px_0_0_#047857]'
              : isInProgress || isCurrentTarget
                ? 'border-amber-600 bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_5px_0_0_#c2410c]'
                : 'border-slate-300 bg-gradient-to-b from-white to-slate-100 text-slate-600 shadow-[0_5px_0_0_#cbd5e1] hover:border-blue-300';

            return (
              <React.Fragment key={node.code}>
                <div
                  className="relative flex flex-col items-center"
                  style={{transform: `translateX(${offsetX}px)`}}
                >
                  {/* Active Floating Callout ("START" / "CONTINUE") */}
                  {isCurrentTarget && !isCompleted && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-800 shadow-xs">
                      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>{isInProgress ? 'CONTINUE' : 'START SHIFT'}</span>
                    </div>
                  )}

                  {/* Circular Ring + Elevated 3D Tactile Button */}
                  <div className="relative flex h-[84px] w-[84px] items-center justify-center">
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 84 84"
                      aria-hidden="true"
                    >
                      <circle
                        cx="42"
                        cy="42"
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="5"
                      />
                      <circle
                        cx="42"
                        cy="42"
                        r={radius}
                        fill="none"
                        stroke={
                          isCompleted
                            ? '#10b981'
                            : isInProgress || isCurrentTarget
                              ? '#f59e0b'
                              : '#3b82f6'
                        }
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-500"
                      />
                    </svg>

                    <button
                      type="button"
                      onClick={() => setSelectedCode(node.code)}
                      aria-label={`Dock ${node.code}: ${node.title} (${node.percent}%)`}
                      aria-pressed={isSelected}
                      className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-150 active:translate-y-1 active:shadow-none ${buttonColors} ${
                        isSelected ? 'ring-4 ring-blue-500/25' : ''
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />

                      {/* Corner Status / Crown Badge */}
                      {isCompleted ? (
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-slate-900 shadow-xs">
                          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      ) : (
                        <span className="font-mono-tabular absolute -bottom-1 -right-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1 text-[10px] font-bold text-white shadow-2xs">
                          {node.code}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Step Caption */}
                  <div className="mt-2 max-w-[168px] text-center">
                    <p className="text-xs font-bold leading-tight text-slate-900">
                      {node.title}
                    </p>
                    <p className="font-mono-tabular mt-0.5 text-[11px] font-medium text-slate-500">
                      {node.examWeight} · {node.percent}%
                    </p>
                  </div>
                </div>

                {/* Curved SVG Connector Line Between Winding Nodes */}
                {index < nodes.length - 1 && (
                  <svg
                    width="180"
                    height="36"
                    viewBox="-90 0 180 36"
                    className="my-0.5 overflow-visible text-slate-300"
                    aria-hidden="true"
                  >
                    <path
                      d={`M ${offsetX} 0 C ${offsetX} 18, ${nextOffsetX} 18, ${nextOffsetX} 36`}
                      fill="none"
                      stroke={isCompleted ? '#10b981' : '#cbd5e1'}
                      strokeWidth="3"
                      strokeDasharray={isCompleted ? undefined : '6 5'}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Interactive Launch Drawer for Selected Dock */}
      {selectedNode && (
        <div className="mt-5 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/50 to-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono-tabular text-[11px] font-semibold text-blue-700">
                Dock {selectedNode.code} · Part {selectedNode.partNumber} ·{' '}
                {selectedNode.examWeight}
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base">
                {selectedNode.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedNode.subtitle}
              </p>
            </div>
            <span className="font-mono-tabular inline-flex items-center gap-1 text-xs font-bold text-slate-700">
              {selectedNode.status === 'completed' && (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              )}
              <span>{selectedNode.percent}% done</span>
            </span>
          </div>

          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {selectedNode.topics.map((topic) => (
              <li key={topic} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <span>{topic}</span>
              </li>
            ))}
          </ul>

          <div className="font-mono-tabular mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className={selectedNode.notesRead ? 'font-semibold text-emerald-700' : ''}>
              Notes: {selectedNode.notesRead ? 'Done' : 'Pending'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Cards: {selectedNode.cardsDone}/{selectedNode.cardsTotal}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Quiz: {selectedNode.quizDone}/{selectedNode.quizTotal}
            </span>
          </div>

          {selectedNode.partAvailable && (
            <div className="mt-3.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  onSelectPartAndTab(selectedNode.partNumber, 'notes')
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Notes</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSelectPartAndTab(selectedNode.partNumber, 'flashcards')
                }
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSelectPartAndTab(selectedNode.partNumber, 'quiz')
                }
                className="btn-primary-premium inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold"
              >
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
