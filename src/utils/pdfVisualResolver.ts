import type {
  QuestionImageCategory,
  QuizImageField,
  QuizQuestionImage,
  StudyPart,
} from '../types/study';

export interface MappedPdfFigure {
  src: string;
  alt: string;
  plainAlt: string;
  headingContext: string;
  surroundingContext: string;
  partNumber: number;
  keywords: string[];
}

export interface ResolvedQuestionVisual {
  src: string;
  alt: string;
  category: QuestionImageCategory;
  source: 'explicit' | 'mapped_pdf';
  matchedPartNumber: number;
  meta: QuizQuestionImage;
}

/**
 * Normalizes a standardized QuizImageField (either a path string or a structured
 * QuizQuestionImage object) into a clean QuizQuestionImage object.
 */
export function normalizeQuizImageField(
  field: QuizImageField | undefined,
  fallbackAlt?: string,
): QuizQuestionImage | null {
  if (!field) return null;
  if (typeof field === 'string') {
    const trimmed = field.trim();
    if (!trimmed) return null;
    return {
      path: resolveMappedAssetUrl(trimmed),
      alt: fallbackAlt,
    };
  }
  const trimmedPath = (field.path || '').trim();
  if (!trimmedPath) return null;
  return {
    ...field,
    path: resolveMappedAssetUrl(trimmedPath),
    alt: field.alt ?? fallbackAlt,
  };
}

/**
 * Infers a spoiler-free visual category for distinct MCQ image framing.
 */
export function inferImageCategory(
  captionOrContext: string,
): QuestionImageCategory {
  const plain = stripFuriganaMarkup(captionOrContext);
  if (/ケアマーク|天地無用|横積み|水濡れ|割れ物|手かぎ|踏みつけ|直射日光|重心|パレットパターン/.test(plain)) {
    return 'sign';
  }
  if (/GHS|どくろ|腐食性|爆弾|炎|感嘆符|環境|健康有害性|高圧ガス|ラベル|バーコード|JAN/.test(plain)) {
    return 'label';
  }
  if (/立入禁止|トラテープ|安全柵|指差|制限速度|後進|持ち上げ|姿勢|安全ベスト|ヘルメット|危険|安全/.test(plain)) {
    return 'hazard';
  }
  if (/フォークリフト|コンベア|パレット|コンテナ|パワーゲート|クランプ|ハンディ|AMR|カッター|包装機|フレコン|段ボール|ドラム|ラック|トラック/.test(plain)) {
    return 'equipment';
  }
  if (/温度|階級|貼り|積み|構造|パターン|図/.test(plain)) {
    return 'diagram';
  }
  return 'reference';
}

const STOP_TERMS = new Set([
  '倉庫',
  '作業',
  '荷物',
  '貨物',
  '商品',
  '管理',
  '確認',
  '方法',
  '基本',
  '注意',
  '場合',
  '必要',
  '正しい',
  '誤り',
  'どれ',
  '何',
  '組合わせ',
  '説明',
  '意味',
  '原則',
  'ルール',
  '区分',
  '種類',
  '対応',
  '使用',
  '実施',
  '手順',
  '項目',
  '特徴',
  '内容',
  '安全',
  '危険',
  '防止',
  '確保',
  '装置',
  '設備',
  '機器',
  '現場',
  'part',
  'fig',
  'jpg',
  'png',
  'pdf',
  'images',
  'figures',
]);

/**
 * Strips {漢字|かんじ} furigana markup down to plain readable text for matching.
 */
