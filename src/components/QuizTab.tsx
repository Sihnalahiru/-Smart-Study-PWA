import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flag,
  Image as ImageIcon,
  Languages,
  LayoutGrid,
  Maximize2,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import {PerformanceAnalyticsCard} from './PerformanceAnalyticsCard';
import type {
  CbtExamAttempt,
  CbtQuestion,
  QuizQuestionStat,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  buildPaperSet,
  formatMmSs,
  getAllCbtQuestions,
  SSW_EXAM_RULES,
  SSW_TOPIC_MAP,
  SSW_TOPICS,
} from '../utils/cbtExam';

interface QuizTabProps {
  parts: StudyPart[];
  allParts: StudyPart[];
  correctQuizIds: string[];
  attemptedQuizIds?: string[];
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  cbtExamHistory?: CbtExamAttempt[];
  initialPracticeTopic?: SswExamTopic | null;
  onConsumePracticeTopic?: () => void;
  onRecordQuizAnswer: (
    questionId: string,
    isCorrect: boolean,
    partNumber: number,
    partFinished: boolean,
  ) => void;
  onRecordCbtExamAttempt: (
    attempt: CbtExamAttempt,
    perQuestionResults: {id: string; isCorrect: boolean}[],
  ) => void;
}

type QuizViewMode = 'lobby' | 'exam' | 'result' | 'practice';
type ExamSessionMode = 'full' | 'academic' | 'practical';
type ActiveExamStage = 'academic' | 'practical';

const OPTION_LETTERS = ['ア', 'イ', 'ウ', 'エ'];

interface ExamSessionState {
  mode: ExamSessionMode;
  paperSet: 1 | 2 | 3;
  stage: ActiveExamStage;
  academicQuestions: CbtQuestion[];
  practicalQuestions: CbtQuestion[];
  currentIndex: number;
  answers: Record<string, number>;
  flagged: Record<string, boolean>;
  stageElapsedSeconds: number;
  previousStageElapsedSeconds: number;
  stageLimitSeconds: number;
}

