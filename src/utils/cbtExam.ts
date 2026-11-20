import academicExpansionData from '../data/cbt-academic-expansion.json';
import practicalData from '../data/cbt-practical-questions.json';
import type {
  CbtExamSection,
  CbtQuestion,
  PaperSetNumber,
  QuizQuestion,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  buildPdfFigureIndex,
  resolveQuestionVisual,
  type MappedPdfFigure,
} from './pdfVisualResolver';

export const TOTAL_PAPER_SETS = 16;

export const PAPER_SET_NUMBERS: PaperSetNumber[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
];

export const SSW_EXAM_RULES = {
  totalQuestions: 50,
  totalMinutes: 80,
  academicQuestions: 30,
  academicMinutes: 40,
  academicPassScore: 18,
  practicalQuestions: 20,
  practicalMinutes: 40,
  practicalPassScore: 12,
  passPercent: 60,
} as const;

export interface SswTopicMeta {
  id: SswExamTopic;
  englishLabel: string;
  shortLabel: string;
  japaneseTag: string;
  description: string;
}

export const SSW_TOPICS: SswTopicMeta[] = [
  {
    id: 'receiving_dispatching',
    englishLabel: 'Receiving & Dispatching',
    shortLabel: 'Receiving & Dispatch',
    japaneseTag: '入出庫作業',
    description: 'Inbound/outbound checks, remarks, loading, shipping documents',
  },
  {
    id: 'storage_inventory',
    englishLabel: 'Storage & Inventory',
    shortLabel: 'Storage & Inventory',
    japaneseTag: '保管・在庫管理',
    description: 'Locations, temperature zones, quality, stocktaking, pallets',
  },
  {
    id: 'picking_processing',
    englishLabel: 'Picking & Processing',
    shortLabel: 'Picking & Packing',
    japaneseTag: 'ピッキング・流通加工',
    description: 'Picking modes, taping, labeling, wrapping, 17 processing tasks',
  },
  {
    id: 'warehouse_equipment',
    englishLabel: 'Warehouse Equipment',
    shortLabel: 'Equipment & Vehicles',
    japaneseTag: '荷役機器・車両',
    description: 'Forklifts, hand pallets, scanners, conveyors, containers, trucks',
  },
  {
    id: 'safety_health',
    englishLabel: 'Health & Safety',
    shortLabel: 'Health & Safety',
    japaneseTag: '安全衛生・危険予知',
    description: 'Labor rules, KYT, 5S, lifting posture, GHS labels, emergency safety',
  },
];

export const SSW_TOPIC_MAP: Record<SswExamTopic, SswTopicMeta> =
  SSW_TOPICS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<SswExamTopic, SswTopicMeta>,
  );

function inferTopicForAcademicQuestion(
  partNumber: number,
  questionText: string,
  noteTopic?: string,
): SswExamTopic {
  const hay = `${noteTopic ?? ''} ${questionText}`;

  if (
    /安全|衛生|KYT|5S|GHS|労働|休憩|熱中症|腰痛|災害|転倒|危険|保護|ヘルメット|安全靴|非常停止|指差|トラテープ|防災|火災|地震/.test(
      hay,
    )
  ) {
    return 'safety_health';
  }
  if (
    /フォークリフト|コンベア|クレーン|パレットトラック|カゴ台車|ウイング|パワーゲート|コンテナ|ハンディ|車両|自動倉庫|垂直搬送|エレベーター|機器|設備|クランプ|リーチ/.test(
      hay,
    )
  ) {
    return 'warehouse_equipment';
  }
  if (
    /ピッキング|流通加工|ラベル|タグ|テープ|梱包|開梱|ストレッチ|PPバンド|検針|カッター|封入|詰め替え/.test(
      hay,
    )
  ) {
    return 'picking_processing';
  }
  if (
    /入庫|出庫|リマーク|残貨|積卸|バンニング|デバンニング|帳票|指図書|受領|引渡|ケアマーク/.test(
      hay,
    )
  ) {
    return 'receiving_dispatching';
  }
  if (
    /保管|在庫|棚卸|ロケーション|温度|冷蔵|冷凍|品質|におい|約款|料金|パレット|単位|換算|助数詞|さし札/.test(
      hay,
    )
  ) {
    return 'storage_inventory';
  }

  switch (partNumber) {
    case 1:
      return 'warehouse_equipment';
    case 2:
      return 'storage_inventory';
    case 3:
      return 'receiving_dispatching';
    case 4:
      return 'picking_processing';
    case 5:
      return 'safety_health';
    case 6:
      return 'warehouse_equipment';
    default:
      return 'storage_inventory';
  }
}

