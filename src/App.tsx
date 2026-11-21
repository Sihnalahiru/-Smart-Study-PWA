import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Award,
  BookOpen,
  CheckSquare,
  ChevronDown,
  Flame,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Maximize2,
  Minimize2,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import manifestData from './data/manifest.json';
import {VOCAB_DAILY_TARGET} from './data/vocabulary';
import {DashboardTab} from './components/DashboardTab';
import {EmptyStudyState} from './components/EmptyStudyState';
import {
  FlashcardsTab,
  type FlashcardViewMode,
} from './components/FlashcardsTab';
import {GlobalSearchModal} from './components/GlobalSearchModal';
import {LoginScreen} from './components/LoginScreen';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PWAInstallButton} from './components/PWAInstallButton';
import {QuizTab, type QuizFilter} from './components/QuizTab';
import {StudyLibraryTab} from './components/StudyLibraryTab';
import {StudyNotesTab} from './components/StudyNotesTab';
import {useStudyProgress} from './hooks/useStudyProgress';
import type {
  ActiveTab,
  SearchNavigationTarget,
  StudyManifest,
  StudyPart,
  UserId,
} from './types/study';
import {
  getStoredActiveUserId,
  getUserProfile,
  setStoredActiveUserId,
  USER_PROFILES,
} from './utils/userProfiles';

const partModules = import.meta.glob<{default?: StudyPart} & StudyPart>(
  './data/part-*.json',
  {eager: true},
);

interface NavItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  section: 'study' | 'library';
  icon: React.ComponentType<{className?: string}>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    section: 'study',
    icon: LayoutDashboard,
  },
  {
    id: 'library',
    label: 'Study Library',
    shortLabel: 'Library',
    section: 'library',
    icon: Library,
  },
  {
    id: 'notes',
    label: 'Study Notes',
    shortLabel: 'Notes',
    section: 'study',
    icon: BookOpen,
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    shortLabel: 'Cards',
    section: 'study',
    icon: Layers,
  },
  {
    id: 'quiz',
    label: 'Quiz (日本語)',
    shortLabel: 'Quiz',
    section: 'study',
    icon: CheckSquare,
  },
];

