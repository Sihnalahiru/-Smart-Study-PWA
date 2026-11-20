#!/usr/bin/env python3
"""
Incremental PDF processor for Smart Study PWA.

Reads src/data/manifest.json to identify already-processed PDFs, scans pdfs/*.pdf
for new files, extracts text and embedded images via PyMuPDF (fitz), generates
structured study notes, flashcards, and quiz questions via Gemini 2.5 Flash,
and persists part-{N}.json + updated manifest.json without overwriting prior parts.
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import fitz  # PyMuPDF
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parent.parent
PDFS_DIR = ROOT_DIR / "pdfs"
DATA_DIR = ROOT_DIR / "src" / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"
IMAGES_DIR = ROOT_DIR / "public" / "images"


class FlashcardItem(BaseModel):
    question: str = Field(description="Concise, clear study prompt or question.")
    answer: str = Field(description="Accurate, direct answer explaining the concept.")


class QuizItem(BaseModel):
    note_topic: str = Field(
        description="The specific study note heading or topic covered by this question (in Japanese with {漢字|ふりがな})."
    )
    question: str = Field(description="Multiple-choice question testing comprehension in Japanese with {漢字|ふりがな}.")
    options: List[str] = Field(
        description="Exactly 4 distinct answer choices in Japanese with {漢字|ふりがな}.",
        min_length=4,
        max_length=4,
    )
    correct_index: int = Field(
        description="Zero-based index (0 to 3) of the correct answer in options.",
        ge=0,
        le=3,
    )
    explanation: str = Field(
        description="Clear explanation in Japanese with {漢字|ふりがな} of why the correct answer is right and others are wrong."
    )


class StudyPartOutput(BaseModel):
    title: str = Field(
        description="Descriptive, concise chapter or topic title for this PDF part."
    )
    notes_markdown: str = Field(
        description=(
            "Comprehensive, well-structured Markdown study notes in Japanese with {漢字|ふりがな} and Sinhala explanations, "
            "using headings, bullet points, key definitions, formulas, and embedded extracted images using exact Markdown image "
            "syntax ![Diagram](/images/part-{N}/filename.ext) where relevant."
        )
    )
    flashcards: List[FlashcardItem] = Field(
        description="10 to 15 high-yield flashcards covering the core concepts.",
        min_length=10,
        max_length=15,
    )
    quiz: List[QuizItem] = Field(
        description="Comprehensive multiple-choice quiz questions covering EVERY study note section and topic in notes_markdown.",
        min_length=8,
        max_length=30,
    )


class SupplementQuizOutput(BaseModel):
    quiz: List[QuizItem] = Field(
        description="Additional multiple-choice quiz questions specifically covering the missing study note topics.",
        min_length=1,
        max_length=15,
    )


def load_manifest() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not MANIFEST_PATH.exists():
        return {"parts": []}
    with MANIFEST_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or "parts" not in data or not isinstance(data["parts"], list):
        return {"parts": []}
    return data


def save_manifest(manifest: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with MANIFEST_PATH.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def extract_pdf_content(pdf_path: Path, part_number: int) -> tuple[str, list[str]]:
    """Extract page-by-page text and embedded images for a single PDF."""
    part_images_dir = IMAGES_DIR / f"part-{part_number}"
    part_images_dir.mkdir(parents=True, exist_ok=True)

    extracted_image_paths: list[str] = []
    pages_payload: list[str] = []

    with fitz.open(pdf_path) as doc:
        for page_index, page in enumerate(doc, start=1):
            page_text = page.get_text("text").strip()
            page_image_refs: list[str] = []
            seen_xrefs: set[int] = set()

            for img_index, img_info in enumerate(page.get_images(full=True), start=1):
                xref = img_info[0]
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)

                try:
                    base_image = doc.extract_image(xref)
                except Exception as exc:
                    print(
                        f"Warning: could not extract image xref={xref} on page {page_index}: {exc}",
                        file=sys.stderr,
                    )
                    continue

                if not base_image or not base_image.get("image"):
                    continue

                ext = str(base_image.get("ext", "png")).lower()
                if ext == "jpeg":
                    ext = "jpg"

                filename = f"page{page_index}_img{img_index}.{ext}"
                output_file = part_images_dir / filename
                output_file.write_bytes(base_image["image"])

                web_path = f"/images/part-{part_number}/{filename}"
                extracted_image_paths.append(web_path)
                page_image_refs.append(web_path)

            image_note = (
                "Available images on this page:\n" + "\n".join(f"- {p}" for p in page_image_refs)
                if page_image_refs
                else "Available images on this page: None"
            )
            pages_payload.append(
                f"=== PAGE {page_index} ===\n{image_note}\n\nText:\n{page_text or '[No selectable text on this page]'}"
            )

    return "\n\n".join(pages_payload), extracted_image_paths


def generate_study_material(
    client: genai.Client,
    pdf_filename: str,
    part_number: int,
    extracted_text: str,
    image_paths: list[str],
) -> StudyPartOutput:
    """Call Gemini 2.5 Flash with Pydantic structured output."""
    image_manifest = (
        "\n".join(f"- ![Diagram]({path})" for path in image_paths)
        if image_paths
        else "None extracted."
    )

    prompt = f"""You are an expert academic tutor and curriculum designer creating study material for "Smart Study PWA".

