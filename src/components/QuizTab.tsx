import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Languages,
  Layers,
  ListOrdered,
  Play,
  RotateCcw,
  Shuffle,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import {PerformanceAnalyticsCard} from './PerformanceAnalyticsCard';
import {QuestionFigureCard} from './QuestionFigureCard';
import type {
  CbtExamAttempt,
  CbtExamSection,
  CbtQuestion,
  PaperSetNumber,
  QuizQuestionStat,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  buildPaperSet,
  formatMmSs,
  getAllCbtQuestions,
  PAPER_SET_NUMBERS,
  SSW_EXAM_RULES,
  SSW_TOPIC_MAP,
  SSW_TOPICS,
} from '../utils/cbtExam';
import {shuffleQuizQuestions} from '../utils/quizCoverage';
import {playSfx, speakJapanese} from '../utils/soundEffects';

interface QuizTabProps {
  parts: StudyPart[];
  allParts: StudyPart[];
  correctQuizIds: string[];
  attemptedQuizIds?: string[];
  wrongQuizIds?: string[];
  dailyWrongQuizIds?: string[];
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  cbtExamHistory?: CbtExamAttempt[];
  initialFilter?: QuizFilter;
  filterTriggerKey?: number;
  onRecordQuizAnswer: (
    questionId: string,
    isCorrect: boolean,
    partNumber: number,
    partFinished: boolean,
  ) => void;
  onRecordCbtExamAttempt?: (
    attempt: CbtExamAttempt,
    perQuestionResults: {id: string; isCorrect: boolean}[],
  ) => void;
}

export type QuizFilter = 'all' | 'unmastered' | 'mistakes';
type QuizWorkspaceMode = 'practice' | 'cbt';
type SectionFilter = 'all' | CbtExamSection;
type CbtMockMode = 'full' | 'academic' | 'practical';

const OPTION_LETTERS = ['ア', 'イ', 'ウ', 'エ'];
const PRACTICE_PAGE_SIZE = 25;