export default function App() {
  const [activeUserId, setActiveUserId] = useState<UserId | null>(() =>
    getStoredActiveUserId(),
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);

  const [focusNotePart, setFocusNotePart] = useState<number | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string>('');
  const [focusCard, setFocusCard] = useState<{
    partNumber: number;
    cardIndex: number;
  } | null>(null);
  const [flashcardInitialMode, setFlashcardInitialMode] =
    useState<FlashcardViewMode>('cards');
  const [flashcardModeKey, setFlashcardModeKey] = useState(0);
  const [quizInitialFilter, setQuizInitialFilter] = useState<QuizFilter>('all');
  const [quizFilterKey, setQuizFilterKey] = useState(0);

  const activeUser = useMemo(
    () => (activeUserId ? getUserProfile(activeUserId) : null),
    [activeUserId],
  );

  useEffect(() => {
    setHeaderAvatarFailed(false);
  }, [activeUserId]);

  const {
    progress,
    levelInfo,
    streakBadge,
    xpToast,
    markPartRead,
    markFlashcardMastered,
    markVocabReviewed,
    recordQuizAnswer,
  } = useStudyProgress(activeUserId);

  const manifest = manifestData as StudyManifest;

  const allParts = useMemo<StudyPart[]>(() => {
    const loadedByNumber = new Map<number, StudyPart>();

    for (const [path, mod] of Object.entries(partModules)) {
      const partData: StudyPart | undefined = mod.default ?? mod;
      if (partData && typeof partData.part_number === 'number') {
        loadedByNumber.set(partData.part_number, partData);
      } else if (partData && typeof partData.title === 'string') {
        const match = path.match(/part-(\d+)\.json$/);
        if (match) {
          const parsedNum = Number(match[1]);
          loadedByNumber.set(parsedNum, {...partData, part_number: parsedNum});
        }
      }
    }

    if (Array.isArray(manifest?.parts) && manifest.parts.length > 0) {
      const ordered: StudyPart[] = [];
      for (const meta of manifest.parts) {
        const found = loadedByNumber.get(meta.part_number);
        if (found) {
          ordered.push(found);
          loadedByNumber.delete(meta.part_number);
        }
      }
      const remaining = Array.from(loadedByNumber.values()).sort(
        (a, b) => a.part_number - b.part_number,
      );
      return [...ordered, ...remaining];
    }

    return Array.from(loadedByNumber.values()).sort(
      (a, b) => a.part_number - b.part_number,
    );
  }, [manifest]);

  const visibleParts = useMemo<StudyPart[]>(() => {
    if (selectedPart === 'all') {
      return allParts;
    }
    const targetNum = Number(selectedPart);
    const match = allParts.filter((p) => p.part_number === targetNum);
    return match.length > 0 ? match : allParts;
  }, [allParts, selectedPart]);

  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    setIsAccountMenuOpen(false);
    try {
      if (
        document.fullscreenEnabled &&
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen denial in restricted iframe contexts
    }
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore fullscreen errors
    }
  }, []);

  const toggleFocusMode = useCallback(() => {
    if (isFocusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [isFocusMode, enterFocusMode, exitFocusMode]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isFocusMode && !isSearchOpen) {
        exitFocusMode();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isFocusMode, isSearchOpen, exitFocusMode]);

  const handleLogin = (userId: UserId) => {
    setStoredActiveUserId(userId);
    setActiveUserId(userId);
    setActiveTab('dashboard');
    setIsAccountMenuOpen(false);
  };

  const handleLogout = () => {
    if (isFocusMode) {
      exitFocusMode();
    }
    setIsAccountMenuOpen(false);
    setStoredActiveUserId(null);
    setActiveUserId(null);
  };

  const handleSearchNavigate = (target: SearchNavigationTarget) => {
    if (target.tab === 'notes') {
      if (target.partNumber !== undefined) {
        setSelectedPart(String(target.partNumber));
        setFocusNotePart(target.partNumber);
      }
      setHighlightQuery(target.query || '');
      setActiveTab('notes');
    } else {
      if (target.partNumber !== undefined) {
        setSelectedPart(String(target.partNumber));
        setFocusCard({
          partNumber: target.partNumber,
          cardIndex: target.cardIndex ?? 0,
        });
      }
      setActiveTab('flashcards');
    }
  };

  const handleOpenVocabSprint = useCallback(() => {
    setFlashcardInitialMode('vocab');
    setFlashcardModeKey((prev) => prev + 1);
    setFocusCard(null);
    setActiveTab('flashcards');
  }, []);

  const handleOpenMistakeReview = useCallback(() => {
    setSelectedPart('all');
    setQuizInitialFilter('mistakes');
    setQuizFilterKey((prev) => prev + 1);
    setActiveTab('quiz');
  }, []);

  const handleSelectPartAndTab = (
    partNumber: number,
    tab: ActiveTab,
    actionMode?: 'vocab' | 'mistakes',
  ) => {
    if (actionMode === 'vocab') {
      handleOpenVocabSprint();
      return;
    }
    if (actionMode === 'mistakes') {
      handleOpenMistakeReview();
      return;
    }
    setSelectedPart(String(partNumber));
    setFocusCard(null);
    setFocusNotePart(null);
    if (tab === 'flashcards') {
      setFlashcardInitialMode('cards');
      setFlashcardModeKey((prev) => prev + 1);
    }
    if (tab === 'quiz') {
      setQuizInitialFilter('all');
      setQuizFilterKey((prev) => prev + 1);
    }
    setActiveTab(tab);
  };

  if (!activeUserId || !activeUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <OfflineIndicator />
      </>
    );
  }

  const isCombinedView = selectedPart === 'all';
  const studyNavItems = NAV_ITEMS.filter((i) => i.section === 'study');
  const libraryNavItems = NAV_ITEMS.filter((i) => i.section === 'library');

  return (
    <div
      className={`min-h-screen text-slate-900 ${
        isFocusMode ? 'bg-white' : ''
      }`}
    >
      {/* Desktop Glassmorphic Sidebar (hidden in Focus Mode) */}
      {!isFocusMode && (
        <aside className="surface-nav-glass hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/80">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200/70 px-5">
            <img
              src="/icon.svg"
              alt=""
              className="h-8 w-8 shrink-0 rounded-xl shadow-xs"
            />
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Smart Study PWA
            </span>
          </div>

          <nav
            aria-label="Sidebar workspace navigation"
            className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
          >
            <div>
              <p className="px-3 text-[11px] font-semibold tracking-[0.04em] text-slate-400">
                Study Workspace
              </p>
              <ul className="mt-2 space-y-1">
                {studyNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusCard(null);
                          setActiveTab(item.id);
                        }}
                        className={`flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50/70 text-blue-700 ring-1 ring-blue-200/70 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-blue-600' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <p className="px-3 text-[11px] font-semibold tracking-[0.04em] text-slate-400">
                Textbook Catalog
              </p>
              <ul className="mt-2 space-y-1">
                {libraryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50/70 text-blue-700 ring-1 ring-blue-200/70 shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-blue-600' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Sidebar Daily Streak, XP & Active User Switcher */}
          <div className="space-y-3 border-t border-slate-200/70 p-4">
            <div className="surface-streak rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame
                    className={`h-4 w-4 shrink-0 ${
                      progress.streakDays > 0
                        ? 'text-amber-500'
                        : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Daily Streak
                  </span>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-slate-900">
                  {progress.streakDays}d
                </span>
              </div>
              <div
                className={`mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${streakBadge.toneClass}`}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{streakBadge.title}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="surface-card-interactive w-full rounded-xl p-3.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Level {levelInfo.level} · {levelInfo.rank}
                </span>
                <span className="font-mono-tabular text-xs font-bold text-amber-600">
                  {progress.xp} XP
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                  style={{width: `${levelInfo.progressPercent}%`}}
                />
              </div>
              <p className="font-mono-tabular mt-1.5 text-[11px] text-slate-500">
                {levelInfo.xpToNext} XP to next level
              </p>
            </button>

            <div className="surface-card flex items-center justify-between gap-2 rounded-xl p-2.5">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-slate-50"
              >
                {headerAvatarFailed ? (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${activeUser.accentGradient} text-xs font-bold text-white`}
                  >
                    {activeUser.name.slice(0, 1)}
                  </span>
                ) : (
                  <img
                    src={activeUser.avatarUrl}
                    alt={activeUser.name}
                    referrerPolicy="no-referrer"
                    onError={() => setHeaderAvatarFailed(true)}
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {activeUser.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {activeUser.genderLabel} · Switch
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Shell (Expands Full-Width in Focus Mode) */}
      <div className={isFocusMode ? '' : 'lg:pl-64'}>
        {/* Top Command Header */}
        <header
          className={`sticky top-0 z-30 h-14 border-b transition-colors ${
            isFocusMode
              ? 'border-slate-200/90 bg-white/95 backdrop-blur-md'
              : 'surface-nav-glass border-slate-200/80'
          }`}
        >
          <div
            className={`mx-auto flex h-full items-center justify-between gap-2 px-3 sm:px-4 ${
              isFocusMode ? 'max-w-4xl' : 'max-w-xl'
            }`}
          >
            {isFocusMode ? (
              <>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="truncate text-sm font-bold tracking-tight text-slate-900">
                    {NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Focus'}
                  </span>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    ·
                  </span>
                  <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                    Distraction-Free Study
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative">
                    <label htmlFor="focus-part-selector" className="sr-only">
                      Select study part
                    </label>
                    <select
                      id="focus-part-selector"
                      value={selectedPart}
                      onChange={(e) => {
                        setSelectedPart(e.target.value);
                        setFocusCard(null);
                      }}
                      className="min-h-[38px] max-w-[115px] appearance-none truncate rounded-xl border border-slate-200 bg-white py-1.5 pr-6 pl-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none sm:max-w-[175px]"
                    >
                      <option value="all">All ({allParts.length})</option>
                      {allParts.map((part) => (
                        <option
                          key={part.part_number}
                          value={String(part.part_number)}
                        >
                          Part {part.part_number}: {part.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={toggleFocusMode}
                    aria-pressed={isFocusMode}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Exit Focus</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Mobile Brand */}
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('dashboard');
                  }}
                  className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap lg:hidden"
                >
                  <img
                    src="/icon.svg"
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-lg shadow-xs"
                  />
                </a>

                {/* Global Search Trigger */}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex min-h-[38px] min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border border-slate-200/90 bg-white/75 px-2.5 py-1.5 text-left text-xs text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:bg-white sm:px-3"
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <Search
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <span className="truncate sm:hidden">Search...</span>
                    <span className="hidden truncate sm:inline">
                      Search notes &amp; cards...
                    </span>
                  </span>
                  <kbd className="font-mono-tabular hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
                    ⌘K
                  </kbd>
                </button>

                {/* Right Controls */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="relative">
                    <label htmlFor="part-selector" className="sr-only">
                      Select study part
                    </label>
                    <select
                      id="part-selector"
                      value={selectedPart}
                      onChange={(e) => {
                        setSelectedPart(e.target.value);
                        setFocusCard(null);
                      }}
                      className="min-h-[38px] max-w-[82px] appearance-none truncate rounded-xl border border-slate-200/90 bg-white/80 py-1.5 pr-5 pl-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:border-slate-300 hover:bg-white focus:border-blue-600 focus:bg-white focus:outline-none sm:max-w-[140px] sm:pr-6 sm:pl-2.5"
                    >
                      <option value="all">All ({allParts.length})</option>
                      {allParts.map((part) => (
                        <option
                          key={part.part_number}
                          value={String(part.part_number)}
                        >
                          Part {part.part_number}: {part.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-1.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Focus Mode Button */}
                  <button
                    type="button"
                    onClick={toggleFocusMode}
                    aria-pressed={isFocusMode}
                    title="Enter distraction-free Focus Mode"
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Maximize2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Focus Mode</span>
                  </button>

                  {/* Active Profile Avatar / Switcher Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen(true)}
                    aria-label={`Profile: ${activeUser.name} (${activeUser.genderLabel})`}
                    title={`${activeUser.name} · Switch user or sign out`}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs transition-colors hover:border-slate-300"
                  >
                    {headerAvatarFailed ? (
                      <span
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${activeUser.accentGradient} text-xs font-bold text-white`}
                      >
                        {activeUser.name.slice(0, 1)}
                      </span>
                    ) : (
                      <img
                        src={activeUser.avatarUrl}
                        alt={activeUser.name}
                        referrerPolicy="no-referrer"
                        onError={() => setHeaderAvatarFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>

                  <PWAInstallButton />
                </div>
              </>
            )}
          </div>
        </header>

        {/* Tablet Navigation Strip (hidden in Focus Mode) */}
        {!isFocusMode && (
          <div className="surface-nav-glass hidden border-b border-slate-200/80 md:block lg:hidden">
            <nav
              aria-label="Tablet study navigation"
              className="mx-auto flex max-w-xl items-center gap-1 overflow-x-auto px-3"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Viewport (Portrait-Optimized Normally, Expanded Full-Screen in Focus Mode) */}
        <main
          className={`mx-auto px-3.5 sm:px-6 ${
            isFocusMode
              ? 'max-w-4xl py-8 pb-16'
              : 'max-w-xl py-6 pb-24 sm:py-7 md:pb-10'
          }`}
        >
          {activeTab === 'dashboard' ? (
            <DashboardTab
              activeUser={activeUser}
              allParts={allParts}
              progress={progress}
              onSelectPartAndTab={handleSelectPartAndTab}
              onNavigateTab={(tab) => {
                if (tab === 'flashcards') {
                  setFlashcardInitialMode('cards');
                  setFlashcardModeKey((prev) => prev + 1);
                }
                if (tab === 'quiz') {
                  setQuizInitialFilter('all');
                  setQuizFilterKey((prev) => prev + 1);
                }
                setActiveTab(tab);
              }}
              onOpenVocabSprint={handleOpenVocabSprint}
              onOpenMistakeReview={handleOpenMistakeReview}
              onEnterFocusMode={() => enterFocusMode()}
            />
          ) : activeTab === 'library' ? (
            <StudyLibraryTab
              allParts={allParts}
              progress={progress}
              onSelectPartAndTab={handleSelectPartAndTab}
              onOpenVocabSprint={handleOpenVocabSprint}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
          ) : allParts.length === 0 ? (
            <EmptyStudyState onGoToLibrary={() => setActiveTab('library')} />
          ) : activeTab === 'notes' ? (
            <StudyNotesTab
              parts={visibleParts}
              isCombinedView={isCombinedView}
              readPartNumbers={progress.readPartNumbers}
              onMarkPartRead={markPartRead}
              focusPartNumber={focusNotePart}
              highlightQuery={highlightQuery}
              onClearSearchHighlight={() => setHighlightQuery('')}
            />
          ) : activeTab === 'flashcards' ? (
            <FlashcardsTab
              parts={visibleParts}
              reviewedFlashcardIds={progress.reviewedFlashcardIds}
              onMarkFlashcardMastered={markFlashcardMastered}
              focusCard={focusCard}
              learnedVocabIds={progress.learnedVocabIds}
              dailyVocabReviewedIds={progress.daily.vocabReviewedIds}
              vocabDailyTarget={VOCAB_DAILY_TARGET}
              onMarkVocabReviewed={markVocabReviewed}
              initialMode={flashcardInitialMode}
              modeTriggerKey={flashcardModeKey}
            />
          ) : (
            <QuizTab
              parts={visibleParts}
              allParts={allParts}
              correctQuizIds={progress.correctQuizIds}
              attemptedQuizIds={progress.attemptedQuizIds}
              wrongQuizIds={progress.wrongQuizIds}
              dailyWrongQuizIds={progress.daily.dailyWrongQuizIds}
              quizQuestionStats={progress.quizQuestionStats}
              cbtExamHistory={progress.cbtExamHistory}
              initialFilter={quizInitialFilter}
              filterTriggerKey={quizFilterKey}
              onRecordQuizAnswer={recordQuizAnswer}
            />
          )}

          {/* Quiet App Footer (hidden in Focus Mode) */}
          {!isFocusMode && (
            <footer className="mt-10 border-t border-slate-200/70 pt-5 text-center text-xs text-slate-500">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-semibold text-slate-700">
                  Smart Study PWA
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Signed in as {activeUser.name} ({activeUser.genderLabel})
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(true)}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Switch User
                </button>
              </div>
            </footer>
          )}
        </main>
      </div>

      {/* Mobile Glassmorphic Bottom Navigation (hidden in Focus Mode) */}
      {!isFocusMode && (
        <nav
          aria-label="Mobile study navigation"
          className="surface-nav-glass fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-5 border-t border-slate-200/80 shadow-[0_-6px_24px_-12px_rgba(15,23,42,0.12)] md:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFocusCard(null);
                  setActiveTab(item.id);
                }}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600"
                    aria-hidden="true"
                  />
                )}
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Profile Switcher & Sign Out Modal */}
      {isAccountMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Account switcher"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAccountMenuOpen(false);
          }}
        >
          <div className="surface-glass w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Study Profiles
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(false)}
                aria-label="Close profile menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {USER_PROFILES.map((profile) => {
                const isCurrent = profile.id === activeUser.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleLogin(profile.id)}
                    className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      isCurrent
                        ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50/70 shadow-2xs'
                        : 'surface-card-interactive'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {profile.name}{' '}
                          <span className="font-jp text-xs font-medium text-slate-500">
                            ({profile.japaneseName})
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {profile.genderLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {isCurrent ? 'Active' : 'Switch'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign Out to Login Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        parts={allParts}
        onNavigate={handleSearchNavigate}
      />

      {/* Premium XP Reward Toast */}
      {xpToast && !isFocusMode && (
        <div
          role="status"
          aria-live="polite"
          className="surface-hero fixed right-4 bottom-20 z-50 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white md:bottom-6"
        >
          <Award
            className="h-4 w-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <span className="font-mono-tabular text-amber-400">
            +{xpToast.xp} XP
          </span>
          <span>{xpToast.label}</span>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