Source PDF filename: {pdf_filename}
Assigned Part Number: Part {part_number}

Available Extracted Images (use ONLY these exact paths if embedding images in notes_markdown):
{image_manifest}

Instructions:
1. Create a clear, specific `title` summarizing the main topic of this document.
2. Write comprehensive, well-organized `notes_markdown` in Japanese with inline furigana using `{{漢字|ふりがな}}` syntax plus clear Sinhala explanations, using Markdown headings (##, ###), bullet points, bold key terms, tables where useful, and code/formula blocks if relevant. Embed the extracted images using standard Markdown image syntax `![Descriptive Diagram Caption](/images/part-{part_number}/filename.ext)` at the exact sections where those page diagrams belong. Do NOT invent image paths that are not listed above.
3. Generate 10 to 15 high-yield `flashcards` (question in Japanese with `{{漢字|ふりがな}}`, answer in Japanese with `{{漢字|ふりがな}}` + Sinhala translation).
4. Generate 8 to 20 multiple-choice `quiz` questions entirely in Japanese with `{{漢字|ふりがな}}` so that EVERY SINGLE study note heading and key concept in `notes_markdown` is covered by at least one quiz question. Include `note_topic`, 4 options, `correct_index` (0-3), and a clear `explanation`.

Extracted PDF Content (page by page):
{extracted_text}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StudyPartOutput,
            temperature=0.2,
        ),
    )

    if response.parsed is not None:
        study_output = response.parsed
    elif response.text:
        study_output = StudyPartOutput.model_validate_json(response.text)
    else:
        raise RuntimeError(f"Gemini returned an empty response for {pdf_filename}")

    sections = extract_note_sections(study_output.notes_markdown)
    uncovered = find_uncovered_sections(sections, study_output.quiz)
    if uncovered:
        print(
            f"Found {len(uncovered)} uncovered study note sections for {pdf_filename}; generating supplemental quiz questions..."
        )
        extra_questions = supplement_quiz_coverage(
            client=client,
            pdf_filename=pdf_filename,
            notes_markdown=study_output.notes_markdown,
            uncovered_sections=uncovered,
        )
        study_output.quiz.extend(extra_questions)

    return study_output


_FURIGANA_RE = re.compile(r"\{([^|{}]+)\|[^|{}]+\}")


def strip_furigana(text: str) -> str:
    return _FURIGANA_RE.sub(r"\1", text)


def _normalize_text(text: str) -> str:
    plain = strip_furigana(text).lower()
    plain = re.sub(r"[*_`>#|\[\]()（）:：・、。,.!！?？/／\-—–]+", " ", plain)
    return re.sub(r"\s+", " ", plain).strip()


def extract_note_sections(notes_markdown: str) -> list[str]:
    """Extract all headings and bold study note bullet topics for coverage auditing."""
    sections: list[str] = []
    seen: set[str] = set()

    for raw_line in notes_markdown.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        heading_match = re.match(r"^#{2,3}\s+(.+)$", line)
        if heading_match:
            label = heading_match.group(1).strip()
            norm = _normalize_text(label)
            if norm and norm not in seen:
                seen.add(norm)
                sections.append(label)
            continue

        bullet_match = re.match(r"^-\s+\*\*(.+?)\*\*", line)
        if bullet_match:
            label = bullet_match.group(1).rstrip(":： ").strip()
            plain = strip_furigana(label)
            if not plain or "සිංහල" in plain or "sinhala" in plain.lower():
                continue
            norm = _normalize_text(plain)
            if norm and norm not in seen:
                seen.add(norm)
                sections.append(label)

    return sections


def _tokenize_section(text: str) -> list[str]:
    plain = strip_furigana(text)
    tokens: list[str] = []
    tokens.extend(re.findall(r"[a-zA-Z0-9]{2,}", plain.lower()))
    for jp in re.findall(r"[\u4e00-\u9faf]{2,}|[\u30a1-\u30f6\u30fc]{2,}", plain):
        tokens.append(jp)
        if len(jp) >= 4 and re.search(r"[\u4e00-\u9faf]", jp):
            tokens.append(jp[:2])
            tokens.append(jp[-2:])
    return list(dict.fromkeys(tokens))


