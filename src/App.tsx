import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Award,
  BookA,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  FileUp,
  Flame,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import manifestData from './data/manifest.json';
import {DashboardTab} from './components/DashboardTab';
import {EmptyStudyState} from './components/EmptyStudyState';
import {
  FlashcardsTab,
  type FlashcardDeckFilter,
} from './components/FlashcardsTab';
import {stripFurigana} from './components/FuriganaText';
import {GlobalSearchModal} from './components/GlobalSearchModal';
import {LibraryTab} from './components/LibraryTab';
import {LoginScreen} from './components/LoginScreen';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PWAInstallButton} from './components/PWAInstallButton';
import {QuizTab} from './components/QuizTab';
import {SettingsTab} from './components/SettingsTab';
import {StudyNotesTab} from './components/StudyNotesTab';
import {UploadPdfTab} from './components/UploadPdfTab';
import {useStudyProgress} from './hooks/useStudyProgress';
import type {
  ActiveTab,
  SearchNavigationTarget,
  SswExamTopic,
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
  shortcut?: string;
  icon: React.ComponentType<{className?: string}>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    section: 'study',
    shortcut: '1',
    icon: LayoutDashboard,
  },
  {
    id: 'notes',
    label: 'Study Notes',
    shortLabel: 'Notes',
    section: 'study',
    shortcut: '2',
    icon: BookOpen,
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    shortLabel: 'Cards',
    section: 'study',
    shortcut: '3',
    icon: Layers,
  },
  {
    id: 'quiz',
    label: 'CBT Exam',
    shortLabel: 'Exam',
    section: 'study',
    shortcut: '4',
    icon: CheckSquare,
  },
  {
    id: 'library',
    label: 'Study Library',
    shortLabel: 'Library',
    section: 'library',
    shortcut: '5',
    icon: Library,
  },
  {
    id: 'upload',
    label: 'Upload PDF',
    shortLabel: 'Upload',
    section: 'library',
    icon: FileUp,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    section: 'library',
    icon: SlidersHorizontal,
  },
];

const EYE_COMFORT_PREFIX = 'smart_study_eye_comfort_v1_';

