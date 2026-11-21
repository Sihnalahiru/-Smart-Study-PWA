import React, {useEffect, useMemo, useState} from 'react';
import {
  CheckCircle2,
  Flame,
  Grid,
  Languages,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  ALL_KANA_CHARS,
  DAILY_ALPHABET_SESSIONS_TARGET,
  HIRAGANA_CHARS,
  KATAKANA_CHARS,
  SSW_MAIN_KANJI,
  type KanaChar,
  type KanaGroup,
  type KanaScript,
  type MainKanjiItem,
} from '../data/kanaKanji';
import {playSfx, speakJapanese} from '../utils/soundEffects';
import {FuriganaText} from './FuriganaText';

interface KanaKanjiTabProps {
  alphabetSessionsToday: number;
  alphabetTotalSessions: number;
  alphabetTotalCorrect: number;
  alphabetTotalAttempts: number;
  masteredKanaIds: string[];
  masteredKanjiIds: string[];
  kanjiPracticedToday: number;
  onRecordAlphabetPractice: (
    charsCount: number,
    correctCount: number,
    attemptCount: number,
    sessionCompleted: boolean,
    newlyMasteredKanaIds?: string[],
  ) => void;
  onRecordKanjiPractice: (
    kanjiId: string,
    isCorrect: boolean,
    label?: string,
  ) => void;
}

type KanaTabMode = 'drill' | 'matrix' | 'kanji';
type DrillScope = 'full219' | 'gojuon92' | 'hiragana104' | 'katakana115';

const GROUP_LABELS: Record<KanaGroup, string> = {
  gojuon: 'Basic Gojūon (46)',
  dakuten: 'Dakuten & Handakuten (25)',
  yoon: 'Yōon Combined Sounds (33)',
  extended: 'Extended Logistics Katakana (11)',
};

function shuffleList<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildKanaDeck(scope: DrillScope): KanaChar[] {
  switch (scope) {
    case 'gojuon92':
      return shuffleList(ALL_KANA_CHARS.filter((k) => k.group === 'gojuon'));
    case 'hiragana104':
      return shuffleList(HIRAGANA_CHARS);
    case 'katakana115':
      return shuffleList(KATAKANA_CHARS);
    case 'full219':
    default:
      return shuffleList(ALL_KANA_CHARS);
  }
}