interface AcademicExpansionRecord extends QuizQuestion {
  id: string;
  partNumber: number;
  topic: SswExamTopic;
}

export function buildAllAcademicQuestions(
  allParts: StudyPart[],
  figureIndex?: MappedPdfFigure[],
): CbtQuestion[] {
  const resolvedIndex = figureIndex ?? buildPdfFigureIndex(allParts);
  const raw: Omit<CbtQuestion, 'paperSet'>[] = [];
  const seenIds = new Set<string>();

  for (const part of allParts) {
    part.quiz.forEach((q, idx) => {
      const id = q.id ?? `part-${part.part_number}-q-${idx}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const topic =
        q.topic ??
        inferTopicForAcademicQuestion(
          part.part_number,
          q.question,
          q.note_topic,
        );
      const visual = resolveQuestionVisual(
        {
          partNumber: part.part_number,
          question: q.question,
          noteTopic: q.note_topic,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
          explicitImage: q.image,
          explicitImageAlt: q.imageAlt,
        },
        resolvedIndex,
      );

      raw.push({
        id,
        section: 'academic',
        topic,
        partNumber: part.part_number,
        note_section_id: q.note_section_id,
        source_pdf_page: q.source_pdf_page,
        difficulty: q.difficulty,
        validation_status: q.validation_status,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        image: visual?.src,
        imageAlt: visual?.alt,
        imageSource: visual?.source,
        imageMeta: visual?.meta,
        isCalculation: q.isCalculation,
      });
    });
  }

  for (const q of academicExpansionData as AcademicExpansionRecord[]) {
    if (seenIds.has(q.id)) continue;
    seenIds.add(q.id);

    const visual = resolveQuestionVisual(
      {
        partNumber: q.partNumber,
        question: q.question,
        noteTopic: q.note_topic,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation,
        explicitImage: q.image,
        explicitImageAlt: q.imageAlt,
      },
      resolvedIndex,
    );

    raw.push({
      id: q.id,
      section: 'academic',
      topic: q.topic,
      partNumber: q.partNumber,
      note_section_id: q.note_section_id,
      source_pdf_page: q.source_pdf_page,
      difficulty: q.difficulty,
      validation_status: q.validation_status,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
      image: visual?.src,
      imageAlt: visual?.alt ?? q.imageAlt,
      imageSource: visual?.source,
      imageMeta: visual?.meta,
      isCalculation: q.isCalculation,
    });
  }

  // Group by topic so each of the 16 Paper Sets gets an exact 6-per-topic (30 Academic) balanced mix
  const byTopic: Record<SswExamTopic, Omit<CbtQuestion, 'paperSet'>[]> = {
    receiving_dispatching: [],
    storage_inventory: [],
    picking_processing: [],
    warehouse_equipment: [],
    safety_health: [],
  };
  for (const item of raw) {
    byTopic[item.topic].push(item);
  }

  // Assign each topic's 96 questions round-robin across Paper Sets 1..16 (exact 6 per topic per set)
  const perSetBuckets: Record<number, CbtQuestion[]> = {};
  for (const ps of PAPER_SET_NUMBERS) {
    perSetBuckets[ps] = [];
  }

  for (const t of SSW_TOPICS) {
    byTopic[t.id].forEach((q, idx) => {
      const ps = ((idx % TOTAL_PAPER_SETS) + 1) as PaperSetNumber;
      perSetBuckets[ps].push({
        ...q,
        paperSet: ps,
      });
    });
  }

  // Within each Paper Set, interleave the 5 topics cleanly so topics are mixed throughout the 30 Qs
  const result: CbtQuestion[] = [];
  for (const ps of PAPER_SET_NUMBERS) {
    const bucket = perSetBuckets[ps];
    const bucketByTopic: Record<SswExamTopic, CbtQuestion[]> = {
      receiving_dispatching: [],
      storage_inventory: [],
      picking_processing: [],
      warehouse_equipment: [],
      safety_health: [],
    };
    for (const q of bucket) {
      bucketByTopic[q.topic].push(q);
    }
    let added = true;
    let cursor = 0;
    while (added) {
      added = false;
      for (const t of SSW_TOPICS) {
        const list = bucketByTopic[t.id];
        if (cursor < list.length) {
          result.push(list[cursor]);
          added = true;
        }
      }
      cursor += 1;
    }
  }

  return result;
}

export function getAllPracticalQuestions(
  figureIndex: MappedPdfFigure[] = [],
): CbtQuestion[] {
  return (practicalData as CbtQuestion[]).map((q) => {
    const visual = resolveQuestionVisual(
      {
        partNumber: q.partNumber,
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation,
        explicitImage: q.image,
        explicitImageAlt: q.imageAlt,
      },
      figureIndex,
    );
    return {
      ...q,
      section: 'practical' as CbtExamSection,
      image: visual?.src,
      imageAlt: visual?.alt ?? q.imageAlt,
      imageSource: visual?.source,
      imageMeta: visual?.meta,
    };
  });
}

export function getAllCbtQuestions(allParts: StudyPart[]): CbtQuestion[] {
  const figureIndex = buildPdfFigureIndex(allParts);
  return [
    ...buildAllAcademicQuestions(allParts, figureIndex),
    ...getAllPracticalQuestions(figureIndex),
  ];
}

export interface CbtPaperSetBundle {
  paperSet: PaperSetNumber;
  title: string;
  subtitle: string;
  academic: CbtQuestion[];
  practical: CbtQuestion[];
  allQuestions: CbtQuestion[];
  imageQuestionCount: number;
  calculationQuestionCount: number;
}

const PAPER_SET_SUBTITLES: Record<PaperSetNumber, string> = {
  1: 'Mixed All 5 Topics · Care Marks, Interlock Stacking, Forklift Safety & Planning Math',
  2: 'Mixed All 5 Topics · GHS Labels, Pallet Capacity, Equipment & Lifting Calculations',
  3: 'Mixed All 5 Topics · Container Ops, Roll Clamps, Temperature Zones & Shift Math',
  4: 'Mixed All 5 Topics · Wet-Cargo Docking, Drum Handling, H-Taping & Floor Load Math',
  5: 'Mixed All 5 Topics · Flex-Bags, Pinwheel Stacking, AMR Robotics & Volume Tonnage',
  6: 'Mixed All 5 Topics · Stack Limits, Oricon/Bales, Brick Stacking & Sorter Planning',
  7: 'Mixed All 5 Topics · No-Cutter Ops, 40ft Containers, Overhead Cranes & Roll Cage Load',
  8: 'Mixed All 5 Topics · No-Hooks, Roll Clamps, Split Stacking, Equipment & GHS Environment',
  9: 'Mixed All 5 Topics · Fire-Free Storage, Overhang Defects, 3-Period Fees & Shift Hours',
  10: 'Mixed All 5 Topics · Handle-With-Care, Pail Cans, SF4 Ultra-Cold & Clearance Math',
  11: 'Mixed All 5 Topics · Do-Not-Step, Paper Rolls, Trailer Blind Spots & Legal Break Math',
  12: 'Mixed All 5 Topics · Case Mark Shortages, Devanning Prep, Sorter Ops & Lifting Limits',
  13: 'Mixed All 5 Topics · Pallet Patterns, 18L Cans, C3 Chilled & Crane Rigging Capacity',
  14: 'Mixed All 5 Topics · Mixed Cargo Loading, Low-Temp Taping, AMR Productivity & Hydration',
  15: 'Mixed All 5 Topics · Container Volume, 3-Tier Floor Load, Stacker Cycle & Overtime Math',
  16: 'Mixed All 5 Topics · Full-Textbook Capstone · Vanning, Revenue Tonnage & Elevator Load',
};

export function buildPaperSet(
  allParts: StudyPart[],
  paperSet: PaperSetNumber,
): CbtPaperSetBundle {
  const figureIndex = buildPdfFigureIndex(allParts);
  const allAcademic = buildAllAcademicQuestions(allParts, figureIndex);
  const allPractical = getAllPracticalQuestions(figureIndex);

  const primaryAcademic = allAcademic.filter((q) => q.paperSet === paperSet);
  const overflowAcademic = allAcademic.filter((q) => q.paperSet !== paperSet);
  const academic = [...primaryAcademic, ...overflowAcademic].slice(
    0,
    SSW_EXAM_RULES.academicQuestions,
  );

  const primaryPractical = allPractical.filter((q) => q.paperSet === paperSet);
  const overflowPractical = allPractical.filter((q) => q.paperSet !== paperSet);
  const practical = [...primaryPractical, ...overflowPractical].slice(
    0,
    SSW_EXAM_RULES.practicalQuestions,
  );

  const allQuestions = [...academic, ...practical];

  return {
    paperSet,
    title: `Mock Exam Paper ${String(paperSet).padStart(2, '0')}`,
    subtitle: PAPER_SET_SUBTITLES[paperSet],
    academic,
    practical,
    allQuestions,
    imageQuestionCount: allQuestions.filter((q) => Boolean(q.image)).length,
    calculationQuestionCount: allQuestions.filter((q) =>
      Boolean(q.isCalculation),
    ).length,
  };
}

export function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
