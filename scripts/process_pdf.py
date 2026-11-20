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
    question: str = Field(description="Multiple-choice question testing comprehension.")
    options: List[str] = Field(
        description="Exactly 4 distinct answer choices.",
        min_length=4,
        max_length=4,
    )
    correct_index: int = Field(
        description="Zero-based index (0 to 3) of the correct answer in options.",
        ge=0,
        le=3,
    )
    explanation: str = Field(
        description="Clear explanation of why the correct answer is right and others are wrong."
    )


class StudyPartOutput(BaseModel):
    title: str = Field(
        description="Descriptive, concise chapter or topic title for this PDF part."
    )
    notes_markdown: str = Field(
        description=(
            "Comprehensive, well-structured Markdown study notes with headings, bullet points, "
            "key definitions, formulas, and embedded extracted images using exact Markdown image "
            "syntax ![Diagram](/images/part-{N}/filename.ext) where relevant."
        )
    )
    flashcards: List[FlashcardItem] = Field(
        description="10 to 15 high-yield flashcards covering the core concepts.",
        min_length=10,
        max_length=15,
    )
    quiz: List[QuizItem] = Field(
        description="5 to 10 multiple-choice quiz questions with explanations.",
        min_length=5,
        max_length=10,
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
2. Write comprehensive, well-organized `notes_markdown` using Markdown headings (##, ###), bullet points, bold key terms, tables where useful, and code/formula blocks if relevant. Embed the extracted images using standard Markdown image syntax `![Descriptive Diagram Caption](/images/part-{part_number}/filename.ext)` at the exact sections where those page diagrams belong. Do NOT invent image paths that are not listed above.
3. Generate 10 to 15 high-yield `flashcards` (concise question + thorough answer).
4. Generate 5 to 10 challenging multiple-choice `quiz` questions, each with 4 options, `correct_index` (0-3), and a clear `explanation`.

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
        return response.parsed
    if response.text:
        return StudyPartOutput.model_validate_json(response.text)
    raise RuntimeError(f"Gemini returned an empty response for {pdf_filename}")


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
