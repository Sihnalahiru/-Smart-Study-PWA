export type UserId = 'haruto' | 'sakura';

export interface UserProfile {
  id: UserId;
  name: string;
  japaneseName: string;
  genderLabel: 'Boy' | 'Lady';
  roleSubtitle: string;
  avatarUrl: string;
  accentGradient: string;
  ringClass: string;
  badgeClass: string;
}

export interface FlashcardItem {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  note_topic?: string;
  module_code?: string;
}

export interface StudyPart {
  part_number: number;
  source_pdf: string;
  title: string;
  notes_markdown: string;
  flashcards: FlashcardItem[];
  quiz: QuizQuestion[];
  images?: string[];
  processed_at?: string;
}

export interface PartMetadata {
  part_number: number;
  source_pdf: string;
  title: string;
  file: string;
  flashcard_count?: number;
  quiz_count?: number;
  image_count?: number;
  processed_at?: string;
}

export interface StudyManifest {
  parts: PartMetadata[];
}

export type ActiveTab =
  | 'dashboard'
  | 'notes'
  | 'flashcards'
  | 'quiz'
  | 'upload';

export interface XpActivity {
  id: string;
  action: string;
  xp: number;
  detail: string;
  timestamp: string;
}

export interface DailyProgress {
  date: string;
  flashcardsReviewed: number;
  quizAnswered: number;
  notesCompleted: number;
  xpEarnedToday: number;
}

export interface StudyProgressState {
  xp: number;
  streakDays: number;
  bestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
  reviewedFlashcardIds: string[];
  readPartNumbers: number[];
  correctQuizIds: string[];
  attemptedQuizIds: string[];
  completedQuizParts: number[];
  activities: XpActivity[];
  daily: DailyProgress;
}

export interface SearchNavigationTarget {
  tab: 'notes' | 'flashcards';
  partNumber?: number;
  cardIndex?: number;
  query?: string;
}
