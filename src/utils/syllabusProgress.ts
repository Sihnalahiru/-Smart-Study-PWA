import type {StudyPart, StudyProgressState} from '../types/study';

export interface SyllabusDefinition {
  code: string;
  title: string;
  subtitle: string;
  examWeight: string;
  topics: string[];
  partNumber: number;
  flashcardIndices: number[];
  quizIndices: number[];
}

export const CORE_SYLLABUS: SyllabusDefinition[] = [
  {
    code: 'A',
    title: 'Health, Safety & Compliance',
    subtitle: 'PPE, Ergonomics, Hazards & LOTO',
    examWeight: '20%–30%',
    topics: [
      'PPE & Safe Lifting Ergonomics',
      'Hazard, Spill & Near-Miss Reporting',
      'Fire Extinguishers & LOTO Rules',
    ],
    partNumber: 1,
    flashcardIndices: [3, 4, 5, 6],
    quizIndices: [2, 3, 6],
  },
  {
    code: 'B',
    title: 'Warehouse Operations & Workflows',
    subtitle: 'Inbound PO/GRN, Slotting & Picking',
    examWeight: '20%–25%',
    topics: [
      'Inbound Unloading, PO & GRN',
      'Slotting & Rack Weight Distribution',
      'Batch, Zone, Wave Picking & Staging',
    ],
    partNumber: 1,
    flashcardIndices: [7, 8, 9, 10, 11],
    quizIndices: [4, 5, 7],
  },
  {
    code: 'C',
    title: 'Inventory Management & Stock Control',
    subtitle: 'FIFO/FEFO, Cycle Counting & ABC',
    examWeight: '20%–25%',
    topics: [
      'FIFO, FEFO & LIFO Rotation',
      'Cycle Counting & Shrinkage Audits',
      'ABC Classification & Safety Stock',
    ],
    partNumber: 2,
    flashcardIndices: [0, 1, 2, 3, 4],
    quizIndices: [0, 1, 2],
  },
  {
    code: 'D',
    title: 'Equipment & Material Handling',
    subtitle: 'Forklifts, Pre-Shift Checks & Load Limits',
    examWeight: '10%–15%',
    topics: [
      'Pallet Jacks, Reach & Counterbalance Trucks',
      '6-Point Pre-Shift Safety Inspection',
      'Center of Gravity & Capacity Plates',
    ],
    partNumber: 2,
    flashcardIndices: [5, 6],
    quizIndices: [3],
  },
  {
    code: 'E',
    title: 'Technology & Documentation',
    subtitle: 'WMS, RFID, BOL & SDS Records',
    examWeight: '10%–15%',
    topics: [
      'WMS, Barcode Scanners & Voice Picking',
      'RFID Non-Line-of-Sight Scanning',
      'SKU, Packing List, BOL & MSDS/SDS',
    ],
    partNumber: 2,
    flashcardIndices: [7, 8, 9],
    quizIndices: [4, 5],
  },
  {
    code: 'F',
    title: 'Numeracy & Warehouse KPIs',
    subtitle: 'Carton Math, Accuracy & Dock-to-Stock',
    examWeight: '10%–15%',
    topics: [
      'Carton/Pallet Weight & Volume Math',
      'Order Accuracy & Inventory Turnover',
      'Picking Lines/Hour & Dock-to-Stock',
    ],
    partNumber: 2,
    flashcardIndices: [10, 11],
    quizIndices: [6, 7],
  },
];

export type ModuleStatus =
  | 'completed'
  | 'in_progress'
  | 'not_started'
  | 'unavailable';

export interface ComputedRoadmapNode {
  code: string;
  title: string;
  subtitle: string;
  examWeight: string;
  topics: string[];
  partNumber: number;
  partAvailable: boolean;
  notesRead: boolean;
  cardsDone: number;
  cardsTotal: number;
  quizDone: number;
  quizTotal: number;
  percent: number;
  status: ModuleStatus;
}

export function computeSyllabusNodes(
  allParts: StudyPart[],
  progress: StudyProgressState,
): ComputedRoadmapNode[] {
  const partMap = new Map<number, StudyPart>();
  for (const part of allParts) {
    partMap.set(part.part_number, part);
  }

  const coreNodes: ComputedRoadmapNode[] = CORE_SYLLABUS.map((def) => {
    const part = partMap.get(def.partNumber);
    if (!part) {
      return {
        ...def,
        partAvailable: false,
        notesRead: false,
        cardsDone: 0,
        cardsTotal: def.flashcardIndices.length,
        quizDone: 0,
        quizTotal: def.quizIndices.length,
        percent: 0,
        status: 'unavailable',
      };
    }

    const notesRead = progress.readPartNumbers.includes(def.partNumber);
    const validCardIds = def.flashcardIndices
      .filter((idx) => idx < part.flashcards.length)
      .map((idx) => `part-${def.partNumber}-fc-${idx}`);
    const validQuizIds = def.quizIndices
      .filter((idx) => idx < part.quiz.length)
      .map((idx) => `part-${def.partNumber}-q-${idx}`);

    const cardsDone = validCardIds.filter((id) =>
      progress.reviewedFlashcardIds.includes(id),
    ).length;
    const quizDone = validQuizIds.filter((id) =>
      progress.correctQuizIds.includes(id),
    ).length;

    const totalSteps = 1 + validCardIds.length + validQuizIds.length;
    const completedSteps = (notesRead ? 1 : 0) + cardsDone + quizDone;
    const percent =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let status: ModuleStatus = 'not_started';
    if (percent === 100) {
      status = 'completed';
    } else if (completedSteps > 0) {
      status = 'in_progress';
    }

    return {
      ...def,
      partAvailable: true,
      notesRead,
      cardsDone,
      cardsTotal: validCardIds.length,
      quizDone,
      quizTotal: validQuizIds.length,
      percent,
      status,
    };
  });

  const extraParts = allParts.filter((p) => p.part_number > 2);
  const extraNodes: ComputedRoadmapNode[] = extraParts.map((part, idx) => {
    const code = String.fromCharCode(71 + idx);
    const notesRead = progress.readPartNumbers.includes(part.part_number);
    const cardIds = part.flashcards.map(
      (_, cIdx) => `part-${part.part_number}-fc-${cIdx}`,
    );
    const quizIds = part.quiz.map(
      (_, qIdx) => `part-${part.part_number}-q-${qIdx}`,
    );

    const cardsDone = cardIds.filter((id) =>
      progress.reviewedFlashcardIds.includes(id),
    ).length;
    const quizDone = quizIds.filter((id) =>
      progress.correctQuizIds.includes(id),
    ).length;

    const totalSteps = 1 + cardIds.length + quizIds.length;
    const completedSteps = (notesRead ? 1 : 0) + cardsDone + quizDone;
    const percent =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let status: ModuleStatus = 'not_started';
    if (percent === 100) status = 'completed';
    else if (completedSteps > 0) status = 'in_progress';

    return {
      code,
      title: part.title,
      subtitle: part.source_pdf,
      examWeight: `Part ${part.part_number}`,
      topics: [
        `${part.flashcards.length} Flashcards`,
        `${part.quiz.length} Japanese Quiz Questions`,
      ],
      partNumber: part.part_number,
      partAvailable: true,
      notesRead,
      cardsDone,
      cardsTotal: cardIds.length,
      quizDone,
      quizTotal: quizIds.length,
      percent,
      status,
    };
  });

  return [...coreNodes, ...extraNodes];
}