function readEyeComfortForUser(userId: UserId | null): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(`${EYE_COMFORT_PREFIX}${userId}`) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [activeUserId, setActiveUserId] = useState<UserId | null>(() =>
    getStoredActiveUserId(),
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);

  const [focusNotePart, setFocusNotePart] = useState<number | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string>('');
  const [focusCard, setFocusCard] = useState<{
    partNumber: number;
    cardIndex: number;
  } | null>(null);
  const [pendingFlashcardDeck, setPendingFlashcardDeck] =
    useState<FlashcardDeckFilter | null>(null);
  const [pendingPracticeTopic, setPendingPracticeTopic] =
    useState<SswExamTopic | null>(null);
  const [eyeComfortMode, setEyeComfortMode] = useState<boolean>(() =>
    readEyeComfortForUser(getStoredActiveUserId()),
  );

  const activeUser = useMemo(
    () => (activeUserId ? getUserProfile(activeUserId) : null),
    [activeUserId],
  );

  useEffect(() => {
    setHeaderAvatarFailed(false);
    setEyeComfortMode(readEyeComfortForUser(activeUserId));
  }, [activeUserId]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'eye-comfort-mode',
      eyeComfortMode,
    );
    return () => {
      document.documentElement.classList.remove('eye-comfort-mode');
    };
  }, [eyeComfortMode]);

  const handleEyeComfortChange = useCallback(
    (enabled: boolean) => {
      setEyeComfortMode(enabled);
      if (!activeUserId) return;
      try {
        localStorage.setItem(
          `${EYE_COMFORT_PREFIX}${activeUserId}`,
          enabled ? 'true' : 'false',
        );
      } catch {
        // Ignore storage write error
      }
    },
    [activeUserId],
  );

  const {
    progress,
    levelInfo,
    streakBadge,
    xpToast,
    markPartRead,
    markFlashcardMastered,
    recordQuizAnswer,
    recordCbtExamAttempt,
    resetProgress,
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

  const totalFlashcardsCount = useMemo(
    () => allParts.reduce((sum, p) => sum + p.flashcards.length, 0),
    [allParts],
  );
  const totalVocabCount = useMemo(
    () =>
      allParts.reduce(
        (sum, p) =>
          sum +
          p.flashcards.filter((fc) => (fc.id ?? '').includes('-fc-vocab-'))
            .length,
        0,
      ),
    [allParts],
  );

  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    setIsAccountMenuOpen(false);
    setIsMobileDrawerOpen(false);
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

  const handleOpenTotalVocabulary = useCallback(() => {
    setFocusCard(null);
    setPendingFlashcardDeck('total_vocab');
    setActiveTab('flashcards');
    setIsMobileDrawerOpen(false);
  }, []);

  const navigateToTab = useCallback((tab: ActiveTab) => {
    setFocusCard(null);
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

  // Power-Up Global Keyboard Navigation (⌘K, Alt+1..5, Alt+V, Esc)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isMobileDrawerOpen) {
          setIsMobileDrawerOpen(false);
          return;
        }
        if (isAccountMenuOpen) {
          setIsAccountMenuOpen(false);
          return;
        }
        if (isFocusMode && !isSearchOpen) {
          exitFocusMode();
        }
        return;
      }

      if (!isTyping && e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === '1') {
          e.preventDefault();
          navigateToTab('dashboard');
        } else if (key === '2') {
          e.preventDefault();
          navigateToTab('notes');
        } else if (key === '3') {
          e.preventDefault();
          navigateToTab('flashcards');
        } else if (key === '4') {
          e.preventDefault();
          navigateToTab('quiz');
        } else if (key === '5') {
          e.preventDefault();
          navigateToTab('library');
        } else if (key === 'v') {
          e.preventDefault();
          handleOpenTotalVocabulary();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [
    isFocusMode,
    isSearchOpen,
    isMobileDrawerOpen,
    isAccountMenuOpen,
    exitFocusMode,
    navigateToTab,
    handleOpenTotalVocabulary,
  ]);

  const handleLogin = (userId: UserId) => {
    setStoredActiveUserId(userId);
    setActiveUserId(userId);
    setActiveTab('dashboard');
    setIsAccountMenuOpen(false);
    setIsMobileDrawerOpen(false);
  };

  const handleLogout = () => {
    if (isFocusMode) {
      exitFocusMode();
    }
    setIsAccountMenuOpen(false);
    setIsMobileDrawerOpen(false);
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

  const handleSelectPartAndTab = (partNumber: number, tab: ActiveTab) => {
    setSelectedPart(String(partNumber));
    setFocusCard(null);
    setFocusNotePart(null);
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handlePracticeWeakTopic = useCallback((topic: SswExamTopic) => {
    setPendingPracticeTopic(topic);
    setActiveTab('quiz');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

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
  const activeNavMeta =
    NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const activePartLabel =
    selectedPart === 'all'
      ? `All ${allParts.length} Parts`
      : `Part ${selectedPart}`;

  const getNavCount = (id: ActiveTab): string | null => {
    if (id === 'notes') return `${progress.readPartNumbers.length}/${allParts.length}`;
    if (id === 'flashcards') return String(totalFlashcardsCount);
    if (id === 'quiz') return '16';
    if (id === 'library') return String(allParts.length);
    return null;
  };

  return (
    <div
      className={`min-h-screen text-slate-900 ${
        isFocusMode ? 'bg-white' : ''
      }`}
    >
      {/* Desktop Executive Sidebar (264px, hidden in Focus Mode) */}
      {!isFocusMode && (
        <aside className="surface-nav-glass hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[264px] lg:flex-col lg:border-r lg:border-slate-200/85">
          {/* Brand Header */}
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-200/75 px-5">
            <img
              src="/icon.svg"
              alt=""
              className="h-7 w-7 shrink-0 rounded-lg shadow-2xs"
            />
            <span className="text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Smart Study PWA
            </span>
          </div>

          {/* Quick Command Search Bar inside Sidebar */}
          <div className="px-3.5 pt-4 pb-1">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="truncate">Quick search...</span>
              </span>
              <kbd className="font-mono-tabular rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Lists */}
          <nav
            aria-label="Sidebar workspace navigation"
            className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
          >
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400">
                Study Workspace
              </p>
              <ul className="mt-2 space-y-0.5">
                {studyNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  const countText = getNavCount(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigateToTab(item.id)}
                        className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-blue-300' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </span>
                        {countText && (
                          <span
                            className={`font-mono-tabular text-[11px] font-medium ${
                              active ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {countText}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}

                {/* Direct Total Vocabulary Quick Entry */}
                {totalVocabCount > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={handleOpenTotalVocabulary}
                      className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-blue-700 transition-colors hover:bg-blue-50/80 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <BookA
                          className="h-4 w-4 shrink-0 text-blue-600"
                          aria-hidden="true"
                        />
                        <span>Total Vocabulary</span>
                      </span>
                      <span className="font-mono-tabular text-[11px] font-semibold text-blue-600">
                        {totalVocabCount}
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* 1-Click Quick Part Scope Rail */}
            <div>
              <div className="flex items-center justify-between px-3">
                <p className="text-[11px] font-semibold text-slate-400">
                  Quick Part Scope
                </p>
                <span className="font-mono-tabular text-[10px] font-medium text-slate-400">
                  {activePartLabel}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPart('all');
                    setFocusCard(null);
                  }}
                  className={`min-h-[32px] rounded-lg border text-[11px] font-semibold transition-all ${
                    selectedPart === 'all'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                {allParts.map((part) => {
                  const active = selectedPart === String(part.part_number);
                  return (
                    <button
                      key={part.part_number}
                      type="button"
                      title={`Part ${part.part_number}: ${part.english_title ?? stripFurigana(part.title)}`}
                      onClick={() => {
                        setSelectedPart(String(part.part_number));
                        setFocusCard(null);
                      }}
                      className={`font-mono-tabular min-h-[32px] rounded-lg border text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      P{part.part_number}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400">
                Library &amp; Tools
              </p>
              <ul className="mt-2 space-y-0.5">
                {libraryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  const countText = getNavCount(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigateToTab(item.id)}
                        className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-blue-300' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </span>
                        {countText && (
                          <span
                            className={`font-mono-tabular text-[11px] font-medium ${
                              active ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {countText}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Compact Bottom Progress & Profile Dock */}
          <div className="space-y-2.5 border-t border-slate-200/75 p-3.5">
            <button
              type="button"
              onClick={() => navigateToTab('dashboard')}
              className="surface-card-interactive w-full rounded-xl p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                  <Flame
                    className={`h-3.5 w-3.5 ${
                      progress.streakDays > 0
                        ? 'text-amber-500'
                        : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="font-mono-tabular">
                    {progress.streakDays}d · Lv.{levelInfo.level}
                  </span>
                </span>
                <span className="font-mono-tabular font-bold text-amber-600">
                  {progress.xp} XP
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                  style={{width: `${levelInfo.progressPercent}%`}}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                <span>{streakBadge.title}</span>
                <span className="font-mono-tabular">
                  {levelInfo.xpToNext} XP next
                </span>
              </div>
            </button>

            <div className="surface-card flex items-center justify-between gap-2 rounded-xl p-2">
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
                    Switch profile
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Shell */}
      <div className={isFocusMode ? '' : 'lg:pl-[264px]'}>
        {/* Sticky Top Command Bar (h-14) */}
        <header
          className={`sticky top-0 z-30 h-14 border-b transition-colors ${
            isFocusMode
              ? 'border-slate-200/90 bg-white/95 backdrop-blur-md'
              : 'surface-nav-glass border-slate-200/80'
          }`}
        >
          <div
            className={`mx-auto flex h-full items-center justify-between gap-3 px-3.5 sm:px-6 ${
              isFocusMode ? 'max-w-5xl' : 'max-w-6xl'
            }`}
          >
            {isFocusMode ? (
              <>
                <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
                  <span className="truncate font-bold tracking-tight text-slate-900">
                    {activeNavMeta.label}
                  </span>
                  <span className="hidden text-slate-300 sm:inline">/</span>
                  <span className="hidden font-medium text-slate-500 sm:inline">
                    Distraction-Free Focus
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
                      className="min-h-[38px] max-w-[125px] appearance-none truncate rounded-xl border border-slate-200 bg-white py-1.5 pr-6 pl-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none sm:max-w-[190px]"
                    >
                      <option value="all">All ({allParts.length})</option>
                      {allParts.map((part) => (
                        <option
                          key={part.part_number}
                          value={String(part.part_number)}
                        >
                          Part {part.part_number}:{' '}
                          {part.english_title ?? stripFurigana(part.title)}
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
                    className="btn-dark-premium inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Exit Focus</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Left Zone: Mobile Brand + Desktop Breadcrumb Context */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToTab('dashboard');
                    }}
                    className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap lg:hidden"
                  >
                    <img
                      src="/icon.svg"
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-lg shadow-2xs"
                    />
                  </a>

                  <nav
                    aria-label="Current location"
                    className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => navigateToTab('dashboard')}
                      className="hidden font-medium text-slate-500 transition-colors hover:text-slate-900 lg:inline whitespace-nowrap"
                    >
                      Workspace
                    </button>
                    <ChevronRight
                      className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 lg:inline"
                      aria-hidden="true"
                    />
                    <span className="truncate font-bold tracking-tight text-slate-900">
                      {activeNavMeta.label}
                    </span>
                    {(activeTab === 'notes' ||
                      activeTab === 'flashcards' ||
                      activeTab === 'quiz') && (
                      <>
                        <ChevronRight
                          className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:inline"
                          aria-hidden="true"
                        />
                        <span className="font-mono-tabular hidden truncate text-xs font-medium text-slate-500 sm:inline">
                          {activePartLabel}
                        </span>
                      </>
                    )}
                  </nav>
                </div>

                {/* Right Zone: Search + Part Scope + Focus Mode + Profile */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Open global search"
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-white sm:px-3"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="hidden md:inline whitespace-nowrap">
                      Search notes &amp; vocab
                    </span>
                    <kbd className="font-mono-tabular hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 md:inline">
                      ⌘K
                    </kbd>
                  </button>

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
                      className="min-h-[38px] max-w-[88px] appearance-none truncate rounded-xl border border-slate-200/90 bg-white/90 py-1.5 pr-6 pl-2.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-white focus:border-blue-600 focus:outline-none sm:max-w-[165px]"
                    >
                      <option value="all">All ({allParts.length})</option>
                      {allParts.map((part) => (
                        <option
                          key={part.part_number}
                          value={String(part.part_number)}
                        >
                          Part {part.part_number}:{' '}
                          {part.english_title ?? stripFurigana(part.title)}
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
                    title="Enter distraction-free Focus Mode"
                    className="hidden min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 whitespace-nowrap shrink-0 sm:inline-flex"
                  >
                    <Maximize2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Focus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen(true)}
                    aria-label={`Profile: ${activeUser.name}`}
                    title={`${activeUser.name} · Switch user or sign out`}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white transition-colors hover:border-slate-300"
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

        {/* Tablet Navigation Strip (md only, hidden in Focus Mode) */}
        {!isFocusMode && (
          <div className="surface-nav-glass hidden border-b border-slate-200/80 md:block lg:hidden">
            <nav
              aria-label="Tablet study navigation"
              className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTab(item.id)}
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
              {totalVocabCount > 0 && (
                <button
                  type="button"
                  onClick={handleOpenTotalVocabulary}
                  className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
                >
                  <BookA className="h-4 w-4" aria-hidden="true" />
                  <span>Total Vocab ({totalVocabCount})</span>
                </button>
              )}
            </nav>
          </div>
        )}

        {/* Full-Width Responsive Executive Viewport */}
        <main
          className={`mx-auto px-3.5 sm:px-6 ${
            isFocusMode
              ? 'max-w-5xl py-8 pb-16'
              : 'max-w-6xl py-6 pb-24 sm:py-7 md:pb-12'
          }`}
        >
          {activeTab === 'dashboard' ? (
            <DashboardTab
              key={activeUserId}
              activeUser={activeUser}
              allParts={allParts}
              progress={progress}
              onSelectPartAndTab={handleSelectPartAndTab}
              onNavigateTab={navigateToTab}
              onOpenTotalVocabulary={handleOpenTotalVocabulary}
              onPracticeTopic={handlePracticeWeakTopic}
              onOpenSearch={() => setIsSearchOpen(true)}
              onEnterFocusMode={() => enterFocusMode()}
            />
          ) : activeTab === 'library' ? (
            <LibraryTab
              parts={allParts}
              onOpenSearch={() => setIsSearchOpen(true)}
              onSelectPartAndTab={handleSelectPartAndTab}
              onOpenTotalVocabulary={handleOpenTotalVocabulary}
              onUploadPdf={() => navigateToTab('upload')}
            />
          ) : activeTab === 'settings' ? (
            <div className="mx-auto max-w-3xl">
              <SettingsTab
                key={activeUserId}
                eyeComfortMode={eyeComfortMode}
                onEyeComfortChange={handleEyeComfortChange}
                onResetComplete={() => {
                  resetProgress();
                  navigateToTab('dashboard');
                }}
              />
            </div>
          ) : activeTab === 'upload' ? (
            <div className="mx-auto max-w-3xl">
              <UploadPdfTab />
            </div>
          ) : allParts.length === 0 ? (
            <EmptyStudyState onGoToUpload={() => navigateToTab('upload')} />
          ) : activeTab === 'notes' ? (
            <StudyNotesTab
              key={activeUserId}
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
              key={activeUserId}
              parts={visibleParts}
              allParts={allParts}
              reviewedFlashcardIds={progress.reviewedFlashcardIds}
              onMarkFlashcardMastered={markFlashcardMastered}
              focusCard={focusCard}
              initialDeckMode={pendingFlashcardDeck}
              onConsumeInitialDeckMode={() => setPendingFlashcardDeck(null)}
            />
          ) : (
            <div className="mx-auto max-w-4xl">
              <QuizTab
                key={activeUserId}
                userId={activeUserId}
                parts={visibleParts}
                allParts={allParts}
                correctQuizIds={progress.correctQuizIds}
                attemptedQuizIds={progress.attemptedQuizIds}
                quizQuestionStats={progress.quizQuestionStats}
                cbtExamHistory={progress.cbtExamHistory}
                initialPracticeTopic={pendingPracticeTopic}
                onConsumePracticeTopic={() => setPendingPracticeTopic(null)}
                onRecordQuizAnswer={recordQuizAnswer}
                onRecordCbtExamAttempt={recordCbtExamAttempt}
              />
            </div>
          )}

          {/* Quiet Footer (hidden in Focus Mode) */}
          {!isFocusMode && (
            <footer className="mt-12 border-t border-slate-200/75 pt-5 text-center text-xs text-slate-500">
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

      {/* Mobile Bottom Navigation Bar (h-14, strict 5 tabs with Quick-Action Menu) */}
      {!isFocusMode && (
        <nav
          aria-label="Mobile study navigation"
          className="surface-nav-glass fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-5 border-t border-slate-200/85 md:hidden"
        >
          {NAV_ITEMS.filter((item) =>
            ['dashboard', 'notes', 'flashcards', 'quiz'].includes(item.id),
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToTab(item.id)}
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

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-expanded={isMobileDrawerOpen}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
              ['library', 'upload', 'settings'].includes(activeTab) ||
              isMobileDrawerOpen
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {['library', 'upload', 'settings'].includes(activeTab) && (
              <span
                className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600"
                aria-hidden="true"
              />
            )}
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {/* Mobile Quick-Action Navigation Sheet */}
      {isMobileDrawerOpen && !isFocusMode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Quick navigation menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileDrawerOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-t-3xl border-t border-slate-200 bg-white p-5 pb-7 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Quick Navigation
                </h2>
                <p className="text-xs text-slate-500">
                  {activeUser.name} · Level {levelInfo.level} · {progress.xp} XP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Direct Total Vocabulary Launcher */}
            {totalVocabCount > 0 && (
              <button
                type="button"
                onClick={handleOpenTotalVocabulary}
                className="btn-primary-premium mt-4 flex min-h-[48px] w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                <span className="flex items-center gap-2.5">
                  <BookA className="h-4 w-4" aria-hidden="true" />
                  <span>Total Warehouse Vocabulary</span>
                </span>
                <span className="font-mono-tabular text-xs text-blue-100">
                  {totalVocabCount} terms
                </span>
              </button>
            )}

            {/* Quick Part Selector */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500">
                Active Part Filter
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPart('all');
                    setFocusCard(null);
                  }}
                  className={`min-h-[38px] rounded-xl border text-xs font-semibold ${
                    selectedPart === 'all'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  All
                </button>
                {allParts.map((part) => (
                  <button
                    key={part.part_number}
                    type="button"
                    onClick={() => {
                      setSelectedPart(String(part.part_number));
                      setFocusCard(null);
                    }}
                    className={`font-mono-tabular min-h-[38px] rounded-xl border text-xs font-semibold ${
                      selectedPart === String(part.part_number)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    P{part.part_number}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Destinations Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigateToTab('library')}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Library className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span>Study Library</span>
              </button>
              <button
                type="button"
                onClick={() => navigateToTab('upload')}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileUp className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={() => navigateToTab('settings')}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <SlidersHorizontal
                  className="h-4 w-4 text-slate-600"
                  aria-hidden="true"
                />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => enterFocusMode()}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Maximize2
                  className="h-4 w-4 text-slate-600"
                  aria-hidden="true"
                />
                <span>Focus Mode</span>
              </button>
              <button
                type="button"
                onClick={() => handleEyeComfortChange(!eyeComfortMode)}
                className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3.5 text-xs font-semibold ${
                  eyeComfortMode
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>Eye Comfort: {eyeComfortMode ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsAccountMenuOpen(true);
                }}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Users className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span>Switch Profile</span>
              </button>
            </div>
          </div>
        </div>
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
                        ? 'border-blue-300 bg-blue-50/75'
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
                          {profile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {profile.genderLabel} · Isolated Profile
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
