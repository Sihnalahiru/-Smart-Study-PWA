import {useCallback, useEffect, useState} from 'react';
import type {
  QuizQuestionStat,
  StudyProgressState,
  UserId,
  XpActivity,
} from '../types/study';

const STORAGE_KEY_PREFIX = 'smart_study_progress_v1_';

function getStorageKey(userId: UserId): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRecent7Days(): {key: string; label: string; isToday: boolean}[] {
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = getTodayKey();
  const list: {key: string; label: string; isToday: boolean}[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    list.push({
      key,
      label: dayNames[d.getDay()],
      isToday: key === today,
    });
  }
  return list;
}

export interface StreakBadgeInfo {
  title: string;
  nextGoal: number;
  isEarned: boolean;
  toneClass: string;
}

export function getStreakBadge(streakDays: number): StreakBadgeInfo {
  if (streakDays >= 30) {
    return {
      title: '30-Day Unstoppable',
      nextGoal: 30,
      isEarned: true,
      toneClass: 'border-amber-300 bg-amber-50 text-amber-900',
    };
  }
  if (streakDays >= 14) {
    return {
      title: '14-Day Dedicated',
      nextGoal: 30,
      isEarned: true,
      toneClass: 'border-amber-300 bg-amber-50 text-amber-900',
    };
  }
  if (streakDays >= 7) {
    return {
      title: '7-Day Scholar',
      nextGoal: 14,
      isEarned: true,
      toneClass: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    };
  }
  if (streakDays >= 3) {
    return {
      title: '3-Day Momentum',
      nextGoal: 7,
      isEarned: true,
      toneClass: 'border-blue-300 bg-blue-50 text-blue-900',
    };
  }
  if (streakDays >= 1) {
    return {
      title: 'First Spark',
      nextGoal: 3,
      isEarned: true,
      toneClass: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  return {
    title: 'Streak Ready',
    nextGoal: 1,
    isEarned: false,
    toneClass: 'border-slate-200 bg-slate-100 text-slate-600',
  };
}

export function createInitialProgressState(): StudyProgressState {
  const today = getTodayKey();
  return {
    xp: 0,
    streakDays: 0,
    bestStreak: 0,
    lastActiveDate: '',
    activeDates: [],
    reviewedFlashcardIds: [],
    readPartNumbers: [],
    correctQuizIds: [],
    attemptedQuizIds: [],
    completedQuizParts: [],
    quizQuestionStats: {},
    activities: [],
    daily: {
      date: today,
      flashcardsReviewed: 0,
      quizAnswered: 0,
      notesCompleted: 0,
      xpEarnedToday: 0,
    },
  };
}

export function loadProgressForUser(userId: UserId): StudyProgressState {
  const fallback = createInitialProgressState();
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>;
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    let validStreak =
      typeof parsed.streakDays === 'number' ? parsed.streakDays : 0;
    if (
      parsed.lastActiveDate &&
      parsed.lastActiveDate !== today &&
      parsed.lastActiveDate !== yesterday
    ) {
      validStreak = 0;
    }

    const daily =
      parsed.daily && parsed.daily.date === today
        ? {
            date: today,
            flashcardsReviewed:
              typeof parsed.daily.flashcardsReviewed === 'number'
                ? parsed.daily.flashcardsReviewed
                : 0,
            quizAnswered:
              typeof parsed.daily.quizAnswered === 'number'
                ? parsed.daily.quizAnswered
                : 0,
            notesCompleted:
              typeof parsed.daily.notesCompleted === 'number'
                ? parsed.daily.notesCompleted
                : 0,
            xpEarnedToday:
              typeof parsed.daily.xpEarnedToday === 'number'
                ? parsed.daily.xpEarnedToday
                : 0,
          }
        : {
            date: today,
            flashcardsReviewed: 0,
            quizAnswered: 0,
            notesCompleted: 0,
            xpEarnedToday: 0,
          };

    const sanitizedAttempted = Array.isArray(parsed.attemptedQuizIds)
      ? parsed.attemptedQuizIds
      : [];
    const sanitizedCorrect = Array.isArray(parsed.correctQuizIds)
      ? parsed.correctQuizIds
      : [];

    const hydratedStats: Record<string, QuizQuestionStat> = {};
    if (
      parsed.quizQuestionStats &&
      typeof parsed.quizQuestionStats === 'object' &&
      !Array.isArray(parsed.quizQuestionStats)
    ) {
      for (const [qId, stat] of Object.entries(parsed.quizQuestionStats)) {
        if (
          stat &&
          typeof stat.attempts === 'number' &&
          typeof stat.correct === 'number'
        ) {
          hydratedStats[qId] = {
            attempts: Math.max(0, Math.floor(stat.attempts)),
            correct: Math.max(
              0,
              Math.min(Math.floor(stat.attempts), Math.floor(stat.correct)),
            ),
          };
        }
      }
    } else {
      for (const qId of sanitizedAttempted) {
        hydratedStats[qId] = {
          attempts: 1,
          correct: sanitizedCorrect.includes(qId) ? 1 : 0,
        };
      }
      for (const qId of sanitizedCorrect) {
        if (!hydratedStats[qId]) {
          hydratedStats[qId] = {attempts: 1, correct: 1};
        }
      }
    }

    return {
      ...fallback,
      ...parsed,
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      streakDays: validStreak,
      bestStreak: Math.max(
        validStreak,
        typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
      ),
      activeDates: Array.isArray(parsed.activeDates) ? parsed.activeDates : [],
      daily,
      reviewedFlashcardIds: Array.isArray(parsed.reviewedFlashcardIds)
        ? parsed.reviewedFlashcardIds
        : [],
      readPartNumbers: Array.isArray(parsed.readPartNumbers)
        ? parsed.readPartNumbers
        : [],
      correctQuizIds: sanitizedCorrect,
      attemptedQuizIds: sanitizedAttempted,
      completedQuizParts: Array.isArray(parsed.completedQuizParts)
        ? parsed.completedQuizParts
        : [],
      quizQuestionStats: hydratedStats,
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    };
  } catch {
    return fallback;
  }
}

export function getLevelInfo(xp: number) {
  const xpPerLevel = 150;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / xpPerLevel) * 100),
  );

  const ranks = [
    'Apprentice',
    'Scholar',
    'Researcher',
    'Fellow',
    'Analyst',
    'Polymath',
  ];
  const rank = ranks[Math.min(level - 1, ranks.length - 1)];

  return {
    level,
    rank,
    currentLevelXp,
    xpPerLevel,
    xpToNext: xpPerLevel - currentLevelXp,
    progressPercent,
  };
}

