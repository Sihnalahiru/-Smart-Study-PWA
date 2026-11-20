import React, {useEffect, useMemo, useState} from 'react';
import {CheckCircle2, Languages, RotateCcw, XCircle} from 'lucide-react';
import {FuriganaText} from './FuriganaText';
import type {QuizQuestion, StudyPart} from '../types/study';

interface QuizTabProps {
  parts: StudyPart[];
  onRecordQuizAnswer: (
    questionId: string,
    isCorrect: boolean,
    partNumber: number,
    partFinished: boolean,
  ) => void;
}

interface IndexedQuizQuestion extends QuizQuestion {
  id: string;
  partNumber: number;
  partTitle: string;
}

const OPTION_LETTERS = ['ア', 'イ', 'ウ', 'エ'];

export const QuizTab: React.FC<QuizTabProps> = ({
  parts,
  onRecordQuizAnswer,
}) => {
  const [showFurigana, setShowFurigana] = useState(true);

  const questions = useMemo<IndexedQuizQuestion[]>(() => {
    return parts.flatMap((part) =>
      part.quiz.map((q, idx) => ({
        ...q,
        id: `part-${part.part_number}-q-${idx}`,
        partNumber: part.part_number,
        partTitle: part.title,
      })),
    );
  }, [parts]);

  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setAnswers({});
  }, [questions]);

  if (questions.length === 0) {
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

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.reduce((acc, q) => {
    const selected = answers[q.id];
    return selected === q.correct_index ? acc + 1 : acc;
  }, 0);
  const allAnswered = answeredCount === questions.length;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handleSelectOption = (
    question: IndexedQuizQuestion,
    optionIndex: number,
  ) => {
    if (answers[question.id] !== undefined) {
      return;
    }

    const nextAnswers = {...answers, [question.id]: optionIndex};
    setAnswers(nextAnswers);

    const partQuestions = questions.filter(
      (item) => item.partNumber === question.partNumber,
    );
    const partFinished = partQuestions.every(
      (item) => nextAnswers[item.id] !== undefined,
    );

    onRecordQuizAnswer(
      question.id,
      optionIndex === question.correct_index,
      question.partNumber,
      partFinished,
    );
  };

  const handleRetake = () => {
    setAnswers({});
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  return (
    <div className="font-jp space-y-5">
      {/* Japanese Furigana Quiz Score Header */}
      <div className="surface-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <span className="font-semibold tracking-tight text-slate-900">
            <FuriganaText text="{得点|とくてん}" showFurigana={showFurigana} />
            :{' '}
            <span className="font-mono-tabular">
              {correctCount} / {questions.length}
            </span>
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-600">
            <FuriganaText text="{回答|かいとう}{済|ず}み" showFurigana={showFurigana} />
            : <span className="font-mono-tabular">{answeredCount}</span>/{questions.length}
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowFurigana((prev) => !prev)}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
              showFurigana
                ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-indigo-50/70 text-blue-700 shadow-2xs'
                : 'border-slate-200/90 bg-white text-slate-600'
            }`}
          >
            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ふりがな</span>
          </button>

          <button
            type="button"
            onClick={handleRetake}
            disabled={answeredCount === 0}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              <FuriganaText text="{再挑戦|さいちょうせん}" showFurigana={showFurigana} />
            </span>
          </button>
        </div>
      </div>

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
                  text={`{結果|けっか}: ${correctCount} / ${questions.length}（{正答率|せいとうりつ} ${accuracy}%）`}
                  showFurigana={showFurigana}
                />
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="btn-primary-premium inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>
                <FuriganaText
                  text="もう{一度|いちど}{挑戦|ちょうせん}"
                  showFurigana={showFurigana}
                />
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-5">
        {questions.map((q, qIdx) => {
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
                  / {questions.length}
                </span>
                <span>Part {q.partNumber}</span>
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
                          ? '{正解|せいかい} (+25 XP) ・ {解説|かいせつ}'
                          : '{解説|かいせつ}'
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
    </div>
  );
};
