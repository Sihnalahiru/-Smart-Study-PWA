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

export type QuestionImageCategory =
  | 'sign'
  | 'label'
  | 'hazard'
  | 'equipment'
  | 'diagram'
  | 'reference';

export interface QuizQuestionImage {
  path: string;
  alt?: string;
  category?: QuestionImageCategory;
  source?: 'explicit' | 'mapped_pdf';
  partNumber?: number;
}

export type QuizImageField = string | QuizQuestionImage;

export type SswExamTopic =
  | 'receiving_dispatching'
  | 'storage_inventory'
  | 'picking_processing'
  | 'warehouse_equipment'
  | 'safety_health';

export type CbtExamSection = 'academic' | 'practical';

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

export interface CbtQuestion {
  id: string;
  paperSet: PaperSetNumber;
  section: CbtExamSection;
  topic: SswExamTopic;
  partNumber: number;
  note_section_id?: string;
  source_pdf_page?: number;
  difficulty?: string;
  validation_status?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  image?: string;
  imageAlt?: string;
  imageSource?: 'explicit' | 'mapped_pdf';
  imageMeta?: QuizQuestionImage;
  isCalculation?: boolean;
}

export interface CbtExamAttempt {
  id?: string;
  mode: 'full' | 'academic' | 'practical';
  paperSet: PaperSetNumber;
  totalCorrect: number;
  totalQuestions: number;
  passedOverall: boolean;
  elapsedSeconds: number;
  timestamp?: string;
  academicCorrect?: number;
  academicTotal?: number;
  practicalCorrect?: number;
  practicalTotal?: number;
}

export interface FlashcardItem {
  id?: string;
  question: string;
  answer: string;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  note_topic?: string;
  module_code?: string;
  topic?: SswExamTopic;
  image?: QuizImageField;
  imageAlt?: string;
  note_section_id?: string;
  source_pdf_page?: number;
  difficulty?: string;
  validation_status?: string;
  isCalculation?: boolean;
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
  | 'notes'
  | 'flashcards'
  | 'kana'
  | 'quiz';

export interface VocabItem {
  id: string;
  partNumber: number;
  category: string;
  jp: string;
  romaji: string;
  sinhala: string;
  exampleJp: string;
  exampleRomaji: string;
  exampleSinhala: string;
}

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
  vocabReviewedIds: string[];
  vocabReviewedCount: number;
  dailyWrongQuizIds: string[];
  alphabetSessionsToday: number;
  alphabetCharsPracticedToday: number;
  kanjiPracticedToday: number;
  studySecondsToday: number;
  completedHomeworkIdsToday: string[];
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
  wrongQuizIds: string[];
  completedQuizParts: number[];
  learnedVocabIds: string[];
  quizQuestionStats?: Record<string, QuizQuestionStat>;
  cbtExamHistory?: CbtExamAttempt[];
  alphabetTotalSessions: number;
  alphabetTotalAttempts: number;
  alphabetTotalCorrect: number;
  masteredKanaIds: string[];
  masteredKanjiIds: string[];
  lastDailyPlanPopupDate?: string;
  activities: XpActivity[];
  daily: DailyProgress;
}

export interface SearchNavigationTarget {
  tab: 'notes' | 'flashcards';
  partNumber?: number;
  cardIndex?: number;
  query?: string;
}
