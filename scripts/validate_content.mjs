#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TOPICS = [
  'receiving_dispatching',
  'storage_inventory',
  'picking_processing',
  'warehouse_equipment',
  'safety_health',
];

const errors = [];
const warnings = [];

function check(cond, msg) {
  if (!cond) errors.push(msg);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function stripFurigana(str) {
  return String(str || '').replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1');
}

function normalize(str) {
  return stripFurigana(str)
    .replace(/[\s、。・「」『』（）()【】？?！!：:・,.\-〜～／/]/g, '')
    .toLowerCase();
}

function bigrams(str) {
  const n = normalize(str);
  const set = new Set();
  if (n.length < 2) {
    set.add(n);
    return set;
  }
  for (let i = 0; i < n.length - 1; i++) {
    set.add(n.slice(i, i + 2));
  }
  return set;
}

function jaccard(setA, setB) {
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function checkImageOnDisk(imgPath, context) {
  if (!imgPath) return;
  const src = typeof imgPath === 'string' ? imgPath : imgPath.path;
  check(
    !src.includes('/images/pages/'),
    `Forbidden full-page PDF image reference in ${context}: ${src}`,
  );
  const disk = path.join(ROOT, 'public', src.replace(/^\/+/, ''));
  check(fs.existsSync(disk), `Missing image asset on disk for ${context}: ${src}`);
}

// 1. Audit 123-page coverage manifest
const coverage = readJson('src/data/source-coverage-manifest.json');
check(
  coverage.total_pdf_pages === 123 && coverage.pages.length === 123,
  `Expected 123 pages in source-coverage-manifest.json, got ${coverage.pages?.length}`,
);
const pageNums = new Set(coverage.pages.map((p) => p.pdf_page));
for (let pg = 1; pg <= 123; pg++) {
  check(pageNums.has(pg), `Missing PDF page ${pg} in source-coverage-manifest.json`);
}

// 2. Audit 113 visual assets in /public/images/figures/
const figureDir = path.join(ROOT, 'public', 'images', 'figures');
const diskFigures = fs
  .readdirSync(figureDir)
  .filter((f) => /\.(jpg|jpeg|png|webp|svg)$/i.test(f))
  .sort();
const visualManifest = readJson('src/data/visual-asset-manifest.json');
check(
  visualManifest.assets.length === diskFigures.length,
  `Visual manifest count (${visualManifest.assets.length}) != disk count (${diskFigures.length})`,
);
const manifestPaths = new Set(visualManifest.assets.map((a) => a.asset_path));
for (const f of diskFigures) {
  check(
    manifestPaths.has(`/images/figures/${f}`),
    `Disk figure missing from visual-asset-manifest.json: /images/figures/${f}`,
  );
}
const pendingVisuals = visualManifest.assets.filter(
  (a) => a.mapping_status === 'pending_review',
);
check(
  pendingVisuals.length === 0,
  `Found ${pendingVisuals.length} pending_review visuals`,
);

// 3. Load Study Parts 1..6, verify notes tables, images, flashcards, legacy Academic MCQs
const allParts = [];
const allFlashcards = [];
const legacyAcademic = [];
let totalNoteImages = 0;

for (let p = 1; p <= 6; p++) {
  const part = readJson(`src/data/part-${p}.json`);
  allParts.push(part);

  // Check zero full-page references in notes
  check(
    !part.notes_markdown.includes('/images/pages/'),
    `part-${p}.json notes_markdown contains forbidden /images/pages/ reference`,
  );

  // Check all note images exist on disk
  const noteImgs = part.notes_markdown.match(/\/images\/figures\/[^\s)"']+/g) || [];
  totalNoteImages += new Set(noteImgs).size;
  for (const img of new Set(noteImgs)) {
    checkImageOnDisk(img, `part-${p}.json notes`);
  }

  // Check no dangling table separators (separator line not preceded by pipe row)
  const lines = part.notes_markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*:?-{3,}/.test(lines[i].trim())) {
      const prev = (lines[i - 1] || '').trim();
      check(
        prev.startsWith('|'),
        `Dangling Markdown table separator in part-${p}.json line ${i + 1}`,
      );
    }
  }

  // Flashcards
  part.flashcards.forEach((fc, idx) => {
    const id = fc.id ?? `part-${p}-fc-${idx}`;
    check(Boolean(fc.question?.trim()), `Empty flashcard question: ${id}`);
    check(Boolean(fc.answer?.trim()), `Empty flashcard answer: ${id}`);
    if (fc.image) checkImageOnDisk(fc.image, `flashcard ${id}`);
    allFlashcards.push({id, part: p, ...fc});
  });

  // Legacy Academic MCQs
  part.quiz.forEach((q, idx) => {
    const id = q.id ?? `part-${p}-q-${idx}`;
    legacyAcademic.push({
      ...q,
      id,
      partNumber: p,
      section: 'academic',
    });
  });
}

// Check flashcards uniqueness
const fcIds = new Set();
const fcExact = new Map();
for (const fc of allFlashcards) {
  check(!fcIds.has(fc.id), `Duplicate flashcard ID: ${fc.id}`);
  fcIds.add(fc.id);
  const key = normalize(fc.question);
  if (fcExact.has(key)) {
    errors.push(`Exact duplicate flashcard question: ${fc.id} === ${fcExact.get(key)}`);
  }
  fcExact.set(key, fc.id);
}

// 4. Load Academic Expansion (388) + Practical (320) => 800 total MCQs
const acadExp = readJson('src/data/cbt-academic-expansion.json');
const practical = readJson('src/data/cbt-practical-questions.json');
const allAcademic = [...legacyAcademic, ...acadExp];
const allMcqs = [...allAcademic, ...practical];

check(
  allAcademic.length === 480,
  `Expected 480 Academic MCQs, got ${allAcademic.length}`,
);
check(
  practical.length === 320,
  `Expected 320 Practical MCQs, got ${practical.length}`,
);
check(allMcqs.length === 800, `Expected 800 total MCQs, got ${allMcqs.length}`);

// Validate every MCQ schema, options, correct_index, images, IDs
const mcqIds = new Set();
const mcqExact = new Map();
const acadTopicCounts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
const pracTopicCounts = Object.fromEntries(TOPICS.map((t) => [t, 0]));

for (const q of allMcqs) {
  check(Boolean(q.id), `MCQ missing ID: ${q.question?.slice(0, 40)}`);
  check(!mcqIds.has(q.id), `Duplicate MCQ ID: ${q.id}`);
  mcqIds.add(q.id);

  check(
    Array.isArray(q.options) && q.options.length === 4,
    `MCQ ${q.id} does not have exactly 4 options`,
  );
  const optNorms = new Set((q.options || []).map(normalize));
  check(optNorms.size === 4, `MCQ ${q.id} has duplicate or empty options`);
  check(
    Number.isInteger(q.correct_index) &&
      q.correct_index >= 0 &&
      q.correct_index <= 3,
    `MCQ ${q.id} has invalid correct_index: ${q.correct_index}`,
  );
  check(Boolean(q.explanation?.trim()), `MCQ ${q.id} missing explanation`);
  check(TOPICS.includes(q.topic), `MCQ ${q.id} has invalid topic: ${q.topic}`);

  if (q.image) checkImageOnDisk(q.image, `MCQ ${q.id}`);

  if (q.section === 'academic') {
    acadTopicCounts[q.topic] += 1;
  } else {
    pracTopicCounts[q.topic] += 1;
  }

  const key = normalize(q.question);
  if (mcqExact.has(key)) {
    errors.push(`Exact duplicate MCQ question: ${q.id} === ${mcqExact.get(key)}`);
  }
  mcqExact.set(key, q.id);
}

// Check Academic topic exact 96 each
for (const t of TOPICS) {
  check(
    acadTopicCounts[t] === 96,
    `Academic topic ${t} count is ${acadTopicCounts[t]}, expected 96`,
  );
}

// Near-duplicate check across all 800 MCQs (bigram Jaccard >= 0.78)
const bgList = allMcqs.map((q) => ({id: q.id, sec: q.section, bg: bigrams(q.question)}));
const nearDupes = [];
for (let i = 0; i < bgList.length; i++) {
  for (let j = i + 1; j < bgList.length; j++) {
    const sim = jaccard(bgList[i].bg, bgList[j].bg);
    if (sim >= 0.78) {
      nearDupes.push({a: bgList[i].id, b: bgList[j].id, sim: Number(sim.toFixed(3))});
    }
  }
}
if (nearDupes.length > 0) {
  for (const d of nearDupes) {
    warnings.push(`High similarity (${d.sim}) between ${d.a} and ${d.b}`);
  }
}

// 5. Simulate 16 Independent Paper Sets (exact match to src/utils/cbtExam.ts)
const byTopicAcad = Object.fromEntries(TOPICS.map((t) => [t, []]));
for (const q of allAcademic) byTopicAcad[q.topic].push(q);

const paperAcad = {};
for (let ps = 1; ps <= 16; ps++) paperAcad[ps] = [];
for (const t of TOPICS) {
  byTopicAcad[t].forEach((q, idx) => {
    paperAcad[(idx % 16) + 1].push(q);
  });
}

const usedAcrossPapers = new Set();
const paperReport = [];
for (let ps = 1; ps <= 16; ps++) {
  const ac = paperAcad[ps];
  const pr = practical.filter((q) => q.paperSet === ps);
  check(ac.length === 30, `Paper ${ps} Academic count = ${ac.length}, expected 30`);
  check(pr.length === 20, `Paper ${ps} Practical count = ${pr.length}, expected 20`);

  const all50 = [...ac, ...pr];
  for (const q of all50) {
    check(!usedAcrossPapers.has(q.id), `Question ${q.id} reused across multiple papers!`);
    usedAcrossPapers.add(q.id);
  }

  const acTopics = new Set(ac.map((q) => q.topic));
  const prTopics = new Set(pr.map((q) => q.topic));
  check(acTopics.size === 5, `Paper ${ps} Academic missing topics`);
  check(prTopics.size === 5, `Paper ${ps} Practical missing topics`);

  const prImg = pr.filter((q) => Boolean(q.image)).length;
  const prCalc = pr.filter((q) => Boolean(q.isCalculation)).length;
  check(prImg >= 8, `Paper ${ps} Practical has only ${prImg} visual questions`);
  check(prCalc >= 4, `Paper ${ps} Practical has only ${prCalc} calculation questions`);

  paperReport.push({
    paper: ps,
    academic: ac.length,
    practical: pr.length,
    prVisual: prImg,
    prCalc,
  });
}
check(
  usedAcrossPapers.size === 800,
  `Expected 800 distinct questions across 16 papers, got ${usedAcrossPapers.size}`,
);

// 6. Check zero audio or QR code regressions in src/
function walkTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}
for (const file of walkTsFiles(path.join(ROOT, 'src'))) {
  const txt = fs.readFileSync(file, 'utf8');
  check(
    !/<audio\b|new Audio\(|speechSynthesis|AudioContext/.test(txt),
    `Forbidden audio API detected in ${path.relative(ROOT, file)}`,
  );
  check(
    !/qrcode|QRCode/i.test(txt),
    `Forbidden QR code reference detected in ${path.relative(ROOT, file)}`,
  );
}

// Summary Output
console.log('=== SSW LOGISTICS WAREHOUSING CONTENT VALIDATION REPORT ===');
console.log(`PDF Pages Audited:         ${coverage.pages.length} / 123 (Examinable: ${coverage.audit_summary.examinable_pages})`);
console.log(`Visual Assets on Disk:     ${diskFigures.length} (Mapped: ${visualManifest.status_summary.mapped}, Superseded: ${visualManifest.status_summary.superseded_by_composite}, Cover: ${visualManifest.status_summary.non_examinable_cover}, Pending: ${pendingVisuals.length})`);
console.log(`Flashcards Verified:       ${allFlashcards.length} (Visual: ${allFlashcards.filter((f) => f.image).length})`);
console.log(`Academic MCQs Verified:    ${allAcademic.length} (Topics: ${JSON.stringify(acadTopicCounts)})`);
console.log(`Practical MCQs Verified:   ${practical.length} (Topics: ${JSON.stringify(pracTopicCounts)})`);
console.log(`Total Validated MCQs:      ${allMcqs.length} across 16 Independent Paper Sets (0 overlap)`);
console.log(`Near-Duplicate Warnings:   ${warnings.length}`);
if (warnings.length > 0) {
  warnings.slice(0, 15).forEach((w) => console.log(`  [WARN] ${w}`));
}
console.log(`Critical Errors:           ${errors.length}`);
if (errors.length > 0) {
  errors.slice(0, 20).forEach((e) => console.error(`  [ERR]  ${e}`));
  process.exit(1);
}
console.log('ALL VALIDATION CHECKS PASSED!');
