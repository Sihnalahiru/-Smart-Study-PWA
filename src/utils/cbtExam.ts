import practicalData from '../data/cbt-practical-questions.json';
import type {
  CbtExamSection,
  CbtQuestion,
  SswExamTopic,
  StudyPart,
} from '../types/study';
import {
  buildPdfFigureIndex,
  resolveQuestionVisual,
  type MappedPdfFigure,
} from './pdfVisualResolver';

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

export function buildAllAcademicQuestions(
  allParts: StudyPart[],
  figureIndex?: MappedPdfFigure[],
): CbtQuestion[] {
  const resolvedIndex = figureIndex ?? buildPdfFigureIndex(allParts);
  const raw: Omit<CbtQuestion, 'paperSet'>[] = [];

  for (const part of allParts) {
    part.quiz.forEach((q, idx) => {
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
        id: q.id ?? `part-${part.part_number}-q-${idx}`,
        section: 'academic',
        topic,
        partNumber: part.part_number,
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

  // Group by topic so each Paper Set (1, 2, 3) gets a balanced mix of all 5 topics
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

  const interleaved: Omit<CbtQuestion, 'paperSet'>[] = [];
  let added = true;
  let cursor = 0;
  while (added) {
    added = false;
    for (const t of SSW_TOPICS) {
      const list = byTopic[t.id];
      if (cursor < list.length) {
        interleaved.push(list[cursor]);
        added = true;
      }
    }
    cursor += 1;
  }

  // Distribute round-robin into Paper Sets 1, 2, 3 so every set has a full mixed spread
  return interleaved.map((q, idx) => ({
    ...q,
    paperSet: ((idx % 3) + 1) as 1 | 2 | 3,
  }));
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
  paperSet: 1 | 2 | 3;
  title: string;
  subtitle: string;
  academic: CbtQuestion[];
  practical: CbtQuestion[];
  allQuestions: CbtQuestion[];
  imageQuestionCount: number;
  calculationQuestionCount: number;
}

export function buildPaperSet(
  allParts: StudyPart[],
  paperSet: 1 | 2 | 3,
): CbtPaperSetBundle {
  const figureIndex = buildPdfFigureIndex(allParts);
  const allAcademic = buildAllAcademicQuestions(allParts, figureIndex);
  const allPractical = getAllPracticalQuestions(figureIndex);

  // Select 30 Academic questions for this paper set (prioritizing assigned set, then filling if needed)
  const primaryAcademic = allAcademic.filter((q) => q.paperSet === paperSet);
  const overflowAcademic = allAcademic.filter((q) => q.paperSet !== paperSet);
  const academic = [...primaryAcademic, ...overflowAcademic].slice(
    0,
    SSW_EXAM_RULES.academicQuestions,
  );

  // Select 20 Practical questions for this paper set
  const primaryPractical = allPractical.filter((q) => q.paperSet === paperSet);
  const overflowPractical = allPractical.filter((q) => q.paperSet !== paperSet);
  const practical = [...primaryPractical, ...overflowPractical].slice(
    0,
    SSW_EXAM_RULES.practicalQuestions,
  );

  const allQuestions = [...academic, ...practical];

  const subtitles: Record<1 | 2 | 3, string> = {
    1: 'Mixed All 5 Topics · Care Marks, Interlock Stacking, Forklift Safety & Planning Math',
    2: 'Mixed All 5 Topics · GHS Labels, Pallet Capacity, Equipment & Lifting Calculations',
    3: 'Mixed All 5 Topics · Container Ops, Roll Clamps, Temperature Zones & Shift Math',
  };

  return {
    paperSet,
    title: `Mock Exam Paper ${paperSet}`,
    subtitle: subtitles[paperSet],
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
