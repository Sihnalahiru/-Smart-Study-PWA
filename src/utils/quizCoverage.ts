import type {QuizQuestion, StudyPart} from '../types/study';
import {CORE_SYLLABUS} from './syllabusProgress';

export type QuizModuleCode =
  | 'EXAM'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | `PART_${number}`;

export interface ModuleDescriptor {
  code: QuizModuleCode;
  shortLabel: string;
  furiganaLabel: string;
  order: number;
  count: number;
}

export interface ExtractedNoteTopic {
  key: string;
  topicLabel: string;
  sectionTitle: string;
  snippet: string;
  matchTokens: string[];
}

export interface ComprehensiveQuizQuestion extends QuizQuestion {
  id: string;
  partNumber: number;
  partTitle: string;
  moduleCode: QuizModuleCode;
  moduleShortLabel: string;
  moduleFuriganaLabel: string;
  noteTopic: string;
  isSynthesized: boolean;
}

export interface PartCoverageSummary {
  partNumber: number;
  title: string;
  totalNoteTopics: number;
  coveredNoteTopics: number;
  existingQuizCount: number;
  synthesizedCount: number;
  totalQuizCount: number;
  coveragePercent: number;
}

export interface FullExamQuizBank {
  questions: ComprehensiveQuizQuestion[];
  coverageByPart: PartCoverageSummary[];
  totalNoteTopics: number;
  coveredNoteTopics: number;
  overallCoveragePercent: number;
  modules: ModuleDescriptor[];
}

const MODULE_META: Record<
  'EXAM' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
  {shortLabel: string; furiganaLabel: string; order: number}
> = {
  EXAM: {
    shortLabel: '試験形式',
    furiganaLabel: '{試験|しけん}{形式|けいしき}',
    order: 0,
  },
  A: {
    shortLabel: 'A 倉庫・設備',
    furiganaLabel: 'A. {倉庫|そうこ}{種類|しゅるい}・{設備|せつび}',
    order: 1,
  },
  B: {
    shortLabel: 'B 業務・品質・防災',
    furiganaLabel: 'B. {業務|ぎょうむ}・{品質|ひんしつ}・{防災|ぼうさい}',
    order: 2,
  },
  C: {
    shortLabel: 'C 服装・単位・助数詞',
    furiganaLabel: 'C. {帳票|ちょうひょう}・{単位|たんい}・{助数詞|じょすうし}',
    order: 3,
  },
  D: {
    shortLabel: 'D 入出庫・流通加工',
    furiganaLabel: 'D. {入出庫|にゅうしゅっこ}・{流通加工|りゅうつうかこう}',
    order: 4,
  },
  E: {
    shortLabel: 'E 安全・KYT・GHS',
    furiganaLabel: 'E. {安全|あんぜん}・KYT・GHS',
    order: 5,
  },
  F: {
    shortLabel: 'F フォークリフト',
    furiganaLabel: 'F. フォークリフト{基準|きじゅん}',
    order: 6,
  },
};

export function stripFurigana(text: string): string {
  return text.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1');
}

