import { describe, it, expect } from "vitest";
import {
  getPhaseForDate,
  getEliminatedSlugsForDate,
  getScheduleProgress,
  getReintroductionDayInfo,
  buildScheduleContext,
  detectConflicts,
} from "./schedule-queries";
import { getAllergenStatuses } from "./allergen-status";
import type {
  GeneratedSchedule,
  QuestionnaireAnswers,
  SchedulePhase,
  MealItem,
} from "$lib/domain/models";
import { BundledCatalogAdapter } from "$lib/adapters/bundled-catalog-adapter";
import { ALLERGENS } from "$lib/data/allergen-catalog/allergen-catalog";
import { addDays } from "$lib/utils/date";

const catalog = new BundledCatalogAdapter();

function phase(
  overrides: Partial<SchedulePhase> &
    Pick<SchedulePhase, "id" | "type" | "startDate" | "endDate">,
): SchedulePhase {
  return { allergenIds: [], ...overrides };
}

const baseSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reset",
      type: "reset",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
    }),
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-06",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-30",
      allergenIds: ["dairy"],
    }),
  ],
};

// Two successive reintros without a rest between them → first allergen is "passed"
const scheduleWithPassedAllergen: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reset",
      type: "reset",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
    }),
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-06",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs", "wheat"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-30",
      allergenIds: ["dairy"],
    }),
    phase({
      id: "reintro-eggs",
      type: "reintroduction",
      startDate: "2026-05-31",
      endDate: "2026-06-03",
      allergenIds: ["eggs"],
    }),
  ],
};

// Reintro followed by a rest phase → allergen is NOT considered passed
const scheduleWithRestPhase: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reset",
      type: "reset",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
    }),
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-06",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-30",
      allergenIds: ["dairy"],
    }),
    phase({
      id: "rest-1",
      type: "rest",
      startDate: "2026-05-31",
      endDate: "2026-06-02",
    }),
  ],
};

// Training phase starts after rest; a subsequent reintro overlaps with it
const scheduleWithTraining: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reset",
      type: "reset",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
    }),
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-06",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-30",
      allergenIds: ["dairy"],
    }),
    phase({
      id: "rest-1",
      type: "rest",
      startDate: "2026-05-31",
      endDate: "2026-06-01",
    }),
    // training starts Jun 2, open-ended (endDate '')
    phase({
      id: "tolerance-building-dairy",
      type: "tolerance-building",
      startDate: "2026-06-02",
      endDate: "",
      allergenIds: ["dairy"],
    }),
    // reintro-eggs also starts Jun 2 — overlaps with tolerance-building
    phase({
      id: "reintro-eggs",
      type: "reintroduction",
      startDate: "2026-06-02",
      endDate: "2026-06-05",
      allergenIds: ["eggs"],
    }),
  ],
};

describe("getPhaseForDate", () => {
  it("returns reset phase on first day of program", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-05-01");
    expect(phase?.id).toBe("reset");
  });

  it("returns reset phase on last day of reset", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-05-05");
    expect(phase?.id).toBe("reset");
  });

  it("returns elimination phase on first day of elimination", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-05-06");
    expect(phase?.id).toBe("elimination");
  });

  it("returns reintroduction phase during reintro", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-05-28");
    expect(phase?.id).toBe("reintro-dairy");
  });

  it("returns null before program starts", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-04-30");
    expect(phase).toBeNull();
  });

  it("returns null after all phases end", () => {
    const phase = getPhaseForDate(baseSchedule, "2026-05-31");
    expect(phase).toBeNull();
  });
});

