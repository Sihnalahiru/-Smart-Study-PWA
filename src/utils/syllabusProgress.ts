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
    title: 'Warehouse Types, Facilities & Vehicles',
    subtitle: '第1編(前) · 13 Temp Zones, Racks, Conveyors & Containers',
    examWeight: 'p.1–34',
    topics: [
      'Exam Formats, Commercial vs Private, 13 Temperature Zones',
      'Building Floors/Walls/Fire/Nester & Automated Warehouses',
      'Material Handling Licenses, Tools, Sea/Rail Containers & Tail-Lifts',
    ],
    partNumber: 1,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
  {
    code: 'B',
    title: 'Warehouse Operations, Quality & Disasters',
    subtitle: '第1編(後) · Contracts, Fees, Odors, Stocktaking & Pallets',
    examWeight: 'p.35–53',
    topics: [
      'Warehousing Clauses, 2/3-Period Fees, Good Faith & Secrecy',
      'Quality Checks, Odor Cargo, Stocktaking & 9-Step Sampling',
      'H₂/O₂ Charging Safety, Quake/Fire/Outage & T11/12/14/9 Pallets',
    ],
    partNumber: 2,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    code: 'C',
    title: 'Work Gear, Docs, Units & 35 Counters',
    subtitle: '第2編(前) · PPE, JAN/QR/RFID, Conversions & 助数詞 35種',
    examWeight: 'p.54–63',
    topics: [
      'PPE Gear, 4 Inbound/Outbound Docs, JAN 12-digit, QR & RFID',
      'Length/Area/Volume/Weight, Measurement Ton & Equipment Ton',
      '150lx Lighting, Era Calendar & All 35 Warehouse Counters',
    ],
    partNumber: 3,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    code: 'D',
    title: 'Inbound/Outbound, 17 Tasks & Care Marks',
    subtitle: '第2編(後) · Remarks, Locations, Packing & 11 Care Marks',
    examWeight: 'p.64–89',
    topics: [
      '8-Point Inbound Inspection, 10 Remarks, Locations & Stock Cards',
      '3 Picking Modes, Overhang Ban & 4 Pallet Patterns',
      '17 Distribution Processing Tasks, Tape Strengths & 11 Care Marks',
    ],
    partNumber: 4,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  },
  {
    code: 'E',
    title: 'Safety, Health, KYT, 5S & 9 GHS Labels',
    subtitle: '第3編 · Labor Law, 2024 Accidents, Roll Cage & KYT',
    examWeight: 'p.90–113',
    topics: [
      'Work Hours, 2024 Top-5 Accidents (909 Cases) & Heatstroke Care',
      'Manual Lifting (40%/24%), Roll Cages (<300kg) & 1.8m/80cm Aisles',
      'KYT 4-Round, Pointing-Calling (0.38%), 5S & 9 GHS Pictograms',
    ],
    partNumber: 5,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    code: 'F',
    title: 'Forklift Work Standards & Containers',
    subtitle: '第4編 · Pre-Checks, 8-Step Handling, 5 Stops & Cargo Rules',
    examWeight: 'p.114–122',
    topics: [
      '4-Liquid & 5-Mechanical Pre-Checks, Head Guard Exception',
      '15–20cm Clearance, 8-Step Handling, 30-Layer Limit & 5 Stops',
      'Slope Straight Travel, FIBC Rules, Clamp Limits & Conveyors',
    ],
    partNumber: 6,
    flashcardIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    quizIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
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

  const extraParts = allParts.filter((p) => p.part_number > 6);
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
