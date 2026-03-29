# Phase 7: Pediatrician Export (PDF + Google Doc)

## Summary

This phase adds two export methods for sharing tracking data with the pediatrician: (1) client-side PDF report generation with embedded photos, charts, and analysis summaries, and (2) Google Doc export that creates a formatted report on Google Drive with inline photos, structured text, and charts — shareable with the pediatrician via a link. The PDF is generated entirely client-side using pdfmake. The Google Doc export decrypts selected photos locally in the browser, uploads them to Google Drive, then assembles a formatted document via the Docs API with the photos embedded inline. All text is in Czech.

## Prerequisites

- **Phase 2**: Food log data model and CRUD operations for food entries and elimination tracking.
- **Phase 3**: Photo capture, client-side encryption/decryption, and photo storage.
- **Phase 4**: AI analysis results (Claude Vision API integration) with stored analysis summaries.
- **Phase 5**: Trend and severity data, chart rendering (uPlot).
- Dexie.js local database with synced food logs, photos, and analysis results.
- Web Crypto API available for decrypting photo blobs in the browser.

## Features

1. **Export configuration page**: Date range picker, optional photo selection, preview of report contents.
2. **Data aggregation service**: Collects and organizes all data needed for the report from local (Dexie) and server sources within the selected date range.
3. **PDF generation service**: Assembles the report using pdfmake, embedding images, charts, and structured text entirely client-side.
4. **Chart-to-image rendering**: Converts rendered severity trend charts to PNG data URLs for embedding in the PDF.
5. **Download, share, and print options**: Trigger browser download, use the Web Share API where available, and offer a print-friendly view.
6. **Meal log section in PDF**: Include a daily meal log table showing what the mother ate (meal type, food items) alongside the elimination timeline, providing the pediatrician with full dietary context.
7. **Google OAuth2 connection**: User connects their Google account from the export page. OAuth2 flow handled server-side; refresh token stored encrypted in PostgreSQL, never exposed to the client. Scopes: Google Drive (file upload) + Google Docs (document creation).
8. **Google Doc export**: Creates or updates a Google Doc with the same report structure as the PDF — header, summary, food elimination timeline, meal log, photo progression with inline images, severity chart, AI analysis summaries, and footer. Selected photos are decrypted locally, uploaded to a Google Drive folder, then inserted inline into the document.
9. **Google Doc photo upload flow**: Photos are decrypted in the browser → uploaded to Google Drive via resumable upload API (server-side, using the stored OAuth token) → referenced by Drive file ID in the Docs API insert image request. The user selects which photos to include (same picker as PDF).
10. **Google Doc sharing**: User can share the exported document with their pediatrician directly from Google Drive, giving the doctor a formatted, readable report with photos they can review and annotate.

## Acceptance Criteria

1. The export page is accessible from the main navigation and displays a date range picker defaulting to the last 30 days.
2. After selecting a date range, the user sees a summary of available data (number of food log entries, photos, analyses) before generating.
3. The user can optionally select which photos to include in the report from a thumbnail grid showing decrypted previews.
4. Clicking "Generovat PDF" (Generate PDF) produces a well-formatted PDF document within a reasonable time (under 10 seconds for a typical 30-day range with 10 photos).
5. The PDF contains all required sections in order: header, summary, food elimination timeline, meal log, skin photo progression, stool photo progression, severity trend chart, AI analysis summaries, notes section, footer.
6. All text in the PDF is in Czech, including dates formatted as "d. M. yyyy" (e.g., "15. 3. 2026").
7. Photos in the PDF are decrypted locally and embedded as base64 images; no network requests are made to fetch or transmit decrypted photo data during PDF generation.
8. The severity trend chart is rendered as a raster image (PNG) embedded in the PDF.
9. The generated PDF can be downloaded to the device with a filename following the pattern `ekzem-report-{childName}-{dateFrom}-{dateTo}.pdf`.
10. On devices supporting the Web Share API, a share button allows sending the PDF via native share sheet.
11. A print button opens the browser print dialog with the PDF content.
12. If no data exists for the selected date range, the export page displays an informational message: "Pro zvolene obdobi nejsou k dispozici zadna data." (No data available for the selected period.)
13. The export page shows a "Pripojit Google ucet" (Connect Google Account) button when no Google account is connected.
14. Clicking "Pripojit Google ucet" initiates an OAuth2 flow — user is redirected to Google, grants Drive + Docs access, and is redirected back. The connection status updates to show the connected Google email.
15. After connecting, an "Exportovat do Google Doc" button appears alongside the PDF export button.
16. Clicking "Exportovat do Google Doc" creates a new Google Doc (or updates the existing one) with the same report structure as the PDF: header, summary, elimination timeline, meal log, photo progression with inline images, severity chart, AI analyses, footer.
17. Selected photos are decrypted locally in the browser, uploaded to a Google Drive folder, and inserted inline into the document. The user controls which photos are included (same photo picker as PDF).
18. OAuth refresh tokens are stored encrypted in PostgreSQL; the client never receives or stores the refresh token.
19. User can disconnect their Google account via a "Odpojit Google ucet" button, which revokes the token and removes it from the database.
20. Export to Google Doc works only when online (requires Drive + Docs API calls); an appropriate message is shown when offline.
21. The Google Doc is created in a dedicated "Eczema Tracker" folder on the user's Google Drive. The folder and document can be shared with the pediatrician via standard Google Drive sharing.
22. Privacy notice is shown before first Google export: "Vybrane fotky budou nahrane na Google Drive. Pokracovat?" (Selected photos will be uploaded to Google Drive. Continue?)

### Navigation

Access the export feature via:

1. **Trends page:** Add an "Exportovat" (Export) button on the trends dashboard, since users reviewing trends are the most likely to want to share with their pediatrician.
2. **Settings page:** Alternative access point in the settings menu.
3. **Bottom nav:** The Export page is accessible at `/export` but does NOT have its own tab (5 tabs is the iOS maximum).