export const KanaKanjiTab: React.FC<KanaKanjiTabProps> = ({
  alphabetSessionsToday,
  alphabetTotalSessions,
  alphabetTotalCorrect,
  alphabetTotalAttempts,
  masteredKanaIds,
  masteredKanjiIds,
  kanjiPracticedToday,
  onRecordAlphabetPractice,
  onRecordKanjiPractice,
}) => {
  const [mode, setMode] = useState<KanaTabMode>('drill');
  const [showFurigana, setShowFurigana] = useState(true);

  // --- Mode 1: 2x Daily Full Alphabet Drill ---
  const [drillScope, setDrillScope] = useState<DrillScope>('full219');
  const [drillDeck, setDrillDeck] = useState<KanaChar[]>(() =>
    buildKanaDeck('full219'),
  );
  const [drillIndex, setDrillIndex] = useState(0);
  const [selectedRomaji, setSelectedRomaji] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionMasteredIds, setSessionMasteredIds] = useState<string[]>([]);
  const [sessionFinished, setSessionFinished] = useState(false);

  const startFreshDrill = (nextScope: DrillScope = drillScope) => {
    playSfx('click');
    setDrillScope(nextScope);
    setDrillDeck(buildKanaDeck(nextScope));
    setDrillIndex(0);
    setSelectedRomaji(null);
    setSessionCorrect(0);
    setSessionAttempted(0);
    setSessionMasteredIds([]);
    setSessionFinished(false);
  };

  const currentKana = drillDeck[drillIndex];

  const kanaOptions = useMemo<string[]>(() => {
    if (!currentKana) return [];
    const sameScriptPool = ALL_KANA_CHARS.filter(
      (k) =>
        k.romaji !== currentKana.romaji &&
        k.script === currentKana.script,
    );
    const uniqueRomaji = Array.from(
      new Set(sameScriptPool.map((k) => k.romaji)),
    );
    const distractors = shuffleList(uniqueRomaji).slice(0, 3);
    return shuffleList([currentKana.romaji, ...distractors]);
  }, [currentKana]);

  const handleAnswerKana = (optionRomaji: string) => {
    if (!currentKana || selectedRomaji !== null || sessionFinished) return;
    setSelectedRomaji(optionRomaji);
    const isCorrect = optionRomaji === currentKana.romaji;
    playSfx(isCorrect ? 'correct' : 'wrong');

    const nextCorrect = sessionCorrect + (isCorrect ? 1 : 0);
    const nextAttempted = sessionAttempted + 1;
    const nextMastered = isCorrect
      ? [...sessionMasteredIds, currentKana.id]
      : sessionMasteredIds;

    setSessionCorrect(nextCorrect);
    setSessionAttempted(nextAttempted);
    setSessionMasteredIds(nextMastered);

    if (drillIndex + 1 >= drillDeck.length) {
      setSessionFinished(true);
      playSfx('complete');
      onRecordAlphabetPractice(
        drillDeck.length,
        nextCorrect,
        nextAttempted,
        true,
        nextMastered,
      );
    }
  };

  const handleNextKanaPrompt = () => {
    if (drillIndex + 1 < drillDeck.length) {
      playSfx('click');
      setDrillIndex((prev) => prev + 1);
      setSelectedRomaji(null);
    }
  };

  const handleCheckpointSave = () => {
    if (sessionAttempted === 0) return;
    playSfx('complete');
    onRecordAlphabetPractice(
      sessionAttempted,
      sessionCorrect,
      sessionAttempted,
      false,
      sessionMasteredIds,
    );
    startFreshDrill(drillScope);
  };

  // --- Mode 2: Full Kana Reference Matrix ---
  const [matrixScript, setMatrixScript] = useState<KanaScript>('hiragana');
  const matrixGroups = useMemo(() => {
    const source =
      matrixScript === 'hiragana' ? HIRAGANA_CHARS : KATAKANA_CHARS;
    const groups: KanaGroup[] =
      matrixScript === 'hiragana'
        ? ['gojuon', 'dakuten', 'yoon']
        : ['gojuon', 'dakuten', 'yoon', 'extended'];
    return groups.map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: source.filter((item) => item.group === g),
    }));
  }, [matrixScript]);

  // --- Mode 3: Main Kanji Practice (84 Textbook Kanji) ---
  const [kanjiPartFilter, setKanjiPartFilter] = useState<number | 'all'>('all');
  const [kanjiSubMode, setKanjiSubMode] = useState<'study' | 'quiz'>('study');
  const [kanjiQuizIdx, setKanjiQuizIdx] = useState(0);
  const [kanjiSelectedId, setKanjiSelectedId] = useState<string | null>(null);

  const filteredKanji = useMemo<MainKanjiItem[]>(() => {
    if (kanjiPartFilter === 'all') return SSW_MAIN_KANJI;
    return SSW_MAIN_KANJI.filter((k) => k.partNumber === kanjiPartFilter);
  }, [kanjiPartFilter]);

  useEffect(() => {
    setKanjiQuizIdx(0);
    setKanjiSelectedId(null);
  }, [kanjiPartFilter, kanjiSubMode]);

  const currentQuizKanji =
    filteredKanji[kanjiQuizIdx % Math.max(1, filteredKanji.length)];

  const kanjiQuizOptions = useMemo<MainKanjiItem[]>(() => {
    if (!currentQuizKanji) return [];
    const pool = SSW_MAIN_KANJI.filter((k) => k.id !== currentQuizKanji.id);
    const distractors = shuffleList(pool).slice(0, 3);
    return shuffleList([currentQuizKanji, ...distractors]);
  }, [currentQuizKanji]);

  const kanaAccuracyPct =
    alphabetTotalAttempts > 0
      ? Math.round((alphabetTotalCorrect / alphabetTotalAttempts) * 100)
      : 0;
  const shiftsProgressPct = Math.min(
    100,
    Math.round((alphabetSessionsToday / DAILY_ALPHABET_SESSIONS_TARGET) * 100),
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Summary Card: 2x Daily Alphabet + Main Kanji */}
      <section className="surface-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-700">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Hiragana, Katakana ({ALL_KANA_CHARS.length}) &amp; Main Kanji ({SSW_MAIN_KANJI.length})
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Daily goal:{' '}
                <strong className="font-mono-tabular text-indigo-700">
                  {alphabetSessionsToday}/{DAILY_ALPHABET_SESSIONS_TARGET} full shifts
                </strong>{' '}
                · Accuracy{' '}
                <strong className="font-mono-tabular text-slate-800">
                  {alphabetTotalAttempts > 0 ? `${kanaAccuracyPct}%` : '—'}
                </strong>{' '}
                · Kanji mastered{' '}
                <strong className="font-mono-tabular text-emerald-700">
                  {masteredKanjiIds.length}/{SSW_MAIN_KANJI.length}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alphabetSessionsToday >= DAILY_ALPHABET_SESSIONS_TARGET && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>2× Daily Clear</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowFurigana((prev) => !prev)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                showFurigana
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ふりがな</span>
            </button>
          </div>
        </div>

        {/* 2x Daily Alphabet Shift Progress */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>Today&apos;s Full-Alphabet Target (2× Daily)</span>
            </span>
            <span className="font-mono-tabular font-semibold text-slate-800">
              Shift {Math.min(DAILY_ALPHABET_SESSIONS_TARGET, alphabetSessionsToday)}/{DAILY_ALPHABET_SESSIONS_TARGET} · Total shifts: {alphabetTotalSessions}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                alphabetSessionsToday >= DAILY_ALPHABET_SESSIONS_TARGET
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-500'
              }`}
              style={{width: `${shiftsProgressPct}%`}}
            />
          </div>
        </div>

        {/* 3 Mode Tabs */}
        <div
          role="tablist"
          aria-label="Kana & Kanji practice modes"
          className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'drill'}
            onClick={() => {
              playSfx('click');
              setMode('drill');
            }}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'drill'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>2× Shift Drill</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'matrix'}
            onClick={() => {
              playSfx('click');
              setMode('matrix');
            }}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'matrix'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Chart (219)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'kanji'}
            onClick={() => {
              playSfx('click');
              setMode('kanji');
            }}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              mode === 'kanji'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Main Kanji ({SSW_MAIN_KANJI.length})</span>
          </button>
        </div>
      </section>

      {mode === 'drill' ? (
        <section className="space-y-4">
          {/* Deck Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ['full219', `Full Alphabet (${ALL_KANA_CHARS.length})`],
                ['gojuon92', 'Basic 92 (Hira+Kata)'],
                ['hiragana104', `Hiragana (${HIRAGANA_CHARS.length})`],
                ['katakana115', `Katakana (${KATAKANA_CHARS.length})`],
              ] as [DrillScope, string][]
            ).map(([scopeKey, label]) => (
              <button
                key={scopeKey}
                type="button"
                onClick={() => startFreshDrill(scopeKey)}
                className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  drillScope === scopeKey
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sessionFinished ? (
            <div className="surface-card rounded-2xl p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Alphabet Shift Complete!
                </h2>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Score:{' '}
                  <strong className="font-mono-tabular text-emerald-700">
                    {sessionCorrect} / {drillDeck.length}
                  </strong>{' '}
                  ({Math.round((sessionCorrect / Math.max(1, drillDeck.length)) * 100)}
                  % accuracy) · Today&apos;s shifts:{' '}
                  <strong className="font-mono-tabular text-indigo-700">
                    {alphabetSessionsToday}/{DAILY_ALPHABET_SESSIONS_TARGET}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => startFreshDrill(drillScope)}
                className="btn-primary-premium inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>
                  {alphabetSessionsToday < DAILY_ALPHABET_SESSIONS_TARGET
                    ? 'Start Shift 2/2 Now'
                    : 'Practice Another Round'}
                </span>
              </button>
            </div>
          ) : (
            currentKana && (
              <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
                  <span className="font-mono-tabular font-bold text-slate-900">
                    {drillIndex + 1} / {drillDeck.length}
                  </span>
                  <span>
                    {currentKana.script === 'hiragana'
                      ? 'ひらがな (Hiragana)'
                      : 'カタカナ (Katakana)'}{' '}
                    · {currentKana.row}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular font-semibold text-emerald-700">
                      {sessionCorrect}/{sessionAttempted} ok
                    </span>
                    {sessionAttempted > 0 && (
                      <button
                        type="button"
                        onClick={handleCheckpointSave}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Save &amp; Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-200"
                    style={{
                      width: `${Math.round(((drillIndex + 1) / drillDeck.length) * 100)}%`,
                    }}
                  />
                </div>

                {/* Character Showcase */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white py-6">
                  <span className="font-jp text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">
                    {currentKana.char}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentKana.char, 0.85)}
                    className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:text-blue-700"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                    <span>Listen Sound</span>
                  </button>
                </div>

                {/* 4 Romaji Options */}
                <div className="grid grid-cols-2 gap-2.5">
                  {kanaOptions.map((opt) => {
                    const answered = selectedRomaji !== null;
                    const isThisCorrect = opt === currentKana.romaji;
                    const isThisSelected = opt === selectedRomaji;

                    let btnClass =
                      'border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/40';
                    if (answered) {
                      if (isThisCorrect) {
                        btnClass =
                          'border-emerald-400 bg-emerald-50 text-emerald-900';
                      } else if (isThisSelected) {
                        btnClass = 'border-red-400 bg-red-50 text-red-900';
                      } else {
                        btnClass =
                          'border-slate-200/60 bg-slate-50 text-slate-400 opacity-70';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={answered}
                        onClick={() => handleAnswerKana(opt)}
                        className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-bold transition-all ${btnClass}`}
                      >
                        <span>{opt}</span>
                        {answered && isThisCorrect && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        )}
                        {answered && isThisSelected && !isThisCorrect && (
                          <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedRomaji !== null && (
                  <button
                    type="button"
                    onClick={handleNextKanaPrompt}
                    className="btn-primary-premium inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                  >
                    <span>Next Character ({drillIndex + 2}/{drillDeck.length})</span>
                  </button>
                )}
              </div>
            )
          )}
        </section>
      ) : mode === 'matrix' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  playSfx('click');
                  setMatrixScript('hiragana');
                }}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  matrixScript === 'hiragana'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hiragana ({HIRAGANA_CHARS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx('click');
                  setMatrixScript('katakana');
                }}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  matrixScript === 'katakana'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Katakana ({KATAKANA_CHARS.length})
              </button>
            </div>
            <span className="font-mono-tabular text-xs font-medium text-slate-500">
              {masteredKanaIds.length}/{ALL_KANA_CHARS.length} mastered
            </span>
          </div>

          {matrixGroups.map((grp) => (
            <div key={grp.group} className="surface-card rounded-2xl p-4 sm:p-5">
              <h2 className="mb-3 text-xs font-bold tracking-wide text-slate-700 sm:text-sm">
                {grp.label} · Tap any tile to hear sound
              </h2>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {grp.items.map((item) => {
                  const isMastered = masteredKanaIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        speakJapanese(item.char, 0.85);
                        if (!isMastered) {
                          onRecordAlphabetPractice(1, 1, 1, false, [item.id]);
                        }
                      }}
                      className={`flex min-h-[60px] flex-col items-center justify-center rounded-xl border p-1.5 transition-all active:scale-95 ${
                        isMastered
                          ? 'border-emerald-300 bg-emerald-50/70 text-slate-900'
                          : 'border-slate-200/90 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <span className="font-jp text-lg font-bold leading-tight">
                        {item.char}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {item.romaji}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* Mode 3: 84 Textbook Main Kanji */
        <section className="space-y-4">
          <div className="surface-card flex flex-wrap items-center justify-between gap-2.5 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setKanjiPartFilter('all')}
                className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  kanjiPartFilter === 'all'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                All ({SSW_MAIN_KANJI.length})
              </button>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setKanjiPartFilter(p)}
                  className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    kanjiPartFilter === p
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  Part {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setKanjiSubMode('study')}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  kanjiSubMode === 'study'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Study Cards ({filteredKanji.length})
              </button>
              <button
                type="button"
                onClick={() => setKanjiSubMode('quiz')}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  kanjiSubMode === 'quiz'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Kanji Quiz ({kanjiPracticedToday} today)
              </button>
            </div>
          </div>

          {kanjiSubMode === 'study' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredKanji.map((item) => {
                const mastered = masteredKanjiIds.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className={`surface-card rounded-2xl p-4 space-y-2.5 ${
                      mastered ? 'border-emerald-200 bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="font-jp flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-3xl font-bold text-slate-900">
                          {item.kanji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-blue-700">
                            Part {item.partNumber} · {item.romaji}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900">
                            {item.sinhala}
                          </p>
                          <p className="font-jp mt-0.5 text-[11px] text-slate-500">
                            音: {item.onyomi} · 訓: {item.kunyomi}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => speakJapanese(item.exampleJp)}
                        aria-label={`Listen to ${item.kanji} example`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        <Volume2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-xs">
                      <p className="font-jp font-semibold leading-[1.9] text-slate-900">
                        <FuriganaText
                          text={item.exampleJp}
                          showFurigana={showFurigana}
                        />
                      </p>
                      <p className="italic text-slate-500">{item.exampleRomaji}</p>
                      <p className="mt-0.5 text-slate-700">{item.exampleSinhala}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx('complete');
                        onRecordKanjiPractice(item.id, true, `${item.kanji} (${item.romaji})`);
                      }}
                      className={`inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mastered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {mastered ? 'Mastered (+2 XP Review)' : 'Mark Mastered (+6 XP)'}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            currentQuizKanji && (
              <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono-tabular font-bold text-slate-900">
                    Kanji {(kanjiQuizIdx % filteredKanji.length) + 1} /{' '}
                    {filteredKanji.length}
                  </span>
                  <span>Part {currentQuizKanji.partNumber}</span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/70 py-6 text-center">
                  <span className="font-jp text-6xl font-bold text-slate-900">
                    {currentQuizKanji.kanji}
                  </span>
                  <p className="font-jp mt-3 text-sm font-medium text-slate-700">
                    <FuriganaText
                      text={currentQuizKanji.exampleJp}
                      showFurigana={false}
                    />
                  </p>
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentQuizKanji.exampleJp)}
                    className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                    <span>Listen Compound</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {kanjiQuizOptions.map((opt) => {
                    const answered = kanjiSelectedId !== null;
                    const isCorrect = opt.id === currentQuizKanji.id;
                    const isSelected = opt.id === kanjiSelectedId;

                    let cls =
                      'border-slate-200 bg-white text-slate-900 hover:border-blue-300';
                    if (answered) {
                      if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-950';
                      else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-950';
                      else cls = 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-70';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={answered}
                        onClick={() => {
                          setKanjiSelectedId(opt.id);
                          const ok = opt.id === currentQuizKanji.id;
                          playSfx(ok ? 'correct' : 'wrong');
                          onRecordKanjiPractice(
                            currentQuizKanji.id,
                            ok,
                            `${currentQuizKanji.kanji} (${currentQuizKanji.romaji})`,
                          );
                        }}
                        className={`flex min-h-[50px] w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-xs font-semibold transition-all sm:text-sm ${cls}`}
                      >
                        <span>
                          {opt.romaji} · {opt.sinhala}
                        </span>
                        {answered && isCorrect && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        )}
                        {answered && isSelected && !isCorrect && (
                          <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {kanjiSelectedId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('click');
                      setKanjiSelectedId(null);
                      setKanjiQuizIdx((prev) => (prev + 1) % filteredKanji.length);
                    }}
                    className="btn-primary-premium inline-flex min-h-[46px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    Next Main Kanji
                  </button>
                )}
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
};