describe("getEliminatedSlugsForDate", () => {
  it("returns only permanent eliminations during reset", () => {
    const schedule: GeneratedSchedule = {
      ...baseSchedule,
      permanentMother: ["soy"],
      permanentBaby: [],
    };
    const slugs = getEliminatedSlugsForDate(schedule, "2026-05-03");
    expect(slugs).toEqual(["soy"]);
  });

  it("returns protocol allergens during elimination phase", () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, "2026-05-10");
    expect(slugs).toContain("dairy");
    expect(slugs).toContain("eggs");
  });

  it("excludes permanent eliminations from protocol allergens (already covered)", () => {
    const schedule: GeneratedSchedule = {
      ...baseSchedule,
      permanentMother: ["dairy"],
      permanentBaby: [],
    };
    const slugs = getEliminatedSlugsForDate(schedule, "2026-05-10");
    expect(slugs).toContain("dairy");
    expect(slugs).toContain("eggs");
  });

  it("allows the reintroduced allergen during its reintro phase", () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, "2026-05-28");
    expect(slugs).not.toContain("dairy");
  });

  it("still eliminates other protocol allergens during reintro", () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, "2026-05-28");
    expect(slugs).toContain("eggs");
  });

  it("returns empty array before program starts", () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, "2026-04-30");
    expect(slugs).toEqual([]);
  });
});

describe("getEliminatedSlugsForDate — already-passed allergens", () => {
  // dairy reintro is followed directly by eggs reintro (no rest) → dairy is "passed"
  // during reintro-eggs: dairy allowed, eggs allowed (current), wheat eliminated

  it("allows an allergen that was tolerated in a previous reintro", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleWithPassedAllergen,
      "2026-06-01",
    );
    expect(slugs).not.toContain("dairy");
  });

  it("allows the allergen currently being reintroduced", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleWithPassedAllergen,
      "2026-06-01",
    );
    expect(slugs).not.toContain("eggs");
  });

  it("still eliminates allergens not yet reintroduced", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleWithPassedAllergen,
      "2026-06-01",
    );
    expect(slugs).toContain("wheat");
  });
});

describe("getEliminatedSlugsForDate — rest phase", () => {
  // dairy reintro followed by rest → dairy NOT passed (reaction triggered the rest)
  // during rest: all protocol allergens remain eliminated

  it("eliminates the preceding reintro allergen during rest (not passed because rest follows)", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleWithRestPhase,
      "2026-06-01",
    );
    expect(slugs).toContain("dairy");
  });

  it("eliminates all other protocol allergens during rest", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleWithRestPhase,
      "2026-06-01",
    );
    expect(slugs).toContain("eggs");
  });
});

// Regression: reacted allergen must stay eliminated in phases after its rest
// (the old tolerance-building recursion could incorrectly drop it)
const scheduleReactedThenRetest: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reset",
      type: "reset",
      startDate: "2026-05-01",
      endDate: "2026-05-05",
    }),
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-06",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-30",
      allergenIds: ["dairy"],
    }),
    phase({
      id: "rest-1",
      type: "rest",
      startDate: "2026-05-31",
      endDate: "2026-06-02",
    }),
    phase({
      id: "reintro-eggs",
      type: "reintroduction",
      startDate: "2026-06-03",
      endDate: "2026-06-06",
      allergenIds: ["eggs"],
    }),
  ],
};

describe("getEliminatedSlugsForDate — reacted allergen stays eliminated", () => {
  // dairy reintro → rest (reacted), then eggs reintro starts
  // dairy status is now 'reacted' → must appear in eliminated slugs during eggs reintro

  it("reacted allergen appears in eliminated slugs during a subsequent reintro phase", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleReactedThenRetest,
      "2026-06-04",
    );
    expect(slugs).toContain("dairy");
  });

  it("the currently-tested allergen is not eliminated during its own reintro", () => {
    const slugs = getEliminatedSlugsForDate(
      scheduleReactedThenRetest,
      "2026-06-04",
    );
    expect(slugs).not.toContain("eggs");
  });
});

