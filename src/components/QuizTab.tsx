import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Languages,
  Layers,
  ListOrdered,
  RotateCcw,
  Shuffle,
  XCircle,
} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import {PerformanceAnalyticsCard} from './PerformanceAnalyticsCard';
import type {
  CbtExamAttempt,
  QuizQuestionStat,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  inferTopicForAcademicQuestion,
  SSW_TOPIC_MAP,
} from '../utils/cbtExam';
import {
  buildFullExamQuizBank,
  shuffleQuizQuestions,
  type ComprehensiveQuizQuestion,
  type QuizModuleCode,
} from '../utils/quizCoverage';

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
}

export type QuizFilter = 'all' | 'unmastered' | 'mistakes';
type ModuleFilter = 'ALL' | QuizModuleCode;

const OPTION_LETTERS = ['ア', 'イ', 'ウ', 'エ'];

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
}) => {
  const [showFurigana, setShowFurigana] = useState(true);
  const [filter, setFilter] = useState<QuizFilter>(initialFilter);
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('ALL');
  const [topicFilter, setTopicFilter] = useState<SswExamTopic | null>(null);
  const [practiceAllModules, setPracticeAllModules] = useState(
    initialFilter === 'mistakes',
  );
  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [clearedInSessionIds, setClearedInSessionIds] = useState<string[]>([]);

  const isHeaderSubset = parts.length > 0 && parts.length < allParts.length;

  useEffect(() => {
    setPracticeAllModules(initialFilter === 'mistakes');
    setModuleFilter('ALL');
    setTopicFilter(null);
    setFilter(initialFilter);
    setShuffledIds(null);
    setAnswers({});
    setClearedInSessionIds([]);
  }, [parts, initialFilter, filterTriggerKey]);

  const effectiveParts = useMemo(
    () => (practiceAllModules ? allParts : parts),
    [practiceAllModules, allParts, parts],
  );

  const bank = useMemo(
    () => buildFullExamQuizBank(effectiveParts, allParts),
    [effectiveParts, allParts],
  );

  const orderedQuestions = useMemo<ComprehensiveQuizQuestion[]>(() => {
    if (!shuffledIds) {
      return bank.questions;
    }
    const byId = new Map<string, ComprehensiveQuizQuestion>();
    for (const q of bank.questions) {
      byId.set(q.id, q);
    }
    const result: ComprehensiveQuizQuestion[] = [];
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
  }, [bank.questions, shuffledIds]);

  const moduleFilteredQuestions = useMemo(() => {
    let base = orderedQuestions;
    if (moduleFilter !== 'ALL') {
      base = base.filter((q) => q.moduleCode === moduleFilter);
    }
    if (topicFilter) {
      base = base.filter(
        (q) =>
          (q.topic ??
            inferTopicForAcademicQuestion(
              q.partNumber,
              q.question,
              q.note_topic,
            )) === topicFilter,
      );
    }
    return base;
  }, [orderedQuestions, moduleFilter, topicFilter]);

  const coveredTopics = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      id: string;
      topic: string;
      partNumber: number;
      mastered: boolean;
    }[] = [];
    for (const q of moduleFilteredQuestions) {
      const label = q.noteTopic || q.partTitle;
      const key = `${q.partNumber}:${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: q.id,
          topic: label,
          partNumber: q.partNumber,
          mastered: correctQuizIds.includes(q.id),
        });
      }
    }
    return list;
  }, [moduleFilteredQuestions, correctQuizIds]);

  const visibleQuestions = useMemo(() => {
    if (filter === 'mistakes') {
      return moduleFilteredQuestions.filter(
        (q) =>
          wrongQuizIds.includes(q.id) ||
          clearedInSessionIds.includes(q.id) ||
          answers[q.id] !== undefined,
      );
    }
    if (filter === 'unmastered') {
      return moduleFilteredQuestions.filter(
        (q) => !correctQuizIds.includes(q.id) || answers[q.id] !== undefined,
      );
    }
    return moduleFilteredQuestions;
  }, [
    moduleFilteredQuestions,
    filter,
    wrongQuizIds,
    clearedInSessionIds,
    correctQuizIds,
    answers,
  ]);

  if (bank.questions.length === 0) {
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

  const totalScopeCount = moduleFilteredQuestions.length;
  const answeredCount = moduleFilteredQuestions.reduce(
    (acc, q) => (answers[q.id] !== undefined ? acc + 1 : acc),
    0,
  );
  const correctCount = moduleFilteredQuestions.reduce((acc, q) => {
    const selected = answers[q.id];
    return selected === q.correct_index ? acc + 1 : acc;
  }, 0);
  const allAnswered =
    totalScopeCount > 0 && answeredCount === totalScopeCount;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const masteredTopicsCount = coveredTopics.filter((t) => t.mastered).length;

  const handleSelectOption = (
    question: ComprehensiveQuizQuestion,
    optionIndex: number,
  ) => {
    if (answers[question.id] !== undefined) {
      return;
    }

    const nextAnswers = {...answers, [question.id]: optionIndex};
    setAnswers(nextAnswers);

    const partQuestions = bank.questions.filter(
      (item) => item.partNumber === question.partNumber,
    );
    const partFinished = partQuestions.every(
      (item) => nextAnswers[item.id] !== undefined,
    );

    if (
      optionIndex === question.correct_index &&
      wrongQuizIds.includes(question.id)
    ) {
      setClearedInSessionIds((prev) =>
        prev.includes(question.id) ? prev : [...prev, question.id],
      );
    }

    onRecordQuizAnswer(
      question.id,
      optionIndex === question.correct_index,
      question.partNumber,
      partFinished,
    );
  };

  const handleShuffle = () => {
    const shuffled = shuffleQuizQuestions(bank.questions).map((q) => q.id);
    setShuffledIds(shuffled);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleResetOrder = () => {
    setShuffledIds(null);
  };

  const handleToggleAllModules = (enableAll: boolean) => {
    setPracticeAllModules(enableAll);
    setModuleFilter('ALL');
    setTopicFilter(null);
    setShuffledIds(null);
  };

  const handlePracticeTopicFromAnalytics = (topic: SswExamTopic) => {
    if (isHeaderSubset && !practiceAllModules) {
      setPracticeAllModules(true);
    }
    setModuleFilter('ALL');
    setTopicFilter(topic);
    setFilter('all');
  };

  const handleRetake = () => {
    setAnswers({});
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleShuffleRetake = () => {
    setAnswers({});
    setShuffledIds(shuffleQuizQuestions(bank.questions).map((q) => q.id));
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  return (
    <div className="font-jp space-y-4 sm:space-y-5">
      {/* Japanese Furigana Score & Order Bar */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-2.5 rounded-2xl px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold tracking-tight text-slate-900">
            <FuriganaText text="{得点|とくてん}" showFurigana={showFurigana} />
            :{' '}
            <span className="font-mono-tabular">
              {correctCount} / {totalScopeCount}
            </span>
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-600">
            <FuriganaText
              text="{回答|かいとう}{済|ず}み"
              showFurigana={showFurigana}
            />
            : <span className="font-mono-tabular">{answeredCount}</span>/
            {totalScopeCount}
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
                ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
                : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <FuriganaText
                text={
                  shuffledIds !== null
                    ? '{再|さい}シャッフル'
                    : 'シャッフル'
                }
                showFurigana={showFurigana}
              />
            </span>
          </button>

          {shuffledIds !== null && (
            <button
              type="button"
              onClick={handleResetOrder}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <ListOrdered
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                <FuriganaText
                  text="{順|じゅん}に{戻|もど}す"
                  showFurigana={showFurigana}
                />
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFurigana((prev) => !prev)}
            className={`inline-flex min-h-[38px] items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              showFurigana
                ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
                : 'border-slate-200/90 bg-white text-slate-600'
            }`}
          >
            <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>ふりがな</span>
          </button>

          <button
            type="button"
            onClick={handleRetake}
            disabled={answeredCount === 0}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              <FuriganaText
                text="{再挑戦|さいちょうせん}"
                showFurigana={showFurigana}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Full Exam Coverage & Module Filter Panel */}
      <section className="surface-card space-y-3.5 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
                <FuriganaText
                  text="{全|ぜん}{学習|がくしゅう}ノート{網羅|もうら}・{模擬|もぎ}{試験|しけん}"
                  showFurigana={showFurigana}
                />
              </p>
              <p className="text-[11px] text-slate-500">
                <FuriganaText
                  text="{網羅率|もうらりつ}"
                  showFurigana={showFurigana}
                />{' '}
                <span className="font-mono-tabular font-semibold text-blue-600">
                  {bank.overallCoveragePercent}%
                </span>{' '}
                ({bank.coveredNoteTopics}/{bank.totalNoteTopics}{' '}
                <FuriganaText
                  text="{項目|こうもく}"
                  showFurigana={showFurigana}
                />
                ){' '}
                <span className="mx-1 text-slate-300" aria-hidden="true">
                  ·
                </span>{' '}
                <FuriganaText
                  text="{習得|しゅうとく}{済|ず}み"
                  showFurigana={showFurigana}
                />{' '}
                <span className="font-mono-tabular font-semibold text-emerald-600">
                  {masteredTopicsCount}/{coveredTopics.length}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHeaderSubset && (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
                <button
                  type="button"
                  onClick={() => handleToggleAllModules(false)}
                  className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    !practiceAllModules
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Part {parts[0].part_number}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllModules(true)}
                  className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    practiceAllModules
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>
                    <FuriganaText
                      text="{全|ぜん}モジュール"
                      showFurigana={showFurigana}
                    />
                  </span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FuriganaText
                  text={`{全問|ぜんもん} (${moduleFilteredQuestions.length})`}
                  showFurigana={showFurigana}
                />
              </button>
              <button
                type="button"
                onClick={() => setFilter('unmastered')}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  filter === 'unmastered'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FuriganaText
                  text="{未習得|みしゅうとく}"
                  showFurigana={showFurigana}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isHeaderSubset && !practiceAllModules) {
                    setPracticeAllModules(true);
                  }
                  setModuleFilter('ALL');
                  setFilter('mistakes');
                }}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  filter === 'mistakes'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : wrongQuizIds.length > 0
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FuriganaText
                  text={`{間違|まちが}い{復習|ふくしゅう} (${wrongQuizIds.length})`}
                  showFurigana={showFurigana}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Daily Mistake Queue Callout */}
        {wrongQuizIds.length > 0 && filter !== 'mistakes' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-orange-50/70 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-amber-950">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <strong className="font-mono-tabular">{wrongQuizIds.length}</strong>{' '}
                missed question{wrongQuizIds.length === 1 ? '' : 's'} queued
                {dailyWrongQuizIds.length > 0
                  ? ` (${dailyWrongQuizIds.length} from today)`
                  : ''}{' '}
                · Clear each for <strong className="font-semibold">+15 bonus XP</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isHeaderSubset) {
                  setPracticeAllModules(true);
                }
                setModuleFilter('ALL');
                setFilter('mistakes');
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Practice Mistakes</span>
            </button>
          </div>
        )}

        {/* Interactive Module Filter Buttons */}
        {bank.modules.length > 1 && (
          <div
            role="group"
            aria-label="Filter quiz questions by exam module"
            className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-200/70 pt-3 pb-0.5"
          >
            <button
              type="button"
              onClick={() => {
                setModuleFilter('ALL');
                setTopicFilter(null);
              }}
              className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                moduleFilter === 'ALL' && !topicFilter
                  ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/80 text-blue-700 shadow-2xs'
                  : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <FuriganaText
                text={`{全|ぜん}モジュール (${bank.questions.length})`}
                showFurigana={showFurigana}
              />
            </button>
            {bank.modules.map((mod) => {
              const active = moduleFilter === mod.code && !topicFilter;
              return (
                <button
                  key={mod.code}
                  type="button"
                  onClick={() => {
                    setModuleFilter(mod.code);
                    setTopicFilter(null);
                  }}
                  className={`min-h-[36px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/80 text-blue-700 shadow-2xs'
                      : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>{mod.shortLabel}</span>{' '}
                  <span className="font-mono-tabular text-[11px] opacity-75">
                    ({mod.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {topicFilter && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200/80 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
            <span>
              Exam Topic Drill:{' '}
              <strong className="font-semibold">
                {SSW_TOPIC_MAP[topicFilter].englishLabel}
              </strong>{' '}
              ({moduleFilteredQuestions.length} Qs)
            </span>
            <button
              type="button"
              onClick={() => setTopicFilter(null)}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100/60"
            >
              Clear Topic Filter
            </button>
          </div>
        )}
      </section>

      {/* Performance Analytics Spider Chart Across Syllabus Modules */}
      <PerformanceAnalyticsCard
        allParts={allParts}
        correctQuizIds={correctQuizIds}
        attemptedQuizIds={attemptedQuizIds}
        quizQuestionStats={quizQuestionStats}
        cbtExamHistory={cbtExamHistory}
        onPracticeTopic={handlePracticeTopicFromAnalytics}
      />

      {allAnswered && (
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/70 p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900">
                <FuriganaText
                  text="{試験|しけん}{練習|れんしゅう}{完了|かんりょう}！"
                  showFurigana={showFurigana}
                />
              </h3>
              <p className="mt-1 text-sm leading-[2.0] text-slate-700">
                <FuriganaText
                  text={`{結果|けっか}: ${correctCount} / ${totalScopeCount}（{正答率|せいとうりつ} ${accuracy}%）`}
                  showFurigana={showFurigana}
                />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShuffleRetake}
                className="btn-primary-premium inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <Shuffle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <FuriganaText
                    text="シャッフルして{再挑戦|さいちょうせん}"
                    showFurigana={showFurigana}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <FuriganaText
                    text="もう{一度|いちど}"
                    showFurigana={showFurigana}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleQuestions.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-slate-900">
            <FuriganaText
              text="この{範囲|はんい}のすべてのノート{項目|こうもく}を{正解|せいかい}しました！"
              showFurigana={showFurigana}
            />
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="btn-primary-premium mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
          >
            <FuriganaText
              text="{全問|ぜんもん}を{表示|ひょうじ}"
              showFurigana={showFurigana}
            />
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {visibleQuestions.map((q, qIdx) => {
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
                      <FuriganaText
                        text={q.moduleFuriganaLabel}
                        showFurigana={showFurigana}
                      />
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600">
                      <FuriganaText
                        text={q.noteTopic}
                        showFurigana={showFurigana}
                      />
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Part {q.partNumber}</span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-semibold leading-[2.15] tracking-tight text-slate-900">
                  <FuriganaText text={q.question} showFurigana={showFurigana} />
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
                        letterClasses = 'border-red-600 bg-red-600 text-white';
                        statusLabel = (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
                            <XCircle className="h-4 w-4" aria-hidden="true" />
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
        </div>
      )}
    </div>
  );
};
