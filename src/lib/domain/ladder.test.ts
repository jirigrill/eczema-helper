import { describe, it, expect } from "vitest";
import { currentRung, nextLegalStep, cadenceGate, skinCalmGate, checkpointVerdictGate, resolveLadder } from "./ladder";
import type { Ladder, LadderStep } from "./ladder";
import type { Meal, SkinObservation, ReintroductionEvaluation } from "$lib/domain/models";
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

const eggsLadder: Ladder = {
  allergenId: "eggs",
  stages: { breastfed: eggsSteps },
};

// ── currentRung ───────────────────────────────────────────────

describe("currentRung", () => {
  it("returns null when the meal history has no matching allergen items", () => {
    const meals: Meal[] = [];
    expect(currentRung("eggs", meals, eggsLadder, "breastfed")).toBeNull();
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
    expect(currentRung("eggs", meals, eggsLadder, "breastfed")?.id).toBe("rung-1");
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
    expect(currentRung("eggs", meals, eggsLadder, "breastfed")?.id).toBe("rung-2");
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
    const rung = currentRung("eggs", meals, eggsLadder, "breastfed");
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
    expect(currentRung("eggs", meals, eggsLadder, "breastfed")).toBeNull();
  });

  it("surfaces isEvaluationCheckpoint=false on a non-checkpoint resolved rung", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" }],
      }),
    ];
    const rung = currentRung("eggs", meals, eggsLadder, "breastfed");
    expect(rung?.id).toBe("rung-1");
    expect(rung?.isEvaluationCheckpoint).toBe(false);
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
    expect(currentRung("eggs", meals, eggsLadder, "breastfed")?.id).toBe("rung-3");
  });
});

// ── nextLegalStep ─────────────────────────────────────────────

describe("nextLegalStep", () => {
  it("returns the first step when the current rung is null", () => {
    expect(nextLegalStep(null, eggsLadder, "breastfed")?.id).toBe("rung-1");
  });

  it("returns the next single step above the current rung", () => {
    expect(nextLegalStep(eggsSteps[0], eggsLadder, "breastfed")?.id).toBe("rung-2");
    expect(nextLegalStep(eggsSteps[1], eggsLadder, "breastfed")?.id).toBe("rung-3");
  });

  it("returns null once the top of the ladder is reached", () => {
    const top = eggsSteps[eggsSteps.length - 1];
    expect(nextLegalStep(top, eggsLadder, "breastfed")).toBeNull();
  });

  it("cannot express a multi-step advance — the return is a single step or null", () => {
    // The signature itself precludes returning two steps at once. This test
    // documents that guarantee: `nextLegalStep` walks exactly one rung.
    const returned = nextLegalStep(eggsSteps[0], eggsLadder, "breastfed");
    const idx = eggsSteps.findIndex((s) => s.id === returned?.id);
    expect(idx).toBe(1);
  });

  it("returns null when the allergen is permanently eliminated, regardless of rung", () => {
    // Permanent elimination (permanent-mother / permanent-baby per ADR-0012)
    // refuses advancement outright — the ladder is inert for that allergen.
    expect(nextLegalStep(null, eggsLadder, "breastfed", undefined, { isPermanentlyEliminated: true })).toBeNull();
    expect(nextLegalStep(eggsSteps[0], eggsLadder, "breastfed", undefined, { isPermanentlyEliminated: true })).toBeNull();
    expect(nextLegalStep(eggsSteps[1], eggsLadder, "breastfed", undefined, { isPermanentlyEliminated: true })).toBeNull();
  });
});

// ── cadenceGate ───────────────────────────────────────────────