export function stripFuriganaMarkup(text: string): string {
  if (!text) return '';
  return text
    .replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1')
    .replace(/[*_`~#[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dynamically resolves any mapped PDF asset path against Vite's BASE_URL
 * so Cloudflare Workers/Pages root deploys and nested SPA routes always load cleanly.
 */
export function resolveMappedAssetUrl(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  if (/^(?:https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  const env = (import.meta as {env?: {BASE_URL?: string}}).env;
  const base = (env?.BASE_URL || '/').replace(/\/+$/, '');
  const cleanRel = trimmed.replace(/^\.?\//, '');
  return `${base}/${cleanRel}`;
}

/**
 * Extracts meaningful Japanese (kanji/katakana) and English/numeric terms for figure matching.
 */
function extractMatchTerms(rawText: string): string[] {
  const plain = stripFuriganaMarkup(rawText);
  if (!plain) return [];

  const matches =
    plain.match(
      /[一-龯々ヶ]{2,}|[ァ-ヴー]{3,}|[A-Za-z][A-Za-z0-9-]{2,}|\d+(?:℃|km\/h|ft|型|種|トン|t|kg)/g,
    ) ?? [];

  const unique = new Set<string>();
  for (const token of matches) {
    const normalized = token.trim();
    if (normalized.length < 2) continue;
    if (STOP_TERMS.has(normalized) || STOP_TERMS.has(normalized.toLowerCase())) {
      continue;
    }
    unique.add(normalized);
  }
  return Array.from(unique);
}

/**
 * Dynamically parses every mapped PDF figure (![alt](/images/figures/...))
 * from all StudyParts' notes_markdown along with its heading and surrounding context.
 */
export function buildPdfFigureIndex(allParts: StudyPart[]): MappedPdfFigure[] {
  const figures: MappedPdfFigure[] = [];
  const imgRegex = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

  for (const part of allParts) {
    const lines = (part.notes_markdown || '').split('\n');
    let currentH2 = '';
    let currentH3 = '';
    let currentH4 = '';

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith('## ')) {
        currentH2 = stripFuriganaMarkup(line);
        currentH3 = '';
        currentH4 = '';
      } else if (line.startsWith('### ')) {
        currentH3 = stripFuriganaMarkup(line);
        currentH4 = '';
      } else if (line.startsWith('#### ')) {
        currentH4 = stripFuriganaMarkup(line);
      }

      imgRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(line)) !== null) {
        const alt = match[1].trim();
        const rawSrc = match[2].trim();
        // Only index mapped PDF visual assets (never raw full-page dumps)
        if (!rawSrc.includes('/images/figures/')) continue;

        const plainAlt = stripFuriganaMarkup(alt);
        const headingContext = [currentH2, currentH3, currentH4]
          .filter(Boolean)
          .join(' ');
        const surroundingLines = lines
          .slice(Math.max(0, i - 1), Math.min(lines.length, i + 2))
          .join(' ')
          .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ');
        const surroundingContext = stripFuriganaMarkup(surroundingLines);

        const keywords = extractMatchTerms(
          `${plainAlt} ${plainAlt} ${headingContext}`,
        );

        figures.push({
          src: resolveMappedAssetUrl(rawSrc),
          alt,
          plainAlt,
          headingContext,
          surroundingContext,
          partNumber: part.part_number,
          keywords,
        });
      }
    }
  }

  return figures;
}

export interface QuestionVisualLookupInput {
  partNumber: number;
  question: string;
  noteTopic?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  explicitImage?: QuizImageField;
  explicitImageAlt?: string;
}

/**
 * Dynamically resolves the best mapped PDF asset for any text or visual question.
 * - Accepts standardized QuizImageField (string path or structured QuizQuestionImage).
 * - If no explicit image is present, searches mapped PDF visuals from the textbook
 *   to pair a genuinely matching illustration alongside the text question.
 */
export function resolveQuestionVisual(
  input: QuestionVisualLookupInput,
  figureIndex: MappedPdfFigure[],
): ResolvedQuestionVisual | null {
  const normalizedExplicit = normalizeQuizImageField(
    input.explicitImage,
    input.explicitImageAlt,
  );

  if (normalizedExplicit) {
    const resolvedSrc = normalizedExplicit.path;
    const rawExplicitPath =
      typeof input.explicitImage === 'string'
        ? input.explicitImage
        : input.explicitImage?.path || '';
    const matchingIndexed = figureIndex.find(
      (fig) =>
        fig.src === resolvedSrc ||
        (rawExplicitPath && fig.src.endsWith(rawExplicitPath)),
    );
    const resolvedAlt =
      normalizedExplicit.alt ||
      matchingIndexed?.alt ||
      'Mapped textbook diagram';
    const resolvedCategory =
      normalizedExplicit.category ??
      inferImageCategory(
        `${resolvedAlt} ${matchingIndexed?.headingContext ?? ''}`,
      );
    const matchedPartNumber =
      normalizedExplicit.partNumber ??
      matchingIndexed?.partNumber ??
      input.partNumber;
    const source = normalizedExplicit.source ?? 'explicit';

    const meta: QuizQuestionImage = {
      path: resolvedSrc,
      alt: resolvedAlt,
      category: resolvedCategory,
      source,
      partNumber: matchedPartNumber,
    };

    return {
      src: resolvedSrc,
      alt: resolvedAlt,
      category: resolvedCategory,
      source,
      matchedPartNumber,
      meta,
    };
  }

  if (figureIndex.length === 0) return null;

  const plainQuestion = stripFuriganaMarkup(input.question);
  const plainTopic = stripFuriganaMarkup(input.noteTopic || '');
  const correctOpt =
    input.options &&
    typeof input.correctIndex === 'number' &&
    input.options[input.correctIndex]
      ? stripFuriganaMarkup(input.options[input.correctIndex])
      : '';
  const plainExplanation = stripFuriganaMarkup(input.explanation || '');

  const primaryHaystack = `${plainQuestion} ${plainTopic}`;
  const secondaryHaystack = `${correctOpt} ${plainExplanation}`;

  // Prefer figures mapped in the same textbook part first
  const samePartFigures = figureIndex.filter(
    (f) => f.partNumber === input.partNumber,
  );
  const candidates =
    samePartFigures.length > 0 ? samePartFigures : figureIndex;

  let bestFigure: MappedPdfFigure | null = null;
  let bestScore = 0;

  for (const fig of candidates) {
    let score = 0;
    let captionHits = 0;

    // 1. Direct full caption phrase match in question/topic (highest confidence)
    const cleanCaptionCore = fig.plainAlt
      .replace(/^\d+\.\s*/, '')
      .replace(/（[^）]*）/g, '')
      .trim();
    if (
      cleanCaptionCore.length >= 3 &&
      !STOP_TERMS.has(cleanCaptionCore) &&
      primaryHaystack.includes(cleanCaptionCore)
    ) {
      score += 12;
      captionHits += 2;
    } else if (
      cleanCaptionCore.length >= 3 &&
      !STOP_TERMS.has(cleanCaptionCore) &&
      secondaryHaystack.includes(cleanCaptionCore)
    ) {
      score += 7;
      captionHits += 1;
    }

    // 2. Caption token overlap with question & topic
    const captionTerms = extractMatchTerms(fig.plainAlt);
    for (const term of captionTerms) {
      const weight = term.length >= 4 ? 5 : 3.5;
      if (primaryHaystack.includes(term)) {
        score += weight;
        captionHits += 1;
      } else if (secondaryHaystack.includes(term)) {
        score += weight * 0.55;
        captionHits += 0.5;
      }
    }

    // 3. Heading context alignment (boosts precision when caption also matches)
    const headingTerms = extractMatchTerms(fig.headingContext);
    for (const term of headingTerms) {
      if (primaryHaystack.includes(term)) {
        score += 2;
      }
    }

    // 4. Surrounding textbook sentence alignment (mild tie-breaker)
    const surroundingTerms = extractMatchTerms(fig.surroundingContext).slice(
      0,
      8,
    );
    for (const term of surroundingTerms) {
      if (primaryHaystack.includes(term)) {
        score += 0.75;
      }
    }

    // Require a direct caption term match so unrelated figures under the same chapter heading are never attached
    const hasMeaningfulAnchor = captionHits >= 1 && score >= 5.5;

    if (hasMeaningfulAnchor && score > bestScore) {
      bestScore = score;
      bestFigure = fig;
    }
  }

  if (!bestFigure) return null;

  const resolvedAlt =
    bestFigure.alt || bestFigure.plainAlt || 'Textbook illustration';
  const resolvedCategory = inferImageCategory(
    `${bestFigure.plainAlt} ${bestFigure.headingContext}`,
  );
  const meta: QuizQuestionImage = {
    path: bestFigure.src,
    alt: resolvedAlt,
    category: resolvedCategory,
    source: 'mapped_pdf',
    partNumber: bestFigure.partNumber,
  };

  return {
    src: bestFigure.src,
    alt: resolvedAlt,
    category: resolvedCategory,
    source: 'mapped_pdf',
    matchedPartNumber: bestFigure.partNumber,
    meta,
  };
}
