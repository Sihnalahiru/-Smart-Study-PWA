import React, {useMemo, useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Clock,
  Radar,
  Target,
  Timer,
} from 'lucide-react';
import type {
  CbtExamAttempt,
  QuizQuestionStat,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  computeQuizAnalytics,
  type TopicAnalyticsAxis,
} from '../utils/quizAnalytics';
import {formatMmSs, SSW_EXAM_RULES} from '../utils/cbtExam';

interface PerformanceAnalyticsCardProps {
  allParts: StudyPart[];
  correctQuizIds: string[];
  attemptedQuizIds: string[];
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  cbtExamHistory?: CbtExamAttempt[];
  onPracticeTopic?: (topic: SswExamTopic) => void;
}

type ChartMetricMode = 'accuracy' | 'mastery';

const CX = 230;
const CY = 166;
const RADIUS = 94;
const GRID_LEVELS = [20, 40, 60, 80, 100];
const PASS_BENCHMARK = SSW_EXAM_RULES.passPercent; // 60% official SSW pass threshold

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

function getTopicStatusInfo(axis: TopicAnalyticsAxis): {
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
  cbtExamHistory = [],
  onPracticeTopic,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('accuracy');
  const [inspectedId, setInspectedId] = useState<SswExamTopic | null>(null);

  const analytics = useMemo(
    () =>
      computeQuizAnalytics(
        allParts,
        correctQuizIds,
        attemptedQuizIds,
        quizQuestionStats,
        cbtExamHistory,
      ),
    [
      allParts,
      correctQuizIds,
      attemptedQuizIds,
      quizQuestionStats,
      cbtExamHistory,
    ],
  );

  const selectedAxis = useMemo(() => {
    if (inspectedId) {
      const found = analytics.axes.find((a) => a.id === inspectedId);
      if (found) return found;
    }
    return analytics.focusTopic ?? analytics.axes[0] ?? null;
  }, [inspectedId, analytics]);

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
      {/* Pure English Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
            <Radar className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Performance Analytics
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
              {analytics.totalExamsCompleted > 0 && (
                <>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Exams Passed{' '}
                    <span className="font-mono-tabular font-semibold text-slate-800">
                      {analytics.totalExamsPassed}/
                      {analytics.totalExamsCompleted}
                    </span>
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
              aria-label="Performance metric selector"
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
                Accuracy
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
                Mastery
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            <span>{isExpanded ? 'Hide' : 'Show'}</span>
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
          {/* Official SSW Section Readiness: Academic vs Practical */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Academic Section
                </span>
                <span
                  className={`font-mono-tabular text-xs font-bold ${
                    analytics.academic.totalAttempts === 0
                      ? 'text-slate-400'
                      : analytics.academic.accuracyPercent >= PASS_BENCHMARK
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {analytics.academic.totalAttempts > 0
                    ? `${analytics.academic.accuracyPercent}%`
                    : '—'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Pass target ≥ 18/30 (60%) · Mastered{' '}
                <span className="font-mono-tabular font-semibold text-slate-700">
                  {analytics.academic.masteredQuestions}/
                  {analytics.academic.totalQuestions}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    analytics.academic.accuracyPercent >= PASS_BENCHMARK
                      ? 'bg-emerald-500'
                      : 'bg-blue-600'
                  }`}
                  style={{width: `${analytics.academic.accuracyPercent}%`}}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Practical Section
                </span>
                <span
                  className={`font-mono-tabular text-xs font-bold ${
                    analytics.practical.totalAttempts === 0
                      ? 'text-slate-400'
                      : analytics.practical.accuracyPercent >= PASS_BENCHMARK
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {analytics.practical.totalAttempts > 0
                    ? `${analytics.practical.accuracyPercent}%`
                    : '—'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Pass target ≥ 12/20 (60%) · Mastered{' '}
                <span className="font-mono-tabular font-semibold text-slate-700">
                  {analytics.practical.masteredQuestions}/
                  {analytics.practical.totalQuestions}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    analytics.practical.accuracyPercent >= PASS_BENCHMARK
                      ? 'bg-emerald-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{width: `${analytics.practical.accuracyPercent}%`}}
                />
              </div>
            </div>
          </div>

          {/* Time Metrics & Exam Pacing (100% English) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Avg Exam Time</span>
              </p>
              <p className="font-mono-tabular mt-1 text-sm font-bold text-slate-900">
                {analytics.timeMetrics.examsTracked > 0
                  ? formatMmSs(analytics.timeMetrics.avgExamSeconds)
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                Budget 80:00 (40m + 40m)
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Timer className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Avg Pace / Q</span>
              </p>
              <p className="font-mono-tabular mt-1 text-sm font-bold text-slate-900">
                {analytics.timeMetrics.avgSecondsPerQuestion > 0
                  ? `${analytics.timeMetrics.avgSecondsPerQuestion}s`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                Target ≤ {analytics.timeMetrics.targetSecondsPerQuestion}s / Q
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold text-slate-500">
                Latest CBT Score
              </p>
              <p
                className={`font-mono-tabular mt-1 text-sm font-bold ${
                  !analytics.latestExam
                    ? 'text-slate-400'
                    : analytics.latestExam.passedOverall
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                }`}
              >
                {analytics.latestExam
                  ? `${analytics.latestExam.totalCorrect}/${analytics.latestExam.totalQuestions}`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                {analytics.latestExam
                  ? `${analytics.latestExam.passedOverall ? 'PASS' : 'Below 60%'} · ${formatMmSs(analytics.latestExam.elapsedSeconds)}`
                  : 'No timed exam yet'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold text-slate-500">
                Pass Rate
              </p>
              <p className="font-mono-tabular mt-1 text-sm font-bold text-slate-900">
                {analytics.totalExamsCompleted > 0
                  ? `${Math.round((analytics.totalExamsPassed / analytics.totalExamsCompleted) * 100)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                {analytics.totalExamsPassed}/{analytics.totalExamsCompleted} CBT
                passed
              </p>
            </div>
          </div>

          {/* Weak Topics Priority Panel (100% English) */}
          {analytics.weakTopics.length > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <span>Weak Topics to Prioritize (Below 60% Pass Target)</span>
                </div>
                <span className="font-mono-tabular text-[11px] font-semibold text-amber-800">
                  {analytics.weakTopics.length} topic
                  {analytics.weakTopics.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {analytics.weakTopics.slice(0, 3).map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-white px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {topic.englishLabel}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {topic.totalAttempts > 0
                          ? `Accuracy ${topic.accuracyPercent}% (${topic.totalCorrect}/${topic.totalAttempts}) · Need +${Math.max(1, PASS_BENCHMARK - topic.accuracyPercent)}% to pass`
                          : `Not attempted yet · ${topic.totalQuestions} questions ready`}
                      </p>
                    </div>
                    {onPracticeTopic && (
                      <button
                        type="button"
                        onClick={() => onPracticeTopic(topic.id)}
                        className="inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100 whitespace-nowrap"
                      >
                        <span>Drill</span>
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Axis English Spider Chart (5 Official SSW Exam Topics) */}
          <div className="mx-auto max-w-[460px]">
            <svg
              viewBox="0 0 460 324"
              role="img"
              aria-label="Radar chart comparing performance across the 5 official SSW Logistics Warehousing exam topics"
              className="h-auto w-full select-none overflow-visible"
            >
              <defs>
                <radialGradient id="spiderFillAccuracy" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.10" />
                </radialGradient>
                <radialGradient id="spiderFillMastery" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.10" />
                </radialGradient>
              </defs>

              {GRID_LEVELS.map((level) => {
                const ringPoints = buildPolygonPoints(
                  analytics.axes.map(() => level),
                );
                const isOuter = level === 100;
                return (
                  <polygon
                    key={level}
                    points={ringPoints}
                    fill={isOuter ? 'rgba(248, 250, 252, 0.7)' : 'none'}
                    stroke={isOuter ? '#cbd5e1' : '#e2e8f0'}
                    strokeWidth={isOuter ? 1.25 : 1}
                  />
                );
              })}

              {analytics.axes.map((axis, idx) => {
                const angle =
                  -Math.PI / 2 + (idx * 2 * Math.PI) / analytics.axes.length;
                const endPt = polarToCartesian(angle, 100);
                const isSelected = selectedAxis?.id === axis.id;
                return (
                  <line
                    key={axis.id}
                    x1={CX}
                    y1={CY}
                    x2={endPt.x}
                    y2={endPt.y}
                    stroke={isSelected ? '#93c5fd' : '#e2e8f0'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                );
              })}

              {/* 60% Official SSW Passing Threshold Ring */}
              <polygon
                points={benchmarkPolygon}
                fill="none"
                stroke="#d97706"
                strokeOpacity={0.8}
                strokeWidth={1.6}
                strokeDasharray="4 4"
              />

              {[20, 60, 100].map((level) => {
                const y = CY - (level / 100) * RADIUS;
                return (
                  <text
                    key={level}
                    x={CX + 4}
                    y={y - 2}
                    fontSize="9"
                    fontWeight="600"
                    fill={level === PASS_BENCHMARK ? '#b45309' : '#94a3b8'}
                    className="font-mono-tabular pointer-events-none"
                  >
                    {level}%
                  </text>
                );
              })}

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

              {analytics.axes.map((axis, idx) => {
                const count = analytics.axes.length;
                const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
                const val = primaryValues[idx];
                const nodePt = polarToCartesian(angle, val);
                const labelPt = polarToCartesian(angle, 100, RADIUS + 20);
                const isSelected = selectedAxis?.id === axis.id;

                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                if (cos > 0.35) textAnchor = 'start';
                else if (cos < -0.35) textAnchor = 'end';

                const labelDy = sin < -0.7 ? -6 : sin > 0.7 ? 10 : 0;

                return (
                  <g
                    key={axis.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${axis.englishLabel}: ${val}%`}
                    onClick={() => setInspectedId(axis.id)}
                    onMouseEnter={() => setInspectedId(axis.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectedId(axis.id);
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
                      fontSize="11"
                      fontWeight={isSelected ? '700' : '600'}
                      fill={isSelected ? '#1d4ed8' : '#334155'}
                    >
                      {axis.shortLabel}
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
                <span>60% Official Pass Target</span>
              </span>
            </div>
          </div>

          {/* 5-Topic English Breakdown Grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {analytics.axes.map((axis) => {
              const metricValue = isAccuracyMode
                ? axis.accuracyPercent
                : axis.masteryPercent;
              const isSelected = selectedAxis?.id === axis.id;
              const statusInfo = getTopicStatusInfo(axis);
              const StatusIcon = statusInfo.icon;

              return (
                <button
                  key={axis.id}
                  type="button"
                  onClick={() => setInspectedId(axis.id)}
                  className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/75 shadow-2xs'
                      : 'border-slate-200/80 bg-slate-50/45 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {axis.englishLabel}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {axis.masteredQuestions}/{axis.totalQuestions} mastered
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

          {/* Focused Topic Inspector (100% English) */}
          {selectedAxis && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <Target
                    className="h-3.5 w-3.5 shrink-0 text-blue-600"
                    aria-hidden="true"
                  />
                  <span className="font-bold text-slate-900">
                    {selectedAxis.englishLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {selectedAxis.totalAttempts > 0 ? (
                    <>
                      <span>Accuracy </span>
                      <span className="font-mono-tabular font-semibold text-blue-700">
                        {selectedAxis.accuracyPercent}%
                      </span>
                      <span>
                        {' '}
                        ({selectedAxis.totalCorrect}/{selectedAxis.totalAttempts}{' '}
                        answers)
                      </span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span>Mastered </span>
                      <span className="font-mono-tabular font-semibold text-emerald-700">
                        {selectedAxis.masteredQuestions}/
                        {selectedAxis.totalQuestions}
                      </span>
                    </>
                  ) : (
                    <span>
                      Not attempted yet · {selectedAxis.totalQuestions} exam
                      questions available. {selectedAxis.description}.
                    </span>
                  )}
                </p>
              </div>

              {onPracticeTopic && (
                <button
                  type="button"
                  onClick={() => onPracticeTopic(selectedAxis.id)}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs transition-colors hover:bg-blue-50 whitespace-nowrap shrink-0"
                >
                  <span>Practice Topic</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
