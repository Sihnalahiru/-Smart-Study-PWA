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

export type PaperSetNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16;

export interface FlashcardItem {
  id?: string;
  question: string;
  answer: string;
  topic?: SswExamTopic;
  note_section_id?: string;
  source_pdf_page?: number;
  image?: string;
  imageAlt?: string;
}

export type CbtExamSection = 'academic' | 'practical';

export type SswExamTopic =
  | 'receiving_dispatching'
  | 'storage_inventory'
  | 'picking_processing'
  | 'warehouse_equipment'
  | 'safety_health';

export type QuestionImageSource = 'explicit' | 'mapped_pdf';

export type QuestionImageCategory =
  | 'sign'
  | 'label'
  | 'equipment'
  | 'hazard'
  | 'diagram'
  | 'reference';

/**
 * Standardized image attachment schema for image-based MCQs.
 */
export interface QuizQuestionImage {
  /** Mapped PDF visual asset path (e.g. "/images/figures/fig-p087-obj404.jpg") */
  path: string;
  /** Accessible caption or textbook figure title (supports Furigana markup) */
  alt?: string;
  /** Semantic figure type used for visually distinct exam framing */
  category?: QuestionImageCategory;
  /** Origin of the asset mapping (explicitly authored vs dynamically mapped from PDF notes) */
  source?: QuestionImageSource;
  /** Textbook part number where the mapped PDF visual appears */
  partNumber?: number;
}

/**
 * Standardized MCQ image field: accepts either a direct asset path string
 * or a full QuizQuestionImage metadata object.
 */
export type QuizImageField = string | QuizQuestionImage;

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  note_topic?: string;
  note_section_id?: string;
  source_pdf_page?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  validation_status?: 'verified' | 'pending_review';
  module_code?: string;
  section?: CbtExamSection;
  topic?: SswExamTopic;
  /** Optional standardized image field (path string or structured QuizQuestionImage) */
  image?: QuizImageField;
  imageAlt?: string;
  isCalculation?: boolean;
}

export interface CbtQuestion {
  id: string;
  paperSet: PaperSetNumber;
  section: CbtExamSection;
  topic: SswExamTopic;
  partNumber: number;
  note_section_id?: string;
  source_pdf_page?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  validation_status?: 'verified' | 'pending_review';
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  /** Normalized resolved image asset path when present */
  image?: string;
  imageAlt?: string;
  imageSource?: QuestionImageSource;
  /** Full standardized image metadata when the question includes an image */
  imageMeta?: QuizQuestionImage;
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
  paperSet: PaperSetNumber;
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