describe("getPhaseForDate — training phase", () => {
  // training is open-ended (endDate = '') and lower priority than regular phases

  it("returns the concurrent non-training phase when both are active", () => {
    // Jun 2: both training-dairy and reintro-eggs are active
    const result = getPhaseForDate(scheduleWithTraining, "2026-06-02");
    expect(result?.id).toBe("reintro-eggs");
  });

  it("returns the training phase when it is the only active phase", () => {
    // Jun 6: reintro-eggs ended Jun 5; training-dairy is still open-ended
    const result = getPhaseForDate(scheduleWithTraining, "2026-06-06");
    expect(result?.id).toBe("tolerance-building-dairy");
  });

  it("treats open-ended training phase as active on any date after its start", () => {
    const result = getPhaseForDate(scheduleWithTraining, "2026-12-31");
    expect(result?.id).toBe("tolerance-building-dairy");
  });
});

describe("getScheduleProgress", () => {
  // 10-day program: 2026-05-01 → 2026-05-10
  const tenDaySchedule: GeneratedSchedule = {
    permanentMother: [],
    permanentBaby: [],
    startDate: "2026-05-01",
    estimatedEndDate: "2026-05-10",
    phases: [],
  };

  it("clamps to day 1 when called before program start", () => {
    const result = getScheduleProgress(tenDaySchedule, "2026-04-28");
    expect(result.currentDay).toBe(1);
    expect(result.totalDays).toBe(10);
  });

  it("clamps to totalDays when called after program end", () => {
    const result = getScheduleProgress(tenDaySchedule, "2026-05-20");
    expect(result.currentDay).toBe(10);
    expect(result.totalDays).toBe(10);
  });

  it("returns correct mid-program day", () => {
    const result = getScheduleProgress(tenDaySchedule, "2026-05-05");
    expect(result.currentDay).toBe(5);
    expect(result.totalDays).toBe(10);
  });

  it("returns 100 on the last day", () => {
    const result = getScheduleProgress(tenDaySchedule, "2026-05-10");
    expect(result.percentComplete).toBe(100);
  });

  it("rounds percentComplete correctly for fractional values", () => {
    // day 1 of 3: Math.round(1/3 * 100) = Math.round(33.33) = 33
    const threeDay: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: "2026-05-01",
      estimatedEndDate: "2026-05-03",
      phases: [],
    };
    const result = getScheduleProgress(threeDay, "2026-05-01");
    expect(result.percentComplete).toBe(33);
  });
});

// ── getReintroductionDayInfo ──────────────────────────────────
// dairy protocol = 5 days; evaluation on day 5 only.
// The old REINTRO_4DAY clamped to index 3 (isEvaluationDay: true) for any day ≥ 4,
// so day 4 of dairy would incorrectly return isEvaluationDay: true.

const dairyReintroSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-06-01",
      allergenIds: ["dairy"],
    }),
  ],
};

describe("getReintroductionDayInfo", () => {
  it("day 5 of a 6-day dairy reintro is NOT the evaluation day", () => {
    // Tracer bullet: dairy has 6 protocol days — only the last day is evaluation.
    const info = getReintroductionDayInfo(
      dairyReintroSchedule,
      "2026-05-31",
      catalog,
    ); // day 5
    expect(info).not.toBeNull();
    expect(info!.isEvaluationDay).toBe(false);
  });

  it("day 6 of a 6-day dairy reintro IS the evaluation day", () => {
    const info = getReintroductionDayInfo(
      dairyReintroSchedule,
      "2026-06-01",
      catalog,
    ); // day 6
    expect(info).not.toBeNull();
    expect(info!.isEvaluationDay).toBe(true);
  });

  it("returns null outside a reintroduction phase", () => {
    const eliminationSchedule: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: "2026-05-01",
      estimatedEndDate: "2026-07-01",
      phases: [
        phase({
          id: "elimination",
          type: "elimination",
          startDate: "2026-05-01",
          endDate: "2026-05-20",
          allergenIds: ["dairy"],
        }),
      ],
    };
    const info = getReintroductionDayInfo(
      eliminationSchedule,
      "2026-05-10",
      catalog,
    );
    expect(info).toBeNull();
  });

  it("returned struct has no label or guidance fields", () => {
    const info = getReintroductionDayInfo(
      dairyReintroSchedule,
      "2026-05-27",
      catalog,
    ); // day 1
    expect(info).not.toBeNull();
    expect("label" in info!).toBe(false);
    expect("guidance" in info!).toBe(false);
  });
});

