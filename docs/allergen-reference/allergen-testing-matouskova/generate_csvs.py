# -*- coding: utf-8 -*-
"""Write matouskova_csv_data.py into per-allergen CSVs under extracted_tables/csv/.

Columns: day,ja,dcera ("ja" = matka, "dcera" = dítě). No PDF extraction step is
needed here (unlike the Pekarkova scan) — this PDF is native text and was
transcribed by hand into matouskova_csv_data.py.
"""

import csv
import os

from matouskova_csv_data import CSV_DATA

OUT_DIR = os.path.join(os.path.dirname(__file__), "extracted_tables", "csv")


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, entry in CSV_DATA.items():
        path = os.path.join(OUT_DIR, f"{filename}.csv")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["day", "ja", "dcera"])
            writer.writerows(entry["rows"])
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