def find_uncovered_sections(sections: list[str], quiz_items: list[QuizItem]) -> list[str]:
    """Return study note sections not yet represented in the quiz questions."""
    quiz_corpus = [
        strip_furigana(f"{item.note_topic} {item.question} {item.explanation}").lower()
        for item in quiz_items
    ]
    uncovered: list[str] = []

    for section in sections:
        tokens = _tokenize_section(section)
        if not tokens:
            continue
        covered = any(
            any(tok in q_text for tok in tokens)
            for q_text in quiz_corpus
        )
        if not covered:
            uncovered.append(section)

    return uncovered


def supplement_quiz_coverage(
    client: genai.Client,
    pdf_filename: str,
    notes_markdown: str,
    uncovered_sections: list[str],
) -> list[QuizItem]:
    """Generate targeted follow-up quiz questions for any uncovered study note sections."""
    bullet_list = "\n".join(f"- {s}" for s in uncovered_sections[:15])
    prompt = f"""You are completing exam coverage for "{pdf_filename}" in Smart Study PWA.

The following study note sections/topics do not yet have a dedicated multiple-choice question:
{bullet_list}

Reference study notes:
{notes_markdown}

Instructions:
Generate at least one Japanese multiple-choice question with inline furigana `{{漢字|ふりがな}}` for EACH uncovered topic above. Every item must set `note_topic`, provide 4 distinct options in Japanese with furigana, `correct_index` (0-3), and a clear explanation in Japanese with furigana.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SupplementQuizOutput,
            temperature=0.2,
        ),
    )

    if response.parsed is not None:
        return response.parsed.quiz
    if response.text:
        return SupplementQuizOutput.model_validate_json(response.text).quiz
    return []


def main() -> int:
    PDFS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest()
    processed_sources = {
        entry.get("source_pdf")
        for entry in manifest["parts"]
        if isinstance(entry, dict) and entry.get("source_pdf")
    }
    processed_names = {
        Path(src).name for src in processed_sources if isinstance(src, str)
    }

    pdf_files = sorted(PDFS_DIR.glob("*.pdf"), key=lambda p: p.name.lower())
    new_pdfs = [
        pdf
        for pdf in pdf_files
        if f"pdfs/{pdf.name}" not in processed_sources and pdf.name not in processed_names
    ]

    if not new_pdfs:
        print("No new PDFs found in pdfs/. Everything is up to date.")
        return 0

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
        return 1

    client = genai.Client(api_key=api_key)

    next_part_number = (
        max(
            (
                int(p.get("part_number", 0))
                for p in manifest["parts"]
                if isinstance(p, dict)
            ),
            default=0,
        )
        + 1
    )

    for pdf_path in new_pdfs:
        source_pdf = f"pdfs/{pdf_path.name}"
        part_num = next_part_number
        print(f"Processing {source_pdf} as Part {part_num}...")

        extracted_text, image_paths = extract_pdf_content(pdf_path, part_num)
        study_output = generate_study_material(
            client=client,
            pdf_filename=pdf_path.name,
            part_number=part_num,
            extracted_text=extracted_text,
            image_paths=image_paths,
        )

        timestamp = datetime.now(timezone.utc).isoformat()
        part_payload = {
            "part_number": part_num,
            "source_pdf": source_pdf,
            "title": study_output.title,
            "notes_markdown": study_output.notes_markdown,
            "flashcards": [fc.model_dump() for fc in study_output.flashcards],
            "quiz": [q.model_dump() for q in study_output.quiz],
            "images": image_paths,
            "processed_at": timestamp,
        }

        part_file = DATA_DIR / f"part-{part_num}.json"
        with part_file.open("w", encoding="utf-8") as f:
            json.dump(part_payload, f, indent=2, ensure_ascii=False)
            f.write("\n")

        manifest["parts"].append(
            {
                "part_number": part_num,
                "source_pdf": source_pdf,
                "title": study_output.title,
                "file": f"part-{part_num}.json",
                "flashcard_count": len(study_output.flashcards),
                "quiz_count": len(study_output.quiz),
                "image_count": len(image_paths),
                "processed_at": timestamp,
            }
        )
        save_manifest(manifest)
        print(
            f"Saved {part_file.relative_to(ROOT_DIR)} "
            f"({len(study_output.flashcards)} flashcards, {len(study_output.quiz)} quiz questions, "
            f"{len(image_paths)} images)."
        )
        next_part_number += 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