### Large Export Warning

When the selected date range contains more than 20 photos, show a warning before generation:

> "Export obsahuje {count} fotek ({estimatedSize} MB). Generování může trvat déle." (Export contains {count} photos ({estimatedSize} MB). Generation may take longer.)

Offer a "Pouze náhledy" (Thumbnails only) option for smaller PDFs.

## Implementation Details

### Files Created / Modified

| File                                          | Action | Purpose                                                                                                                                 |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/domain/services/export.ts`           | Create | ExportService: data aggregation and PDF document definition assembly                                                                    |
| `src/lib/domain/services/pdf-builder.ts`      | Create | PDFBuilder: pdfmake document definition construction with layout helpers                                                                |
| `src/lib/utils/chart-to-image.ts`             | Create | Utility to render a chart to a canvas and export as PNG data URL                                                                        |
| `src/lib/utils/date-format.ts`                | Modify | Add Czech date formatting helpers for PDF (if not already present)                                                                      |
| `src/routes/(app)/export/+page.svelte`        | Create | Export configuration page with date range picker, photo selector, preview, and generate button                                          |
| `src/routes/(app)/export/+page.ts`            | Create | Client-side load function (no server load needed; all data comes from Dexie)                                                            |
| `src/lib/domain/ports/google-export.ts`       | Create | GoogleDocExport port interface                                                                                                          |
| `src/lib/adapters/google-docs.ts`             | Create | Google Docs adapter: OAuth token management, Drive folder/file creation, Docs document assembly with inline images                      |
| `src/routes/api/google/connect/+server.ts`    | Create | Initiates OAuth2 flow — generates Google auth URL with Drive + Docs scopes                                                              |
| `src/routes/api/google/callback/+server.ts`   | Create | OAuth2 callback — exchanges auth code for tokens, stores refresh token encrypted in DB                                                  |
| `src/routes/api/google/export/+server.ts`     | Create | Triggers Google Doc export — receives aggregated data + decrypted photo blobs from client, uploads photos to Drive, creates/updates Doc |
| `src/routes/api/google/disconnect/+server.ts` | Create | Revokes Google token and removes connection from DB                                                                                     |
| Database migration                            | Create | `google_doc_connections` table for storing OAuth tokens and document references                                                         |

### Step-by-Step Instructions

#### Step 1: Install pdfmake

Add pdfmake as a dependency:

```bash
bun add pdfmake
```

pdfmake runs entirely in the browser and supports embedded images, tables, and custom fonts. It produces a PDF blob that can be downloaded or shared directly.

#### Step 2: Create Czech Date Formatting Utility

Ensure `src/lib/utils/date-format.ts` has the following:

```typescript
const CZECH_MONTHS = [
  "ledna",
  "unora",
  "brezna",
  "dubna",
  "kvetna",
  "cervna",
  "cervence",
  "srpna",
  "zari",
  "rijna",
  "listopadu",
  "prosince",
];

