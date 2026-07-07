#!/usr/bin/env python3
"""
Extract images from scanned PDF, rename by food category, merge related pages,
and generate structured CSVs (one per food category) from OCR-verified data.

Outputs to extracted_tables/ directory:
  01-lepek.png           …   09-mlecne_vrobky.png       (9 PNGs)
  csv/01-lepek.csv       …   csv/09-mlecne_vyrobky.csv  (9 CSVs)

CSV schema: type, allergen, day, instructions
  type       - "plne kojene dite (bez prikrmu)" |
               "kojene dite + prikrmy"          |
               "dite plne na prikrmech"
  allergen   - "Lepek", "Luštěniny", "Ryby", …
  day        - "1. den", "2. den", …
  instructions - "maminka: …" and/or "dítě: …" (joined with "; ")
"""

import csv
import shutil
import sys
from pathlib import Path

try:
    import pdfplumber
    from PIL import Image
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "pillow"])
    import pdfplumber
    from PIL import Image


def extract_pdf_to_images(pdf_path: str, output_dir: str = "_temp_extracted", script_dir: Path = None) -> list[Path]:
    """Extract all page images from PDF."""
    if script_dir is None:
        script_dir = Path(__file__).parent

    pdf_path = Path(pdf_path)
    if not pdf_path.is_absolute():
        pdf_path = script_dir / pdf_path

    output_dir = script_dir / output_dir
    output_dir.mkdir(exist_ok=True)

    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    print(f"Extracting images from {pdf_path.name}...")

    extracted_images = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            if not page.images:
                continue

            for img_idx, img in enumerate(page.images, 1):
                img_obj = page.crop((img['x0'], img['top'], img['x1'], img['bottom'])).to_image()
                filename = output_dir / f"page{page_num:02d}_image{img_idx:02d}.png"
                img_obj.save(filename)
                extracted_images.append(filename)

    print(f"✓ Extracted {len(extracted_images)} images\n")
    return sorted(extracted_images)


def organize_and_merge(extracted_dir: str = "_temp_extracted", output_dir: str = "extracted_tables", script_dir: Path = None):
    """Extract images by food category and merge specified pages."""
    if script_dir is None:
        script_dir = Path(__file__).parent

    extracted_dir = script_dir / extracted_dir
    output_dir = script_dir / output_dir
    output_dir.mkdir(exist_ok=True)

    print("Organizing images by food category...\n")

    # Pages to names mapping (sequential, skipping missing page 5)
    # Original PDF pages → food categories
    pages_to_names = {
        1: "01-lepek",
        2: "02-lusteniny",
        3: "03-ryby",
        4: "04-exotick_ovoce",
        6: "05-citrusy",  # Page 5 missing, so page 6 becomes 05
        9: "07-korenova_zelenina",
        10: "08-vejce",
    }

    # Copy individual files
    for page_num, category_name in pages_to_names.items():
        src = extracted_dir / f"page{page_num:02d}_image01.png"
        if src.exists():
            dst = output_dir / f"{category_name}.png"
            shutil.copy(src, dst)
            print(f"  ✓ {category_name}.png")

    # Merge pages 7+8 (Jahody | Maliny | Rajčata/Papriky)
    print("\n  Merging pages 7+8 (strawberry/raspberry/tomato/pepper)...")
    images_78 = []
    for p in [7, 8]:
        img_path = extracted_dir / f"page{p:02d}_image01.png"
        if img_path.exists():
            images_78.append(Image.open(img_path))

    if images_78:
        total_h = sum(img.height for img in images_78)
        max_w = max(img.width for img in images_78)
        merged_78 = Image.new('RGB', (max_w, total_h), color='white')
        y = 0
        for img in images_78:
            merged_78.paste(img, (0, y))
            y += img.height
        merged_78.save(output_dir / "06-jahody_maliny_rajcata_paprika.png")
        print(f"  ✓ 06-jahody_maliny_rajcata_paprika.png")

    # Merge pages 11+12 (Mléčné výrobky - Dairy products)
    print("\n  Merging pages 11+12 (dairy products)...")
    images_1112 = []
    for p in [11, 12]:
        img_path = extracted_dir / f"page{p:02d}_image01.png"
        if img_path.exists():
            images_1112.append(Image.open(img_path))

    if images_1112:
        total_h = sum(img.height for img in images_1112)
        max_w = max(img.width for img in images_1112)
        merged_1112 = Image.new('RGB', (max_w, total_h), color='white')
        y = 0
        for img in images_1112:
            merged_1112.paste(img, (0, y))
            y += img.height
        merged_1112.save(output_dir / "09-mlecne_vrobky.png")
        print(f"  ✓ 09-mlecne_vrobky.png")

    print(f"\n✓ Organized {len(list(output_dir.glob('*.png')))} food categories\n")

    return output_dir


def print_summary(output_dir: Path):
    """Print final summary."""
    print("=" * 60)
    print("FINAL STRUCTURE")
    print("=" * 60 + "\n")

    files = sorted(output_dir.glob("*.png"))
    for f in files:
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"  {f.name:45} {size_mb:6.1f}MB")

    print(f"\nTotal: {len(files)} food categories in {output_dir}/\n")


def cleanup_extracted(extracted_dir: str = "_temp_extracted", keep: bool = False, script_dir: Path = None):
    """Clean up extracted_tables directory."""
    if script_dir is None:
        script_dir = Path(__file__).parent

    if not keep:
        extracted_path = script_dir / extracted_dir
        if extracted_path.exists():
            shutil.rmtree(extracted_path)
            print(f"✓ Cleaned up {extracted_dir}/\n")


def generate_csvs(output_dir: str = "extracted_tables", script_dir: Path = None):
    """Write one CSV per allergen from OCR-verified data.

    CSV schema: type, allergen, day, instructions

    Row order per file: bez příkrmů rows (by day), then kojené + příkrmy rows,
    then plně na příkrmech rows. Same shape as the source PDF tables.
    """
    from diet_csv_data import CSV_DATA

    if script_dir is None:
        script_dir = Path(__file__).parent

    csv_dir = script_dir / output_dir / "csv"
    csv_dir.mkdir(parents=True, exist_ok=True)

    print("Generating CSVs...\n")
    for stem, spec in CSV_DATA.items():
        allergen = spec["allergen"]
        rows = spec["rows"]
        out_path = csv_dir / f"{stem}.csv"
        with out_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
            writer.writerow(["type", "allergen", "day", "instructions"])
            for row_type, day, instructions in rows:
                writer.writerow([row_type, allergen, day, instructions])
        print(f"  ✓ csv/{stem}.csv ({len(rows)} rows)")

    print(f"\n✓ Wrote {len(CSV_DATA)} CSVs to {csv_dir}/\n")
    return csv_dir


def main():
    """Main pipeline: extract → organize → generate CSVs → summarize."""
    script_dir = Path(__file__).parent
    pdf_file = script_dir / "full-elimination-diet-schedule.pdf"

    if not pdf_file.exists():
        print(f"Error: PDF not found at {pdf_file}")
        sys.exit(1)

    # Extract images from PDF
    extracted_images = extract_pdf_to_images("full-elimination-diet-schedule.pdf", script_dir=script_dir)

    # Organize and merge
    output_dir = organize_and_merge(script_dir=script_dir)

    # Generate CSVs from curated data
    generate_csvs(script_dir=script_dir)

    # Summary
    print_summary(output_dir)

    # Clean up intermediate files
    cleanup_extracted(keep=False, script_dir=script_dir)

    print("✓ Done.\n")


if __name__ == "__main__":
    main()
