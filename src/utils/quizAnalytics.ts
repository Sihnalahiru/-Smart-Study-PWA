import type {QuizQuestionStat, StudyPart} from '../types/study';
import {buildFullExamQuizBank, type QuizModuleCode} from './quizCoverage';

export type CoreModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface ModuleAnalyticsAxis {
  code: CoreModuleCode;
  axisShortLabel: string;
  englishLabel: string;
  japaneseLabel: string;
  partNumber: number;
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  accuracyPercent: number;
  masteryPercent: number;
  sessionAnswered: number;
  sessionCorrect: number;
  sessionAccuracyPercent: number | null;
}

export interface QuizAnalyticsSummary {
  axes: ModuleAnalyticsAxis[];
  totalQuestions: number;
  totalMastered: number;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracyPercent: number;
  overallMasteryPercent: number;
  strongestModule: ModuleAnalyticsAxis | null;
  focusModule: ModuleAnalyticsAxis | null;
  hasAnyAttempts: boolean;
}

const CORE_AXIS_DEFS: {
  code: CoreModuleCode;
  axisShortLabel: string;
  englishLabel: string;
  japaneseLabel: string;
  partNumber: number;
}[] = [
  {
    code: 'A',
    axisShortLabel: 'A. 設備',
    englishLabel: 'Facilities & Gear',
    japaneseLabel: 'A. {倉庫|そうこ}・{設備|せつび}',
    partNumber: 1,
  },
  {
    code: 'B',
    axisShortLabel: 'B. 業務品質',
    englishLabel: 'Operations & Quality',
    japaneseLabel: 'B. {業務|ぎょうむ}・{品質|ひんしつ}',
    partNumber: 2,
  },
  {
    code: 'C',
    axisShortLabel: 'C. 単位・助数詞',
    englishLabel: 'Docs, Units & Counters',
    japaneseLabel: 'C. {帳票|ちょうひょう}・{単位|たんい}',
    partNumber: 3,
  },
  {
    code: 'D',
    axisShortLabel: 'D. 在庫・入出庫',
    englishLabel: 'Inventory & Packing',
    japaneseLabel: 'D. {入出庫|にゅうしゅっこ}・{加工|かこう}',
    partNumber: 4,
  },
  {
    code: 'E',
    axisShortLabel: 'E. 安全衛生',
    englishLabel: 'Health & Safety',
    japaneseLabel: 'E. {安全|あんぜん}{衛生|えいせい}・KYT',
    partNumber: 5,
  },
  {
    code: 'F',
    axisShortLabel: 'F. リフト',
    englishLabel: 'Forklift Standards',
    japaneseLabel: 'F. フォークリフト',
    partNumber: 6,
  },
];

function resolveCoreCode(moduleCode: QuizModuleCode, partNumber: number): CoreModuleCode {
  if (
    moduleCode === 'A' ||
    moduleCode === 'B' ||
    moduleCode === 'C' ||
    moduleCode === 'D' ||
    moduleCode === 'E' ||
    moduleCode === 'F'
  ) {
    return moduleCode;
  }
  const mapByPart: Record<number, CoreModuleCode> = {
    1: 'A',
    2: 'B',
    3: 'C',
    4: 'D',
    5: 'E',
    6: 'F',
  };
  return mapByPart[partNumber] ?? 'A';
}