interface ExamResultBundle {
  attempt: CbtExamAttempt;
  questions: CbtQuestion[];
  answers: Record<string, number>;
  flagged: Record<string, boolean>;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  allParts,
  correctQuizIds,
  attemptedQuizIds = [],
  quizQuestionStats,
  cbtExamHistory = [],
  initialPracticeTopic = null,
  onConsumePracticeTopic,
  onRecordQuizAnswer,
  onRecordCbtExamAttempt,
}) => {
  const [view, setView] = useState<QuizViewMode>('lobby');
  const [selectedPaperSet, setSelectedPaperSet] = useState<1 | 2 | 3>(1);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showNavigator, setShowNavigator] = useState(false);
  const [zoomImage, setZoomImage] = useState<{src: string; alt: string} | null>(
    null,
  );
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Active CBT Timed Exam State
  const [examSession, setExamSession] = useState<ExamSessionState | null>(null);
  const [examResult, setExamResult] = useState<ExamResultBundle | null>(null);
  const [reviewFilter, setReviewFilter] = useState<
    'all' | 'incorrect' | 'flagged'
  >('all');

  // Topic / Custom Practice State
  const [practiceTopic, setPracticeTopic] = useState<
    SswExamTopic | 'all' | 'images' | 'calculations'
  >('all');
  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<string, number>
  >({});
  const [practiceElapsed, setPracticeElapsed] = useState(0);

  const paperBundles = useMemo(
    () => ({
      1: buildPaperSet(allParts, 1),
      2: buildPaperSet(allParts, 2),
      3: buildPaperSet(allParts, 3),
    }),
    [allParts],
  );

  const allCbtQuestions = useMemo(
    () => getAllCbtQuestions(allParts),
    [allParts],
  );

  const activeBundle = paperBundles[selectedPaperSet];

  // Auto-submit ref to avoid stale closure on timeout
  const finishStageOrSubmitRef = useRef<() => void>(() => {});

  // Live 1-second timer for active CBT exam
  useEffect(() => {
    if (view !== 'exam' || !examSession) return;
    const interval = window.setInterval(() => {
      setExamSession((prev) => {
        if (!prev) return null;
        const nextElapsed = prev.stageElapsedSeconds + 1;
        if (nextElapsed >= prev.stageLimitSeconds) {
          window.setTimeout(() => finishStageOrSubmitRef.current(), 0);
          return {...prev, stageElapsedSeconds: prev.stageLimitSeconds};
        }
        return {...prev, stageElapsedSeconds: nextElapsed};
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [view, examSession?.stage, examSession?.paperSet, examSession?.mode]);

  // Live 1-second elapsed timer for Practice mode
  useEffect(() => {
    if (view !== 'practice') return;
    const interval = window.setInterval(() => {
      setPracticeElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [view]);

  // Launch directly into a targeted weak topic when triggered from Dashboard Analytics
  useEffect(() => {
    if (!initialPracticeTopic) return;
    setPracticeTopic(initialPracticeTopic);
    setPracticeAnswers({});
    setPracticeElapsed(0);
    setView('practice');
    onConsumePracticeTopic?.();
  }, [initialPracticeTopic, onConsumePracticeTopic]);

  const startExam = (mode: ExamSessionMode, paperSet: 1 | 2 | 3) => {
    const bundle = paperBundles[paperSet];
    const initialStage: ActiveExamStage =
      mode === 'practical' ? 'practical' : 'academic';
    const limitSeconds =
      initialStage === 'academic'
        ? SSW_EXAM_RULES.academicMinutes * 60
        : SSW_EXAM_RULES.practicalMinutes * 60;

    setExamSession({
      mode,
      paperSet,
      stage: initialStage,
      academicQuestions: mode === 'practical' ? [] : bundle.academic,
      practicalQuestions: mode === 'academic' ? [] : bundle.practical,
      currentIndex: 0,
      answers: {},
      flagged: {},
      stageElapsedSeconds: 0,
      previousStageElapsedSeconds: 0,
      stageLimitSeconds: limitSeconds,
    });
    setExamResult(null);
    setShowNavigator(false);
    setConfirmSubmitOpen(false);
    setView('exam');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const finalizeExam = (session: ExamSessionState) => {
    const allSessionQuestions = [
      ...session.academicQuestions,
      ...session.practicalQuestions,
    ];

    let academicCorrect = 0;
    for (const q of session.academicQuestions) {
      if (session.answers[q.id] === q.correct_index) academicCorrect += 1;
    }

    let practicalCorrect = 0;
    for (const q of session.practicalQuestions) {
      if (session.answers[q.id] === q.correct_index) practicalCorrect += 1;
    }

    const academicTotal = session.academicQuestions.length;
    const practicalTotal = session.practicalQuestions.length;
    const totalCorrect = academicCorrect + practicalCorrect;
    const totalQuestions = allSessionQuestions.length;

    const passedAcademic =
      academicTotal === 0
        ? true
        : academicCorrect >=
          Math.ceil(academicTotal * (SSW_EXAM_RULES.passPercent / 100));
    const passedPractical =
      practicalTotal === 0
        ? true
        : practicalCorrect >=
          Math.ceil(practicalTotal * (SSW_EXAM_RULES.passPercent / 100));
    const passedOverall = passedAcademic && passedPractical;

    const topicScores = SSW_TOPICS.map((t) => {
      const qs = allSessionQuestions.filter((q) => q.topic === t.id);
      const correct = qs.filter(
        (q) => session.answers[q.id] === q.correct_index,
      ).length;
      return {
        topic: t.id,
        correct,
        total: qs.length,
      };
    }).filter((ts) => ts.total > 0);

    const totalElapsed =
      session.previousStageElapsedSeconds + session.stageElapsedSeconds;

    const attempt: CbtExamAttempt = {
      id: `cbt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: session.mode,
      paperSet: session.paperSet,
      completedAt: new Date().toISOString(),
      elapsedSeconds: totalElapsed,
      academicCorrect,
      academicTotal,
      practicalCorrect,
      practicalTotal,
      totalCorrect,
      totalQuestions,
      passedAcademic,
      passedPractical,
      passedOverall,
      topicScores,
    };

    const perQuestionResults = allSessionQuestions.map((q) => ({
      id: q.id,
      isCorrect: session.answers[q.id] === q.correct_index,
    }));

    onRecordCbtExamAttempt(attempt, perQuestionResults);

    setExamResult({
      attempt,
      questions: allSessionQuestions,
      answers: session.answers,
      flagged: session.flagged,
    });
    setReviewFilter('all');
    setConfirmSubmitOpen(false);
    setExamSession(null);
    setView('result');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleFinishStageOrSubmit = () => {
    if (!examSession) return;
    if (examSession.mode === 'full' && examSession.stage === 'academic') {
      // Transition cleanly to Practical Section (20 Qs · 40 min)
      setExamSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          stage: 'practical',
          currentIndex: 0,
          previousStageElapsedSeconds: prev.stageElapsedSeconds,
          stageElapsedSeconds: 0,
          stageLimitSeconds: SSW_EXAM_RULES.practicalMinutes * 60,
        };
      });
      setShowNavigator(false);
      setConfirmSubmitOpen(false);
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    finalizeExam(examSession);
  };

  finishStageOrSubmitRef.current = handleFinishStageOrSubmit;

  const startTopicPractice = (
    topic: SswExamTopic | 'all' | 'images' | 'calculations',
  ) => {
    setPracticeTopic(topic);
    setPracticeAnswers({});
    setPracticeElapsed(0);
    setView('practice');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const practiceQuestions = useMemo(() => {
    if (practiceTopic === 'all') return allCbtQuestions;
    if (practiceTopic === 'images') {
      return allCbtQuestions.filter((q) => Boolean(q.image));
    }
    if (practiceTopic === 'calculations') {
      return allCbtQuestions.filter((q) => Boolean(q.isCalculation));
    }
    return allCbtQuestions.filter((q) => q.topic === practiceTopic);
  }, [allCbtQuestions, practiceTopic]);

  // =========================================================================
  // VIEW 1: ACTIVE CBT EXAM SIMULATOR
  // =========================================================================
  if (view === 'exam' && examSession) {
    const stageQuestions =
      examSession.stage === 'academic'
        ? examSession.academicQuestions
        : examSession.practicalQuestions;
    const currentQ = stageQuestions[examSession.currentIndex];
    const stageAnswered = stageQuestions.reduce(
      (sum, q) => (examSession.answers[q.id] !== undefined ? sum + 1 : sum),
      0,
    );
    const stageRemaining = stageQuestions.length - stageAnswered;

    const totalExamQuestions =
      examSession.academicQuestions.length +
      examSession.practicalQuestions.length;
    const totalAnswered = Object.keys(examSession.answers).length;
    const totalRemaining = totalExamQuestions - totalAnswered;

    const remainingSeconds = Math.max(
      0,
      examSession.stageLimitSeconds - examSession.stageElapsedSeconds,
    );
    const totalElapsedSeconds =
      examSession.previousStageElapsedSeconds + examSession.stageElapsedSeconds;
    const isLowTime = remainingSeconds <= 300;
    const isCriticalTime = remainingSeconds <= 120;

    const passTarget =
      examSession.stage === 'academic'
        ? SSW_EXAM_RULES.academicPassScore
        : SSW_EXAM_RULES.practicalPassScore;

    const selectedOpt = currentQ ? examSession.answers[currentQ.id] : undefined;
    const isFlagged = currentQ ? Boolean(examSession.flagged[currentQ.id]) : false;

    return (
      <div className="space-y-4">
        {/* Sticky Authentic CBT Exam HUD */}
        <section
          aria-label="CBT Exam Status Bar"
          className="surface-glass sticky top-16 z-20 rounded-2xl border border-slate-200/90 p-3.5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-900">
                Paper {examSession.paperSet}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-blue-700">
                {examSession.stage === 'academic'
                  ? 'Academic Section (学科)'
                  : 'Practical Section (実技)'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono-tabular text-slate-600">
                Pass ≥ {passTarget}/{stageQuestions.length} (60%)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowFurigana((prev) => !prev)}
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  showFurigana
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Furigana: {showFurigana ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExamSession(null);
                  setView('lobby');
                }}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* 4 Live CBT Counters: Answered, Remaining, Time Elapsed, Time Remaining */}
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">
                Answered
              </p>
              <p className="font-mono-tabular mt-0.5 text-sm font-bold text-blue-700">
                {stageAnswered}/{stageQuestions.length}
                {examSession.mode === 'full' && (
                  <span className="ml-1 text-[10px] font-medium text-slate-400">
                    ({totalAnswered}/{totalExamQuestions})
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">
                Remaining
              </p>
              <p className="font-mono-tabular mt-0.5 text-sm font-bold text-slate-900">
                {stageRemaining} left
                {examSession.mode === 'full' && (
                  <span className="ml-1 text-[10px] font-medium text-slate-400">
                    ({totalRemaining} total)
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Time Elapsed</span>
              </p>
              <p className="font-mono-tabular mt-0.5 text-sm font-bold text-slate-900">
                {formatMmSs(examSession.stageElapsedSeconds)}
                {examSession.mode === 'full' &&
                  examSession.stage === 'practical' && (
                    <span className="ml-1 text-[10px] font-medium text-slate-400">
                      ({formatMmSs(totalElapsedSeconds)})
                    </span>
                  )}
              </p>
            </div>

            <div
              className={`rounded-xl border px-3 py-2 ${
                isCriticalTime
                  ? 'border-red-300 bg-red-50'
                  : isLowTime
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-slate-200/80 bg-white/90'
              }`}
            >
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Timer className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Time Remaining</span>
              </p>
              <p
                className={`font-mono-tabular mt-0.5 text-sm font-bold ${
                  isCriticalTime
                    ? 'text-red-700'
                    : isLowTime
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {formatMmSs(remainingSeconds)}
              </p>
            </div>
          </div>

          {/* Progress bar + Navigator Toggle */}
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-200"
                style={{
                  width: `${Math.round((stageAnswered / Math.max(1, stageQuestions.length)) * 100)}%`,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNavigator((prev) => !prev)}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>{showNavigator ? 'Hide Grid' : 'Question Grid'}</span>
            </button>
          </div>

          {showNavigator && (
            <div className="mt-3 border-t border-slate-200/70 pt-3">
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                {stageQuestions.map((q, idx) => {
                  const answered = examSession.answers[q.id] !== undefined;
                  const flagged = Boolean(examSession.flagged[q.id]);
                  const isCurrent = idx === examSession.currentIndex;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setExamSession((prev) =>
                          prev ? {...prev, currentIndex: idx} : null,
                        );
                        setShowNavigator(false);
                      }}
                      className={`font-mono-tabular relative flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-500/25'
                          : answered
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {idx + 1}
                      {flagged && (
                        <span
                          className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-500"
                          aria-label="Flagged"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Blue = Answered · White = Unanswered · Amber dot = Flagged for review
              </p>
            </div>
          )}
        </section>

        {/* Current Question Card */}
        {currentQ && (
          <article className="surface-card font-jp rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-mono-tabular font-bold text-blue-700">
                  Q{examSession.currentIndex + 1} / {stageQuestions.length}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-slate-800">
                  {SSW_TOPIC_MAP[currentQ.topic].englishLabel}
                </span>
                {currentQ.image && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Visual Judgment</span>
                    </span>
                  </>
                )}
                {currentQ.isCalculation && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                      <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Calculation &amp; Planning</span>
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setExamSession((prev) =>
                    prev
                      ? {
                          ...prev,
                          flagged: {
                            ...prev.flagged,
                            [currentQ.id]: !prev.flagged[currentQ.id],
                          },
                        }
                      : null,
                  )
                }
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isFlagged
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>

            {/* Practical Question Visual Figure */}
            {currentQ.image && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setZoomImage({
                      src: currentQ.image!,
                      alt: currentQ.imageAlt || 'Exam diagram',
                    })
                  }
                  className="group relative mx-auto inline-block cursor-zoom-in rounded-lg bg-white p-2 shadow-2xs"
                  aria-label="Zoom question diagram"
                >
                  <img
                    src={currentQ.image}
                    alt={currentQ.imageAlt || 'Exam figure'}
                    referrerPolicy="no-referrer"
                    className="mx-auto max-h-[240px] w-auto max-w-full rounded-md object-contain"
                  />
                  <span className="absolute right-2 bottom-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-blue-600 shadow-xs">
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Tap illustration to enlarge
                </p>
              </div>
            )}

            <h3 className="mt-4 text-base font-semibold leading-[2.15] tracking-tight text-slate-900 sm:text-lg">
              <FuriganaText text={currentQ.question} showFurigana={showFurigana} />
            </h3>

            <div className="mt-4 space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedOpt === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() =>
                      setExamSession((prev) =>
                        prev
                          ? {
                              ...prev,
                              answers: {
                                ...prev.answers,
                                [currentQ.id]: optIdx,
                              },
                            }
                          : null,
                      )
                    }
                    className={`flex min-h-[54px] w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/85 text-blue-950 shadow-2xs ring-2 ring-blue-500/15'
                        : 'border-slate-200/90 bg-white text-slate-800 hover:border-blue-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <span
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {OPTION_LETTERS[optIdx] ?? optIdx + 1}
                    </span>
                    <span className="leading-[2.05] font-medium">
                      <FuriganaText text={opt} showFurigana={showFurigana} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Navigation Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/70 pt-4">
              <button
                type="button"
                disabled={examSession.currentIndex === 0}
                onClick={() =>
                  setExamSession((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentIndex: Math.max(0, prev.currentIndex - 1),
                        }
                      : null,
                  )
                }
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {examSession.currentIndex < stageQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExamSession((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentIndex: Math.min(
                                stageQuestions.length - 1,
                                prev.currentIndex + 1,
                              ),
                            }
                          : null,
                      )
                    }
                    className="btn-primary-premium inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-semibold"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (stageRemaining > 0) {
                      setConfirmSubmitOpen(true);
                    } else {
                      handleFinishStageOrSubmit();
                    }
                  }}
                  className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    examSession.currentIndex === stageQuestions.length - 1 ||
                    stageRemaining === 0
                      ? 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white shadow-xs hover:brightness-110'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {examSession.mode === 'full' &&
                    examSession.stage === 'academic'
                      ? 'Finish Academic → Start Practical'
                      : 'Submit Exam'}
                  </span>
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Confirmation Dialog if Questions Remain Unanswered */}
        {confirmSubmitOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          >
            <div className="surface-glass w-full max-w-sm rounded-2xl p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {stageRemaining} Question{stageRemaining === 1 ? '' : 's'}{' '}
                    Unanswered
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {examSession.mode === 'full' &&
                    examSession.stage === 'academic'
                      ? 'Once you proceed to the Practical Section, you cannot return to Academic questions. Continue?'
                      : 'Unanswered questions count as 0 points. Are you ready to submit and grade your CBT exam?'}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep Working
                </button>
                <button
                  type="button"
                  onClick={handleFinishStageOrSubmit}
                  className="btn-primary-premium min-h-[38px] rounded-xl px-4 py-1.5 text-xs font-semibold"
                >
                  {examSession.mode === 'full' &&
                  examSession.stage === 'academic'
                    ? 'Start Practical'
                    : 'Submit Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Zoom Modal for Practical Diagrams */}
        {zoomImage && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            onClick={() => setZoomImage(null)}
          >
            <div
              className="relative max-w-2xl rounded-2xl bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                aria-label="Close diagram preview"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 text-white hover:bg-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={zoomImage.src}
                alt={zoomImage.alt}
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: OFFICIAL CBT SCORE REPORT & QUESTION REVIEW
  // =========================================================================
  if (view === 'result' && examResult) {
    const {attempt, questions, answers, flagged} = examResult;
    const totalPct = Math.round(
      (attempt.totalCorrect / Math.max(1, attempt.totalQuestions)) * 100,
    );
    const acadPct =
      attempt.academicTotal > 0
        ? Math.round((attempt.academicCorrect / attempt.academicTotal) * 100)
        : null;
    const pracPct =
      attempt.practicalTotal > 0
        ? Math.round((attempt.practicalCorrect / attempt.practicalTotal) * 100)
        : null;

    const filteredReview = questions.filter((q) => {
      if (reviewFilter === 'incorrect') {
        return answers[q.id] !== q.correct_index;
      }
      if (reviewFilter === 'flagged') {
        return Boolean(flagged[q.id]);
      }
      return true;
    });

    return (
      <div className="space-y-5">
        {/* Official Pass/Fail Score Banner */}
        <section
          className={`rounded-2xl border p-5 sm:p-6 shadow-xs ${
            attempt.passedOverall
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70'
              : 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50/60'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold">
                {attempt.passedOverall ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>OFFICIAL PASS STANDARD MET</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    <span>BELOW PASSING SCORE — REVIEW NEEDED</span>
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                Paper {attempt.paperSet} Result:{' '}
                <span className="font-mono-tabular">
                  {attempt.totalCorrect} / {attempt.totalQuestions} ({totalPct}
                  %)
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Time Taken:{' '}
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatMmSs(attempt.elapsedSeconds)}
                </span>{' '}
                · Official pass rule requires ≥ 18/30 (60%) Academic and ≥ 12/20
                (60%) Practical.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startExam(attempt.mode, attempt.paperSet)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retake Paper</span>
              </button>
              <button
                type="button"
                onClick={() => setView('lobby')}
                className="btn-primary-premium inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <span>Back to CBT Lobby</span>
              </button>
            </div>
          </div>

          {/* Section Breakdown Cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {attempt.academicTotal > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Academic Section (学科)
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      attempt.passedAcademic
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {attempt.passedAcademic ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-slate-900">
                  {attempt.academicCorrect} / {attempt.academicTotal} ({acadPct}
                  %)
                </p>
                <p className="text-[11px] text-slate-500">
                  Pass target: ≥ {SSW_EXAM_RULES.academicPassScore}/
                  {SSW_EXAM_RULES.academicQuestions} (60%)
                </p>
              </div>
            )}

            {attempt.practicalTotal > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Practical Section (実技)
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      attempt.passedPractical
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {attempt.passedPractical ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="font-mono-tabular mt-1 text-lg font-bold text-slate-900">
                  {attempt.practicalCorrect} / {attempt.practicalTotal} (
                  {pracPct}%)
                </p>
                <p className="text-[11px] text-slate-500">
                  Pass target: ≥ {SSW_EXAM_RULES.practicalPassScore}/
                  {SSW_EXAM_RULES.practicalQuestions} (60%)
                </p>
              </div>
            )}
          </div>

          {/* 5-Topic Score Breakdown */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-3.5">
            <h3 className="text-xs font-bold text-slate-900">
              Score Breakdown by Official SSW Topic
            </h3>
            <div className="mt-2.5 space-y-2">
              {attempt.topicScores.map((ts) => {
                const pct = Math.round(
                  (ts.correct / Math.max(1, ts.total)) * 100,
                );
                return (
                  <div key={ts.topic} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {SSW_TOPIC_MAP[ts.topic].englishLabel}
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {ts.correct}/{ts.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 60 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Full Answer Review */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Question-by-Question Review
            </h3>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              {(
                [
                  {id: 'all', label: `All (${questions.length})`},
                  {
                    id: 'incorrect',
                    label: `Incorrect (${questions.length - attempt.totalCorrect})`,
                  },
                  {
                    id: 'flagged',
                    label: `Flagged (${Object.values(flagged).filter(Boolean).length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReviewFilter(tab.id)}
                  className={`min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                    reviewFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredReview.map((q, idx) => {
            const picked = answers[q.id];
            const isCorrect = picked === q.correct_index;
            return (
              <article
                key={q.id}
                className="surface-card font-jp rounded-2xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono-tabular font-bold text-slate-700">
                    #{idx + 1} ·{' '}
                    {q.section === 'academic' ? 'Academic' : 'Practical'} ·{' '}
                    {SSW_TOPIC_MAP[q.topic].englishLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      isCorrect ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {picked === undefined ? 'Unanswered' : 'Incorrect'}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {q.image && (
                  <div className="mt-3 flex justify-center rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                    <img
                      src={q.image}
                      alt={q.imageAlt || 'Exam figure'}
                      className="max-h-[160px] w-auto rounded-md bg-white object-contain p-1"
                    />
                  </div>
                )}

                <p className="mt-3 text-sm font-semibold leading-[2.05] text-slate-900">
                  <FuriganaText text={q.question} showFurigana={showFurigana} />
                </p>

                <div className="mt-3 space-y-1.5">
                  {q.options.map((opt, optIdx) => {
                    const isRight = optIdx === q.correct_index;
                    const isPicked = optIdx === picked;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-xs leading-[1.95] ${
                          isRight
                            ? 'border-emerald-400 bg-emerald-50/80 text-emerald-950 font-semibold'
                            : isPicked
                              ? 'border-red-300 bg-red-50/80 text-red-900'
                              : 'border-slate-200/70 bg-slate-50/40 text-slate-600'
                        }`}
                      >
                        <span className="font-bold">
                          {OPTION_LETTERS[optIdx]}.
                        </span>
                        <span className="flex-1">
                          <FuriganaText text={opt} showFurigana={showFurigana} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs leading-[1.95] text-slate-700">
                  <p className="font-bold text-slate-900">Explanation</p>
                  <p className="mt-0.5">
                    <FuriganaText
                      text={q.explanation}
                      showFurigana={showFurigana}
                    />
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: TOPIC / VISUAL / CALCULATION PRACTICE MODE
  // =========================================================================
  if (view === 'practice') {
    const answeredCount = practiceQuestions.reduce(
      (sum, q) => (practiceAnswers[q.id] !== undefined ? sum + 1 : sum),
      0,
    );
    const remainingCount = practiceQuestions.length - answeredCount;
    const correctCount = practiceQuestions.reduce(
      (sum, q) =>
        practiceAnswers[q.id] === q.correct_index ? sum + 1 : sum,
      0,
    );

    const practiceTitle =
      practiceTopic === 'all'
        ? `Full PDF Question Bank (${allCbtQuestions.length} Questions)`
        : practiceTopic === 'images'
          ? 'Practical Visual & Diagram Judgment Drill'
          : practiceTopic === 'calculations'
            ? 'Practical Calculation & Planning Drill'
            : SSW_TOPIC_MAP[practiceTopic].englishLabel;

    const practiceBudgetSeconds = Math.max(
      60,
      practiceQuestions.length *
        Math.round(
          (SSW_EXAM_RULES.totalMinutes * 60) / SSW_EXAM_RULES.totalQuestions,
        ),
    );
    const practiceRemainingSeconds = Math.max(
      0,
      practiceBudgetSeconds - practiceElapsed,
    );

    return (
      <div className="space-y-4">
        <div className="surface-glass sticky top-16 z-20 rounded-2xl border border-slate-200/90 p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('lobby')}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>CBT Lobby</span>
              </button>
              <span className="text-xs font-bold text-slate-900">
                {practiceTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono-tabular text-xs font-semibold text-emerald-700">
                Score {correctCount}/{answeredCount}
              </span>
              <button
                type="button"
                onClick={() => setShowFurigana((prev) => !prev)}
                className={`inline-flex min-h-[34px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold ${
                  showFurigana
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Furigana: {showFurigana ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5">
              <p className="text-[10px] font-semibold text-slate-500">
                Answered
              </p>
              <p className="font-mono-tabular text-sm font-bold text-blue-700">
                {answeredCount}/{practiceQuestions.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5">
              <p className="text-[10px] font-semibold text-slate-500">
                Remaining
              </p>
              <p className="font-mono-tabular text-sm font-bold text-slate-900">
                {remainingCount} left
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Time Elapsed</span>
              </p>
              <p className="font-mono-tabular text-sm font-bold text-slate-900">
                {formatMmSs(practiceElapsed)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Timer className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Time Remaining</span>
              </p>
              <p
                className={`font-mono-tabular text-sm font-bold ${
                  practiceRemainingSeconds <= 120
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatMmSs(practiceRemainingSeconds)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {practiceQuestions.map((q, idx) => {
            const picked = practiceAnswers[q.id];
            const isAnswered = picked !== undefined;
            const isCorrect = picked === q.correct_index;

            return (
              <section
                key={q.id}
                className="surface-card font-jp rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono-tabular font-bold text-blue-700">
                    Q{idx + 1} / {practiceQuestions.length}
                  </span>
                  <span>
                    {q.section === 'academic' ? 'Academic' : 'Practical'} ·{' '}
                    {SSW_TOPIC_MAP[q.topic].englishLabel}
                  </span>
                </div>

                {q.image && (
                  <div className="mt-3 flex justify-center rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({
                          src: q.image!,
                          alt: q.imageAlt || 'Exam figure',
                        })
                      }
                      className="cursor-zoom-in rounded-lg bg-white p-1.5 shadow-2xs"
                    >
                      <img
                        src={q.image}
                        alt={q.imageAlt || 'Exam figure'}
                        className="max-h-[200px] w-auto rounded-md object-contain"
                      />
                    </button>
                  </div>
                )}

                <h3 className="mt-3 text-base font-semibold leading-[2.1] text-slate-900">
                  <FuriganaText text={q.question} showFurigana={showFurigana} />
                </h3>

                <div className="mt-3.5 space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isRight = optIdx === q.correct_index;
                    const isPicked = optIdx === picked;

                    let styleClass =
                      'border-slate-200/90 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/30';
                    if (isAnswered) {
                      if (isRight) {
                        styleClass =
                          'border-emerald-400 bg-emerald-50/85 text-emerald-950 font-semibold';
                      } else if (isPicked) {
                        styleClass =
                          'border-red-400 bg-red-50/85 text-red-950';
                      } else {
                        styleClass =
                          'border-slate-200/70 bg-slate-50/50 text-slate-500 opacity-75';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => {
                          if (isAnswered) return;
                          setPracticeAnswers((prev) => ({
                            ...prev,
                            [q.id]: optIdx,
                          }));
                          onRecordQuizAnswer(
                            q.id,
                            optIdx === q.correct_index,
                            q.partNumber,
                            false,
                          );
                        }}
                        className={`flex min-h-[50px] w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all ${styleClass}`}
                      >
                        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white/80 text-xs font-bold text-slate-700">
                          {OPTION_LETTERS[optIdx]}
                        </span>
                        <span className="leading-[2.0]">
                          <FuriganaText text={opt} showFurigana={showFurigana} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div
                    className={`mt-3.5 rounded-xl border p-3.5 text-xs leading-[2.0] ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <p className="font-bold text-slate-900">
                      {isCorrect ? 'Correct (+25 XP)' : 'Explanation'}
                    </p>
                    <p className="mt-0.5">
                      <FuriganaText
                        text={q.explanation}
                        showFurigana={showFurigana}
                      />
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {zoomImage && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            onClick={() => setZoomImage(null)}
          >
            <div
              className="relative max-w-2xl rounded-2xl bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                aria-label="Close diagram"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={zoomImage.src}
                alt={zoomImage.alt}
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: CBT EXAM LOBBY (100% CLEAN ENGLISH STRUCTURE + 3 FULL 50Q PAPERS)
  // =========================================================================
  return (
    <div className="space-y-5">
      {/* Official SSW Logistics Warehousing CBT Exam Structure Hero */}
      <section className="surface-hero rounded-2xl p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-300">
              Official SSW Logistics Warehousing CBT Format
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Mock CBT Exam Simulator
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              50 mixed multiple-choice questions · 80 minutes total · Japanese
              with Furigana · No listening audio · {allCbtQuestions.length} total
              textbook questions
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] text-slate-300">Academic Section</p>
            <p className="font-mono-tabular mt-1 text-base font-bold text-white">
              30 Qs · 40m
            </p>
            <p className="text-[11px] text-emerald-300">Pass ≥ 18/30 (60%)</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] text-slate-300">Practical Section</p>
            <p className="font-mono-tabular mt-1 text-base font-bold text-white">
              20 Qs · 40m
            </p>
            <p className="text-[11px] text-emerald-300">Pass ≥ 12/20 (60%)</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] text-slate-300">Practical Visuals</p>
            <p className="font-mono-tabular mt-1 text-base font-bold text-white">
              42 Diagrams
            </p>
            <p className="text-[11px] text-slate-300">Signs, GHS &amp; Gear</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] text-slate-300">Planning Math</p>
            <p className="font-mono-tabular mt-1 text-base font-bold text-white">
              18 Problems
            </p>
            <p className="text-[11px] text-slate-300">Workers, Time &amp; Load</p>
          </div>
        </div>
      </section>

      {/* Select Paper Set (3 Full 50-Question Exam Papers Covering Entire PDF) */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3.5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Select Exam Paper Set
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Every paper mixes all 5 official topics with 30 Academic + 20
              Practical questions
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((ps) => {
            const active = selectedPaperSet === ps;
            return (
              <button
                key={ps}
                type="button"
                onClick={() => setSelectedPaperSet(ps)}
                className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-left transition-all ${
                  active
                    ? 'border-blue-500 bg-blue-50/80 shadow-2xs ring-2 ring-blue-500/15'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    active ? 'text-blue-700' : 'text-slate-900'
                  }`}
                >
                  Paper Set {ps}
                </p>
                <p className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                  50 Qs · 80 min
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Paper Set Details & Launch Actions */}
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeBundle.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {activeBundle.subtitle}
              </p>
            </div>
            <span className="font-mono-tabular text-xs font-semibold text-blue-700">
              {activeBundle.imageQuestionCount} Visual ·{' '}
              {activeBundle.calculationQuestionCount} Math
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => startExam('full', selectedPaperSet)}
              className="btn-primary-premium inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold sm:col-span-3"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>
                Start Full CBT Exam · Paper {selectedPaperSet} (50 Qs · 80 min)
              </span>
            </button>

            <button
              type="button"
              onClick={() => startExam('academic', selectedPaperSet)}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 sm:col-span-1"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>Academic Only (30Q · 40m)</span>
            </button>

            <button
              type="button"
              onClick={() => startExam('practical', selectedPaperSet)}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 sm:col-span-2"
            >
              <ImageIcon
                className="h-3.5 w-3.5 text-indigo-600"
                aria-hidden="true"
              />
              <span>Practical Visual &amp; Math Only (20Q · 40m)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 100% Pure English Performance Analytics */}
      <PerformanceAnalyticsCard
        allParts={allParts}
        correctQuizIds={correctQuizIds}
        attemptedQuizIds={attemptedQuizIds}
        quizQuestionStats={quizQuestionStats}
        cbtExamHistory={cbtExamHistory}
        onPracticeTopic={(topic) => startTopicPractice(topic)}
      />

      {/* Focused Practice Drills (Untimed Study Practice Across Entire PDF) */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="border-b border-slate-200/70 pb-3.5">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Focused Topic &amp; Practical Drills
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Practice with instant explanations across all {allCbtQuestions.length}{' '}
            textbook questions
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => startTopicPractice('all')}
            className="surface-card-interactive flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left sm:col-span-2"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">
                Full PDF Question Bank Drill (Mixed All 5 Topics)
              </p>
              <p className="text-[11px] text-slate-500">
                All Academic reading, Practical visual judgment &amp; planning
                math questions across the entire textbook
              </p>
            </div>
            <span className="font-mono-tabular shrink-0 text-xs font-bold text-slate-900">
              {allCbtQuestions.length} Qs
            </span>
          </button>

          <button
            type="button"
            onClick={() => startTopicPractice('images')}
            className="surface-card-interactive flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">
                Visual &amp; Sign Judgment Drill
              </p>
              <p className="text-[11px] text-slate-500">
                Care marks, GHS labels, forklift &amp; safety diagrams
              </p>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-indigo-700">
              {allCbtQuestions.filter((q) => Boolean(q.image)).length} Qs
            </span>
          </button>

          <button
            type="button"
            onClick={() => startTopicPractice('calculations')}
            className="surface-card-interactive flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">
                Calculation &amp; Work Planning Drill
              </p>
              <p className="text-[11px] text-slate-500">
                Boxes/hour, workers, pallet stacks, weight &amp; breaks
              </p>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-amber-700">
              {allCbtQuestions.filter((q) => Boolean(q.isCalculation)).length}{' '}
              Qs
            </span>
          </button>

          {SSW_TOPICS.map((topic) => {
            const count = allCbtQuestions.filter(
              (q) => q.topic === topic.id,
            ).length;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => startTopicPractice(topic.id)}
                className="surface-card-interactive flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {topic.englishLabel}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {topic.description}
                  </p>
                </div>
                <span className="font-mono-tabular shrink-0 text-xs font-bold text-blue-700">
                  {count} Qs
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Per-User CBT Exam History */}
      {cbtExamHistory.length > 0 && (
        <section className="surface-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Recent CBT Exam History
            </h2>
            <span className="font-mono-tabular text-xs text-slate-500">
              {cbtExamHistory.length} attempt
              {cbtExamHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          <ul className="divide-y divide-slate-200/70">
            {cbtExamHistory.slice(0, 6).map((item) => {
              const pct = Math.round(
                (item.totalCorrect / Math.max(1, item.totalQuestions)) * 100,
              );
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      Paper {item.paperSet} ·{' '}
                      {item.mode === 'full'
                        ? 'Full CBT (50 Qs)'
                        : item.mode === 'academic'
                          ? 'Academic Only (30 Qs)'
                          : 'Practical Only (20 Qs)'}
                    </p>
                    <p className="font-mono-tabular mt-0.5 text-[11px] text-slate-500">
                      {item.academicTotal > 0 &&
                        `Academic ${item.academicCorrect}/${item.academicTotal}`}
                      {item.academicTotal > 0 && item.practicalTotal > 0 && ' · '}
                      {item.practicalTotal > 0 &&
                        `Practical ${item.practicalCorrect}/${item.practicalTotal}`}
                      {' · '}Time {formatMmSs(item.elapsedSeconds)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono-tabular font-bold ${
                        item.passedOverall
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {item.passedOverall ? 'PASS' : 'REVIEW'} · {pct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};