describe("cadenceGate", () => {
  it("blocks escalation when the last matching dose is fewer than the cadence threshold days ago", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" }],
      }),
    ];
    // Threshold is 3 days; two days elapsed → blocked.
    const result = cadenceGate("eggs", meals, "2026-06-03", 3);
    expect(result.allowed).toBe(false);
    expect(result.daysSinceLastDose).toBe(2);
  });

  it("unblocks once the cadence threshold has elapsed since the last dose", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" }],
      }),
    ];
    // 3 days elapsed → threshold met.
    const result = cadenceGate("eggs", meals, "2026-06-04", 3);
    expect(result.allowed).toBe(true);
    expect(result.daysSinceLastDose).toBe(3);
  });

  it("imposes no delay when the allergen has never been dosed", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Rýže", foodId: "ryze", amount: "portion" }],
      }),
    ];
    const result = cadenceGate("eggs", meals, "2026-06-04", 3);
    expect(result.allowed).toBe(true);
    expect(result.daysSinceLastDose).toBeNull();
  });

  it("blocks a same-day second dose regardless of cadence value", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" }],
      }),
    ];
    // F4 daily cadence (cadenceDays = 1): same-day re-check is still blocked.
    const result = cadenceGate("eggs", meals, "2026-06-01", 1);
    expect(result.allowed).toBe(false);
    expect(result.daysSinceLastDose).toBe(0);
  });
});

// ── skinCalmGate ──────────────────────────────────────────────

function obs(date: string, level: 0 | 1 | 2 | 3, overrides?: Partial<SkinObservation>): SkinObservation {
  return {
    id: overrides?.id ?? `obs-${date}`,
    date,
    createdAt: overrides?.createdAt ?? `${date}T12:00:00Z`,
    regions: level === 0 ? [] : [{ id: "face", level }],
    ...(overrides ?? {}),
  };
}

describe("skinCalmGate", () => {
  it("holds escalation when the latest observation shows any active region (flare)", () => {
    const observations: SkinObservation[] = [
      obs("2026-06-01", 0),
      obs("2026-06-02", 2), // flare
    ];
    const result = skinCalmGate(observations, "2026-06-02");
    expect(result.allowed).toBe(false);
    expect(result.isFlare).toBe(true);
  });

  it("releases escalation once the latest observation returns to klidné", () => {
    const observations: SkinObservation[] = [
      obs("2026-06-01", 2), // earlier flare
      obs("2026-06-03", 0), // calm
    ];
    const result = skinCalmGate(observations, "2026-06-03");
    expect(result.allowed).toBe(true);
    expect(result.isFlare).toBe(false);
    expect(result.latestSeverity).toBe(0);
  });

  it("ignores observations after `today` — future observations do not gate a past date", () => {
    const observations: SkinObservation[] = [
      obs("2026-06-01", 0),
      obs("2026-06-05", 3),
    ];
    const result = skinCalmGate(observations, "2026-06-02");
    expect(result.allowed).toBe(true);
    expect(result.isFlare).toBe(false);
  });
});

// ── checkpointVerdictGate ─────────────────────────────────────

function evaluation(
  overrides: Partial<ReintroductionEvaluation> & Pick<ReintroductionEvaluation, "date" | "outcome">,
): ReintroductionEvaluation {
  return {
    phaseId: "phase-1",
    phaseType: "allergen-test",
    allergenId: "eggs",
    ...overrides,
  };
}

