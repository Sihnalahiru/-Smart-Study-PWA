import React, {useEffect, useMemo, useState} from 'react';
import {
  Award,
  BookOpen,
  CheckSquare,
  ChevronDown,
  FileUp,
  Flame,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Mic,
  MoreHorizontal,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import manifestData from './data/manifest.json';
import {AudioTranscribeTab} from './components/AudioTranscribeTab';
import {DashboardTab} from './components/DashboardTab';
import {EmptyStudyState} from './components/EmptyStudyState';
import {FlashcardsTab} from './components/FlashcardsTab';
import {GlobalSearchModal} from './components/GlobalSearchModal';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PWAInstallButton} from './components/PWAInstallButton';
import {QuizTab} from './components/QuizTab';
import {StudyNotesTab} from './components/StudyNotesTab';
import {UploadPdfTab} from './components/UploadPdfTab';
import {VisualStudioTab} from './components/VisualStudioTab';
import {useStudyProgress} from './hooks/useStudyProgress';
import type {
  ActiveTab,
  SearchNavigationTarget,
  StudyManifest,
  StudyPart,
} from './types/study';

const partModules = import.meta.glob<{default?: StudyPart} & StudyPart>(
  './data/part-*.json',
  {eager: true},
);

interface NavItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  section: 'study' | 'tools';
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
  {
    id: 'studio',
    label: 'Visual Studio',
    shortLabel: 'Visuals',
    section: 'tools',
    icon: ImageIcon,
  },
  {
    id: 'audio',
    label: 'Voice Notes',
    shortLabel: 'Voice',
    section: 'tools',
    icon: Mic,
  },
  {
    id: 'upload',
    label: '+ Upload PDF',
    shortLabel: 'Upload',
    section: 'tools',
    icon: FileUp,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

  const [focusNotePart, setFocusNotePart] = useState<number | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string>('');
  const [focusCard, setFocusCard] = useState<{
    partNumber: number;
    cardIndex: number;
  } | null>(null);

  const {
    progress,
    levelInfo,
    streakBadge,
    xpToast,
    markPartRead,
    markFlashcardMastered,
    recordQuizAnswer,
    saveTranscript,
    deleteTranscript,
    saveVisual,
    deleteVisual,
  } = useStudyProgress();

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

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleSearchNavigate = (target: SearchNavigationTarget) => {
    if (target.tab === 'notes') {
      if (target.partNumber !== undefined) {
        setSelectedPart(String(target.partNumber));
        setFocusNotePart(target.partNumber);
      }
      setHighlightQuery(target.query || '');
      setActiveTab('notes');
    } else if (target.tab === 'flashcards') {
      if (target.partNumber !== undefined) {
        setSelectedPart(String(target.partNumber));
        setFocusCard({
          partNumber: target.partNumber,
          cardIndex: target.cardIndex ?? 0,
        });
      }
      setActiveTab('flashcards');
    } else {
      setActiveTab('audio');
    }
  };

  const handleSelectPartAndTab = (partNumber: number, tab: ActiveTab) => {
    setSelectedPart(String(partNumber));
    setFocusCard(null);
    setFocusNotePart(null);
    setActiveTab(tab);
  };

  const isCombinedView = selectedPart === 'all';
  const studyNavItems = NAV_ITEMS.filter((i) => i.section === 'study');
  const toolNavItems = NAV_ITEMS.filter((i) => i.section === 'tools');
  const isToolTabActive =
    activeTab === 'studio' || activeTab === 'audio' || activeTab === 'upload';

  return (
    <div className="min-h-screen text-slate-900">
      {/* Desktop Glassmorphic Sidebar */}
      <aside className="surface-nav-glass hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/80">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/70 px-5">
          <img
            src="/icon.svg"
            alt=""
            className="h-8 w-8 rounded-xl shadow-xs shrink-0"
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
              Studio &amp; Capture
            </p>
            <ul className="mt-2 space-y-1">
              {toolNavItems.map((item) => {
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

        {/* Sidebar Daily Streak + XP Summary */}
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
        </div>
      </aside>

      {/* Main Portrait-Optimized App Shell */}
      <div className="lg:pl-64">
        {/* Top Frosted Glass Command Header */}
        <header className="surface-nav-glass sticky top-0 z-30 h-14 border-b border-slate-200/80">
          <div className="mx-auto flex h-full max-w-xl items-center justify-between gap-2 px-3.5 sm:px-4">
            {/* Mobile Brand */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 lg:hidden"
            >
              <img
                src="/icon.svg"
                alt=""
                className="h-7 w-7 rounded-lg shadow-xs shrink-0"
              />
            </a>

            {/* Global Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex min-h-[38px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/75 px-3 py-1.5 text-left text-xs text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:bg-white"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <Search
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="truncate">Search notes &amp; cards...</span>
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
                  className="min-h-[38px] max-w-[110px] appearance-none truncate rounded-xl border border-slate-200/90 bg-white/80 py-1.5 pr-6 pl-2.5 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:border-slate-300 hover:bg-white focus:border-blue-600 focus:bg-white focus:outline-none sm:max-w-[155px]"
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
                onClick={() => setActiveTab('dashboard')}
                aria-label="View daily streak and XP"
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50/70 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-xs transition-colors hover:border-amber-300 whitespace-nowrap shrink-0"
              >
                <Flame
                  className="h-3.5 w-3.5 text-amber-600"
                  aria-hidden="true"
                />
                <span className="font-mono-tabular">{progress.streakDays}d</span>
              </button>

              <PWAInstallButton />
            </div>
          </div>
        </header>

        {/* Tablet Navigation Strip */}
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

        {/* Portrait Mobile Main Viewport */}
        <main className="mx-auto max-w-xl px-3.5 py-6 pb-24 sm:px-4 sm:py-7 md:pb-14">
          {activeTab === 'dashboard' ? (
            <DashboardTab
              allParts={allParts}
              progress={progress}
              onSelectPartAndTab={handleSelectPartAndTab}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
          ) : activeTab === 'upload' ? (
            <UploadPdfTab />
          ) : activeTab === 'studio' ? (
            <VisualStudioTab
              savedVisuals={progress.savedVisuals}
              onSaveVisual={saveVisual}
              onDeleteVisual={deleteVisual}
            />
          ) : activeTab === 'audio' ? (
            <AudioTranscribeTab
              savedTranscripts={progress.savedTranscripts}
              onSaveTranscript={saveTranscript}
              onDeleteTranscript={deleteTranscript}
            />
          ) : allParts.length === 0 ? (
            <EmptyStudyState onGoToUpload={() => setActiveTab('upload')} />
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
            />
          ) : (
            <QuizTab
              parts={visibleParts}
              onRecordQuizAnswer={recordQuizAnswer}
            />
          )}
        </main>
      </div>

      {/* Mobile Glassmorphic Bottom Navigation */}
      <nav
        aria-label="Mobile study navigation"
        className="surface-nav-glass fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-5 border-t border-slate-200/80 shadow-[0_-6px_24px_-12px_rgba(15,23,42,0.12)] md:hidden"
      >
        {studyNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIsMobileToolsOpen(false);
                setActiveTab(item.id);
              }}
              className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
                isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
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
          onClick={() => setIsMobileToolsOpen((prev) => !prev)}
          className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors whitespace-nowrap ${
            isToolTabActive || isMobileToolsOpen
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {(isToolTabActive || isMobileToolsOpen) && (
            <span
              className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600"
              aria-hidden="true"
            />
          )}
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Tools</span>
        </button>
      </nav>

      {/* Mobile Tools Glassmorphic Bottom Sheet */}
      {isMobileToolsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-slate-950/45 backdrop-blur-sm md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileToolsOpen(false);
          }}
        >
          <div className="surface-glass w-full rounded-t-3xl p-5 pb-8 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300/90" />
            <div className="flex items-center justify-between pb-4">
              <div>
                <p className="text-sm font-bold tracking-tight text-slate-900">
                  Study Tools &amp; Upload
                </p>
                <p className="font-mono-tabular mt-0.5 text-xs text-slate-500">
                  {progress.streakDays}d streak ({streakBadge.title}) ·{' '}
                  {progress.xp} XP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileToolsOpen(false)}
                aria-label="Close tools menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {toolNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileToolsOpen(false);
                    }}
                    className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                      isActive
                        ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50/70 text-blue-700'
                        : 'surface-card text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        parts={allParts}
        transcripts={progress.savedTranscripts}
        onNavigate={handleSearchNavigate}
      />

      {/* Premium XP Reward Toast */}
      {xpToast && (
        <div
          role="status"
          aria-live="polite"
          className="surface-hero fixed right-4 bottom-20 z-50 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white md:bottom-6"
        >
          <Award
            className="h-4 w-4 text-amber-400 shrink-0"
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
