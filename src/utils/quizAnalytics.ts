import type {
  CbtExamAttempt,
  QuizQuestionStat,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {getAllCbtQuestions, SSW_EXAM_RULES, SSW_TOPICS} from './cbtExam';

export type CoreTopicId = SswExamTopic;

export interface TopicAnalyticsAxis {
  id: CoreTopicId;
  shortLabel: string;
  englishLabel: string;
  description: string;
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  accuracyPercent: number;
  masteryPercent: number;
}

export interface SectionAnalyticsBreakdown {
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  accuracyPercent: number;
  passTargetPercent: number;
}

export interface ExamTimeMetrics {
  examsTracked: number;
  totalExamSeconds: number;
  avgExamSeconds: number;
  avgSecondsPerQuestion: number;
  lastExamSeconds: number | null;
  fastestExamSeconds: number | null;
  targetSecondsPerQuestion: number;
}

export interface QuizAnalyticsSummary {
  axes: TopicAnalyticsAxis[];
  weakTopics: TopicAnalyticsAxis[];
  academic: SectionAnalyticsBreakdown;
  practical: SectionAnalyticsBreakdown;
  timeMetrics: ExamTimeMetrics;
  totalQuestions: number;
  totalMastered: number;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracyPercent: number;
  overallMasteryPercent: number;
  strongestTopic: TopicAnalyticsAxis | null;
  focusTopic: TopicAnalyticsAxis | null;
  hasAnyAttempts: boolean;
  totalExamsCompleted: number;
  totalExamsPassed: number;
  latestExam: CbtExamAttempt | null;
}

export function computeQuizAnalytics(
  allParts: StudyPart[],
  correctQuizIds: string[],
  attemptedQuizIds: string[],
  quizQuestionStats: Record<string, QuizQuestionStat> | undefined,
  cbtExamHistory: CbtExamAttempt[] = [],
): QuizAnalyticsSummary {
  const allQuestions = getAllCbtQuestions(allParts);
  const correctSet = new Set(correctQuizIds);
  const attemptedSet = new Set(attemptedQuizIds);
  const statsMap = quizQuestionStats ?? {};

  const buckets = new Map<
    CoreTopicId,
    {
      totalQuestions: number;
      attemptedQuestions: number;
      masteredQuestions: number;
      totalAttempts: number;
      totalCorrect: number;
    }
  >();

  for (const topic of SSW_TOPICS) {
    buckets.set(topic.id, {
      totalQuestions: 0,
      attemptedQuestions: 0,
      masteredQuestions: 0,
      totalAttempts: 0,
      totalCorrect: 0,
    });
  }

  const secBuckets = {
    academic: {
      totalQuestions: 0,
      attemptedQuestions: 0,
      masteredQuestions: 0,
      totalAttempts: 0,
      totalCorrect: 0,
    },
    practical: {
      totalQuestions: 0,
      attemptedQuestions: 0,
      masteredQuestions: 0,
      totalAttempts: 0,
      totalCorrect: 0,
    },
  };

  for (const q of allQuestions) {
    const topicBucket = buckets.get(q.topic);
    const secBucket = secBuckets[q.section];
    if (!topicBucket) continue;

    topicBucket.totalQuestions += 1;
    secBucket.totalQuestions += 1;

    const isMastered = correctSet.has(q.id);
    const stat = statsMap[q.id];
    const hasAttempted =
      attemptedSet.has(q.id) || isMastered || (stat?.attempts ?? 0) > 0;

    if (hasAttempted) {
      topicBucket.attemptedQuestions += 1;
      secBucket.attemptedQuestions += 1;
    }
    if (isMastered) {
      topicBucket.masteredQuestions += 1;
      secBucket.masteredQuestions += 1;
    }

    const attempts =
      stat && stat.attempts > 0 ? stat.attempts : hasAttempted ? 1 : 0;
    const correct =
      stat && stat.attempts > 0 ? stat.correct : isMastered ? 1 : 0;

    topicBucket.totalAttempts += attempts;
    topicBucket.totalCorrect += correct;
    secBucket.totalAttempts += attempts;
    secBucket.totalCorrect += correct;
  }

  const axes: TopicAnalyticsAxis[] = SSW_TOPICS.map((topic) => {
    const b = buckets.get(topic.id)!;
    const accuracyPercent =
      b.totalAttempts > 0
        ? Math.round((b.totalCorrect / b.totalAttempts) * 100)
        : 0;
    const masteryPercent =
      b.totalQuestions > 0
        ? Math.round((b.masteredQuestions / b.totalQuestions) * 100)
        : 0;

    return {
      id: topic.id,
      shortLabel: topic.shortLabel,
      englishLabel: topic.englishLabel,
      description: topic.description,
      totalQuestions: b.totalQuestions,
      attemptedQuestions: b.attemptedQuestions,
      masteredQuestions: b.masteredQuestions,
      totalAttempts: b.totalAttempts,
      totalCorrect: b.totalCorrect,
      accuracyPercent,
      masteryPercent,
    };
  });

  const makeSectionSummary = (
    b: typeof secBuckets.academic,
  ): SectionAnalyticsBreakdown => ({
    ...b,
    accuracyPercent:
      b.totalAttempts > 0
        ? Math.round((b.totalCorrect / b.totalAttempts) * 100)
        : 0,
    passTargetPercent: SSW_EXAM_RULES.passPercent,
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
  const strongestTopic =
    attemptedAxes.length > 0
      ? [...attemptedAxes].sort((a, b) => {
          if (b.accuracyPercent !== a.accuracyPercent) {
            return b.accuracyPercent - a.accuracyPercent;
          }
          return b.masteryPercent - a.masteryPercent;
        })[0]
      : null;

  const focusTopic =
    axes.length > 0
      ? [...axes].sort((a, b) => {
          const scoreA = a.totalAttempts > 0 ? a.accuracyPercent : -1;
          const scoreB = b.totalAttempts > 0 ? b.accuracyPercent : -1;
          if (scoreA !== scoreB) return scoreA - scoreB;
          return a.masteryPercent - b.masteryPercent;
        })[0]
      : null;

  const weakTopics = [...axes]
    .filter(
      (a) =>
        a.totalAttempts === 0 || a.accuracyPercent < SSW_EXAM_RULES.passPercent,
    )
    .sort((a, b) => {
      // Prioritize attempted topics below pass threshold first, then unattempted
      if (a.totalAttempts > 0 && b.totalAttempts === 0) return -1;
      if (a.totalAttempts === 0 && b.totalAttempts > 0) return 1;
      if (a.accuracyPercent !== b.accuracyPercent) {
        return a.accuracyPercent - b.accuracyPercent;
      }
      return a.masteryPercent - b.masteryPercent;
    });

  const examsTracked = cbtExamHistory.length;
  const totalExamSeconds = cbtExamHistory.reduce(
    (sum, item) => sum + Math.max(0, item.elapsedSeconds || 0),
    0,
  );
  const totalExamQuestions = cbtExamHistory.reduce(
    (sum, item) => sum + Math.max(1, item.totalQuestions || 0),
    0,
  );
  const avgExamSeconds =
    examsTracked > 0 ? Math.round(totalExamSeconds / examsTracked) : 0;
  const avgSecondsPerQuestion =
    totalExamQuestions > 0
      ? Math.round(totalExamSeconds / totalExamQuestions)
      : 0;
  const lastExamSeconds =
    cbtExamHistory.length > 0 ? cbtExamHistory[0].elapsedSeconds : null;
  const fastestExamSeconds =
    cbtExamHistory.length > 0
      ? Math.min(...cbtExamHistory.map((item) => item.elapsedSeconds))
      : null;

  const targetSecondsPerQuestion = Math.round(
    (SSW_EXAM_RULES.totalMinutes * 60) / SSW_EXAM_RULES.totalQuestions,
  );

  return {
    axes,
    weakTopics,
    academic: makeSectionSummary(secBuckets.academic),
    practical: makeSectionSummary(secBuckets.practical),
    timeMetrics: {
      examsTracked,
      totalExamSeconds,
      avgExamSeconds,
      avgSecondsPerQuestion,
      lastExamSeconds,
      fastestExamSeconds,
      targetSecondsPerQuestion,
    },
    totalQuestions,
    totalMastered,
    totalAttempts,
    totalCorrect,
    overallAccuracyPercent,
    overallMasteryPercent,
    strongestTopic,
    focusTopic,
    hasAnyAttempts: totalAttempts > 0,
    totalExamsCompleted: cbtExamHistory.length,
    totalExamsPassed: cbtExamHistory.filter((e) => e.passedOverall).length,
    latestExam: cbtExamHistory[0] ?? null,
  };
}