export function computeQuizAnalytics(
  allParts: StudyPart[],
  correctQuizIds: string[],
  attemptedQuizIds: string[],
  quizQuestionStats: Record<string, QuizQuestionStat> | undefined,
  sessionAnswers: Record<string, number>,
): QuizAnalyticsSummary {
  const bank = buildFullExamQuizBank(allParts, allParts);
  const correctSet = new Set(correctQuizIds);
  const attemptedSet = new Set(attemptedQuizIds);
  const statsMap = quizQuestionStats ?? {};

  const buckets = new Map<
    CoreModuleCode,
    {
      totalQuestions: number;
      attemptedQuestions: number;
      masteredQuestions: number;
      totalAttempts: number;
      totalCorrect: number;
      sessionAnswered: number;
      sessionCorrect: number;
    }
  >();

  for (const def of CORE_AXIS_DEFS) {
    buckets.set(def.code, {
      totalQuestions: 0,
      attemptedQuestions: 0,
      masteredQuestions: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      sessionAnswered: 0,
      sessionCorrect: 0,
    });
  }

  for (const q of bank.questions) {
    const code = resolveCoreCode(q.moduleCode, q.partNumber);
    const bucket = buckets.get(code);
    if (!bucket) continue;

    bucket.totalQuestions += 1;

    const isMastered = correctSet.has(q.id);
    const stat = statsMap[q.id];
    const hasAttempted =
      attemptedSet.has(q.id) || isMastered || (stat?.attempts ?? 0) > 0;

    if (hasAttempted) {
      bucket.attemptedQuestions += 1;
    }
    if (isMastered) {
      bucket.masteredQuestions += 1;
    }

    if (stat && stat.attempts > 0) {
      bucket.totalAttempts += stat.attempts;
      bucket.totalCorrect += stat.correct;
    } else if (hasAttempted) {
      bucket.totalAttempts += 1;
      bucket.totalCorrect += isMastered ? 1 : 0;
    }

    const sessionPick = sessionAnswers[q.id];
    if (sessionPick !== undefined) {
      bucket.sessionAnswered += 1;
      if (sessionPick === q.correct_index) {
        bucket.sessionCorrect += 1;
      }
    }
  }

  const axes: ModuleAnalyticsAxis[] = CORE_AXIS_DEFS.map((def) => {
    const b = buckets.get(def.code)!;
    const accuracyPercent =
      b.totalAttempts > 0
        ? Math.round((b.totalCorrect / b.totalAttempts) * 100)
        : 0;
    const masteryPercent =
      b.totalQuestions > 0
        ? Math.round((b.masteredQuestions / b.totalQuestions) * 100)
        : 0;
    const sessionAccuracyPercent =
      b.sessionAnswered > 0
        ? Math.round((b.sessionCorrect / b.sessionAnswered) * 100)
        : null;

    return {
      code: def.code,
      axisShortLabel: def.axisShortLabel,
      englishLabel: def.englishLabel,
      japaneseLabel: def.japaneseLabel,
      partNumber: def.partNumber,
      totalQuestions: b.totalQuestions,
      attemptedQuestions: b.attemptedQuestions,
      masteredQuestions: b.masteredQuestions,
      totalAttempts: b.totalAttempts,
      totalCorrect: b.totalCorrect,
      accuracyPercent,
      masteryPercent,
      sessionAnswered: b.sessionAnswered,
      sessionCorrect: b.sessionCorrect,
      sessionAccuracyPercent,
    };
  });

  const totalQuestions = axes.reduce((s, a) => s + a.totalQuestions, 0);
  const totalMastered = axes.reduce((s, a) => s + a.masteredQuestions, 0);
  const totalAttempts = axes.reduce((s, a) => s + a.totalAttempts, 0);
  const totalCorrect = axes.reduce((s, a) => s + a.totalCorrect, 0);

  const overallAccuracyPercent =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const overallMasteryPercent =
    totalQuestions > 0 ? Math.round((totalMastered / totalQuestions) * 100) : 0;

  const attemptedAxes = axes.filter((a) => a.totalAttempts > 0);
  const strongestModule =
    attemptedAxes.length > 0
      ? [...attemptedAxes].sort((a, b) => {
          if (b.accuracyPercent !== a.accuracyPercent) {
            return b.accuracyPercent - a.accuracyPercent;
          }
          return b.masteryPercent - a.masteryPercent;
        })[0]
      : null;

  const focusModule =
    axes.length > 0
      ? [...axes].sort((a, b) => {
          const scoreA = a.totalAttempts > 0 ? a.accuracyPercent : -1;
          const scoreB = b.totalAttempts > 0 ? b.accuracyPercent : -1;
          if (scoreA !== scoreB) return scoreA - scoreB;
          return a.masteryPercent - b.masteryPercent;
        })[0]
      : null;

  return {
    axes,
    totalQuestions,
    totalMastered,
    totalAttempts,
    totalCorrect,
    overallAccuracyPercent,
    overallMasteryPercent,
    strongestModule,
    focusModule,
    hasAnyAttempts: totalAttempts > 0,
  };
}
