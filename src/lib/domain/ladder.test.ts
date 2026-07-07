import { describe, it, expect } from "vitest";
import { currentRung, nextLegalStep } from "./ladder";
import type { LadderStep } from "./ladder";
import type { Meal } from "$lib/domain/models";
import { ALLERGENS } from "$lib/data/allergen-catalog/allergen-catalog";

// ── Fixtures ──────────────────────────────────────────────────

function makeMeal(
  overrides: Partial<Meal> & Pick<Meal, "id" | "date" | "mealType" | "items">,
): Meal {
  return {
    actor: "mother",
    createdAt: `${overrides.date}T12:00:00Z`,
    ...overrides,
  };
}

const eggsSteps: readonly LadderStep[] = [
  {
    id: "rung-1",
    anchor: "portion",
    isEvaluationCheckpoint: false,
    dose: "test rung 1",
  },
  {
    id: "rung-2",
    anchor: "portion",
    isEvaluationCheckpoint: false,
    dose: "test rung 2",
  },
  {
    id: "rung-3",
    anchor: "package",
    isEvaluationCheckpoint: true,
    dose: "test rung 3",
  },
];

// ── currentRung ───────────────────────────────────────────────

describe("currentRung", () => {
  it("returns null when the meal history has no matching allergen items", () => {
    const meals: Meal[] = [];
    expect(currentRung("eggs", meals, eggsSteps)).toBeNull();
  });

  it("returns the first rung when only the first-rung anchor has been logged", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [
          { id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
    ];
    expect(currentRung("eggs", meals, eggsSteps)?.id).toBe("rung-1");
  });

  it("advances to the second rung once a second matching anchor is logged on a later meal", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [
          { id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
      makeMeal({
        id: "2026-06-02:breakfast",
        date: "2026-06-02",
        mealType: "breakfast",
        items: [
          { id: "i2", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
    ];
    expect(currentRung("eggs", meals, eggsSteps)?.id).toBe("rung-2");
  });

  it("reaches the top rung when the final anchor is logged after the earlier anchors", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [
          { id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
      makeMeal({
        id: "2026-06-02:breakfast",
        date: "2026-06-02",
        mealType: "breakfast",
        items: [
          { id: "i2", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
      makeMeal({
        id: "2026-06-03:lunch",
        date: "2026-06-03",
        mealType: "lunch",
        items: [
          { id: "i3", name: "Vejce", foodId: "vejce", amount: "package" },
        ],
      }),
    ];
    const rung = currentRung("eggs", meals, eggsSteps);
    expect(rung?.id).toBe("rung-3");
    expect(rung?.isEvaluationCheckpoint).toBe(true);
  });

  it("ignores meals whose items do not match the allergen", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Rýže", foodId: "ryze", amount: "portion" }],
      }),
    ];
    expect(currentRung("eggs", meals, eggsSteps)).toBeNull();
  });

  it("preserves the highest rung reached even when a smaller dose is logged afterwards", () => {
    // Reacted-history shape: mother reached the top rung, then dropped to a smaller
    // dose on a later meal. The derivation is monotone in the ordered history —
    // reaching a rung is a permanent record of "you've been here".
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [
          { id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
      makeMeal({
        id: "2026-06-02:breakfast",
        date: "2026-06-02",
        mealType: "breakfast",
        items: [
          { id: "i2", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
      makeMeal({
        id: "2026-06-03:lunch",
        date: "2026-06-03",
        mealType: "lunch",
        items: [
          { id: "i3", name: "Vejce", foodId: "vejce", amount: "package" },
        ],
      }),
      makeMeal({
        id: "2026-06-05:breakfast",
        date: "2026-06-05",
        mealType: "breakfast",
        items: [
          { id: "i4", name: "Vejce", foodId: "vejce", amount: "portion" },
        ],
      }),
    ];
    expect(currentRung("eggs", meals, eggsSteps)?.id).toBe("rung-3");
  });
});

// ── nextLegalStep ─────────────────────────────────────────────

describe("nextLegalStep", () => {
  it("returns the first step when the current rung is null", () => {
    expect(nextLegalStep(null, eggsSteps)?.id).toBe("rung-1");
  });

  it("returns the next single step above the current rung", () => {
    expect(nextLegalStep(eggsSteps[0], eggsSteps)?.id).toBe("rung-2");
    expect(nextLegalStep(eggsSteps[1], eggsSteps)?.id).toBe("rung-3");
  });

  it("returns null once the top of the ladder is reached", () => {
    const top = eggsSteps[eggsSteps.length - 1];
    expect(nextLegalStep(top, eggsSteps)).toBeNull();
  });

  it("cannot express a multi-step advance — the return is a single step or null", () => {
    // The signature itself precludes returning two steps at once. This test
    // documents that guarantee: `nextLegalStep` walks exactly one rung.
    const returned = nextLegalStep(eggsSteps[0], eggsSteps);
    const idx = eggsSteps.findIndex((s) => s.id === returned?.id);
    expect(idx).toBe(1);
  });
});

// ── Catalog parity ────────────────────────────────────────────

describe("ALLERGENS ladders", () => {
  it("every protocol allergen carries a ladder", () => {
    const withProtocol = ALLERGENS.filter(
      (a): a is typeof a & { protocol: object } =>
        "protocol" in a && a.protocol !== undefined,
    );
    for (const allergen of withProtocol) {
      expect(
        (allergen as { ladder?: unknown }).ladder,
        `missing ladder on ${allergen.id}`,
      ).toBeDefined();
    }
  });

  it("each breastfed-stage rung inherits isEvaluationCheckpoint from the legacy ProtocolDay.isEvaluationDay at the same index", () => {
    for (const allergen of ALLERGENS) {
      const rec = allergen as {
        id: string;
        protocol?: { days: readonly { isEvaluationDay: boolean }[] };
        ladder?: {
          stages: { breastfed?: readonly { isEvaluationCheckpoint: boolean }[] };
        };
      };
      const breastfed = rec.ladder?.stages.breastfed;
      if (!rec.protocol || !breastfed) continue;
      expect(breastfed.length, `rung count mismatch on ${rec.id}`).toBe(
        rec.protocol.days.length,
      );
      for (let i = 0; i < rec.protocol.days.length; i++) {
        expect(
          breastfed[i].isEvaluationCheckpoint,
          `parity mismatch on ${rec.id} rung ${i + 1}`,
        ).toBe(rec.protocol.days[i].isEvaluationDay);
      }
    }
  });
});
