import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import {resolveMappedAssetUrl} from '../utils/pdfVisualResolver';
import {playSfx} from '../utils/soundEffects';

export interface BlitzSymbolItem {
  id: string;
  group: 'Care Mark' | 'GHS Hazard';
  imagePath: string;
  japaneseName: string;
  englishName: string;
  sinhalaName: string;
}

const ALL_BLITZ_SYMBOLS: BlitzSymbolItem[] = [
  // 11 Care Marks (Part 4, p.87-89)
  {
    id: 'cm-1',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p087-obj404.jpg',
    japaneseName: '取扱注意',
    englishName: 'Handle With Care',
    sinhalaName: 'ප්‍රවේශමෙන් හසුරුවන්න',
  },
  {
    id: 'cm-2',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p087-obj405.jpg',
    japaneseName: '壊れもの注意',
    englishName: 'Fragile (Glass)',
    sinhalaName: 'බිඳෙනසුලු භාණ්ඩ',
  },
  {
    id: 'cm-3',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p087-obj406.jpg',
    japaneseName: '水濡れ防止',
    englishName: 'Keep Dry (Umbrella)',
    sinhalaName: 'තෙත් වීමෙන් වළක්වන්න',
  },
  {
    id: 'cm-4',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p088-obj410.jpg',
    japaneseName: '横積み禁止（天地無用）',
    englishName: 'This Side Up',
    sinhalaName: 'මෙම පැත්ත ඉහළට / පෙරළීම තහනම්',
  },
  {
    id: 'cm-5',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p088-obj411.jpg',
    japaneseName: '踏みつけ厳禁',
    englishName: 'Do Not Step On',
    sinhalaName: 'පෑගීම සපුරා තහනම්',
  },
  {
    id: 'cm-6',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p088-obj412.jpg',
    japaneseName: 'カッター注意',
    englishName: 'Do Not Use Blade / Cutter Caution',
    sinhalaName: 'කටර් පිහිය ප්‍රවේශමෙන්',
  },
  {
    id: 'cm-7',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p088-obj413.jpg',
    japaneseName: '積段数制限',
    englishName: 'Stacking Limit (Max Layers)',
    sinhalaName: 'උපරිම තට්ටු ගණන සීමාව',
  },
  {
    id: 'cm-8',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p088-obj414.jpg',
    japaneseName: '手かぎ禁止',
    englishName: 'Use No Hand Hooks',
    sinhalaName: 'කොකු භාවිතය තහනම්',
  },
  {
    id: 'cm-9',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p089-obj420.jpg',
    japaneseName: '直射日光・熱遮へい',
    englishName: 'Keep Away From Direct Sunlight',
    sinhalaName: 'සෘජු හිරු එළියෙන් ඈත් කරන්න',
  },
  {
    id: 'cm-10',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p089-obj422.jpg',
    japaneseName: '火気厳禁',
    englishName: 'Keep Away From Fire',
    sinhalaName: 'ගිනි හා ගිනි පුපුරුවලින් ඈත් කරන්න',
  },
  {
    id: 'cm-11',
    group: 'Care Mark',
    imagePath: '/images/figures/fig-p089-pallet-pattern.jpg',
    japaneseName: 'パレットパターン',
    englishName: 'Pallet Pattern (Stacking Layout)',
    sinhalaName: 'පැලට් ඇසිරීමේ රටා උපදෙස',
  },
  // 9 GHS Pictograms (Part 5, p.109-112)
  {
    id: 'ghs-1',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p109-obj479.jpg',
    japaneseName: '爆弾の爆発（爆発物）',
    englishName: 'Exploding Bomb (Explosives)',
    sinhalaName: 'පුපුරන සුලු ද්‍රව්‍ය',
  },
  {
    id: 'ghs-2',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p109-obj480.jpg',
    japaneseName: '炎（引火性・可燃性）',
    englishName: 'Flame (Flammable)',
    sinhalaName: 'ගිනිගන්නා සුලු ද්‍රව්‍ය',
  },
  {
    id: 'ghs-3',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p110-obj484.jpg',
    japaneseName: '円上の炎（酸化性）',
    englishName: 'Flame Over Circle (Oxidizing)',
    sinhalaName: 'ඔක්සිකාරක ද්‍රව්‍ය',
  },
  {
    id: 'ghs-4',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p110-obj485.jpg',
    japaneseName: 'ガスボンベ（高圧ガス）',
    englishName: 'Gas Cylinder (Gases Under Pressure)',
    sinhalaName: 'අධි පීඩන වායු',
  },
  {
    id: 'ghs-5',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p110-obj486.jpg',
    japaneseName: '感嘆符（皮膚・眼刺激性）',
    englishName: 'Exclamation Mark (Irritant / Harmful)',
    sinhalaName: 'සමට හා ඇසට හානිකර',
  },
  {
    id: 'ghs-6',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p111-obj490.jpg',
    japaneseName: 'どくろ（急性毒性 区分1〜3）',
    englishName: 'Skull & Crossbones (Acute Toxicity)',
    sinhalaName: 'මාරාන්තික උග්‍ර විෂ',
  },
  {
    id: 'ghs-7',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p111-obj491.jpg',
    japaneseName: '腐食性（金属・皮膚・眼）',
    englishName: 'Corrosion (Skin Burns & Metal)',
    sinhalaName: 'විඛාදන ද්‍රව්‍ය',
  },
  {
    id: 'ghs-8',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p111-obj492.jpg',
    japaneseName: '健康有害性（発がん性・臓器障害）',
    englishName: 'Health Hazard (Carcinogen / Organ)',
    sinhalaName: 'බරපතල සෞඛ්‍ය හානි',
  },
  {
    id: 'ghs-9',
    group: 'GHS Hazard',
    imagePath: '/images/figures/fig-p112-obj497.jpg',
    japaneseName: '環境（水性環境有害性）',
    englishName: 'Environment (Aquatic Toxicity)',
    sinhalaName: 'ජලජ පරිසරයට හානිකර',
  },
];