// ── getReintroductionDayInfo — ladder-parity across every protocol allergen ──
// Frozen pre-migration values sourced from `ALLERGENS[*].protocol.days[i].isEvaluationDay`.
// After the switch to `LadderStep.isEvaluationCheckpoint`, output must be identical for
// every protocol allergen and every day-in-phase.

describe('getReintroductionDayInfo — ladder parity with legacy protocol', () => {
  type ProtocolRecord = {
    id: string;
    protocol: { days: readonly { isEvaluationDay: boolean }[] };
  };
  const protocolAllergens = ALLERGENS.filter(
    (a): a is typeof a & ProtocolRecord => 'protocol' in a && a.protocol !== undefined
  );

  it('covers every protocol allergen in the catalog', () => {
    expect(protocolAllergens.length).toBeGreaterThan(0);
  });

  for (const allergen of protocolAllergens) {
    const totalDays = allergen.protocol.days.length;
    const startDate = '2026-05-01';
    const endDate = addDays(startDate, totalDays - 1);
    const schedule: GeneratedSchedule = {
      permanentMother: [], permanentBaby: [],
      startDate,
      estimatedEndDate: addDays(startDate, totalDays + 30),
      phases: [
        phase({
          id: `reintro-${allergen.id}`,
          type: 'reintroduction',
          startDate,
          endDate,
          allergenIds: [allergen.id as SchedulePhase['allergenIds'][number]],
        }),
      ],
    };

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const date = addDays(startDate, dayIndex);
      const expected = allergen.protocol.days[dayIndex].isEvaluationDay;
      it(`${allergen.id} day ${dayIndex + 1}/${totalDays} → isEvaluationDay=${expected}`, () => {
        const info = getReintroductionDayInfo(schedule, date, catalog);
        expect(info).not.toBeNull();
        expect(info!.isEvaluationDay).toBe(expected);
      });
    }
  }
});

// ── buildScheduleContext ──────────────────────────────────────

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: "2025-01-01",
  eczemaSeverity: "moderate",
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: "2026-05-01",
  completedAt: "2026-05-01T10:00:00.000Z",
  testedAllergens: ["dairy", "eggs"],
};

// reintro schedule: dairy reintro 2026-05-27→05-31
const reintroSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: "2026-05-01",
  estimatedEndDate: "2026-07-01",
  phases: [
    phase({
      id: "elimination",
      type: "elimination",
      startDate: "2026-05-01",
      endDate: "2026-05-26",
      allergenIds: ["dairy", "eggs"],
    }),
    phase({
      id: "reintro-dairy",
      type: "reintroduction",
      startDate: "2026-05-27",
      endDate: "2026-05-31",
      allergenIds: ["dairy"],
    }),
  ],
};

describe("buildScheduleContext", () => {
  it("passes schedule and answers through by identity", () => {
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      "2026-05-28",
      catalog,
    );
    expect(ctx.schedule).toBe(reintroSchedule);
    expect(ctx.answers).toBe(sampleAnswers);
  });

  it("allergenStatuses equals getAllergenStatuses(schedule, today)", () => {
    const today = "2026-05-28";
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
    );
    expect(ctx.allergenStatuses).toEqual(
      getAllergenStatuses(reintroSchedule, today),
    );
  });

  it("eliminatedToday equals getEliminatedSlugsForDate(schedule, today)", () => {
    const today = "2026-05-28";
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
    );
    expect(ctx.eliminatedToday).toEqual(
      getEliminatedSlugsForDate(reintroSchedule, today),
    );
  });

  it("reintroInfo equals getReintroductionDayInfo(schedule, today)", () => {
    const today = "2026-05-28";
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
    );
    expect(ctx.reintroInfo).toEqual(
      getReintroductionDayInfo(reintroSchedule, today, catalog),
    );
  });

  it("progress equals getScheduleProgress(schedule, today)", () => {
    const today = "2026-05-28";
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
    );
    expect(ctx.progress).toEqual(getScheduleProgress(reintroSchedule, today));
  });

  it("single-today coherence: tested allergen appears in reintroInfo but not eliminatedToday", () => {
    // 2026-05-28 is day 2 of dairy reintroduction — dairy is being tested, so not forbidden
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      "2026-05-28",
      catalog,
    );
    expect(ctx.reintroInfo?.allergenId).toBe("dairy");
    expect(ctx.eliminatedToday).not.toContain("dairy");
  });

  it("result has no status key", () => {
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      "2026-05-28",
      catalog,
    );
    expect(ctx).not.toHaveProperty("status");
  });
});

