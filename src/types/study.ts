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

export type CbtExamSection = 'academic' | 'practical';

export type SswExamTopic =
  | 'receiving_dispatching'
  | 'storage_inventory'
  | 'picking_processing'
  | 'warehouse_equipment'
  | 'safety_health';

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  note_topic?: string;
  module_code?: string;
  section?: CbtExamSection;
  topic?: SswExamTopic;
  image?: string;
  imageAlt?: string;
  isCalculation?: boolean;
}

export interface CbtQuestion {
  id: string;
  paperSet: 1 | 2 | 3;
  section: CbtExamSection;
  topic: SswExamTopic;
  partNumber: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  image?: string;
  imageAlt?: string;
  isCalculation?: boolean;
}

export interface CbtTopicScore {
  topic: SswExamTopic;
  correct: number;
  total: number;
}

export interface CbtExamAttempt {
  id: string;
  mode: 'full' | 'academic' | 'practical';
  paperSet: 1 | 2 | 3;
  completedAt: string;
  elapsedSeconds: number;
  academicCorrect: number;
  academicTotal: number;
  practicalCorrect: number;
  practicalTotal: number;
  totalCorrect: number;
  totalQuestions: number;
  passedAcademic: boolean;
  passedPractical: boolean;
  passedOverall: boolean;
  topicScores: CbtTopicScore[];
}

export interface StudyPart {
  part_number: number;
  source_pdf: string;
  title: string;
  english_title?: string;
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
  | 'library'
  | 'settings'
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

export interface QuizQuestionStat {
  attempts: number;
  correct: number;
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
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  cbtExamHistory?: CbtExamAttempt[];
  activities: XpActivity[];
  daily: DailyProgress;
}

export interface SearchNavigationTarget {
  tab: 'notes' | 'flashcards';
  partNumber?: number;
  cardIndex?: number;
  query?: string;
}