describe("checkpointVerdictGate", () => {
  it("is permissive at a non-checkpoint rung — nothing to evaluate there", () => {
    const result = checkpointVerdictGate(eggsSteps[0], "eggs", []);
    expect(result.allowed).toBe(true);
  });

  it("blocks at a checkpoint rung when no verdict has been recorded yet", () => {
    const result = checkpointVerdictGate(eggsSteps[2], "eggs", []);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(false);
  });

  it("allows past a checkpoint once the latest verdict for the allergen is tolerated", () => {
    const evaluations = [evaluation({ date: "2026-06-03", outcome: "tolerated" })];
    const result = checkpointVerdictGate(eggsSteps[2], "eggs", evaluations);
    expect(result.allowed).toBe(true);
    expect(result.requiresRest).toBe(false);
  });

  it("holds and requires rest when the latest verdict is a reaction", () => {
    const evaluations = [evaluation({ date: "2026-06-03", outcome: "clear-reaction" })];
    const result = checkpointVerdictGate(eggsSteps[2], "eggs", evaluations);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(true);
    expect(result.restDays).toBe(7);
  });

  it("uses only the latest verdict by date, not an earlier stale one", () => {
    const evaluations = [
      evaluation({ date: "2026-06-01", outcome: "severe-reaction" }),
      evaluation({ date: "2026-06-05", outcome: "tolerated" }),
    ];
    const result = checkpointVerdictGate(eggsSteps[2], "eggs", evaluations);
    expect(result.allowed).toBe(true);
  });

  it("ignores evaluations for a different allergen or a skin-status phase", () => {
    const evaluations = [
      evaluation({ date: "2026-06-03", outcome: "tolerated", allergenId: "dairy" }),
      evaluation({ date: "2026-06-04", outcome: "improved", phaseType: "skin-status", allergenId: "eggs" }),
    ];
    const result = checkpointVerdictGate(eggsSteps[2], "eggs", evaluations);
    expect(result.allowed).toBe(false);
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

// ── resolveLadder (override merge) ────────────────────────────

describe("resolveLadder", () => {
  const defaultLadder: Ladder = {
    allergenId: "eggs",
    stages: {
      breastfed: [
        { id: "default-b-1", anchor: "pinch", isEvaluationCheckpoint: false, dose: "default breastfed" },
      ],
      mixed: [
        { id: "default-m-1", anchor: "teaspoon", isEvaluationCheckpoint: false, dose: "default mixed" },
      ],
      solids: [
        { id: "default-s-1", anchor: "portion", isEvaluationCheckpoint: false, dose: "default solids" },
      ],
    },
  };

  const overrideLadder: Ladder = {
    allergenId: "eggs",
    stages: {
      breastfed: [
        { id: "override-b-1", anchor: "teaspoon", isEvaluationCheckpoint: true, dose: "override breastfed" },
      ],
    },
  };

  it("returns the default ladder when no override is present", () => {
    expect(resolveLadder(defaultLadder, null)).toBe(defaultLadder);
  });

  it("returns the default ladder when the override is undefined", () => {
    expect(resolveLadder(defaultLadder, undefined)).toBe(defaultLadder);
  });

  it("replaces the default stage's rungs with the override's when the override defines that stage", () => {
    const resolved = resolveLadder(defaultLadder, overrideLadder);
    expect(resolved.stages.breastfed?.[0].id).toBe("override-b-1");
  });

  it("preserves default stages the override does not define — a breastfed-only override keeps mixed/solids", () => {
    // Regression guard: an override customising just one stage must not
    // silently erase the other stages. The child would find an empty ladder
    // on transition into mixed/solids otherwise (issue #427 review).
    const resolved = resolveLadder(defaultLadder, overrideLadder);
    expect(resolved.stages.mixed?.[0].id).toBe("default-m-1");
    expect(resolved.stages.solids?.[0].id).toBe("default-s-1");
  });

  it("currentRung uses the override rungs when an override is passed", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:breakfast",
        date: "2026-06-01",
        mealType: "breakfast",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "teaspoon" }],
      }),
    ];
    // The default first rung anchors on `pinch`; the override anchors on `teaspoon`.
    // A `teaspoon` meal advances the override's first rung, not the default's.
    expect(currentRung("eggs", meals, defaultLadder, "breastfed", overrideLadder)?.id).toBe("override-b-1");
  });

  it("nextLegalStep walks the override rungs when an override is passed", () => {
    expect(nextLegalStep(null, defaultLadder, "breastfed", overrideLadder)?.id).toBe("override-b-1");
  });

  it("currentRung falls back to the default stage when the override does not define that stage", () => {
    const meals: Meal[] = [
      makeMeal({
        id: "2026-06-01:lunch",
        date: "2026-06-01",
        mealType: "lunch",
        items: [{ id: "i1", name: "Vejce", foodId: "vejce", amount: "portion" }],
      }),
    ];
    // Override only defines breastfed; asking about solids must use the default.
    expect(currentRung("eggs", meals, defaultLadder, "solids", overrideLadder)?.id).toBe("default-s-1");
  });
});