export interface XpToast {
  id: string;
  xp: number;
  label: string;
}

export function useStudyProgress(userId: UserId | null) {
  const [state, setState] = useState<StudyProgressState>(() =>
    userId ? loadProgressForUser(userId) : createInitialProgressState(),
  );
  const [xpToast, setXpToast] = useState<XpToast | null>(null);

  useEffect(() => {
    if (userId) {
      setState(loadProgressForUser(userId));
    } else {
      setState(createInitialProgressState());
    }
    setXpToast(null);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    } catch {
      // Ignore storage failure
    }
  }, [state, userId]);

  const showToast = useCallback((xp: number, label: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setXpToast({id, xp, label});
  }, []);

  useEffect(() => {
    if (!xpToast) return;
    const timer = window.setTimeout(() => setXpToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [xpToast]);

  const computeStreakAndDaily = (prev: StudyProgressState, addXp: number) => {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    let nextStreak = prev.streakDays;
    let streakBonus = 0;

    if (prev.lastActiveDate !== today) {
      if (prev.lastActiveDate === yesterday) {
        nextStreak = prev.streakDays + 1;
      } else {
        nextStreak = 1;
      }
      if ([3, 7, 14, 30].includes(nextStreak)) {
        streakBonus = nextStreak * 10;
      }
    }

    const nextActiveDates = prev.activeDates.includes(today)
      ? prev.activeDates
      : [...prev.activeDates, today].slice(-60);

    const nextBestStreak = Math.max(prev.bestStreak || 0, nextStreak);

    const baseDaily =
      prev.daily.date === today
        ? prev.daily
        : {
            date: today,
            flashcardsReviewed: 0,
            quizAnswered: 0,
            notesCompleted: 0,
            xpEarnedToday: 0,
          };

    return {
      today,
      nextStreak,
      nextBestStreak,
      nextActiveDates,
      streakBonus,
      nextDaily: {
        ...baseDaily,
        xpEarnedToday: baseDaily.xpEarnedToday + addXp + streakBonus,
      },
    };
  };

  const makeActivity = (
    action: string,
    xp: number,
    detail: string,
  ): XpActivity => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    xp,
    detail,
    timestamp: new Date().toISOString(),
  });

  const markPartRead = useCallback(
    (partNumber: number, title: string) => {
      let earned = 0;
      setState((prev) => {
        if (prev.readPartNumbers.includes(partNumber)) {
          return prev;
        }
        earned = 25;
        const {
          today,
          nextStreak,
          nextBestStreak,
          nextActiveDates,
          streakBonus,
          nextDaily,
        } = computeStreakAndDaily(prev, earned);
        earned += streakBonus;
        const activities = [
          makeActivity(
            'Completed Study Notes',
            25,
            `Part ${partNumber}: ${title}`,
          ),
          ...prev.activities,
        ];
        if (streakBonus > 0) {
          activities.unshift(
            makeActivity(
              'Streak Milestone Bonus',
              streakBonus,
              `${nextStreak}-Day Streak Badge`,
            ),
          );
        }
        return {
          ...prev,
          xp: prev.xp + earned,
          streakDays: nextStreak,
          bestStreak: nextBestStreak,
          lastActiveDate: today,
          activeDates: nextActiveDates,
          readPartNumbers: [...prev.readPartNumbers, partNumber],
          daily: {
            ...nextDaily,
            notesCompleted: nextDaily.notesCompleted + 1,
          },
          activities: activities.slice(0, 30),
        };
      });
      if (earned > 0) {
        showToast(earned, 'Study section completed');
      }
    },
    [showToast],
  );

  const markFlashcardMastered = useCallback(
    (cardId: string, label: string) => {
      let earned = 0;
      setState((prev) => {
        const alreadyReviewed = prev.reviewedFlashcardIds.includes(cardId);
        const baseXp = alreadyReviewed ? 2 : 10;
        const {
          today,
          nextStreak,
          nextBestStreak,
          nextActiveDates,
          streakBonus,
          nextDaily,
        } = computeStreakAndDaily(prev, baseXp);
        earned = baseXp + streakBonus;

        const activities = [
          makeActivity('Reviewed Flashcard', baseXp, label),
          ...prev.activities,
        ];
        if (streakBonus > 0) {
          activities.unshift(
            makeActivity(
              'Streak Milestone Bonus',
              streakBonus,
              `${nextStreak}-Day Streak Badge`,
            ),
          );
        }

        return {
          ...prev,
          xp: prev.xp + earned,
          streakDays: nextStreak,
          bestStreak: nextBestStreak,
          lastActiveDate: today,
          activeDates: nextActiveDates,
          reviewedFlashcardIds: alreadyReviewed
            ? prev.reviewedFlashcardIds
            : [...prev.reviewedFlashcardIds, cardId],
          daily: {
            ...nextDaily,
            flashcardsReviewed: nextDaily.flashcardsReviewed + 1,
          },
          activities: activities.slice(0, 30),
        };
      });
      if (earned > 0) {
        showToast(earned, 'Flashcard mastered');
      }
    },
    [showToast],
  );

  const recordQuizAnswer = useCallback(
    (
      questionId: string,
      isCorrect: boolean,
      partNumber: number,
      partFinished: boolean,
    ) => {
      let earned = 0;
      let toastText = '';
      setState((prev) => {
        const alreadyCorrect = prev.correctQuizIds.includes(questionId);
        const alreadyAttempted = prev.attemptedQuizIds.includes(questionId);
        const alreadyCompletedPart =
          prev.completedQuizParts.includes(partNumber);

        let delta = 0;
        if (isCorrect && !alreadyCorrect) {
          delta += 25;
        } else if (!alreadyAttempted) {
          delta += 5;
        }

        const partBonus = partFinished && !alreadyCompletedPart ? 50 : 0;
        delta += partBonus;

        const {
          today,
          nextStreak,
          nextBestStreak,
          nextActiveDates,
          streakBonus,
          nextDaily,
        } = computeStreakAndDaily(prev, delta);
        earned = delta + streakBonus;

        if (partBonus > 0) {
          toastText = `Quiz completed (+${partBonus} bonus)`;
        } else if (isCorrect && !alreadyCorrect) {
          toastText = 'Correct quiz answer';
        } else if (delta > 0) {
          toastText = 'Quiz attempt logged';
        }

        const nextActivities = [...prev.activities];
        if (delta > 0) {
          nextActivities.unshift(
            makeActivity(
              partBonus > 0
                ? 'Quiz Completed'
                : isCorrect
                  ? 'Correct Answer'
                  : 'Quiz Practice',
              delta,
              `Part ${partNumber}`,
            ),
          );
        }
        if (streakBonus > 0) {
          nextActivities.unshift(
            makeActivity(
              'Streak Milestone Bonus',
              streakBonus,
              `${nextStreak}-Day Streak Badge`,
            ),
          );
        }

        const prevStats = prev.quizQuestionStats ?? {};
        const prevEntry = prevStats[questionId] ?? {
          attempts: alreadyAttempted ? 1 : 0,
          correct: alreadyCorrect ? 1 : 0,
        };
        const nextStats: Record<string, QuizQuestionStat> = {
          ...prevStats,
          [questionId]: {
            attempts: prevEntry.attempts + 1,
            correct: prevEntry.correct + (isCorrect ? 1 : 0),
          },
        };

        return {
          ...prev,
          xp: prev.xp + earned,
          streakDays: nextStreak,
          bestStreak: nextBestStreak,
          lastActiveDate: today,
          activeDates: nextActiveDates,
          correctQuizIds:
            isCorrect && !alreadyCorrect
              ? [...prev.correctQuizIds, questionId]
              : prev.correctQuizIds,
          attemptedQuizIds: alreadyAttempted
            ? prev.attemptedQuizIds
            : [...prev.attemptedQuizIds, questionId],
          completedQuizParts:
            partFinished && !alreadyCompletedPart
              ? [...prev.completedQuizParts, partNumber]
              : prev.completedQuizParts,
          quizQuestionStats: nextStats,
          daily: {
            ...nextDaily,
            quizAnswered: nextDaily.quizAnswered + 1,
          },
          activities: nextActivities.slice(0, 30),
        };
      });

      if (earned > 0 && toastText) {
        showToast(earned, toastText);
      }
    },
    [showToast],
  );

  const resetProgress = useCallback(() => {
    if (!userId) return;
    const initial = createInitialProgressState();
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(initial));
    } catch {
      // Ignore storage failure; state still resets for this session.
    }
    setState(initial);
    setXpToast(null);
  }, [userId]);

  return {
    progress: state,
    levelInfo: getLevelInfo(state.xp),
    streakBadge: getStreakBadge(state.streakDays),
    studiedToday: state.lastActiveDate === getTodayKey(),
    xpToast,
    markPartRead,
    markFlashcardMastered,
    recordQuizAnswer,
    resetProgress,
  };
}