export function formatDateCzech(date: Date): string {
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

export function formatDateCzechLong(date: Date): string {
  return `${date.getDate()}. ${CZECH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateRange(from: Date, to: Date): string {
  return `${formatDateCzech(from)} - ${formatDateCzech(to)}`;
}
```

#### Step 3: Create the Chart-to-Image Utility

Create `src/lib/utils/chart-to-image.ts`:

```typescript
/**
 * Renders a uPlot chart to a PNG data URL for embedding in the PDF.
 * Creates an offscreen container, renders the chart, and exports the canvas.
 */
export async function chartToDataUrl(
  opts: uPlot.Options,
  data: uPlot.AlignedData,
  width: number = 600,
  height: number = 300,
): Promise<string> {
  // Dynamic import to avoid SSR issues
  const uPlot = (await import("uplot")).default;

  // Create an offscreen container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  const chart = new uPlot({ ...opts, width, height }, data, container);

  // uPlot renders to a canvas element inside the container
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("uPlot canvas not found");
  const dataUrl = canvas.toDataURL("image/png");

  chart.destroy();
  document.body.removeChild(container);

  return dataUrl;
}
```

#### Step 4: Create the Export Service

Create `src/lib/domain/services/export.ts`:

```typescript
import type { DexieDB } from '$lib/adapters/dexie';
import { formatDateCzech, formatDateRange, formatDateCzechLong } from '$lib/utils/date-format';
import { chartToDataUrl } from '$lib/utils/chart-to-image';

export interface ExportOptions {
    childId: string;
    dateFrom: Date;
    dateTo: Date;
    selectedPhotoIds?: string[];
    includeAiSummaries: boolean;
    parentNotes?: string;
}

export interface ExportData {
    childName: string;
    childBirthDate: Date;
    dateRange: { from: Date; to: Date };
    foodLogs: Array<{
        date: Date;
        foods: string[];
        eliminatedFoods: string[];
        reintroducedFoods: string[];
        notes?: string;
    }>;
    meals: Array<{
        date: Date;
        mealType: string;       // 'Snídaně', 'Oběd', 'Večeře', 'Svačina'
        label?: string;
        items: string[];        // Display names of meal items
    }>;
    photos: Array<{
        id: string;
        date: Date;
        bodyArea: string;
        severityRating: number;
        imageDataUrl: string;  // decrypted, base64 PNG/JPEG
    }>;
    severityData: Array<{
        date: Date;
        severity: number;
        bodyArea: string;
    }>;
    aiAnalyses: Array<{
        date: Date;
        summary: string;
        trendIndicator: 'improving' | 'stable' | 'worsening';
    }>;
    eliminationSummary: {
        totalEliminations: number;
        currentlyEliminated: string[];
        successfulReintroductions: string[];
        failedReintroductions: string[];
    };
}

export class ExportService {
    constructor(private db: DexieDB, private cryptoAdapter: /* your crypto adapter */) {}

    async aggregateData(options: ExportOptions): Promise<ExportData> {
        const child = await this.db.children.get(options.childId);
        if (!child) throw new Error('Dite nenalezeno');

        const foodLogs = await this.db.foodLogs
            .where('childId').equals(options.childId)
            .and(log => {
                const logDate = new Date(log.date);
                return logDate >= options.dateFrom && logDate <= options.dateTo;
            })
            .toArray();

        const allPhotos = await this.db.trackingPhotos
            .where('childId').equals(options.childId)
            .and(photo => {
                const photoDate = new Date(photo.date);
                return photoDate >= options.dateFrom && photoDate <= options.dateTo;
            })
            .toArray();

        // Filter to selected photos if specified
        const photosToInclude = options.selectedPhotoIds
            ? allPhotos.filter(p => options.selectedPhotoIds!.includes(p.id))
            : allPhotos;

        // Decrypt photo blobs to data URLs
        const decryptedPhotos = await Promise.all(
            photosToInclude.map(async (photo) => {
                const decryptedBlob = await this.cryptoAdapter.decrypt(photo.encryptedBlob, photo.iv);
                const dataUrl = await this.blobToDataUrl(decryptedBlob);
                return {
                    id: photo.id,
                    date: new Date(photo.date),
                    bodyArea: photo.bodyArea,
                    severityRating: photo.severityRating,
                    imageDataUrl: dataUrl
                };
            })
        );

        // Severity is stored on trackingPhotos records as severityManual
        const severityData = decryptedPhotos
            .filter(p => p.severityRating != null)
            .map(p => ({
                date: p.date,
                severity: p.severityRating,
                bodyArea: p.bodyArea
            }));

        const aiAnalyses = options.includeAiSummaries
            ? await this.db.analysisResults
                .where('childId').equals(options.childId)
                .and(a => {
                    const d = new Date(a.date);
                    return d >= options.dateFrom && d <= options.dateTo;
                })
                .toArray()
            : [];

        // Build elimination summary from food logs
        const eliminationSummary = this.buildEliminationSummary(foodLogs);

        return {
            childName: child.name,
            childBirthDate: new Date(child.birthDate),
            dateRange: { from: options.dateFrom, to: options.dateTo },
            foodLogs: foodLogs.map(log => ({
                date: new Date(log.date),
                foods: log.foods || [],
                eliminatedFoods: log.eliminatedFoods || [],
                reintroducedFoods: log.reintroducedFoods || [],
                notes: log.notes
            })),
            photos: decryptedPhotos.sort((a, b) => a.date.getTime() - b.date.getTime()),
            severityData: severityData.map(r => ({
                date: new Date(r.date),
                severity: r.severity,
                bodyArea: r.bodyArea
            })),
            aiAnalyses: aiAnalyses.map(a => ({
                date: new Date(a.date),
                summary: a.summary,
                trendIndicator: a.trendIndicator
            })),
            eliminationSummary
        };
    }

    private buildEliminationSummary(foodLogs: any[]): ExportData['eliminationSummary'] {
        // Implementation: iterate through food logs chronologically,
        // track which foods were eliminated and reintroduced,
        // determine success/failure based on severity changes after reintroduction
        // Returns aggregate elimination data
        // ...simplified for documentation
        return {
            totalEliminations: 0,
            currentlyEliminated: [],
            successfulReintroductions: [],
            failedReintroductions: []
        };
    }

    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
```

#### Step 5: Create the PDF Builder

Create `src/lib/domain/services/pdf-builder.ts`:

```typescript
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import type { ExportData } from "./export";
import {
  formatDateCzech,
  formatDateRange,
  formatDateCzechLong,
} from "$lib/utils/date-format";

const TREND_LABELS: Record<string, string> = {
  improving: "Zlepseni",
  stable: "Stabilni",
  worsening: "Zhorseni",
};

const BODY_AREA_LABELS: Record<string, string> = {
  face: "Oblicej",
  arms: "Paze",
  legs: "Nohy",
  torso: "Trup",
  hands: "Ruce",
  feet: "Chodidla",
  neck: "Krk",
  scalp: "Pokozka hlavy",
};

export class PDFBuilder {
  buildDocument(
    data: ExportData,
    chartImageDataUrl: string | null,
  ): TDocumentDefinitions {
    return {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: "Roboto",
        fontSize: 10,
        lineHeight: 1.4,
      },
      content: [
        this.buildHeader(data),
        this.buildSummary(data),
        this.buildFoodTimeline(data),
        this.buildMealLog(data),
        this.buildPhotoProgression(data),
        this.buildSeverityChart(chartImageDataUrl),
        this.buildAiAnalyses(data),
        this.buildNotesSection(data),
        this.buildFooter(),
      ].filter(Boolean) as Content[],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
        sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
        small: { fontSize: 8, color: "#666666" },
        tableHeader: { bold: true, fontSize: 10, fillColor: "#f0f0f0" },
      },
    };
  }

  private buildHeader(data: ExportData): Content {
    return [
      { text: "Zprava o prubehu ekzemu", style: "header" },
      {
        columns: [
          {
            width: "*",
            text: [
              { text: "Dite: ", bold: true },
              `${data.childName}\n`,
              { text: "Datum narozeni: ", bold: true },
              `${formatDateCzech(data.childBirthDate)}\n`,
            ],
          },
          {
            width: "auto",
            text: [
              { text: "Obdobi: ", bold: true },
              formatDateRange(data.dateRange.from, data.dateRange.to),
            ],
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 1,
            lineColor: "#cccccc",
          },
        ],
      },
    ];
  }

  private buildSummary(data: ExportData): Content {
    const summary = data.eliminationSummary;
    return [
      { text: "Souhrn", style: "subheader" },
      {
        ul: [
          `Pocet eliminaci: ${summary.totalEliminations}`,
          `Aktualne eliminovane potraviny: ${summary.currentlyEliminated.length > 0 ? summary.currentlyEliminated.join(", ") : "zadne"}`,
          `Uspesne znovuzavedene potraviny: ${summary.successfulReintroductions.length > 0 ? summary.successfulReintroductions.join(", ") : "zadne"}`,
          `Neuspesne znovuzavedeni: ${summary.failedReintroductions.length > 0 ? summary.failedReintroductions.join(", ") : "zadne"}`,
          `Pocet zaznamu jidla: ${data.foodLogs.length}`,
          `Pocet fotek: ${data.photos.length}`,
          `Pocet AI analyz: ${data.aiAnalyses.length}`,
        ],
      },
    ];
  }

  private buildFoodTimeline(data: ExportData): Content {
    if (data.foodLogs.length === 0) {
      return [
        { text: "Casova osa eliminacni diety", style: "subheader" },
        {
          text: "V tomto obdobi nebyly zaznamenany zadne zmeny v jidelnicku.",
          italics: true,
        },
      ];
    }

    const timelineRows: any[][] = [
      [
        { text: "Datum", style: "tableHeader" },
        { text: "Potraviny", style: "tableHeader" },
        { text: "Eliminovane", style: "tableHeader" },
        { text: "Znovuzavedene", style: "tableHeader" },
        { text: "Poznamky", style: "tableHeader" },
      ],
    ];

    for (const log of data.foodLogs) {
      timelineRows.push([
        formatDateCzech(log.date),
        log.foods.join(", ") || "-",
        log.eliminatedFoods.join(", ") || "-",
        log.reintroducedFoods.join(", ") || "-",
        log.notes || "-",
      ]);
    }

    return [
      { text: "Casova osa eliminacni diety", style: "subheader" },
      {
        table: {
          headerRows: 1,
          widths: [60, "*", "*", "*", "*"],
          body: timelineRows,
        },
        layout: "lightHorizontalLines",
      },
    ];
  }

  private buildMealLog(data: ExportData): Content {
    if (data.meals.length === 0) {
      return [
        { text: "Zaznam jidel", style: "subheader" },
        {
          text: "V tomto obdobi nebyla zaznamenana zadna jidla.",
          italics: true,
        },
      ];
    }

    // Group meals by date
    const mealsByDate = new Map<string, typeof data.meals>();
    for (const meal of data.meals) {
      const key = formatDateCzech(meal.date);
      if (!mealsByDate.has(key)) mealsByDate.set(key, []);
      mealsByDate.get(key)!.push(meal);
    }

    const rows: any[][] = [
      [
        { text: "Datum", style: "tableHeader" },
        { text: "Jidlo", style: "tableHeader" },
        { text: "Polozky", style: "tableHeader" },
      ],
    ];

    for (const [date, meals] of mealsByDate) {
      for (const meal of meals) {
        const label = meal.label
          ? `${meal.mealType} (${meal.label})`
          : meal.mealType;
        rows.push([date, label, meal.items.join(", ")]);
      }
    }

    return [
      { text: "Zaznam jidel", style: "subheader" },
      {
        table: {
          headerRows: 1,
          widths: [60, 100, "*"],
          body: rows,
        },
        layout: "lightHorizontalLines",
      },
    ];
  }

  private buildPhotoProgression(data: ExportData): Content {
    if (data.photos.length === 0) {
      return [
        { text: "Fotodokumentace", style: "subheader" },
        { text: "V tomto obdobi nebyly porizeny zadne fotky.", italics: true },
      ];
    }

    const photoItems: Content[] = data.photos.map((photo) => ({
      stack: [
        {
          image: photo.imageDataUrl,
          width: 150,
          margin: [0, 5, 0, 5] as [number, number, number, number],
        },
        {
          text: [
            { text: `${formatDateCzech(photo.date)}`, bold: true },
            ` | ${BODY_AREA_LABELS[photo.bodyArea] || photo.bodyArea}`,
            ` | Zavaznost: ${photo.severityRating}/10`,
          ],
          fontSize: 9,
        },
      ],
      margin: [0, 5, 10, 10] as [number, number, number, number],
    }));

    // Arrange photos in rows of 3
    const rows: Content[] = [];
    for (let i = 0; i < photoItems.length; i += 3) {
      const rowPhotos = photoItems.slice(i, i + 3);
      rows.push({
        columns: rowPhotos.map((item) => ({ width: "33%", ...item })),
      });
    }

    return [{ text: "Fotodokumentace", style: "subheader" }, ...rows];
  }

  private buildSeverityChart(chartImageDataUrl: string | null): Content | null {
    if (!chartImageDataUrl) return null;

    return [
      { text: "Trend zavaznosti ekzemu", style: "subheader" },
      {
        image: chartImageDataUrl,
        width: 500,
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ];
  }

  private buildAiAnalyses(data: ExportData): Content {
    if (data.aiAnalyses.length === 0) {
      return [
        { text: "AI analyzy", style: "subheader" },
        {
          text: "V tomto obdobi nebyly provedeny zadne AI analyzy.",
          italics: true,
        },
      ];
    }

    const analysisItems: Content[] = data.aiAnalyses.map((analysis) => ({
      stack: [
        {
          text: [
            { text: `${formatDateCzech(analysis.date)} `, bold: true },
            {
              text: `[${TREND_LABELS[analysis.trendIndicator]}]`,
              color: this.getTrendColor(analysis.trendIndicator),
            },
          ],
        },
        {
          text: analysis.summary,
          margin: [0, 2, 0, 8] as [number, number, number, number],
        },
      ],
    }));

    return [{ text: "AI analyzy", style: "subheader" }, ...analysisItems];
  }

  private buildNotesSection(data: ExportData): Content {
    return [
      { text: "Poznamky", style: "subheader" },
      {
        text: "Prostor pro doplnujici poznamky rodice nebo lekare:",
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: "#cccccc",
          },
          {
            type: "line",
            x1: 0,
            y1: 20,
            x2: 515,
            y2: 20,
            lineWidth: 0.5,
            lineColor: "#cccccc",
          },
          {
            type: "line",
            x1: 0,
            y1: 40,
            x2: 515,
            y2: 40,
            lineWidth: 0.5,
            lineColor: "#cccccc",
          },
          {
            type: "line",
            x1: 0,
            y1: 60,
            x2: 515,
            y2: 60,
            lineWidth: 0.5,
            lineColor: "#cccccc",
          },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];
  }

  private buildFooter(): Content {
    return {
      text: "Generovano aplikaci Eczema Tracker",
      style: "small",
      alignment: "center",
      margin: [0, 20, 0, 0] as [number, number, number, number],
    };
  }

  private getTrendColor(trend: string): string {
    switch (trend) {
      case "improving":
        return "#22c55e";
      case "stable":
        return "#f59e0b";
      case "worsening":
        return "#ef4444";
      default:
        return "#666666";
    }
  }
}
```

#### Step 6: Create the Export Page

Create `src/routes/(app)/export/+page.svelte`:

The page should include:

1. **Header**: "Export pro lekare" (Export for pediatrician).

2. **Date range picker**: Two date inputs for "Od" (From) and "Do" (To), defaulting to the last 30 days.

3. **Data summary panel**: After date range selection, display a summary showing available data counts:
   - "Zaznamy jidla: X" (Food logs: X)
   - "Fotky: X" (Photos: X)
   - "AI analyzy: X" (AI analyses: X)
   - If all counts are zero, display: "Pro zvolene obdobi nejsou k dispozici zadna data."

4. **Photo selection grid**: A grid of thumbnail images (decrypted from Dexie) with checkboxes. Defaults to all selected. Each thumbnail shows the date and body area.

5. **Options**:
   - Checkbox: "Zahrnout AI analyzy" (Include AI analyses), default checked.
   - Text area: "Poznamky pro lekare" (Notes for pediatrician), optional.

6. **Generate button**: "Generovat PDF" with a loading spinner during generation.

7. **Result actions** (shown after generation):
   - "Stahnout PDF" (Download PDF) -- always available.
   - "Sdílet" (Share) -- shown only if `navigator.share` is available.
   - "Tisknout" (Print) -- opens print dialog.

The generation flow:

```typescript
import { ExportService } from "$lib/domain/services/export";
import { PDFBuilder } from "$lib/domain/services/pdf-builder";
import { chartToDataUrl } from "$lib/utils/chart-to-image";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

async function generatePDF() {
  generating = true;
  try {
    const exportService = new ExportService(db, cryptoAdapter);
    const data = await exportService.aggregateData({
      childId: activeChild.id,
      dateFrom: selectedDateFrom,
      dateTo: selectedDateTo,
      selectedPhotoIds: selectedPhotoIds,
      includeAiSummaries: includeAiSummaries,
      parentNotes: parentNotes,
    });

    // Render severity chart to image
    let chartImage: string | null = null;
    if (data.severityData.length > 0) {
      chartImage = await chartToDataUrl(
        buildSeverityChartConfig(data.severityData),
      );
    }

    const pdfBuilder = new PDFBuilder();
    const docDefinition = pdfBuilder.buildDocument(data, chartImage);

    pdfMake
      .createPdf(docDefinition)
      .download(
        `ekzem-report-${data.childName}-${formatFileDate(selectedDateFrom)}-${formatFileDate(selectedDateTo)}.pdf`,
      );
  } catch (err) {
    errorMessage = "Chyba pri generovani PDF. Zkuste to prosim znovu.";
    console.error("PDF generation error:", err);
  } finally {
    generating = false;
  }
}
```

#### Step 7: Implement Share and Print

Add share and print functions to the export page:

```typescript
async function sharePDF() {
  const exportService = new ExportService(db, cryptoAdapter);
  const data = await exportService.aggregateData(/* ...options... */);
  const pdfBuilder = new PDFBuilder();
  const docDefinition = pdfBuilder.buildDocument(data, chartImage);

  pdfMake.createPdf(docDefinition).getBlob(async (blob: Blob) => {
    const file = new File([blob], `ekzem-report.pdf`, {
      type: "application/pdf",
    });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Zprava o ekzemu" });
    }
  });
}

function printPDF() {
  pdfMake.createPdf(docDefinition).print();
}
```

#### Step 8: Install googleapis

```bash
bun add googleapis
```

The `googleapis` package provides the Google Drive API, Google Docs API, and OAuth2 utilities. It runs server-side only (SvelteKit API routes).

#### Step 9: Create the GoogleDocExport port interface

Create `src/lib/domain/ports/google-export.ts`:

```typescript
export interface GoogleDocExportData {
  childName: string;
  childBirthDate: Date;
  dateRange: { from: Date; to: Date };
  foodLogs: Array<{
    date: string;
    category: string;
    subItem: string;
    action: string;
    notes?: string;
  }>;
  meals: Array<{
    date: string;
    mealType: string;
    label?: string;
    items: string[];
  }>;
  photos: Array<{
    date: string;
    photoType: string;
    bodyArea?: string;
    severity?: number;
    stoolColor?: string;
    stoolConsistency?: string;
    hasMucus?: boolean;
    hasBlood?: boolean;
    notes?: string;
    imageBlob?: Blob; // decrypted photo, optional (user selects which to include)
  }>;
  analyses: Array<{
    date: string;
    photoType: string;
    trend: string;
    explanation: string;
  }>;
  chartImage?: Blob; // severity chart rendered as PNG
}

export interface GoogleDocExportPort {
  connect(userId: string): Promise<{ authUrl: string }>;
  handleCallback(userId: string, code: string): Promise<void>;
  export(
    userId: string,
    data: GoogleDocExportData,
  ): Promise<{ documentUrl: string }>;
  disconnect(userId: string): Promise<void>;
  isConnected(userId: string): Promise<boolean>;
}
```

#### Step 10: Implement the Google Docs adapter

Create `src/lib/adapters/google-docs.ts`:

- Constructor takes Google OAuth2 client credentials (from env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
- `connect()` generates OAuth2 auth URL with scopes:
  - `https://www.googleapis.com/auth/drive.file` (create/access files the app creates)
  - `https://www.googleapis.com/auth/documents` (create/edit Google Docs)
- `handleCallback()` exchanges auth code for tokens, encrypts the refresh token, stores in `google_doc_connections` table
- `export()`:
  1. Load refresh token from DB, create authenticated Drive + Docs clients
  2. Create an "Eczema Tracker" folder on Drive (if not exists)
  3. Upload selected photo blobs to the folder as JPEG files (named `{date}-{bodyArea}.jpg` or `{date}-stool.jpg`)
  4. Upload the severity chart PNG to the folder
  5. If `documentId` exists, clear and update the existing Doc; otherwise create a new one named `"Zprava o ekzemu - {childName} - {dateRange}"`
  6. Assemble the Doc using the Docs API batchUpdate with structured requests:
     - InsertText for headers, summary, food timeline table, meal log table, analysis summaries
     - InsertInlineImage referencing the uploaded Drive photos by file ID
     - InsertTable for food log and meal data
     - UpdateTextStyle for formatting (bold headers, font sizes)
  7. Store the `documentId` and `folderId` in the connection record
  8. Return the document URL
- `disconnect()` revokes the Google token via `https://oauth2.googleapis.com/revoke`, deletes the connection record (does NOT delete the Drive files — they belong to the user)

#### Step 11: Create server API routes for Google integration

**`GET /api/google/connect`** — returns `{ authUrl }` for the OAuth2 redirect. Requires authentication.

**`GET /api/google/callback?code=...`** — Google redirects here after user grants access. Exchanges code for tokens, stores connection, redirects user back to `/export` with success message.

**`POST /api/google/export`** — accepts multipart/form-data with: JSON metadata (dateFrom, dateTo, food logs, meals, analyses, photo metadata) + decrypted photo blobs + chart image. The client decrypts photos locally and sends them to this endpoint. The server uploads photos to Drive, creates/updates the Doc. Returns `{ documentUrl }`.

**`POST /api/google/disconnect`** — revokes token, deletes connection record. Returns 200.

**`GET /api/google/status`** — returns `{ connected: boolean, email?: string, documentUrl?: string }`.

#### Step 12: Update the export page with Google Doc UI

Add to `src/routes/(app)/export/+page.svelte`:

- A "Google Doc" section below the PDF section
- If not connected: "Pripojit Google ucet" button that calls `GET /api/google/connect` and redirects
- If connected: show connected email, "Exportovat do Google Doc" button, "Odpojit" button
- Export button uses the same date range picker and photo selector as PDF
- Privacy confirmation dialog on first export: "Vybrane fotky budou nahrane na Google Drive. Pokracovat?"
- Loading state during export with progress: "Nahravani fotek (3/7)...", "Vytvareni dokumentu..."
- On success: show link to the Google Doc

#### Step 13: Photo upload flow (client → server → Drive)

The photo upload is a multi-step process:

1. **Client side** (browser): User selects photos and date range. Selected photos are decrypted locally using the passphrase-derived key. Severity chart is rendered to PNG. All decrypted blobs + metadata are sent to `POST /api/google/export` as multipart/form-data.
2. **Server side** (SvelteKit API route): Receives decrypted photo blobs. Authenticates with Google using stored refresh token. Uploads each photo to the Drive folder. Creates/updates the Google Doc with inline image references.
3. **Cleanup**: Decrypted photo blobs exist in server memory only during the request — they are not persisted to disk or database.

This keeps the encryption key client-side only while allowing the server to act as the Google API intermediary.

#### Step 14: Database migration for google_doc_connections

```sql
CREATE TABLE google_doc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  document_id TEXT,
  folder_id TEXT,
  last_export_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_google_doc_user ON google_doc_connections(user_id);
```

### Key Code Patterns

**Client-side only PDF generation**: The `ExportService` and `PDFBuilder` run entirely in the browser. Photos are decrypted using the Web Crypto API key stored in the client, converted to base64 data URLs, and embedded directly in the pdfmake document definition. No photo data is sent to the server during export.

**Lazy loading of pdfmake**: Use dynamic `import()` for pdfmake to avoid loading its ~2MB bundle until the user actually navigates to the export page. This keeps the initial app bundle small.

**Chart-to-image pipeline**: The severity chart is rendered to an offscreen canvas using uPlot with animations disabled, then exported as a PNG data URL. This image is embedded in the PDF since pdfmake cannot render uPlot charts natively.

**Data aggregation from Dexie**: All report data comes from the local Dexie database, which mirrors server data through the sync mechanism. This ensures the report can be generated even when offline.

**Defensive empty-state handling**: Every section of the PDF builder checks whether data exists and renders an appropriate "no data" message in Czech if absent, preventing empty sections in the PDF.

**Google Doc export: split client/server responsibility**: Photos are decrypted client-side (encryption key never leaves the browser), then sent to the server as decrypted blobs. The server handles all Google API calls (Drive upload, Docs creation) using the stored OAuth refresh token. Decrypted blobs exist in server memory only during the request — never written to disk.

**OAuth2 token security**: The refresh token is encrypted at rest in PostgreSQL using AES-256-GCM. The encryption key is derived from `SESSION_SECRET` via HKDF with a unique salt per token (stored alongside the ciphertext). Implementation pattern:

```typescript
// Encrypt refresh token before storage
async function encryptRefreshToken(token: string, sessionSecret: string): Promise<{ ciphertext: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret),
    'HKDF',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('google-refresh-token') },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  );
  // Combine IV + ciphertext
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return {
    ciphertext: Buffer.from(combined).toString('base64'),
    salt: Buffer.from(salt).toString('base64')
  };
}
```

The `google_doc_connections` table stores both `refresh_token_encrypted` (ciphertext with IV) and `refresh_token_salt`. The access token is short-lived and never stored — derived from the refresh token on each export. The client never sees any Google token.

**Google Doc assembly via batchUpdate**: The Docs API uses a `batchUpdate` endpoint with an array of requests (InsertText, InsertInlineImage, InsertTable, UpdateTextStyle). The adapter builds this array programmatically to mirror the PDF report structure. Photos are referenced by Drive file ID after upload.

**Document update strategy**: On first export, a new Google Doc is created and its ID stored in `google_doc_connections.document_id`. Subsequent exports clear the document body and rebuild it, preserving sharing settings and the URL the pediatrician bookmarked. Photos from previous exports remain in the Drive folder (not deleted).

**Privacy boundary**: Unlike PDF (fully offline), Google Doc export sends decrypted photos to Google Drive. A privacy confirmation dialog is shown before the first export. The user explicitly chooses which photos to include.

## Post-Implementation State

The export page offers two export methods:

**PDF report**: Users select a date range and optionally choose which photos to include. The PDF contains a structured summary with food elimination timeline, meal log, photo progression (decrypted locally), severity trend chart, and AI analysis summaries. Everything is generated client-side -- decrypted photos never leave the device. The report is in Czech and can be downloaded, shared, or printed.

**Google Doc**: Users connect their Google account via OAuth2 (one-time setup). After connecting, they can export a formatted report to Google Docs with the same structure as the PDF — including inline photos uploaded to Google Drive. The pediatrician receives a shareable link to a readable, annotatable document with embedded medical photos. A privacy notice warns the user before photos are uploaded to Google Drive.

## Test Suite

### Unit Tests

1. **ExportService.aggregateData**
   - Given a child with 10 food logs, 5 photos, and 3 analyses in the date range, returns all items correctly structured.
   - Given a date range with no data, returns empty arrays for all collections and zeroed elimination summary.
   - Given selected photo IDs, only those photos are included in the result (others filtered out).
   - Given `includeAiSummaries: false`, the `aiAnalyses` array is empty regardless of available data.
   - Date range boundary test: entries exactly on the start date and end date are included; entries one day outside are excluded.
   - Photos are sorted by date ascending in the output.

2. **ExportService.buildEliminationSummary**
   - Given food logs showing milk eliminated on day 1 and reintroduced on day 14 with no worsening, milk appears in `successfulReintroductions`.
   - Given food logs showing egg eliminated on day 1 and reintroduced on day 14 with worsening, egg appears in `failedReintroductions`.
   - Given food logs showing soy currently eliminated (no reintroduction), soy appears in `currentlyEliminated`.
   - `totalEliminations` counts the total number of distinct foods eliminated.

3. **PDFBuilder.buildDocument**
   - Returns a valid pdfmake TDocumentDefinitions object with all required top-level keys (pageSize, content, styles).
   - Header section contains child name, birth date, and date range formatted in Czech.
   - Summary section lists correct elimination counts.
   - Food timeline table has correct column headers in Czech: "Datum", "Potraviny", "Eliminovane", "Znovuzavedene", "Poznamky".
   - When photos array is empty, photo section shows "V tomto obdobi nebyly porizeny zadne fotky." message.
   - When photos are present, they are arranged in rows of 3 with correct captions.
   - Chart image is embedded when provided; section is omitted when chartImageDataUrl is null.
   - AI analyses section shows trend indicator with correct color coding (green for improving, amber for stable, red for worsening).
   - Footer contains "Generovano aplikaci Eczema Tracker".

4. **PDFBuilder.buildMealLog**
   - When meals array is empty, shows "V tomto obdobi nebyla zaznamenana zadna jidla." message.
   - When meals are present, table has correct columns: "Datum", "Jidlo", "Polozky".
   - Meals are grouped by date: multiple meals on the same date share the date column.
   - Meal type labels are in Czech (Snídaně, Oběd, Večeře, Svačina).
   - Custom meal labels appear in parentheses after the meal type.
   - Meal items are joined with commas.

5. **Czech date formatting**
   - `formatDateCzech(new Date(2026, 2, 15))` returns "15. 3. 2026".
   - `formatDateCzechLong(new Date(2026, 0, 1))` returns "1. ledna 2026".
   - `formatDateRange` produces correct "from - to" string.

6. **chartToDataUrl**
   - Given a valid uPlot configuration, returns a string starting with "data:image/png;base64,".
   - The chart is destroyed after rendering (no memory leak).
   - Throws an error if canvas 2D context is unavailable.

7. **Filename generation**
   - Filename follows pattern `ekzem-report-{childName}-{YYYY-MM-DD}-{YYYY-MM-DD}.pdf`.
   - Special characters in child name are sanitized (spaces replaced with hyphens, diacritics handled).

8. **Google Docs adapter — document assembly (with mocked Google API)**
   - `connect()` returns a valid auth URL with Drive + Docs scopes.
   - `handleCallback()` with valid code stores encrypted refresh token in DB.
   - `handleCallback()` with invalid code throws error.
   - `export()` creates a new Doc when no `documentId` exists.
   - `export()` clears and updates existing Doc when `documentId` is set.
   - `export()` uploads photo blobs to Drive and receives file IDs.
   - `export()` builds Docs batchUpdate request array with InsertText, InsertInlineImage, InsertTable requests in correct order.
   - `export()` with no photos produces a Doc with text sections only (no InsertInlineImage requests).
   - `export()` with chart image uploads it to Drive and inserts inline.
   - `disconnect()` calls Google revoke endpoint and deletes DB record.
   - `isConnected()` returns true when connection exists, false otherwise.

9. **Google Docs data formatting**
   - Food log table is formatted with columns: Datum, Kategorie, Polozka, Akce, Poznamky. Dates Czech style.
   - Meal table is formatted with columns: Datum, Typ jidla, Polozky.
   - Photo section includes inline images with captions (date, body area/stool metadata).
   - Analysis section includes trend labels and Czech explanation text.
   - Empty data sections render a "Zadna data" (No data) message instead of empty tables.

### Integration Tests

1. **Full data aggregation pipeline**
   - Seed Dexie with a realistic dataset (food logs, encrypted photos, severity ratings, analyses for 30 days).
   - Call `aggregateData` with a 30-day range.
   - Verify all data is correctly retrieved and structured.
   - Verify photos are decrypted (data URLs are valid image data, not encrypted blobs).

2. **PDF generation with real data**
   - Aggregate data from seeded Dexie, build document definition, generate PDF blob via pdfmake.
   - Verify the blob is non-empty and has MIME type "application/pdf".
   - Verify the PDF is a valid file (starts with `%PDF-` header bytes).

3. **Empty date range handling**
   - Select a date range with no data.
   - Verify the export page shows the "no data" message.
   - Verify that the generate button is disabled or that generating produces a PDF with only "no data" sections.

4. **Google OAuth flow (mocked Google)**
   - `GET /api/google/connect` returns 200 with `authUrl` containing correct client_id and Drive + Docs scopes.
   - `GET /api/google/callback?code=valid` stores connection in DB and redirects to `/export`.
   - `GET /api/google/callback?code=invalid` returns error and redirects with error message.
   - `POST /api/google/export` with valid connection and photo blobs uploads photos to Drive, creates Doc, and returns `documentUrl`.
   - `POST /api/google/export` without Google connection returns 400.
   - `POST /api/google/export` without photos still creates a text-only Doc successfully.
   - `POST /api/google/disconnect` revokes token and deletes connection. Returns 200.
   - `GET /api/google/status` returns connected state with email when connected, `{ connected: false }` otherwise.
   - All Google endpoints require authentication (401 without session).
   - Decrypted photo blobs are not persisted to server disk after the request completes.

5. **Large dataset performance**
   - Seed Dexie with 90 days of daily food logs, 30 photos, and 15 analyses.
   - Measure PDF generation time; verify it completes within 10 seconds.
   - Verify memory does not spike excessively (no more than 200MB above baseline).

### E2E / Manual Tests

1. **Full export flow**
   - Log in, navigate to the export page.
   - Select a date range that includes food logs, photos, and analyses.
   - Verify the data summary panel shows correct counts.
   - Select a subset of photos in the photo grid.
   - Click "Generovat PDF".
   - Verify the loading spinner appears and disappears within a reasonable time.
   - Verify the PDF downloads with the correct filename.
   - Open the downloaded PDF and verify all sections are present and correctly formatted.

2. **PDF content verification**
   - Open a generated PDF and verify:
     - Header shows correct child name and date range.
     - Food timeline table entries match what was logged in the app.
     - Photos are visible and correspond to the selected photos.
     - Severity chart shows a line graph with correct date range.
     - AI analysis summaries match stored analyses.
     - Footer text reads "Generovano aplikaci Eczema Tracker".
     - All text is in Czech.
     - Dates are formatted as "d. M. yyyy".

3. **Share functionality**
   - On a device supporting Web Share API (mobile Chrome, Safari), generate a PDF and tap "Sdilet".
   - Verify the native share sheet appears with the PDF file.
   - Share to another app (e.g., email, messaging) and verify the PDF arrives intact.

4. **Print functionality**
   - Generate a PDF and click "Tisknout".
   - Verify the browser print dialog opens.
   - Verify the print preview shows correct content.

5. **Offline generation**
   - Ensure data is synced to Dexie.
   - Disconnect from the network.
   - Navigate to the export page, select a date range, generate a PDF.
   - Verify the PDF generates successfully without network access.

6. **Photo privacy verification**
   - Open browser DevTools Network tab before generating a PDF.
   - Generate a PDF that includes photos.
   - Verify no network requests are made during photo decryption or PDF generation (all data comes from IndexedDB).

7. **Google Doc: connect and export with photos**
   - Navigate to the export page. Click "Pripojit Google ucet".
   - Complete Google OAuth2 flow (grant Drive + Docs access).
   - Verify the page shows connected Google email and "Exportovat do Google Doc" button.
   - Select a date range with data. Select 3 photos to include.
   - Privacy dialog appears: "Vybrane fotky budou nahrane na Google Drive. Pokracovat?" — confirm.
   - Click "Exportovat do Google Doc". Observe progress ("Nahravani fotek 1/3...", "Vytvareni dokumentu...").
   - Verify a Google Doc link is returned. Open it.
   - Verify the document contains: header, summary, food timeline, meal log, 3 inline photos with captions, severity chart, AI analyses, footer.

8. **Google Doc: export without photos**
   - Select a date range. Deselect all photos.
   - Click "Exportovat do Google Doc".
   - Verify the document is created with text sections only, no inline images.

9. **Google Doc: update existing document**
   - After an initial export, add new food log entries.
   - Export again with a broader date range and additional photos.
   - Verify the same document URL is updated (not a new one created).
   - Verify new content and photos appear in the document.

10. **Google Doc: disconnect**
    - Click "Odpojit Google ucet".
    - Verify the connection status resets to disconnected.
    - Verify "Exportovat do Google Doc" button is no longer available.
    - Verify the existing Google Doc and photos remain on Drive (not deleted).

11. **Google Doc: offline behavior**
    - Disconnect from network. Navigate to export page.
    - Verify Google Doc section shows "Export do Google Doc neni dostupny offline" message.
    - Verify PDF export still works offline.

### Regression Checks

1. Verify that navigating to and from the export page does not affect the local Dexie database (no data corruption).
2. Verify that the photo decryption used in export does not interfere with photo decryption used elsewhere in the app (e.g., the photo gallery).
3. Verify that installing pdfmake does not significantly increase the initial bundle size (it should be lazy-loaded).
4. Verify that the uPlot offscreen rendering does not leave orphaned canvas elements in the DOM.
5. Verify that the export page works on both desktop and mobile viewports (responsive layout for date pickers, photo grid).
6. Verify that existing routes and navigation are unaffected by the new `/export` route.
