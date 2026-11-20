import React, {useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Radar,
  Target,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import type {QuizQuestionStat, StudyPart} from '../types/study';
import {
  computeQuizAnalytics,
  type CoreModuleCode,
  type ModuleAnalyticsAxis,
} from '../utils/quizAnalytics';
import type {QuizModuleCode} from '../utils/quizCoverage';

interface PerformanceAnalyticsCardProps {
  allParts: StudyPart[];
  correctQuizIds: string[];
  attemptedQuizIds: string[];
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  sessionAnswers: Record<string, number>;
  activeModuleFilter: 'ALL' | QuizModuleCode;
  showFurigana: boolean;
  onSelectModulePractice: (moduleCode: CoreModuleCode) => void;
}

type ChartMetricMode = 'accuracy' | 'mastery';

const CX = 230;
const CY = 165;
const RADIUS = 98;
const GRID_LEVELS = [25, 50, 75, 100];
const PASS_BENCHMARK = 75;

function polarToCartesian(
  angleRad: number,
  percent: number,
  radius = RADIUS,
): {x: number; y: number} {
  const scaled = (Math.max(0, Math.min(100, percent)) / 100) * radius;
  return {
    x: CX + scaled * Math.cos(angleRad),
    y: CY + scaled * Math.sin(angleRad),
  };
}

function buildPolygonPoints(values: number[], radius = RADIUS): string {
  const count = values.length;
  return values
    .map((val, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
      const pt = polarToCartesian(angle, val, radius);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');
}

function getModuleStatusInfo(axis: ModuleAnalyticsAxis): {
  label: string;
  toneClass: string;
  icon: React.ComponentType<{className?: string}>;
} {
  if (axis.totalAttempts === 0) {
    return {
      label: 'Not Started',
      toneClass: 'text-slate-500',
      icon: CircleDashed,
    };
  }
  if (axis.accuracyPercent >= PASS_BENCHMARK) {
    return {
      label: 'Pass Ready',
      toneClass: 'text-emerald-700',
      icon: CheckCircle2,
    };
  }
  return {
    label: 'Needs Review',
    toneClass: 'text-amber-700',
    icon: AlertTriangle,
  };
}

export const PerformanceAnalyticsCard: React.FC<
  PerformanceAnalyticsCardProps
> = ({
  allParts,
  correctQuizIds,
  attemptedQuizIds,
  quizQuestionStats,
  sessionAnswers,
  activeModuleFilter,
  showFurigana,
  onSelectModulePractice,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('accuracy');
  const [inspectedCode, setInspectedCode] = useState<CoreModuleCode | null>(
    null,
  );

  const analytics = useMemo(
    () =>
      computeQuizAnalytics(
        allParts,
        correctQuizIds,
        attemptedQuizIds,
        quizQuestionStats,
        sessionAnswers,
      ),
    [
      allParts,
      correctQuizIds,
      attemptedQuizIds,
      quizQuestionStats,
      sessionAnswers,
    ],
  );

  const selectedAxis = useMemo(() => {
    if (inspectedCode) {
      const found = analytics.axes.find((a) => a.code === inspectedCode);
      if (found) return found;
    }
    if (
      activeModuleFilter !== 'ALL' &&
      ['A', 'B', 'C', 'D', 'E', 'F'].includes(activeModuleFilter)
    ) {
      const found = analytics.axes.find((a) => a.code === activeModuleFilter);
      if (found) return found;
    }
    return analytics.focusModule ?? analytics.axes[0] ?? null;
  }, [inspectedCode, activeModuleFilter, analytics]);

  if (analytics.axes.length === 0) {
    return null;
  }

  const primaryValues = analytics.axes.map((axis) =>
    metricMode === 'accuracy' ? axis.accuracyPercent : axis.masteryPercent,
  );
  const benchmarkValues = analytics.axes.map(() => PASS_BENCHMARK);
  const primaryPolygon = buildPolygonPoints(primaryValues);
  const benchmarkPolygon = buildPolygonPoints(benchmarkValues);

  const isAccuracyMode = metricMode === 'accuracy';
  const polygonStroke = isAccuracyMode ? '#2563eb' : '#059669';
  const polygonFill = isAccuracyMode
    ? 'rgba(37, 99, 235, 0.18)'
    : 'rgba(5, 150, 105, 0.18)';

  return (
    <section
      aria-label="Performance Analytics"
      className="surface-card rounded-2xl p-4 sm:p-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
            <Radar className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Performance Analytics{' '}
              <span className="font-normal text-slate-500">
                ·{' '}
                <FuriganaText
                  text="{分野別|ぶんやべつ}{正答率|せいとうりつ}"
                  showFurigana={showFurigana}
                />
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              <span>Overall Accuracy </span>
              <span className="font-mono-tabular font-semibold text-blue-700">
                {analytics.hasAnyAttempts
                  ? `${analytics.overallAccuracyPercent}%`
                  : '—'}
              </span>
              <span className="mx-1.5 text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>Mastered </span>
              <span className="font-mono-tabular font-semibold text-emerald-700">
                {analytics.totalMastered}/{analytics.totalQuestions}
              </span>
              {analytics.strongestModule && (
                <>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Top: {analytics.strongestModule.code} (
                    <span className="font-mono-tabular font-semibold text-slate-700">
                      {analytics.strongestModule.accuracyPercent}%
                    </span>
                    )
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <div
              role="group"
              aria-label="Spider chart metric"
              className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1"
            >
              <button
                type="button"
                onClick={() => setMetricMode('accuracy')}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  metricMode === 'accuracy'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FuriganaText
                  text="{正答率|せいとうりつ}"
                  showFurigana={showFurigana}
                />
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('mastery')}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  metricMode === 'mastery'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FuriganaText
                  text="{習得率|しゅうとくりつ}"
                  showFurigana={showFurigana}
                />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? 'Collapse performance analytics'
                : 'Expand performance analytics'
            }
            className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            <span>{isExpanded ? 'Hide' : 'Show Chart'}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-slate-200/70 pt-4">
          {/* Interactive Hexagon Spider Chart */}
          <div className="mx-auto max-w-[450px]">
            <svg
              viewBox="0 0 460 326"
              role="img"
              aria-label="Spider chart comparing accuracy across warehouse syllabus modules A through F"
              className="h-auto w-full select-none overflow-visible"
            >
              <defs>
                <radialGradient id="spiderFillAccuracy" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
                </radialGradient>
                <radialGradient id="spiderFillMastery" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.12" />
                </radialGradient>
              </defs>

              {/* Concentric Hexagon Grid Rings (25%, 50%, 75%, 100%) */}
              {GRID_LEVELS.map((level) => {
                const ringPoints = buildPolygonPoints(
                  analytics.axes.map(() => level),
                );
                const isOuter = level === 100;
                return (
                  <polygon
                    key={level}
                    points={ringPoints}
                    fill={isOuter ? 'rgba(248, 250, 252, 0.65)' : 'none'}
                    stroke={isOuter ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={isOuter ? 1.25 : 1}
                  />
                );
              })}

              {/* Radial Axis Spokes */}
              {analytics.axes.map((axis, idx) => {
                const angle =
                  -Math.PI / 2 + (idx * 2 * Math.PI) / analytics.axes.length;
                const endPt = polarToCartesian(angle, 100);
                const isSelected = selectedAxis?.code === axis.code;
                return (
                  <line
                    key={axis.code}
                    x1={CX}
                    y1={CY}
                    x2={endPt.x}
                    y2={endPt.y}
                    stroke={isSelected ? '#93c5fd' : '#e2e8f0'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                );
              })}

              {/* 75% Exam Passing Target Ring */}
              <polygon
                points={benchmarkPolygon}
                fill="none"
                stroke="#d97706"
                strokeOpacity={0.72}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />

              {/* Scale Labels on Top Axis */}
              {[25, 50, 75, 100].map((level) => {
                const y = CY - (level / 100) * RADIUS;
                return (
                  <text
                    key={level}
                    x={CX + 4}
                    y={y - 2}
                    fontSize="9"
                    fontWeight="600"
                    fill={level === 75 ? '#b45309' : '#94a3b8'}
                    className="font-mono-tabular pointer-events-none"
                  >
                    {level}%
                  </text>
                );
              })}

              {/* User Performance Data Polygon */}
              <polygon
                points={primaryPolygon}
                fill={
                  isAccuracyMode
                    ? 'url(#spiderFillAccuracy)'
                    : 'url(#spiderFillMastery)'
                }
                stroke={polygonStroke}
                strokeWidth={2.25}
                strokeLinejoin="round"
                style={{
                  transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Interactive Vertex Nodes & Axis Labels */}
              {analytics.axes.map((axis, idx) => {
                const count = analytics.axes.length;
                const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
                const val = primaryValues[idx];
                const nodePt = polarToCartesian(angle, val);
                const labelPt = polarToCartesian(angle, 100, RADIUS + 20);
                const isSelected = selectedAxis?.code === axis.code;
                const isFiltered = activeModuleFilter === axis.code;

                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                if (cos > 0.35) textAnchor = 'start';
                else if (cos < -0.35) textAnchor = 'end';

                const labelDy = sin < -0.7 ? -6 : sin > 0.7 ? 8 : 0;

                return (
                  <g
                    key={axis.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`${axis.axisShortLabel} (${axis.englishLabel}): ${val}%`}
                    onClick={() => setInspectedCode(axis.code)}
                    onMouseEnter={() => setInspectedCode(axis.code)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectedCode(axis.code);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {isSelected && (
                      <circle
                        cx={nodePt.x}
                        cy={nodePt.y}
                        r={9}
                        fill={polygonFill}
                        stroke={polygonStroke}
                        strokeWidth={1.25}
                      />
                    )}

                    <circle
                      cx={nodePt.x}
                      cy={nodePt.y}
                      r={isSelected ? 5 : 4}
                      fill={axis.totalAttempts > 0 ? polygonStroke : '#cbd5e1'}
                      stroke="#ffffff"
                      strokeWidth={1.75}
                    />

                    <circle
                      cx={nodePt.x}
                      cy={nodePt.y}
                      r={22}
                      fill="transparent"
                    />

                    <text
                      x={labelPt.x}
                      y={labelPt.y + labelDy}
                      textAnchor={textAnchor}
                      fontSize="11.5"
                      fontWeight={isSelected || isFiltered ? '700' : '600'}
                      fill={isSelected || isFiltered ? '#1d4ed8' : '#334155'}
                    >
                      {axis.axisShortLabel}
                    </text>
                    <text
                      x={labelPt.x}
                      y={labelPt.y + labelDy + 13}
                      textAnchor={textAnchor}
                      fontSize="10.5"
                      fontWeight="600"
                      fill={
                        axis.totalAttempts === 0
                          ? '#94a3b8'
                          : val >= PASS_BENCHMARK
                            ? '#047857'
                            : '#b45309'
                      }
                      className="font-mono-tabular"
                    >
                      {axis.totalAttempts > 0 ? `${val}%` : '—'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Chart Legend */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-xs ${
                    isAccuracyMode ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                  aria-hidden="true"
                />
                <span>{isAccuracyMode ? 'Accuracy (%)' : 'Mastery (%)'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-4 border-t-2 border-dashed border-amber-600"
                  aria-hidden="true"
                />
                <span>75% Pass Target</span>
              </span>
            </div>
          </div>

          {/* 2-Column Module Accuracy Grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {analytics.axes.map((axis) => {
              const metricValue = isAccuracyMode
                ? axis.accuracyPercent
                : axis.masteryPercent;
              const isSelected = selectedAxis?.code === axis.code;
              const statusInfo = getModuleStatusInfo(axis);
              const StatusIcon = statusInfo.icon;

              return (
                <button
                  key={axis.code}
                  type="button"
                  onClick={() => setInspectedCode(axis.code)}
                  className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/75 shadow-2xs'
                      : 'border-slate-200/80 bg-slate-50/45 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {axis.axisShortLabel}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {axis.englishLabel}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${statusInfo.toneClass}`}
                    >
                      <StatusIcon
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{statusInfo.label}</span>
                    </span>
                    <span className="font-mono-tabular w-9 text-right text-xs font-bold text-slate-900">
                      {axis.totalAttempts > 0 || !isAccuracyMode
                        ? `${metricValue}%`
                        : '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Focused Module Inspector & Practice Action */}
          {selectedAxis && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Target
                    className="h-3.5 w-3.5 shrink-0 text-blue-600"
                    aria-hidden="true"
                  />
                  <span className="font-bold text-slate-900">
                    <FuriganaText
                      text={selectedAxis.japaneseLabel}
                      showFurigana={showFurigana}
                    />
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-600">
                    {selectedAxis.englishLabel}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  {selectedAxis.totalAttempts > 0 ? (
                    <>
                      <span>Accuracy </span>
                      <span className="font-mono-tabular font-semibold text-blue-700">
                        {selectedAxis.accuracyPercent}%
                      </span>
                      <span>
                        {' '}
                        ({selectedAxis.totalCorrect}/{selectedAxis.totalAttempts}{' '}
                        attempts)
                      </span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span>Mastered </span>
                      <span className="font-mono-tabular font-semibold text-emerald-700">
                        {selectedAxis.masteredQuestions}/
                        {selectedAxis.totalQuestions}
                      </span>
                      {selectedAxis.sessionAnswered > 0 && (
                        <>
                          <span
                            className="mx-1.5 text-slate-300"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span>
                            Session {selectedAxis.sessionCorrect}/
                            {selectedAxis.sessionAnswered}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>
                      Not attempted yet · {selectedAxis.totalQuestions}{' '}
                      questions ready in Part {selectedAxis.partNumber}. Answer
                      questions below to plot your accuracy.
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectModulePractice(selectedAxis.code)}
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs transition-colors hover:bg-blue-50 whitespace-nowrap shrink-0"
              >
                <span>Practice Module {selectedAxis.code}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