function shuffleArr<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface SymbolBlitzModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SymbolBlitzModal: React.FC<SymbolBlitzModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [stage, setStage] = useState<'ready' | 'playing' | 'done'>('ready');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [deck, setDeck] = useState<BlitzSymbolItem[]>(() =>
    shuffleArr(ALL_BLITZ_SYMBOLS),
  );
  const [cursor, setCursor] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{
    pickedId: string;
    isCorrect: boolean;
  } | null>(null);

  const startGame = useCallback(() => {
    playSfx('click');
    setDeck(shuffleArr(ALL_BLITZ_SYMBOLS));
    setCursor(0);
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setSecondsLeft(60);
    setStage('playing');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStage('ready');
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || stage !== 'playing') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setStage('done');
          playSfx('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, stage]);

  const currentItem = deck[cursor % deck.length];

  const options = useMemo<BlitzSymbolItem[]>(() => {
    if (!currentItem) return [];
    const sameGroup = ALL_BLITZ_SYMBOLS.filter(
      (s) => s.id !== currentItem.id && s.group === currentItem.group,
    );
    const distractors = shuffleArr(sameGroup).slice(0, 3);
    return shuffleArr([currentItem, ...distractors]);
  }, [currentItem]);

  const handlePick = (opt: BlitzSymbolItem) => {
    if (stage !== 'playing' || feedback !== null) return;
    const ok = opt.id === currentItem.id;
    playSfx(ok ? 'correct' : 'wrong');
    setFeedback({pickedId: opt.id, isCorrect: ok});
    setAttempts((a) => a + 1);
    if (ok) {
      setScore((s) => s + 1);
      setStreak((st) => {
        const next = st + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }

    window.setTimeout(() => {
      setFeedback(null);
      setCursor((c) => {
        const next = c + 1;
        if (next % deck.length === 0) {
          setDeck(shuffleArr(ALL_BLITZ_SYMBOLS));
        }
        return next;
      });
    }, 420);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="60-Second Care Marks and GHS Symbol Blitz"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface-card flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="surface-hero flex items-center justify-between gap-3 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold tracking-tight">
                60-Second Symbol Blitz
              </h2>
              <p className="text-[11px] text-slate-300">
                11 Cargo Care Marks + 9 GHS Hazard Pictograms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Symbol Blitz"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {stage === 'ready' && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                <Sparkles className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Master All 20 Exam Symbols in 60 Seconds
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  Identify each Care Mark (Part 4) and GHS Hazard Pictogram
                  (Part 5) as fast as possible before the 60-second clock hits
                  zero.
                </p>
              </div>
              <button
                type="button"
                onClick={startGame}
                className="btn-primary-premium inline-flex min-h-[48px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Start 60-Second Blitz</span>
              </button>
            </div>
          )}

          {stage === 'playing' && currentItem && (
            <div className="space-y-4">
              {/* Live HUD */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs">
                <span
                  className={`font-mono-tabular inline-flex items-center gap-1.5 font-bold ${
                    secondsLeft <= 10 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>{secondsLeft}s</span>
                </span>
                <span className="font-mono-tabular font-bold text-emerald-700">
                  Score: {score}
                </span>
                <span className="font-mono-tabular inline-flex items-center gap-1 font-semibold text-amber-700">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{streak} streak</span>
                </span>
              </div>

              {/* Symbol Viewport */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-2xs">
                <span className="mb-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {currentItem.group}
                </span>
                <img
                  src={resolveMappedAssetUrl(currentItem.imagePath)}
                  alt="Identify this symbol"
                  className="h-32 w-auto max-w-full object-contain sm:h-36"
                />
              </div>

              {/* 4 Choices */}
              <div className="space-y-2">
                {options.map((opt) => {
                  const isCorrect = opt.id === currentItem.id;
                  const isPicked = feedback?.pickedId === opt.id;
                  let cls =
                    'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50/40';
                  if (feedback) {
                    if (isCorrect) {
                      cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
                    } else if (isPicked) {
                      cls = 'border-rose-500 bg-rose-50 text-rose-950';
                    } else {
                      cls = 'border-slate-200/60 bg-slate-50 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={feedback !== null}
                      onClick={() => handlePick(opt)}
                      className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all ${cls}`}
                    >
                      <div className="min-w-0">
                        <p className="font-jp truncate text-xs font-bold text-slate-900 sm:text-sm">
                          {opt.japaneseName} ·{' '}
                          <span className="font-semibold text-blue-700">
                            {opt.englishName}
                          </span>
                        </p>
                        <p className="truncate text-[11px] text-slate-600">
                          {opt.sinhalaName}
                        </p>
                      </div>
                      {feedback && isCorrect && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      {feedback && isPicked && !isCorrect && (
                        <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                <Trophy className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Time&apos;s Up! {score} Symbols Identified
                </h3>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Accuracy:{' '}
                  <strong className="font-mono-tabular text-emerald-700">
                    {attempts > 0 ? Math.round((score / attempts) * 100) : 0}%
                  </strong>{' '}
                  ({score}/{attempts}) · Best Streak:{' '}
                  <strong className="font-mono-tabular text-amber-700">
                    {bestStreak}
                  </strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={startGame}
                  className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold sm:text-sm"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
