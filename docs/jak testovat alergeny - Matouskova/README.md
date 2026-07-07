# Jak testovat alergeny (Matoušková) — Tabulky

Allergen-testing schedule from `jak testovat alergeny - matouskova.pdf`, split into
per-allergen CSVs with separate mother/child dosage columns.

Unlike the Pekárková PDF (a scanned book requiring OCR + image extraction), this
PDF is native text/tables and small (9 pages), so it was transcribed by hand into
`matouskova_csv_data.py` — no `pdfplumber`/OCR step needed.

## Regenerate CSVs

```bash
cd "docs/jak testovat alergeny - matouskova" && python3 generate_csvs.py
```

## Output

```
extracted_tables/csv/
├── 01-lusteniny.csv
├── 02-korenova_zelenina.csv
├── ...
└── 20-arasidy.csv
```

Each CSV has columns `day,ja,dcera` ("ja" = matka/mother, "dcera" = dítě/child).
An empty cell means the PDF table had no entry for that person/day (e.g. lepek and
oves are tested in the child only; arašídy and semínka/mák in the mother only).

Allergen #21 (karob) has no dosage table in the source — it was tested by the
mother only, following the kakao schedule — so it has no CSV, just a note in
`matouskova_csv_data.py`.

General notes that apply across allergens (not tied to a single table) are in
`matouskova_csv_data.GENERAL_NOTES`.