// ── detectConflicts — live trigger resolution ─────────────────

function item(id: string, foodId: string): MealItem {
  return {
    id,
    name: id,
    foodId: foodId as MealItem["foodId"],
    amount: "portion",
  };
}

describe("detectConflicts", () => {
  it("returns empty array when no items conflict", () => {
    // ryzove-mleko has no allergenIds — neutral food never conflicts
    const result = detectConflicts(
      [item("a", "ryzove-mleko")],
      ["dairy", "soy"],
      catalog,
    );
    expect(result).toHaveLength(0);
  });

  it("flags an item whose single trigger is eliminated", () => {
    // kravske-mleko → ['dairy']
    const result = detectConflicts(
      [item("a", "kravske-mleko")],
      ["dairy"],
      catalog,
    );
    expect(result).toHaveLength(1);
    expect(result[0].foodId).toBe("kravske-mleko");
  });

  it("sójové mléko conflicts under soy elimination (family divergence)", () => {
    // sojove-mleko is in family 'dairy' but its trigger is 'soy', not 'dairy'
    const result = detectConflicts(
      [item("a", "sojove-mleko")],
      ["soy"],
      catalog,
    );
    expect(result).toHaveLength(1);
  });

  it("sójové mléko does NOT conflict under dairy-only elimination", () => {
    // family is dairy but allergenId is soy — conflict resolves via allergenIds, not family
    const result = detectConflicts(
      [item("a", "sojove-mleko")],
      ["dairy"],
      catalog,
    );
    expect(result).toHaveLength(0);
  });

  it("hummus conflicts when chickpea (legumes) is eliminated", () => {
    const result = detectConflicts([item("a", "hummus")], ["legumes"], catalog);
    expect(result).toHaveLength(1);
  });

  it("hummus conflicts when sesame is eliminated", () => {
    const result = detectConflicts([item("a", "hummus")], ["sesame"], catalog);
    expect(result).toHaveLength(1);
  });

  it("hummus conflicts when either trigger is eliminated", () => {
    const result = detectConflicts(
      [item("a", "hummus")],
      ["legumes", "sesame"],
      catalog,
    );
    expect(result).toHaveLength(1);
    expect(result[0].foodId).toBe("hummus");
  });

  it("neutral food never conflicts even when elimination list is non-empty", () => {
    // ryze has allergenIds: [] — always safe
    const result = detectConflicts(
      [item("a", "ryze")],
      ["dairy", "eggs", "wheat"],
      catalog,
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty items list", () => {
    expect(detectConflicts([], ["dairy"], catalog)).toHaveLength(0);
  });

  it("returns empty array when eliminated list is empty", () => {
    const result = detectConflicts([item("a", "hummus")], [], catalog);
    expect(result).toHaveLength(0);
  });

  it("unknown foodId (other: custom) resolves to no triggers — never conflicts", () => {
    const result = detectConflicts(
      [item("a", "other:custom-cake")],
      ["dairy", "eggs"],
      catalog,
    );
    expect(result).toHaveLength(0);
  });

  it("only returns the conflicting items, not all items", () => {
    const items: MealItem[] = [
      item("safe", "ryze"),
      item("conflict", "kravske-mleko"),
    ];
    const result = detectConflicts(items, ["dairy"], catalog);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("conflict");
  });
});