export const QuizTab: React.FC<QuizTabProps> = ({
  parts,
  allParts,
  correctQuizIds,
  attemptedQuizIds = [],
  wrongQuizIds = [],
  dailyWrongQuizIds = [],
  quizQuestionStats,
  cbtExamHistory = [],
  initialFilter = 'all',
  filterTriggerKey = 0,
  onRecordQuizAnswer,
  onRecordCbtExamAttempt,
}) => {
  const [workspaceMode, setWorkspaceMode] =
    useState<QuizWorkspaceMode>('practice');
  const [showFurigana, setShowFurigana] = useState(true);

  // Practice Bank State (Full 800-Q Bank)
  const [filter, setFilter] = useState<QuizFilter>(initialFilter);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [topicFilter, setTopicFilter] = useState<SswExamTopic | null>(null);
  const [practiceAllModules, setPracticeAllModules] = useState(
    parts.length === allParts.length || initialFilter === 'mistakes',
  );
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [clearedInSessionIds, setClearedInSessionIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(PRACTICE_PAGE_SIZE);

  // Figure Zoom Lightbox State
  const [zoomedFigure, setZoomedFigure] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // Timed CBT Mock Exam State (16 Paper Sets × 50 Qs)
  const [paperSet, setPaperSet] = useState<PaperSetNumber>(1);
  const [cbtMode, setCbtMode] = useState<CbtMockMode>('full');
  const [cbtStage, setCbtStage] = useState<'lobby' | 'active' | 'results'>(
    'lobby',
  );
  const [cbtCursor, setCbtCursor] = useState(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<string, number>>({});
  const [cbtSecondsLeft, setCbtSecondsLeft] = useState(
    SSW_EXAM_RULES.totalMinutes * 60,
  );
  const [cbtStartTimestamp, setCbtStartTimestamp] = useState<number>(0);
  const [lastAttemptResult, setLastAttemptResult] =
    useState<CbtExamAttempt | null>(null);

  const isHeaderSubset = parts.length > 0 && parts.length < allParts.length;

  useEffect(() => {
    setPracticeAllModules(
      parts.length === allParts.length || initialFilter === 'mistakes',
    );
    setTopicFilter(null);
    setSectionFilter('all');
    setFilter(initialFilter);
    setShuffledIds(null);
    setAnswers({});
    setClearedInSessionIds([]);
    setVisibleLimit(PRACTICE_PAGE_SIZE);
    if (initialFilter === 'mistakes') {
      setWorkspaceMode('practice');
    }
  }, [parts, allParts.length, initialFilter, filterTriggerKey]);

  // Full 800-Question CBT Bank (480 Academic + 320 Practical)
  const allBankQuestions = useMemo<CbtQuestion[]>(
    () => getAllCbtQuestions(allParts),
    [allParts],
  );

  const selectedPartNumbers = useMemo(
    () => new Set(parts.map((p) => p.part_number)),
    [parts],
  );

  const scopeBankQuestions = useMemo<CbtQuestion[]>(() => {
    if (practiceAllModules || !isHeaderSubset) {
      return allBankQuestions;
    }
    return allBankQuestions.filter((q) =>
      selectedPartNumbers.has(q.partNumber),
    );
  }, [
    allBankQuestions,
    practiceAllModules,
    isHeaderSubset,
    selectedPartNumbers,
  ]);

  const orderedQuestions = useMemo<CbtQuestion[]>(() => {
    if (!shuffledIds) {
      return scopeBankQuestions;
    }
    const byId = new Map<string, CbtQuestion>();
    for (const q of scopeBankQuestions) {
      byId.set(q.id, q);
    }
    const result: CbtQuestion[] = [];
    for (const id of shuffledIds) {
      const found = byId.get(id);
      if (found) {
        result.push(found);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      result.push(remaining);
    }
    return result;
  }, [scopeBankQuestions, shuffledIds]);

  const sectionAndTopicQuestions = useMemo(() => {
    let base = orderedQuestions;
    if (sectionFilter !== 'all') {
      base = base.filter((q) => q.section === sectionFilter);
    }
    if (topicFilter) {
      base = base.filter((q) => q.topic === topicFilter);
    }
    return base;
  }, [orderedQuestions, sectionFilter, topicFilter]);

  const visibleQuestions = useMemo(() => {
    if (filter === 'mistakes') {
      return sectionAndTopicQuestions.filter(
        (q) =>
          wrongQuizIds.includes(q.id) ||
          clearedInSessionIds.includes(q.id) ||
          answers[q.id] !== undefined,
      );
    }
    if (filter === 'unmastered') {
      return sectionAndTopicQuestions.filter(
        (q) => !correctQuizIds.includes(q.id) || answers[q.id] !== undefined,
      );
    }
    return sectionAndTopicQuestions;
  }, [
    sectionAndTopicQuestions,
    filter,
    wrongQuizIds,
    clearedInSessionIds,
    correctQuizIds,
    answers,
  ]);

  useEffect(() => {
    setVisibleLimit(PRACTICE_PAGE_SIZE);
  }, [filter, sectionFilter, topicFilter, practiceAllModules, shuffledIds]);

  // --- Timed CBT Mock Bundle ---
  const paperBundle = useMemo(
    () => buildPaperSet(allParts, paperSet),
    [allParts, paperSet],
  );

  const cbtActiveQuestions = useMemo<CbtQuestion[]>(() => {
    if (cbtMode === 'academic') return paperBundle.academic;
    if (cbtMode === 'practical') return paperBundle.practical;
    return paperBundle.allQuestions;
  }, [paperBundle, cbtMode]);

  const submitCbtExam = React.useCallback(() => {
    const totalQ = cbtActiveQuestions.length;
    if (totalQ === 0) return;

    let totalCorrect = 0;
    let acCorrect = 0;
    let acTotal = 0;
    let prCorrect = 0;
    let prTotal = 0;

    const perQuestionResults: {id: string; isCorrect: boolean}[] = [];

    for (const q of cbtActiveQuestions) {
      const picked = cbtAnswers[q.id];
      const ok = picked === q.correct_index;
      if (ok) totalCorrect += 1;
      if (q.section === 'academic') {
        acTotal += 1;
        if (ok) acCorrect += 1;
      } else {
        prTotal += 1;
        if (ok) prCorrect += 1;
      }
      perQuestionResults.push({id: q.id, isCorrect: ok});
    }

    const passedOverall =
      cbtMode === 'full'
        ? totalCorrect >= 30 &&
          acCorrect >= SSW_EXAM_RULES.academicPassScore &&
          prCorrect >= SSW_EXAM_RULES.practicalPassScore
        : cbtMode === 'academic'
          ? acCorrect >= SSW_EXAM_RULES.academicPassScore
          : prCorrect >= SSW_EXAM_RULES.practicalPassScore;

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - cbtStartTimestamp) / 1000),
    );

    const attempt: CbtExamAttempt = {
      id: `cbt-${Date.now()}`,
      mode: cbtMode,
      paperSet,
      totalCorrect,
      totalQuestions: totalQ,
      passedOverall,
      elapsedSeconds,
      timestamp: new Date().toISOString(),
      academicCorrect: acTotal > 0 ? acCorrect : undefined,
      academicTotal: acTotal > 0 ? acTotal : undefined,
      practicalCorrect: prTotal > 0 ? prCorrect : undefined,
      practicalTotal: prTotal > 0 ? prTotal : undefined,
    };

    setLastAttemptResult(attempt);
    setCbtStage('results');
    playSfx(passedOverall ? 'levelUp' : 'complete');
    onRecordCbtExamAttempt?.(attempt, perQuestionResults);
  }, [
    cbtActiveQuestions,
    cbtAnswers,
    cbtMode,
    cbtStartTimestamp,
    onRecordCbtExamAttempt,
    paperSet,
  ]);

  useEffect(() => {
    if (workspaceMode !== 'cbt' || cbtStage !== 'active') return;
    const timer = window.setInterval(() => {
      setCbtSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          submitCbtExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [workspaceMode, cbtStage, submitCbtExam]);

  if (allBankQuestions.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-8 text-center">
        <p className="font-jp text-sm text-slate-600">
          <FuriganaText
            text="{選択|せんたく}したパートに{問題|もんだい}がありません。"
            showFurigana={showFurigana}
          />
        </p>
      </div>
    );
  }

  const academicCount = scopeBankQuestions.filter(
    (q) => q.section === 'academic',
  ).length;
  const practicalCount = scopeBankQuestions.filter(
    (q) => q.section === 'practical',
  ).length;

  const totalScopeCount = sectionAndTopicQuestions.length;
  const answeredCount = sectionAndTopicQuestions.reduce(
    (acc, q) => (answers[q.id] !== undefined ? acc + 1 : acc),
    0,
  );
  const correctCount = sectionAndTopicQuestions.reduce((acc, q) => {
    const selected = answers[q.id];
    return selected === q.correct_index ? acc + 1 : acc;
  }, 0);
  const allAnswered =
    totalScopeCount > 0 && answeredCount === totalScopeCount;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const displayedQuestions = visibleQuestions.slice(0, visibleLimit);

  const handleSelectOption = (question: CbtQuestion, optionIndex: number) => {
    if (answers[question.id] !== undefined) return;
    const isCorrect = optionIndex === question.correct_index;
    playSfx(isCorrect ? 'correct' : 'wrong');

    const nextAnswers = {...answers, [question.id]: optionIndex};
    setAnswers(nextAnswers);

    const partQuestions = scopeBankQuestions.filter(
      (item) => item.partNumber === question.partNumber,
    );
    const partFinished = partQuestions.every(
      (item) => nextAnswers[item.id] !== undefined,
    );

    if (isCorrect && wrongQuizIds.includes(question.id)) {
      setClearedInSessionIds((prev) =>
        prev.includes(question.id) ? prev : [...prev, question.id],
      );
    }

    onRecordQuizAnswer(
      question.id,
      isCorrect,
      question.partNumber,
      partFinished,
    );
  };

  const handleShuffle = () => {
    playSfx('click');
    const shuffled = shuffleQuizQuestions(scopeBankQuestions).map((q) => q.id);
    setShuffledIds(shuffled);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handlePracticeTopicFromAnalytics = (topic: SswExamTopic) => {
    playSfx('click');
    setWorkspaceMode('practice');
    if (isHeaderSubset && !practiceAllModules) {
      setPracticeAllModules(true);
    }
    setSectionFilter('all');
    setTopicFilter(topic);
    setFilter('all');
  };

  const handleStartCbtExam = () => {
    playSfx('click');
    const mins =
      cbtMode === 'full'
        ? SSW_EXAM_RULES.totalMinutes
        : cbtMode === 'academic'
          ? SSW_EXAM_RULES.academicMinutes
          : SSW_EXAM_RULES.practicalMinutes;
    setCbtAnswers({});
    setCbtCursor(0);
    setCbtSecondsLeft(mins * 60);
    setCbtStartTimestamp(Date.now());
    setLastAttemptResult(null);
    setCbtStage('active');
  };

  return (
    <div className="font-jp space-y-4 sm:space-y-5">
      {/* Top Mode Switcher: Full 800-Q Practice Bank vs Timed 50-Q SSW CBT Mock */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl p-2 sm:px-4 sm:py-2.5">
        <div
          role="tablist"
          aria-label="Quiz Workspace Mode"
          className="grid flex-1 grid-cols-2 gap-1.5 sm:max-w-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'practice'}
            onClick={() => {
              playSfx('click');
              setWorkspaceMode('practice');
            }}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              workspaceMode === 'practice'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <BookOpenCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Practice Bank ({allBankQuestions.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'cbt'}
            onClick={() => {
              playSfx('click');
              setWorkspaceMode('cbt');
            }}
            className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              workspaceMode === 'cbt'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>CBT Mock (16 Sets)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFurigana((prev) => !prev)}
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
            showFurigana
              ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
              : 'border-slate-200/90 bg-white text-slate-600'
          }`}
        >
          <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>ふりがな</span>
        </button>
      </div>

      {/* Spider Chart Performance Analytics */}
      {!(workspaceMode === 'cbt' && cbtStage === 'active') && (
        <PerformanceAnalyticsCard
          allParts={allParts}
          correctQuizIds={correctQuizIds}
          attemptedQuizIds={attemptedQuizIds}
          quizQuestionStats={quizQuestionStats}
          cbtExamHistory={cbtExamHistory}
          onPracticeTopic={handlePracticeTopicFromAnalytics}
        />
      )}

      {workspaceMode === 'cbt' ? (
        /* ==================== TIMED SSW CBT MOCK EXAM (16 PAPER SETS) ==================== */
        cbtStage === 'lobby' ? (
          <section className="surface-card space-y-4 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  OFFICIAL SSW LOGISTICS CBT SIMULATOR
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {paperBundle.title} · 50 Questions / 80 Minutes
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {paperBundle.subtitle}
                </p>
              </div>
            </div>

            {/* Paper Set 1-16 Grid */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">
                Select Mock Paper Set (All 16 Sets Cover All 800 Questions):
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {PAPER_SET_NUMBERS.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      playSfx('click');
                      setPaperSet(num);
                    }}
                    className={`font-mono-tabular min-h-[40px] rounded-xl border text-xs font-bold transition-all ${
                      paperSet === num
                        ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    #{String(num).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Mode Selector */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ['full', 'Full CBT Exam', '50 Qs (30 Ac + 20 Pr) · 80 min'],
                  ['academic', 'Academic Only', '30 Qs (Pass ≥18) · 40 min'],
                  [
                    'practical',
                    'Practical Visuals',
                    '20 Qs (Pass ≥12) · 40 min',
                  ],
                ] as [CbtMockMode, string, string][]
              ).map(([mKey, title, sub]) => (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => {
                    playSfx('click');
                    setCbtMode(mKey);
                  }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    cbtMode === mKey
                      ? 'border-blue-500 bg-blue-50/80 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
              <span>
                <strong className="font-mono-tabular text-slate-900">
                  {paperBundle.imageQuestionCount}
                </strong>{' '}
                figure questions ·{' '}
                <strong className="font-mono-tabular text-slate-900">
                  {paperBundle.calculationQuestionCount}
                </strong>{' '}
                math questions · Official Pass ≥60%
              </span>
              <button
                type="button"
                onClick={handleStartCbtExam}
                className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Start Paper #{String(paperSet).padStart(2, '0')}</span>
              </button>
            </div>

            {/* CBT Exam History Scoreboard */}
            {cbtExamHistory.length > 0 && (
              <div className="border-t border-slate-200/80 pt-4">
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Past CBT Mock Exam Attempts ({cbtExamHistory.length})
                  </span>
                  <span className="font-mono-tabular text-slate-500">
                    Pass Target ≥ 60%
                  </span>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                  {cbtExamHistory.map((attempt) => {
                    const pct = Math.round(
                      (attempt.totalCorrect /
                        Math.max(1, attempt.totalQuestions)) *
                        100,
                    );
                    const dateLabel = new Date(
                      attempt.timestamp,
                    ).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={attempt.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              attempt.passedOverall
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {attempt.passedOverall ? 'PASS' : 'RETRY'}
                          </span>
                          <span className="font-mono-tabular font-bold text-slate-900">
                            Paper #{String(attempt.paperSet).padStart(2, '0')}
                          </span>
                          <span className="capitalize text-slate-500">
                            ({attempt.mode})
                          </span>
                        </div>

                        <div className="font-mono-tabular flex items-center gap-3 text-slate-700">
                          <span className="font-bold text-slate-900">
                            {attempt.totalCorrect}/{attempt.totalQuestions} (
                            {pct}%)
                          </span>
                          <span className="text-slate-500">
                            {formatMmSs(attempt.elapsedSeconds)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {dateLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : cbtStage === 'active' ? (
          /* Active Timed CBT Runner */
          (() => {
            const q = cbtActiveQuestions[cbtCursor];
            const answeredTotal = cbtActiveQuestions.filter(
              (item) => cbtAnswers[item.id] !== undefined,
            ).length;
            const picked = q ? cbtAnswers[q.id] : undefined;

            return (
              <div className="space-y-4">
                <div className="surface-glass sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-tabular inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                      <Clock
                        className="h-3.5 w-3.5 text-amber-400"
                        aria-hidden="true"
                      />
                      <span>{formatMmSs(cbtSecondsLeft)}</span>
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-slate-700">
                      Q{cbtCursor + 1}/{cbtActiveQuestions.length} · Answered{' '}
                      {answeredTotal}/{cbtActiveQuestions.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCbtStage('lobby')}
                      className="min-h-[36px] rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitCbtExam}
                      className="btn-primary-premium min-h-[36px] rounded-xl px-3.5 py-1 text-xs font-semibold"
                    >
                      Submit &amp; Grade
                    </button>
                  </div>
                </div>

                {/* Compact Question Navigator */}
                <div className="surface-card rounded-2xl p-3">
                  <div className="flex flex-wrap gap-1">
                    {cbtActiveQuestions.map((item, idx) => {
                      const isCurr = idx === cbtCursor;
                      const isDone = cbtAnswers[item.id] !== undefined;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCbtCursor(idx)}
                          className={`font-mono-tabular h-7 min-w-[28px] rounded-lg px-1.5 text-[11px] font-bold transition-all ${
                            isCurr
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                              : isDone
                                ? 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {q && (
                  <section className="surface-card space-y-4 rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-bold text-blue-700">
                        {q.section === 'practical'
                          ? 'Practical Visual'
                          : 'Academic'}{' '}
                        · {SSW_TOPIC_MAP[q.topic]?.shortLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakJapanese(q.question)}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700"
                      >
                        <Volume2
                          className="h-3.5 w-3.5 text-blue-600"
                          aria-hidden="true"
                        />
                        <span>Listen</span>
                      </button>
                    </div>

                    {q.image && (
                      <QuestionFigureCard
                        image={q.imageMeta ?? q.image}
                        fallbackAlt={q.imageAlt}
                        showFurigana={showFurigana}
                        revealCaption={false}
                        variant="prominent"
                        onZoom={(src, alt) => setZoomedFigure({src, alt})}
                      />
                    )}

                    <h3 className="text-base font-semibold leading-[2.1] text-slate-900">
                      <FuriganaText
                        text={q.question}
                        showFurigana={showFurigana}
                      />
                    </h3>

                    <div className="space-y-2.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = picked === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              playSfx('click');
                              setCbtAnswers((prev) => ({
                                ...prev,
                                [q.id]: optIdx,
                              }));
                            }}
                            className={`flex min-h-[50px] w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-2xs'
                                : 'border-slate-200/90 bg-white text-slate-800 hover:border-blue-300'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {OPTION_LETTERS[optIdx] ?? optIdx + 1}
                            </span>
                            <span className="leading-[2.0] font-medium">
                              <FuriganaText
                                text={opt}
                                showFurigana={showFurigana}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        disabled={cbtCursor === 0}
                        onClick={() => setCbtCursor((c) => Math.max(0, c - 1))}
                        className="surface-card-interactive inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        <span>Previous</span>
                      </button>
                      {cbtCursor + 1 < cbtActiveQuestions.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCbtCursor((c) =>
                              Math.min(cbtActiveQuestions.length - 1, c + 1),
                            )
                          }
                          className="btn-primary-premium inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={submitCbtExam}
                          className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>Finish &amp; Grade</span>
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </div>
            );
          })()
        ) : (
          /* CBT Results & Full Question Review */
          lastAttemptResult && (
            <div className="space-y-4">
              <section
                className={`rounded-2xl border p-5 sm:p-6 ${
                  lastAttemptResult.passedOverall
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
                    : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        lastAttemptResult.passedOverall
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      <Award className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {lastAttemptResult.passedOverall
                          ? `PASSED · Paper #${String(lastAttemptResult.paperSet).padStart(2, '0')}`
                          : `Review Needed · Paper #${String(lastAttemptResult.paperSet).padStart(2, '0')}`}
                      </h2>
                      <p className="text-xs text-slate-600">
                        Score:{' '}
                        <strong className="font-mono-tabular text-slate-900">
                          {lastAttemptResult.totalCorrect}/
                          {lastAttemptResult.totalQuestions}
                        </strong>{' '}
                        (
                        {Math.round(
                          (lastAttemptResult.totalCorrect /
                            Math.max(1, lastAttemptResult.totalQuestions)) *
                            100,
                        )}
                        %) · Time: {formatMmSs(lastAttemptResult.elapsedSeconds)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCbtStage('lobby')}
                    className="btn-primary-premium min-h-[42px] rounded-xl px-4 py-2 text-xs font-semibold"
                  >
                    Choose Another Paper Set
                  </button>
                </div>
              </section>

              <div className="space-y-3">
                {cbtActiveQuestions.map((q, idx) => {
                  const picked = cbtAnswers[q.id];
                  const ok = picked === q.correct_index;
                  return (
                    <div
                      key={q.id}
                      className="surface-card space-y-3 rounded-2xl p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono-tabular font-bold text-slate-700">
                          #{idx + 1} · {q.section.toUpperCase()}
                        </span>
                        <span
                          className={`font-semibold ${
                            ok ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {ok ? 'Correct ✓' : 'Missed ✗'}
                        </span>
                      </div>

                      {q.image && (
                        <QuestionFigureCard
                          image={q.imageMeta ?? q.image}
                          fallbackAlt={q.imageAlt}
                          showFurigana={showFurigana}
                          revealCaption
                          variant="compact"
                          onZoom={(src, alt) => setZoomedFigure({src, alt})}
                        />
                      )}

                      <p className="text-sm font-semibold leading-[2.0] text-slate-900">
                        <FuriganaText
                          text={q.question}
                          showFurigana={showFurigana}
                        />
                      </p>
                      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-[1.9] text-slate-700">
                        <strong className="text-emerald-700">
                          Answer ({OPTION_LETTERS[q.correct_index]}):{' '}
                        </strong>
                        <FuriganaText
                          text={q.options[q.correct_index]}
                          showFurigana={showFurigana}
                        />
                        <br />
                        <FuriganaText
                          text={q.explanation}
                          showFurigana={showFurigana}
                        />
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )
      ) : (
        /* ==================== FULL 800-Q PRACTICE BANK ==================== */
        <>
          {/* Score & Order Bar */}
          <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold tracking-tight text-slate-900">
                <FuriganaText
                  text="{得点|とくてん}"
                  showFurigana={showFurigana}
                />
                :{' '}
                <span className="font-mono-tabular">
                  {correctCount} / {totalScopeCount}
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-slate-600">
                {answeredCount}/{totalScopeCount} answered
              </span>
              {answeredCount > 0 && (
                <>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-blue-600">
                    {accuracy}%
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleShuffle}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  shuffledIds !== null
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{shuffledIds ? 'Re-Shuffle' : 'Shuffle All'}</span>
              </button>

              {shuffledIds !== null && (
                <button
                  type="button"
                  onClick={() => setShuffledIds(null)}
                  className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setAnswers({})}
                disabled={answeredCount === 0}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Comprehensive Filter Panel (All 800 Qs: 480 Academic + 320 Practical + 5 Topics) */}
          <section className="surface-card space-y-3 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <p className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
                  Full SSW Exam Bank · {scopeBankQuestions.length} Questions (
                  {academicCount} Academic + {practicalCount} Visual Practical)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isHeaderSubset && (
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
                    <button
                      type="button"
                      onClick={() => setPracticeAllModules(false)}
                      className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        !practiceAllModules
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Part {parts[0].part_number}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticeAllModules(true)}
                      className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        practiceAllModules
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      <span>All 800 Qs</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      filter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    All ({sectionAndTopicQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unmastered')}
                    className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      filter === 'unmastered'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Unmastered
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeAllModules(true);
                      setFilter('mistakes');
                    }}
                    className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      filter === 'mistakes'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : wrongQuizIds.length > 0
                          ? 'text-amber-700 hover:bg-amber-50'
                          : 'text-slate-600'
                    }`}
                  >
                    Mistakes ({wrongQuizIds.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Section Filter (All / Academic / Practical Visuals) */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-2.5 pb-0.5">
              {(
                [
                  ['all', `All Sections (${scopeBankQuestions.length})`],
                  ['academic', `Academic (${academicCount})`],
                  ['practical', `Practical Visuals (${practicalCount})`],
                ] as [SectionFilter, string][]
              ).map(([secKey, label]) => (
                <button
                  key={secKey}
                  type="button"
                  onClick={() => setSectionFilter(secKey)}
                  className={`inline-flex min-h-[34px] items-center gap-1 rounded-xl border px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    sectionFilter === secKey
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {secKey === 'practical' && (
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Syllabus Topic Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setTopicFilter(null)}
                className={`min-h-[34px] rounded-xl border px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  topicFilter === null
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                All 5 Exam Topics
              </button>
              {SSW_TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopicFilter(t.id)}
                  className={`min-h-[34px] rounded-xl border px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    topicFilter === t.id
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.shortLabel}
                </button>
              ))}
            </div>

            {/* Daily Mistake Queue Callout */}
            {wrongQuizIds.length > 0 && filter !== 'mistakes' && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-orange-50/70 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-xs text-amber-950">
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="font-mono-tabular">
                      {wrongQuizIds.length}
                    </strong>{' '}
                    missed question{wrongQuizIds.length === 1 ? '' : 's'} queued
                    {dailyWrongQuizIds.length > 0
                      ? ` (${dailyWrongQuizIds.length} from today)`
                      : ''}{' '}
                    · Clear each for{' '}
                    <strong className="font-semibold">+15 bonus XP</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPracticeAllModules(true);
                    setFilter('mistakes');
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Practice Mistakes</span>
                </button>
              </div>
            )}
          </section>

          {allAnswered && (
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70 p-5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Session Complete! {correctCount} / {totalScopeCount} (
                    {accuracy}%)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    handleShuffle();
                  }}
                  className="btn-primary-premium inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  <Shuffle className="h-4 w-4" aria-hidden="true" />
                  <span>Shuffle &amp; Retake</span>
                </button>
              </div>
            </div>
          )}

          {visibleQuestions.length === 0 ? (
            <div className="surface-card rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No pending questions match this filter!
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="btn-primary-premium mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Show All Questions
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {displayedQuestions.map((q, qIdx) => {
                const selectedIdx = answers[q.id];
                const isAnswered = selectedIdx !== undefined;
                const isUserCorrect = selectedIdx === q.correct_index;

                return (
                  <section
                    key={q.id}
                    className="surface-card rounded-2xl p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
                      <span className="font-mono-tabular font-semibold text-blue-600">
                        <FuriganaText
                          text={`{第|だい}${qIdx + 1}{問|もん}`}
                          showFurigana={showFurigana}
                        />{' '}
                        / {visibleQuestions.length}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {q.section === 'practical' ? 'Practical' : 'Academic'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{SSW_TOPIC_MAP[q.topic]?.shortLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Part {q.partNumber}</span>
                        <button
                          type="button"
                          onClick={() => speakJapanese(q.question)}
                          aria-label="Listen to question"
                          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {q.image && (
                      <div className="mt-3">
                        <QuestionFigureCard
                          image={q.imageMeta ?? q.image}
                          fallbackAlt={q.imageAlt}
                          showFurigana={showFurigana}
                          revealCaption={isAnswered}
                          variant={
                            q.section === 'practical' ? 'prominent' : 'side'
                          }
                          onZoom={(src, alt) => setZoomedFigure({src, alt})}
                        />
                      </div>
                    )}

                    <h3 className="mt-3 text-base font-semibold leading-[2.15] tracking-tight text-slate-900">
                      <FuriganaText
                        text={q.question}
                        showFurigana={showFurigana}
                      />
                    </h3>

                    <div className="mt-4 space-y-2.5">
                      {q.options.map((option, optIdx) => {
                        const isThisCorrect = optIdx === q.correct_index;
                        const isThisSelected = optIdx === selectedIdx;

                        let containerClasses =
                          'border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 text-slate-800 hover:border-blue-300/90 hover:from-white hover:to-blue-50/30';
                        let letterClasses =
                          'border-slate-200/90 bg-slate-50 text-slate-600';
                        let statusLabel: React.ReactNode = null;

                        if (isAnswered) {
                          if (isThisCorrect) {
                            containerClasses =
                              'border-emerald-400 bg-gradient-to-r from-emerald-50/90 to-teal-50/60 text-emerald-950 shadow-2xs';
                            letterClasses =
                              'border-emerald-600 bg-emerald-600 text-white';
                            statusLabel = (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                                <CheckCircle2
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                <span>
                                  <FuriganaText
                                    text="{正解|せいかい}"
                                    showFurigana={showFurigana}
                                  />
                                </span>
                              </span>
                            );
                          } else if (isThisSelected) {
                            containerClasses =
                              'border-red-400 bg-gradient-to-r from-red-50/90 to-rose-50/60 text-red-950';
                            letterClasses =
                              'border-red-600 bg-red-600 text-white';
                            statusLabel = (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
                                <XCircle
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                <span>
                                  <FuriganaText
                                    text="{不正解|ふせいかい}"
                                    showFurigana={showFurigana}
                                  />
                                </span>
                              </span>
                            );
                          } else {
                            containerClasses =
                              'border-slate-200/70 bg-slate-50/40 text-slate-500 opacity-70';
                            letterClasses =
                              'border-slate-200 bg-slate-100 text-slate-400';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(q, optIdx)}
                            className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${containerClasses} ${
                              isAnswered ? 'cursor-default' : 'cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${letterClasses}`}
                              >
                                {OPTION_LETTERS[optIdx] ?? optIdx + 1}
                              </span>
                              <span className="leading-[2.05] font-medium">
                                <FuriganaText
                                  text={option}
                                  showFurigana={showFurigana}
                                />
                              </span>
                            </div>
                            {statusLabel}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`mt-4 rounded-xl border p-4 text-sm leading-[2.05] ${
                          isUserCorrect
                            ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/75 to-teal-50/40 text-emerald-950'
                            : 'border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-900">
                            <FuriganaText
                              text={
                                isUserCorrect
                                  ? clearedInSessionIds.includes(q.id)
                                    ? '{正解|せいかい} (+40 XP · {弱点克服|じゃくてんこくふく}!) ・ {解説|かいせつ}'
                                    : '{正解|せいかい} (+25 XP) ・ {解説|かいせつ}'
                                  : '{解説|かいせつ} ({間違|まちが}いリストに{追加|ついか})'
                              }
                              showFurigana={showFurigana}
                            />
                          </p>
                          <button
                            type="button"
                            onClick={() => speakJapanese(q.explanation)}
                            aria-label="Listen to explanation"
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700"
                          >
                            <Volume2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                        <p className="mt-1">
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

              {visibleLimit < visibleQuestions.length && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('click');
                      setVisibleLimit((prev) => prev + PRACTICE_PAGE_SIZE);
                    }}
                    className="btn-primary-premium inline-flex min-h-[46px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold sm:text-sm"
                  >
                    <span>
                      Load Next{' '}
                      {Math.min(
                        PRACTICE_PAGE_SIZE,
                        visibleQuestions.length - visibleLimit,
                      )}{' '}
                      Questions ({displayedQuestions.length} /{' '}
                      {visibleQuestions.length})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Fullscreen Zoom Modal for Exam Figure Questions */}
      {zoomedFigure && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exam Figure Zoom"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
          onClick={() => setZoomedFigure(null)}
        >
          <div
            className="relative max-h-[88vh] max-w-2xl overflow-auto rounded-2xl border border-white/15 bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedFigure(null)}
              aria-label="Close image zoom"
              className="absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 text-white hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={zoomedFigure.src}
              alt={zoomedFigure.alt}
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
            />
            <p className="mt-2 text-center text-xs font-medium text-slate-600">
              <FuriganaText
                text={zoomedFigure.alt}
                showFurigana={showFurigana}
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