function normalizeForMatch(text: string): string {
  return stripFurigana(text)
    .toLowerCase()
    .replace(/[*_`>#|[\]()（）:：・、。,.!！?？/／\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForMatch(text: string): string[] {
  const plain = stripFurigana(text);
  const tokens = new Set<string>();

  // English / alphanumeric acronyms & keywords (2+ chars)
  const latinMatches = plain.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  for (const m of latinMatches) {
    tokens.add(m);
  }

  // Kanji runs (2+ kanji) and Katakana letter runs excluding middle dot ・ (\u30fb)
  const jpMatches =
    plain.match(/[\u4e00-\u9faf]{2,}|[\u30a1-\u30f6\u30fc]{2,}/g) ?? [];
  for (const m of jpMatches) {
    tokens.add(m);
    if (m.length >= 4 && /[\u4e00-\u9faf]/.test(m)) {
      tokens.add(m.slice(0, 2));
      tokens.add(m.slice(-2));
    }
  }

  return Array.from(tokens);
}

/**
 * Extracts leaf study note topics (headings without bullet children + bold bullet concepts)
 * so quiz coverage can be audited against every substantive topic in notes_markdown.
 */
export function extractStudyNoteTopics(
  notesMarkdown: string,
): ExtractedNoteTopic[] {
  const lines = notesMarkdown.split(/\r?\n/);
  const headingItems: {lineIdx: number; topic: ExtractedNoteTopic; hasBullets: boolean}[] = [];
  const bulletTopics: ExtractedNoteTopic[] = [];
  const seenKeys = new Set<string>();
  let currentHeadingIdx = -1;
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      const rawHeading = headingMatch[1].trim();
      const plainHeading = stripFurigana(rawHeading);
      if (/主要シラバス/.test(plainHeading) && !/目的別/.test(plainHeading)) {
        continue;
      }
      currentSection = rawHeading;
      const key = normalizeForMatch(plainHeading);
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        const nextContent: string[] = [];
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const candidate = lines[j].trim();
          if (
            candidate &&
            !candidate.startsWith('#') &&
            !candidate.startsWith('---') &&
            !/සිංහල/.test(candidate)
          ) {
            nextContent.push(candidate.replace(/^[-*>\s]+/, ''));
          }
        }
        currentHeadingIdx = headingItems.length;
        headingItems.push({
          lineIdx: i,
          hasBullets: false,
          topic: {
            key,
            topicLabel: rawHeading.replace(/^#+\s*/, ''),
            sectionTitle: rawHeading,
            snippet: nextContent.join(' ').slice(0, 220),
            matchTokens: tokenizeForMatch(plainHeading),
          },
        });
      }
      continue;
    }

    const bulletMatch = trimmed.match(/^-\s+\*\*(.+?)\*\*(.*)$/);
    if (bulletMatch) {
      const boldTitle = bulletMatch[1].replace(/[:：]\s*$/, '').trim();
      const plainTitle = stripFurigana(boldTitle);
      if (!plainTitle || /සිංහල|sinhala/i.test(plainTitle)) {
        continue;
      }
      if (currentHeadingIdx >= 0) {
        headingItems[currentHeadingIdx].hasBullets = true;
      }
      const key = normalizeForMatch(plainTitle);
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        const remainder = bulletMatch[2]
          .replace(/^[:：\s]+/, '')
          .replace(/\*\*/g, '')
          .trim();
        bulletTopics.push({
          key,
          topicLabel: boldTitle,
          sectionTitle: currentSection || boldTitle,
          snippet: remainder || plainTitle,
          matchTokens: tokenizeForMatch(`${plainTitle} ${remainder}`),
        });
      }
    }
  }

  const leafHeadings = headingItems
    .filter((item) => !item.hasBullets)
    .map((item) => item.topic);

  return [...leafHeadings, ...bulletTopics];
}

export function inferQuestionModule(
  q: QuizQuestion,
  partNumber: number,
  questionIndex: number,
  partTitle: string,
): {code: QuizModuleCode; shortLabel: string; furiganaLabel: string; order: number} {
  const explicit = q.module_code?.trim().toUpperCase();
  if (
    explicit === 'EXAM' ||
    explicit === 'A' ||
    explicit === 'B' ||
    explicit === 'C' ||
    explicit === 'D' ||
    explicit === 'E' ||
    explicit === 'F'
  ) {
    return {code: explicit, ...MODULE_META[explicit]};
  }

  const plainTopic = stripFurigana(q.note_topic || '');
  if (/試験形式|Exam Format/i.test(plainTopic)) {
    return {code: 'EXAM', ...MODULE_META.EXAM};
  }
  const sectionMatch = plainTopic.match(/^\s*(?:###?\s*)?([A-F])\s*[-.:：.]/i);
  if (sectionMatch) {
    const letter = sectionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    return {code: letter, ...MODULE_META[letter]};
  }

  for (const mod of CORE_SYLLABUS) {
    if (
      mod.partNumber === partNumber &&
      mod.quizIndices.includes(questionIndex)
    ) {
      const letter = mod.code as 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
      if (MODULE_META[letter]) {
        return {code: letter, ...MODULE_META[letter]};
      }
    }
  }

  const partModule = CORE_SYLLABUS.find((mod) => mod.partNumber === partNumber);
  if (partModule) {
    const letter = partModule.code as 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    if (MODULE_META[letter]) {
      return {code: letter, ...MODULE_META[letter]};
    }
  }

  const cleanTitle = stripFurigana(partTitle).slice(0, 14);
  return {
    code: `PART_${partNumber}`,
    shortLabel: `Part ${partNumber}`,
    furiganaLabel: `Part ${partNumber}: ${cleanTitle}`,
    order: 10 + partNumber,
  };
}

function isTopicCoveredByQuestions(
  topic: ExtractedNoteTopic,
  questions: ComprehensiveQuizQuestion[],
): boolean {
  const normalizedTopic = topic.key;
  return questions.some((q) => {
    const rawHaystack = stripFurigana(
      `${q.noteTopic} ${q.question} ${q.explanation}`,
    ).toLowerCase();
    if (!rawHaystack) return false;
    if (normalizeForMatch(rawHaystack).includes(normalizedTopic)) return true;

    return topic.matchTokens.some((token) =>
      rawHaystack.includes(token.toLowerCase()),
    );
  });
}

function buildJapaneseSnippetForCard(rawText: string): string {
  const withoutSinhala = rawText
    .split('\n')
    .filter((line) => !/සිංහල|sinhala/i.test(line))
    .join(' ')
    .trim();
  return withoutSinhala || rawText.trim();
}

function truncateFuriganaSafe(text: string, maxLen: number): string {
  const clean = text.replace(/\*\*/g, '').trim();
  if (clean.length <= maxLen) return clean;
  let cut = maxLen;
  const openIdx = clean.lastIndexOf('{', cut);
  const closeIdx = clean.lastIndexOf('}', cut);
  if (openIdx > closeIdx) {
    const nextClose = clean.indexOf('}', cut);
    cut = nextClose >= 0 && nextClose - cut <= 24 ? nextClose + 1 : openIdx;
  }
  return clean.slice(0, cut).trim();
}

function synthesizeQuestionForTopic(
  part: StudyPart,
  topic: ExtractedNoteTopic,
  synthIdx: number,
  allParts: StudyPart[],
): ComprehensiveQuizQuestion | null {
  // Prefer matching flashcard in the same part for crisp Japanese+Furigana Q&A
  const matchingCard = part.flashcards.find((fc) => {
    const cardHaystack = normalizeForMatch(`${fc.question} ${fc.answer}`);
    return topic.matchTokens.some((token) => cardHaystack.includes(token));
  });

  const distractorPool = [
    ...part.flashcards.map((fc) => buildJapaneseSnippetForCard(fc.answer)),
    ...allParts
      .filter((p) => p.part_number !== part.part_number)
      .flatMap((p) =>
        p.flashcards.map((fc) => buildJapaneseSnippetForCard(fc.answer)),
      ),
  ]
    .map((txt) => truncateFuriganaSafe(txt, 110))
    .filter((txt) => txt.length > 6);

  const moduleMeta = inferQuestionModule(
    {
      question: topic.topicLabel,
      options: [],
      correct_index: 0,
      explanation: '',
      note_topic: topic.sectionTitle || topic.topicLabel,
    },
    part.part_number,
    part.quiz.length + synthIdx,
    part.title,
  );

  if (matchingCard) {
    const correctAnswer = truncateFuriganaSafe(
      buildJapaneseSnippetForCard(matchingCard.answer),
      120,
    );
    const distractors = Array.from(
      new Set(distractorPool.filter((d) => d !== correctAnswer)),
    ).slice(0, 3);

    if (distractors.length === 3) {
      const correctIndex = synthIdx % 4;
      const options = [...distractors];
      options.splice(correctIndex, 0, correctAnswer);

      return {
        id: `part-${part.part_number}-auto-${synthIdx}`,
        partNumber: part.part_number,
        partTitle: part.title,
        moduleCode: moduleMeta.code,
        moduleShortLabel: moduleMeta.shortLabel,
        moduleFuriganaLabel: moduleMeta.furiganaLabel,
        noteTopic: topic.topicLabel,
        question: `{学習|がくしゅう}ノート「${topic.topicLabel}」について{正|ただ}しい{説明|せつめい}はどれですか？（${matchingCard.question}）`,
        options,
        correct_index: correctIndex,
        explanation: `${correctAnswer}`,
        note_topic: topic.topicLabel,
        isSynthesized: true,
      };
    }
  }

  // Fallback directly from study note snippet if no matching flashcard had enough distractors
  const snippetAnswer = truncateFuriganaSafe(
    topic.snippet || topic.topicLabel,
    120,
  );
  const distractors = Array.from(
    new Set(distractorPool.filter((d) => d !== snippetAnswer)),
  ).slice(0, 3);

  if (distractors.length < 3) {
    return null;
  }

  const correctIndex = synthIdx % 4;
  const options = [...distractors];
  options.splice(correctIndex, 0, snippetAnswer);

  return {
    id: `part-${part.part_number}-auto-${synthIdx}`,
    partNumber: part.part_number,
    partTitle: part.title,
    moduleCode: moduleMeta.code,
    moduleShortLabel: moduleMeta.shortLabel,
    moduleFuriganaLabel: moduleMeta.furiganaLabel,
    noteTopic: topic.topicLabel,
    question: `{学習|がくしゅう}ノート「${topic.topicLabel}」の{要点|ようてん}として{正|ただ}しいものはどれですか？`,
    options,
    correct_index: correctIndex,
    explanation: `{学習|がくしゅう}ノート「${topic.topicLabel}」の{重要|じゅうよう}ポイント：${snippetAnswer}`,
    note_topic: topic.topicLabel,
    isSynthesized: true,
  };
}

/**
 * Ensures a single StudyPart has comprehensive quiz assessment coverage across
 * every topic extracted from its study notes.
 */
export function ensureComprehensivePartCoverage(
  part: StudyPart,
  allParts: StudyPart[],
): {
  questions: ComprehensiveQuizQuestion[];
  summary: PartCoverageSummary;
} {
  const baseQuestions: ComprehensiveQuizQuestion[] = part.quiz.map(
    (q, idx) => {
      const moduleMeta = inferQuestionModule(
        q,
        part.part_number,
        idx,
        part.title,
      );
      return {
        ...q,
        id: `part-${part.part_number}-q-${idx}`,
        partNumber: part.part_number,
        partTitle: part.title,
        moduleCode: moduleMeta.code,
        moduleShortLabel: moduleMeta.shortLabel,
        moduleFuriganaLabel: moduleMeta.furiganaLabel,
        noteTopic: q.note_topic || part.title,
        isSynthesized: false,
      };
    },
  );

  const noteTopics = extractStudyNoteTopics(part.notes_markdown);
  const synthesized: ComprehensiveQuizQuestion[] = [];

  for (const topic of noteTopics) {
    const combined = [...baseQuestions, ...synthesized];
    if (!isTopicCoveredByQuestions(topic, combined)) {
      const generated = synthesizeQuestionForTopic(
        part,
        topic,
        synthesized.length,
        allParts,
      );
      if (generated) {
        synthesized.push(generated);
      }
    }
  }

  const allQuestions = [...baseQuestions, ...synthesized];
  const coveredCount = noteTopics.filter((topic) =>
    isTopicCoveredByQuestions(topic, allQuestions),
  ).length;

  const totalTopics = Math.max(noteTopics.length, allQuestions.length > 0 ? 1 : 0);
  const coveragePercent =
    noteTopics.length > 0
      ? Math.min(100, Math.round((coveredCount / noteTopics.length) * 100))
      : allQuestions.length > 0
        ? 100
        : 0;

  return {
    questions: allQuestions,
    summary: {
      partNumber: part.part_number,
      title: part.title,
      totalNoteTopics: totalTopics,
      coveredNoteTopics: noteTopics.length > 0 ? coveredCount : totalTopics,
      existingQuizCount: baseQuestions.length,
      synthesizedCount: synthesized.length,
      totalQuizCount: allQuestions.length,
      coveragePercent,
    },
  };
}

/**
 * Builds the comprehensive exam quiz bank across targetParts (using allParts as
 * distractor pool), computes per-part & aggregate coverage metrics, and lists
 * available exam modules for filtering.
 */
export function buildFullExamQuizBank(
  targetParts: StudyPart[],
  allParts: StudyPart[],
): FullExamQuizBank {
  const questions: ComprehensiveQuizQuestion[] = [];
  const coverageByPart: PartCoverageSummary[] = [];
  const moduleMap = new Map<QuizModuleCode, ModuleDescriptor>();

  for (const part of targetParts) {
    const result = ensureComprehensivePartCoverage(part, allParts);
    questions.push(...result.questions);
    coverageByPart.push(result.summary);

    for (const q of result.questions) {
      const existing = moduleMap.get(q.moduleCode);
      const order =
        q.moduleCode in MODULE_META
          ? MODULE_META[q.moduleCode as keyof typeof MODULE_META].order
          : 10 + part.part_number;
      if (existing) {
        existing.count += 1;
      } else {
        moduleMap.set(q.moduleCode, {
          code: q.moduleCode,
          shortLabel: q.moduleShortLabel,
          furiganaLabel: q.moduleFuriganaLabel,
          order,
          count: 1,
        });
      }
    }
  }

  const totalNoteTopics = coverageByPart.reduce(
    (sum, item) => sum + item.totalNoteTopics,
    0,
  );
  const coveredNoteTopics = coverageByPart.reduce(
    (sum, item) => sum + item.coveredNoteTopics,
    0,
  );
  const overallCoveragePercent =
    totalNoteTopics > 0
      ? Math.min(100, Math.round((coveredNoteTopics / totalNoteTopics) * 100))
      : questions.length > 0
        ? 100
        : 0;

  const modules = Array.from(moduleMap.values()).sort(
    (a, b) => a.order - b.order,
  );

  return {
    questions,
    coverageByPart,
    totalNoteTopics,
    coveredNoteTopics,
    overallCoveragePercent,
    modules,
  };
}

/**
 * Unbiased Fisher-Yates shuffle returning a new array for full-exam practice.
 */
export function shuffleQuizQuestions<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
