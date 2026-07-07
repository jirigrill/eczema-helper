# Eliminační dieta - Tabulky

PDF extraction and organization script for the elimination diet schedule.

## Quick Start (No Installation Required)

**Run from:** `eczema-helper` root directory

```bash
cd "docs/full elimination diet schedule - atopicky ekzem Pekarkova" && \
python3 -m venv /tmp/v$$ && source /tmp/v$$/bin/activate && \
pip install -q pdfplumber pillow && python3 extract_organize_diet_tables.py && \
deactivate && cd - && rm -rf /tmp/v$$
```

Or longer but safer (from project root):
```bash
cd /Users/jiri.grill/Developer/eczema-helper && \
python3 -m venv /tmp/diet_venv && \
source /tmp/diet_venv/bin/activate && \
pip install -q pdfplumber pillow && \
python3 "docs/full elimination diet schedule - atopicky ekzem Pekarkova/extract_organize_diet_tables.py" && \
deactivate && rm -rf /tmp/diet_venv
```

## What It Does

1. **Extracts** all PDF pages as individual PNG images
2. **Identifies** each food category (Czech: potravina)
3. **Merges** related pages (berries/tomatoes, dairy products)
4. **Organizes** into `extracted_tables/` with sequential naming
5. **Cleans up** intermediate files automatically

## Output Structure

```
extracted_tables/
├── 01-lepek.png                              # wheat
├── 02-lusteniny.png                          # legumes
├── 03-ryby.png                               # fish
├── 04-exotick_ovoce.png                      # exotic fruit
├── 05-citrusy.png                            # citrus
├── 06-jahody_maliny_rajcata_paprika.png      # strawberry|raspberry|tomato/pepper (merged 7+8)
├── 07-korenova_zelenina.png                  # root vegetables
├── 08-vejce.png                              # eggs
└── 09-mlecne_vrobky.png                      # dairy products (merged 11+12)
```

## Dependencies (Installed Temporarily)

- pdfplumber — PDF extraction
- pillow — image manipulation

Installed via pip into temporary venv, never touches system Python.

## Notes

- No permanent installation. Venv auto-deleted after run
- Script runs from its own directory
- Output only: `extracted_tables/` stays, temp files cleaned automatically
