import type {ComponentType} from 'react';
import {
  BookMarked,
  ClipboardCheck,
  Crown,
  Forklift,
  HardHat,
  Languages,
  PackageCheck,
  RotateCcw,
  Scale,
  Warehouse,
} from 'lucide-react';
import type {ActiveTab, StudyPart, StudyProgressState} from '../types/study';
import type {StreakBadgeInfo} from '../hooks/useStudyProgress';
import {VOCAB_DAILY_TARGET} from '../data/vocabulary';
import {computeSyllabusNodes} from './syllabusProgress';

export interface TrophyBadge {
  id: string;
  title: string;
  requirement: string;
  moduleRef: string;
  unlocked: boolean;
  progressPercent: number;
  targetPartNumber: number;
  targetTab: ActiveTab;
  actionMode?: 'vocab' | 'mistakes';
  accentGradient: string;
  iconBg: string;
  icon: ComponentType<{className?: string}>;
}

export function computeTrophyBadges(
  allParts: StudyPart[],
  progress: StudyProgressState,
): TrophyBadge[] {
  const nodes = computeSyllabusNodes(allParts, progress);
  const byCode = new Map(nodes.map((n) => [n.code, n]));

  const getRecommendedTab = (
    partNumber: number,
    cardsDone: number,
    cardsTotal: number,
  ): ActiveTab => {
    if (!progress.readPartNumbers.includes(partNumber)) return 'notes';
    if (cardsDone < cardsTotal) return 'flashcards';
    return 'quiz';
  };

  const modA = byCode.get('A');
  const modB = byCode.get('B');
  const modC = byCode.get('C');
  const modD = byCode.get('D');
  const modE = byCode.get('E');
  const modF = byCode.get('F');

  const coreNodes = [modA, modB, modC, modD, modE, modF].filter(
    (n): n is NonNullable<typeof n> => Boolean(n),
  );
  const masterPct =
    coreNodes.length > 0
      ? Math.round(
          coreNodes.reduce((sum, n) => sum + n.percent, 0) / coreNodes.length,
        )
      : 0;
  const masterUnlocked =
    coreNodes.length === 6 &&
    coreNodes.every((n) => n.status === 'completed');

  const firstIncompleteNode =
    coreNodes.find((n) => n.status !== 'completed' && n.partAvailable) ??
    coreNodes[0];

  const vocabProgressPct = Math.min(
    100,
    Math.round(
      (Math.max(
        progress.daily.vocabReviewedCount,
        progress.learnedVocabIds.length,
      ) /
        VOCAB_DAILY_TARGET) *
        100,
    ),
  );
  const vocabSprinterUnlocked =
    progress.daily.vocabReviewedCount >= VOCAB_DAILY_TARGET ||
    progress.learnedVocabIds.length >= VOCAB_DAILY_TARGET;

  const attemptedCount = progress.attemptedQuizIds.length;
  const wrongCount = progress.wrongQuizIds.length;
  const zeroDefectUnlocked = attemptedCount >= 10 && wrongCount === 0;
  const zeroDefectPct = zeroDefectUnlocked
    ? 100
    : attemptedCount === 0
      ? 0
      : Math.min(
          95,
          Math.round((Math.min(attemptedCount, 10) / 10) * 70) +
            (wrongCount === 0 ? 25 : 0),
        );

  return [
    {
      id: 'safety-first',
      title: 'Warehouse Architect',
      requirement: 'Finish Part 1 (Warehouses, 13 Temps, Equipment & Vehicles)',
      moduleRef: 'Dock A · Part 1',
      unlocked: modA?.status === 'completed',
      progressPercent: modA?.percent ?? 0,
      targetPartNumber: 1,
      targetTab: getRecommendedTab(
        1,
        modA?.cardsDone ?? 0,
        modA?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60',
      iconBg:
        'border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs',
      icon: Warehouse,
    },
    {
      id: 'warehouse-pro',
      title: 'Inventory Warden',
      requirement: 'Master Part 2 (Operations, Fees, Disasters & Pallets)',
      moduleRef: 'Dock B · Part 2',
      unlocked: modB?.status === 'completed',
      progressPercent: modB?.percent ?? 0,
      targetPartNumber: 2,
      targetTab: getRecommendedTab(
        2,
        modB?.cardsDone ?? 0,
        modB?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60',
      iconBg:
        'border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs',
      icon: ClipboardCheck,
    },
    {
      id: 'stock-controller',
      title: 'Units & Counters Ace',
      requirement: 'Complete Part 3 (PPE, JAN/QR/RFID, Units & 35 Counters)',
      moduleRef: 'Dock C · Part 3',
      unlocked: modC?.status === 'completed',
      progressPercent: modC?.percent ?? 0,
      targetPartNumber: 3,
      targetTab: getRecommendedTab(
        3,
        modC?.cardsDone ?? 0,
        modC?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60',
      iconBg:
        'border-indigo-200 bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs',
      icon: Scale,
    },
    {
      id: 'forklift-ace',
      title: 'Cargo Flow Specialist',
      requirement: 'Complete Part 4 (In/Out, 17 Tasks & 11 Care Marks)',
      moduleRef: 'Dock D · Part 4',
      unlocked: modD?.status === 'completed',
      progressPercent: modD?.percent ?? 0,
      targetPartNumber: 4,
      targetTab: getRecommendedTab(
        4,
        modD?.cardsDone ?? 0,
        modD?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60',
      iconBg:
        'border-amber-200 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs',
      icon: PackageCheck,
    },
    {
      id: 'wms-specialist',
      title: 'Safety & KYT Guardian',
      requirement: 'Finish Part 5 (Labor Law, KYT, 5S & 9 GHS Pictograms)',
      moduleRef: 'Dock E · Part 5',
      unlocked: modE?.status === 'completed',
      progressPercent: modE?.percent ?? 0,
      targetPartNumber: 5,
      targetTab: getRecommendedTab(
        5,
        modE?.cardsDone ?? 0,
        modE?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/60',
      iconBg:
        'border-sky-200 bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-xs',
      icon: HardHat,
    },
    {
      id: 'kpi-analyst',
      title: 'Forklift Commander',
      requirement: 'Master Part 6 (Forklift Standards & Container Rules)',
      moduleRef: 'Dock F · Part 6',
      unlocked: modF?.status === 'completed',
      progressPercent: modF?.percent ?? 0,
      targetPartNumber: 6,
      targetTab: getRecommendedTab(
        6,
        modF?.cardsDone ?? 0,
        modF?.cardsTotal ?? 0,
      ),
      accentGradient:
        'border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60',
      iconBg:
        'border-teal-200 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs',
      icon: Forklift,
    },
    {
      id: 'daily-vocab-sprinter',
      title: 'Daily 25 Vocab Sprinter',
      requirement: `Review ${VOCAB_DAILY_TARGET} warehouse words in one shift`,
      moduleRef: `${progress.daily.vocabReviewedCount}/${VOCAB_DAILY_TARGET} Today`,
      unlocked: vocabSprinterUnlocked,
      progressPercent: vocabProgressPct,
      targetPartNumber: 1,
      targetTab: 'flashcards',
      actionMode: 'vocab',
      accentGradient:
        'border-amber-200/90 bg-gradient-to-br from-amber-50/85 via-white to-yellow-50/60',
      iconBg:
        'border-amber-200 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs',
      icon: BookMarked,
    },
    {
      id: 'zero-defect-reviewer',
      title: 'Zero-Defect Reviewer',
      requirement: 'Answer 10+ quiz items & clear your mistake queue to zero',
      moduleRef:
        wrongCount > 0 ? `${wrongCount} mistakes queued` : `${attemptedCount} checked`,
      unlocked: zeroDefectUnlocked,
      progressPercent: zeroDefectPct,
      targetPartNumber: 1,
      targetTab: 'quiz',
      actionMode: wrongCount > 0 ? 'mistakes' : undefined,
      accentGradient:
        'border-emerald-200/90 bg-gradient-to-br from-emerald-50/85 via-white to-cyan-50/60',
      iconBg:
        'border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xs',
      icon: RotateCcw,
    },
    {
      id: 'kana-kanji-ace',
      title: '2× Daily Kana & Kanji Ace',
      requirement: 'Finish 2 full Hiragana+Katakana shifts today & practice Main Kanji',
      moduleRef: `${progress.daily.alphabetSessionsToday}/2 shifts today`,
      unlocked:
        progress.daily.alphabetSessionsToday >= 2 ||
        progress.alphabetTotalSessions >= 2,
      progressPercent: Math.min(
        100,
        Math.round((Math.max(progress.daily.alphabetSessionsToday, progress.alphabetTotalSessions) / 2) * 100),
      ),
      targetPartNumber: 1,
      targetTab: 'kana',
      accentGradient:
        'border-indigo-200/90 bg-gradient-to-br from-indigo-50/85 via-white to-violet-50/60',
      iconBg:
        'border-indigo-200 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs',
      icon: Languages,
    },
    {
      id: 'certified-logistics-master',
      title: 'Logistics Master',
      requirement: 'Unlock all 6 SSW Textbook docks (Parts 1–6)',
      moduleRef: 'Full 123p SSW Exam',
      unlocked: masterUnlocked,
      progressPercent: masterPct,
      targetPartNumber: firstIncompleteNode?.partNumber ?? 1,
      targetTab: 'notes',
      accentGradient:
        'border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/80',
      iconBg:
        'border-amber-300 bg-gradient-to-br from-slate-900 to-slate-800 text-amber-400 shadow-xs',
      icon: Crown,
    },
  ];
}

export function getUnlockedMilestoneEntries(
  allParts: StudyPart[],
  progress: StudyProgressState,
  streakBadge: StreakBadgeInfo,
): {id: string; label: string}[] {
  const entries: {id: string; label: string}[] = [];

  for (const badge of computeTrophyBadges(allParts, progress)) {
    if (badge.unlocked) {
      entries.push({id: `trophy:${badge.id}`, label: badge.title});
    }
  }

  if (streakBadge.isEarned) {
    entries.push({
      id: `streak:${streakBadge.title}`,
      label: `${streakBadge.title} Streak Badge`,
    });
  }

  return entries;
}
