/**
 * Allergen ladder simulator — interactive CLI.
 *
 * NOT part of the app. A thin *driver* of the pure domain functions in
 * `src/lib/domain/ladder.ts`, run against in-memory arrays; nothing touches
 * Dexie/IndexedDB. The simulator invents no logic of its own — it only calls
 * domain functions and renders what they return, so the call trace is a
 * faithful picture of the app's real behavior. Rung is derived, never stored
 * (ADR-0012) — state is recomputed every render.
 *
 * Scope: meals → `currentRung` → tolerance, per-stage ladder rendering,
 * in-memory per-allergen ladder overrides (issue #427, ADR-0023), the read-only
 * gate *signals* — cadence and skin-stability read off the engine's own trace
 * (`explainLadderMove`, issue #528) so they can't drift from the verdict, plus
 * the auxiliary `skinCalmGate`/`checkpointVerdictGate` — and the composed
 * verdict those signals feed (PRD #445).
 * The verdict line is the decision; the signals line below it is the "why".
 * The escalation/de-escalation logic lives in the domain (`decideLadderMove`),
 * not in this script — the simulator only drives and renders it.
 *
 * ── How to run ────────────────────────────────────────────────
 *   just simulate                                 # track DEFAULT_TESTED_ALLERGENS (soy, wheat, eggs, dairy)
 *   just simulate dairy                           # track only dairy
 *   just simulate dairy eggs                      # track two allergens
 *   just simulate phase=reintroduction            # start in F4 (cadence 1d) instead of F3
 *   just simulate dairy phase=reintroduction      # combine
 *   just simulate verbose=true                    # also print the per-render → gate call trace
 *
 * Without the `just` recipe:
 *   bun run scripts/simulate.ts               # no args → default set
 *   bun run scripts/simulate.ts dairy         # track only dairy
 *
 * An unknown allergen id aborts with the list of valid (ladder-carrying) ids.
 * The initial phase can also be flipped at runtime with the `phase` command.
 * Once running, type `help` for the command list, `quit` (or Ctrl-D) to exit.
 * In a real terminal, ↑/↓ recall previous commands and the line is editable.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  currentRung,
  skinCalmGate,
  checkpointVerdictGate,
  explainLadderMove,
  resolveLadder,
  type Ladder,
  type LadderStep,
  type LadderDecision,
  type FeedingStage,
} from '../src/lib/domain/ladder';
import type {
  Meal,
  MealType,
  MealItem,
  MealId,
  PortionKind,
  SkinObservation,
  ReintroductionEvaluation,
  ProtocolAllergenId,
  RegionLevel,
  AllergenOutcome,
} from '../src/lib/domain/models';
import { FEEDING_STAGES } from '../src/lib/domain/canonical-allergen';
import { ALLERGENS, FOODS } from '../src/lib/data/allergen-catalog/allergen-catalog';
import { DEFAULT_TESTED_ALLERGENS, cadenceForPhase, stabilityWindowFor, type LadderPhase } from '../src/lib/domain/policy';
import { addDays } from '../src/lib/utils/date';

// ── Config ────────────────────────────────────────────────────

const PORTIONS: readonly PortionKind[] = ['pinch', 'teaspoon', 'spoon', 'portion', 'package'];
const OUTCOMES: readonly AllergenOutcome[] = ['tolerated', 'mild-reaction', 'clear-reaction', 'severe-reaction'];
const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const LADDER_PHASES: readonly LadderPhase[] = ['tolerance-building', 'reintroduction'];

/** Catalog allergens that actually carry a ladder — the only sensible things to simulate. */
const LADDER_ALLERGENS: readonly ProtocolAllergenId[] = ALLERGENS.filter((a) => a.ladder).map(
  (a) => a.id as ProtocolAllergenId
);

// ── ANSI ──────────────────────────────────────────────────────

const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// ── Tracked allergens + initial phase (from CLI args) ─────────

type CliArgs = {
  tracked: readonly ProtocolAllergenId[];
  phase: LadderPhase;
  verbose: boolean;
};

function parseArgs(argv: readonly string[]): CliArgs {
  const positional: string[] = [];
  let phase: LadderPhase = 'tolerance-building';
  let verbose = false;

  for (const raw of argv) {
    const eq = raw.indexOf('=');
    if (eq > 0) {
      const key = raw.slice(0, eq);
      const value = raw.slice(eq + 1);
      if (key === 'phase') {
        if (!isPhase(value)) {
          console.error(`${RED}phase must be one of: ${LADDER_PHASES.join(', ')} (got '${value}')${RESET}`);
          process.exit(1);
        }
        phase = value;
        continue;
      }
      if (key === 'verbose') {
        if (value !== 'true' && value !== 'false') {
          console.error(`${RED}verbose must be 'true' or 'false' (got '${value}')${RESET}`);
          process.exit(1);
        }
        verbose = value === 'true';
        continue;
      }
      console.error(`${RED}unknown flag: ${key}${RESET}`);
      console.error(`${DIM}supported flags: phase=<${LADDER_PHASES.join('|')}>, verbose=<true|false>${RESET}`);
      process.exit(1);
    }
    positional.push(raw);
  }

  const tracked = positional.length === 0 ? DEFAULT_TESTED_ALLERGENS : positional;
  const unknown = tracked.filter((a) => !LADDER_ALLERGENS.includes(a as ProtocolAllergenId));
  if (unknown.length > 0) {
    console.error(`${RED}unknown allergen id(s): ${unknown.join(', ')}${RESET}`);
    console.error(`${DIM}valid ids (allergens with a ladder): ${LADDER_ALLERGENS.join(', ')}${RESET}`);
    process.exit(1);
  }
  return { tracked: tracked as readonly ProtocolAllergenId[], phase, verbose };
}

const CLI = parseArgs(process.argv.slice(2));
const TRACKED = CLI.tracked;

// ── In-memory world ───────────────────────────────────────────

type World = {
  meals: Meal[];
  observations: SkinObservation[];
  evaluations: ReintroductionEvaluation[];
  /** Per-allergen ladder override, replacing the catalog default per stage (resolveLadder). */
  overrides: Map<ProtocolAllergenId, Ladder>;
  /** Allergens marked permanently eliminated — drives `decideLadderMove`'s `blocked` verdict. */
  permanent: Set<ProtocolAllergenId>;
  today: string;
  stage: FeedingStage;
  /** Ladder phase — selects the escalation cadence via `cadenceForPhase` (F3 vs F4). */
  phase: LadderPhase;
};

const world: World = {
  meals: [],
  observations: [],
  evaluations: [],
  overrides: new Map(),
  permanent: new Set(),
  today: '2026-06-01',
  stage: 'breastfed',
  phase: CLI.phase,
};

/** The cadence the engine is driven with — resolved from the active phase (ADR-0023). */
function cadenceDays(): number {
  return cadenceForPhase(world.phase);
}

/** The skin-stability window the engine is driven with (ADR-0023 §decision-engine). */
function stabilityWindowDays(): number {
  return stabilityWindowFor(world.phase);
}

// ── Tracing ───────────────────────────────────────────────────

let traceOn = true;
let traceFull = false;
let verbose = CLI.verbose;

/** A domain-function call: name, argument summaries, and the return value.
 *  Gated on `verbose` — these are diagnostic and off by default, while
 *  mutation traces remain visible so the record of user actions stays intact. */
function traceCall(name: string, args: string[], ret: string): void {
  if (!verbose || !traceOn) return;
  console.log(`  ${DIM}→ ${name}(${args.join(', ')}) = ${ret}${RESET}`);
}

/** A world mutation: the record appended by the simulator on the user's behalf. */
function traceMutation(name: string, record: unknown): void {
  if (!traceOn) return;
  const body = traceFull ? JSON.stringify(record, null, 2) : JSON.stringify(record);
  console.log(`  ${CYAN}✎ ${name}${RESET} ${DIM}${body}${RESET}`);
}

function sumMeals(): string {
  return traceFull ? JSON.stringify(world.meals) : `meals[${world.meals.length}]`;
}
function sumObs(): string {
  return traceFull ? JSON.stringify(world.observations) : `observations[${world.observations.length}]`;
}
function sumEvals(): string {
  return traceFull ? JSON.stringify(world.evaluations) : `evaluations[${world.evaluations.length}]`;
}
function sumLadder(l: Ladder | null | undefined): string {
  if (!l) return 'null';
  if (traceFull) return JSON.stringify(l);
  const stages = Object.keys(l.stages).join('/');
  return `Ladder(${l.allergenId}: ${stages || '∅'})`;
}

// ── Catalog / ladder helpers ──────────────────────────────────

function defaultLadderFor(allergenId: ProtocolAllergenId): Ladder {
  const ladder = ALLERGENS.find((a) => a.id === allergenId)?.ladder;
  return ladder ?? { allergenId, stages: {} };
}

function overrideFor(allergenId: ProtocolAllergenId): Ladder | null {
  return world.overrides.get(allergenId) ?? null;
}

/** Effective ladder for an allergen — default merged with any override. Traced. */
function effectiveLadder(allergenId: ProtocolAllergenId): Ladder {
  const def = defaultLadderFor(allergenId);
  const ovr = overrideFor(allergenId);
  const merged = resolveLadder(def, ovr);
  traceCall('resolveLadder', [sumLadder(def), sumLadder(ovr)], sumLadder(merged));
  return merged;
}

function stepsFor(allergenId: ProtocolAllergenId, stage: FeedingStage): readonly LadderStep[] {
  return effectiveLadder(allergenId).stages[stage] ?? [];
}

/** True when the given stage's rungs come from the override (stage-level replace). */
function stageIsOverridden(allergenId: ProtocolAllergenId, stage: FeedingStage): boolean {
  return overrideFor(allergenId)?.stages[stage] !== undefined;
}

function aFoodTriggering(allergenId: ProtocolAllergenId): string {
  const food = FOODS.find((f) => f.allergenIds.includes(allergenId));
  if (!food) throw new Error(`no catalog food triggers ${allergenId}`);
  return food.id;
}

// ── Mutations (traced) ────────────────────────────────────────

let seq = 0;

function mealsToday(): number {
  return world.meals.filter((m) => m.date === world.today).length;
}

function logMeal(items: MealItem[]): void {
  const mealType = MEAL_TYPES[mealsToday() % MEAL_TYPES.length];
  const meal: Meal = {
    id: `${world.today}:${mealType}` as MealId,
    date: world.today,
    mealType,
    actor: 'mother',
    items,
    createdAt: `${world.today}T12:00:${String(seq++).padStart(2, '0')}Z`,
  };
  world.meals.push(meal);
  traceMutation('logMeal', meal);
}

function mealItem(allergenId: ProtocolAllergenId, amount: PortionKind): MealItem {
  const foodId = aFoodTriggering(allergenId);
  return { id: `${world.today}-${seq++}`, name: foodId, foodId: foodId as MealItem['foodId'], amount };
}

function logCleanMeal(): void {
  logMeal([{ id: `${world.today}-${seq++}`, name: 'ryze', foodId: 'ryze' as MealItem['foodId'], amount: 'portion' }]);
}

function logSkin(level: RegionLevel): void {
  const obs = {
    id: `${world.today}-obs-${seq++}`,
    date: world.today,
    createdAt: `${world.today}T18:00:00Z`,
    regions: level === 0 ? [] : [{ id: 'face', level }],
  } as SkinObservation;
  world.observations.push(obs);
  traceMutation('logSkin', obs);
}

function logEvaluation(allergenId: ProtocolAllergenId, outcome: AllergenOutcome): void {
  const evaluation: ReintroductionEvaluation = {
    phaseId: `${allergenId}-${world.today}`,
    phaseType: 'allergen-test',
    outcome,
    allergenId,
    date: world.today,
  };
  world.evaluations.push(evaluation);
  traceMutation('logEvaluation', evaluation);
}

// ── Override editing ──────────────────────────────────────────

/** Snapshot the effective rungs of a stage as a mutable override base. */
function stageBase(allergenId: ProtocolAllergenId, stage: FeedingStage): LadderStep[] {
  return [...stepsFor(allergenId, stage)].map((s) => ({ ...s }));
}

function commitStage(allergenId: ProtocolAllergenId, stage: FeedingStage, steps: LadderStep[]): void {
  const existing = world.overrides.get(allergenId);
  const next: Ladder = existing
    ? { ...existing, stages: { ...existing.stages, [stage]: steps } }
    : { allergenId, stages: { [stage]: steps } };
  world.overrides.set(allergenId, next);
}

let ovrSeq = 0;

function rungEdit(
  allergenId: ProtocolAllergenId,
  stage: FeedingStage,
  index: number,
  fields: { anchor?: PortionKind; checkpoint?: boolean; dose?: string }
): boolean {
  const steps = stageBase(allergenId, stage);
  const i = index - 1;
  if (i < 0 || i >= steps.length) return warn(`no rung ${index} on ${allergenId}/${stage} (has ${steps.length})`);
  if (fields.anchor !== undefined) steps[i].anchor = fields.anchor;
  if (fields.checkpoint !== undefined) steps[i].isEvaluationCheckpoint = fields.checkpoint;
  if (fields.dose !== undefined) steps[i].dose = fields.dose;
  commitStage(allergenId, stage, steps);
  return true;
}

function rungAdd(
  allergenId: ProtocolAllergenId,
  stage: FeedingStage,
  fields: { anchor?: PortionKind; checkpoint?: boolean; dose?: string; at?: number }
): boolean {
  const steps = stageBase(allergenId, stage);
  const step: LadderStep = {
    id: `${allergenId}-ovr-${++ovrSeq}`,
    anchor: fields.anchor ?? 'pinch',
    isEvaluationCheckpoint: fields.checkpoint ?? false,
    dose: fields.dose ?? '(override rung)',
  };
  const pos = fields.at !== undefined ? fields.at - 1 : steps.length;
  if (pos < 0 || pos > steps.length) return warn(`bad insert position ${fields.at} (1..${steps.length + 1})`);
  steps.splice(pos, 0, step);
  commitStage(allergenId, stage, steps);
  return true;
}

function rungRemove(allergenId: ProtocolAllergenId, stage: FeedingStage, index: number): boolean {
  const steps = stageBase(allergenId, stage);
  const i = index - 1;
  if (i < 0 || i >= steps.length) return warn(`no rung ${index} on ${allergenId}/${stage} (has ${steps.length})`);
  steps.splice(i, 1);
  commitStage(allergenId, stage, steps);
  return true;
}

function rungReset(allergenId: ProtocolAllergenId, stage?: FeedingStage): void {
  const ovr = world.overrides.get(allergenId);
  if (!ovr) return;
  if (!stage) {
    world.overrides.delete(allergenId);
    return;
  }
  const rest = { ...ovr.stages };
  delete rest[stage];
  if (Object.keys(rest).length === 0) world.overrides.delete(allergenId);
  else world.overrides.set(allergenId, { ...ovr, stages: rest });
}

// ── Rendering ─────────────────────────────────────────────────

/** One-line, colored rendering of the composed `decideLadderMove` verdict. */
function formatVerdict(v: LadderDecision): string {
  switch (v.kind) {
    case 'advance':
      return `${GREEN}advance${RESET} ${DIM}${v.from?.id ?? '(start)'} → ${v.to.id}${RESET}`;
    case 'hold': {
      const detail =
        v.reason === 'cadence' && v.daysRemaining !== undefined
          ? ` (${v.daysRemaining}d left)`
          : v.reason === 'skin-worsening' &&
              v.baselineSeverity !== undefined &&
              v.currentSeverity !== undefined
            ? ` (${v.baselineSeverity} → ${v.currentSeverity})`
            : '';
      return `${YELLOW}hold${RESET} ${DIM}${v.reason}${detail} @ ${v.rung.id}${RESET}`;
    }
    case 'rest':
      return `${YELLOW}rest${RESET} ${DIM}${v.days}d until ${v.until} @ ${v.rung.id}${RESET}`;
    case 'step-back':
      return `${YELLOW}step-back${RESET} ${DIM}${v.from.id} → ${v.to.id}${RESET}`;
    case 'passed':
      return `${GREEN}passed${RESET} ${DIM}@ ${v.rung.id}${RESET}`;
    case 'blocked':
      return `${RED}blocked${RESET} ${DIM}(permanently eliminated / inert)${RESET}`;
    // Clinical-reshape variants (ADR-0023 §6) — never emitted yet; placeholder
    // renders so the exhaustive switch stays green as the union grows.
    case 'settled':
      return `${GREEN}settled${RESET} ${DIM}@ ${v.rung.id}${RESET}`;
    case 'adapting-decelerate':
      return `${YELLOW}adapting-decelerate${RESET} ${DIM}@ ${v.rung.id}${RESET}`;
    case 'suspected-reaction':
      return `${YELLOW}suspected-reaction${RESET} ${DIM}@ ${v.rung.id} — awaiting mother's verdict${RESET}`;
    case 'ceiling-reached':
      return `${RED}ceiling-reached${RESET} ${DIM}(${v.reason}) @ ${v.rung.id} — defer to clinician${RESET}`;
    default: {
      const _exhaustive: never = v;
      return _exhaustive;
    }
  }
}

function renderAllergen(allergenId: ProtocolAllergenId): void {
  const stage = world.stage;
  const def = defaultLadderFor(allergenId);
  const ovr = overrideFor(allergenId);
  const steps = stepsFor(allergenId, stage);

  const rung = currentRung(allergenId, world.meals, def, stage, ovr);
  traceCall('currentRung', [`'${allergenId}'`, sumMeals(), sumLadder(def), `'${stage}'`, sumLadder(ovr)], rung?.id ?? 'null');

  const isPermanent = world.permanent.has(allergenId);
  // Cadence and skin-stability are the two gate-backed precedence steps. Read
  // them off the engine's own trace (`explainLadderMove`) rather than re-calling
  // the gates here: a second, outside reconstruction can silently drift from the
  // verdict as the engine evolves (design #521). The `explain` walk is the same
  // code path `decideLadderMove` runs, so trace and verdict cannot diverge.
  const explain = explainLadderMove({
    allergenId,
    meals: world.meals,
    evaluations: world.evaluations,
    observations: world.observations,
    defaultLadder: def,
    override: ovr,
    stage,
    today: world.today,
    cadenceDays: cadenceDays(),
    stabilityWindowDays: stabilityWindowDays(),
    isPermanentlyEliminated: isPermanent,
  });
  const move = explain.decision;
  const cadenceStep = explain.steps.find((s) => s.name === 'cadence')!;
  const stabilityStep = explain.steps.find((s) => s.name === 'skin-worsening')!;
  const cadence = cadenceStep.detail.step === 'cadence' ? cadenceStep.detail.gate : null;
  const effectiveCadence =
    cadenceStep.detail.step === 'cadence' ? cadenceStep.detail.cadenceDays : cadenceDays();
  const stability =
    stabilityStep.detail.step === 'skin-worsening'
      ? stabilityStep.detail.gate
      : { allowed: true, baselineSeverity: null, currentSeverity: null };
  traceCall('explainLadderMove.steps[cadence]', [`effective=${effectiveCadence}`], JSON.stringify(cadence));
  traceCall('explainLadderMove.steps[skin-worsening]', [`window=${stabilityWindowDays()}`], JSON.stringify(stability));

  // Auxiliary signals — retired from the decision path (ADR-0023 §6) but still
  // useful context; they carry no decision-path drift risk, so they stay as
  // direct calls rather than moving onto the seam.
  const skin = skinCalmGate(world.observations, world.today);
  traceCall('skinCalmGate', [sumObs(), `'${world.today}'`], JSON.stringify(skin));

  const verdict = checkpointVerdictGate(rung, allergenId, world.evaluations);
  traceCall('checkpointVerdictGate', [rung?.id ?? 'null', `'${allergenId}'`, sumEvals()], JSON.stringify(verdict));

  traceCall(
    'explainLadderMove',
    [
      `{ '${allergenId}', ${sumMeals()}, ${sumEvals()}, ${sumObs()}, ` +
        `defaultLadder=${sumLadder(def)}, override=${sumLadder(ovr)}, ` +
        `stage='${stage}', today='${world.today}', cadence=${cadenceDays()}, ` +
        `stabilityWindow=${stabilityWindowDays()}, permanent=${isPermanent} }`,
    ],
    JSON.stringify(move),
  );

  const reachedIdx = rung ? steps.findIndex((s) => s.id === rung.id) : -1;
  const ovrTag = stageIsOverridden(allergenId, stage) ? ` ${YELLOW}[override]${RESET}` : '';
  const permTag = isPermanent ? ` ${RED}[permanent]${RESET}` : '';

  console.log(`\n${BOLD}${allergenId}${RESET} ${DIM}(${stage})${RESET}${ovrTag}${permTag}`);
  if (steps.length === 0) {
    console.log(`  ${DIM}no ladder for this stage${RESET}`);
    return;
  }
  steps.forEach((step, i) => {
    const mark = i < reachedIdx ? `${GREEN}✓${RESET}` : i === reachedIdx ? `${GREEN}▶${RESET}` : `${DIM}·${RESET}`;
    const chk = step.isEvaluationCheckpoint ? ` ${YELLOW}[checkpoint]${RESET}` : '';
    console.log(`  ${mark} ${String(i + 1).padStart(2)}. ${step.anchor.padEnd(8)} ${DIM}${step.dose}${RESET}${chk}`);
  });

  // Tolerance = raw currentRung (highest dose logged in sequence). No back-off,
  // no gate adjustment — the domain does not model that (see file header).
  const tol = rung
    ? `${BOLD}${rung.id}${RESET} ${DIM}(${rung.anchor}, rung ${reachedIdx + 1}/${steps.length})${RESET} — ${rung.dose}`
    : `${DIM}none yet (rung 0/${steps.length})${RESET}`;
  console.log(`  ${GREEN}tolerance:${RESET} ${tol}`);

  // Composed decision (the "what to do"), with the raw signals below as its "why".
  console.log(`  ${BOLD}verdict:${RESET} ${formatVerdict(move)}`);

  // Raw gate signals — the inputs `explainLadderMove` composed into the verdict
  // above. `cadence`/`stability` come from the trace's gate steps; a step higher
  // in the precedence may have fired before the cadence gate ran, in which case
  // its detail is the not-run identity (allowed, no data).
  const cadenceTxt = !cadence
    ? `${DIM}—${RESET}`
    : cadence.allowed
      ? `${GREEN}ok${RESET}`
      : `${YELLOW}wait ${cadence.daysSinceLastDose}d/${effectiveCadence}d${RESET}`;
  const skinTxt = skin.isFlare ? `${RED}flare ${skin.latestSeverity}${RESET}` : `${GREEN}calm${RESET}`;
  const trendTxt = stability.allowed
    ? stability.baselineSeverity !== null && stability.currentSeverity !== null
      ? `${GREEN}stable ${stability.baselineSeverity}→${stability.currentSeverity}${RESET}`
      : `${GREEN}stable (no data)${RESET}`
    : `${RED}worsening ${stability.baselineSeverity}→${stability.currentSeverity}${RESET}`;
  const verdictTxt = verdict.allowed
    ? `${GREEN}ok${RESET}`
    : `${RED}hold${verdict.requiresRest ? ` rest ${verdict.restDays}d` : ''}${RESET}`;
  console.log(`  ${DIM}signals:${RESET} cadence ${cadenceTxt} | skin ${skinTxt} | trend ${trendTxt} | verdict ${verdictTxt}`);
}

function renderState(): void {
  console.log(`\n${'═'.repeat(56)}`);
  console.log(
    `${BOLD}day ${world.today}${RESET}   ${DIM}stage=${world.stage} phase=${world.phase} (cadence ${cadenceDays()}d, stability window ${stabilityWindowDays()}d) meals=${world.meals.length} skin=${world.observations.length} evals=${world.evaluations.length}${RESET}`
  );
  for (const a of TRACKED) renderAllergen(a);
  console.log('');
}

function renderLadderAllStages(allergenId: ProtocolAllergenId): void {
  console.log(`\n${BOLD}${allergenId}${RESET} ${DIM}— all stages${RESET}`);
  for (const stage of FEEDING_STAGES) {
    const steps = stepsFor(allergenId, stage);
    const ovrTag = stageIsOverridden(allergenId, stage) ? ` ${YELLOW}[override]${RESET}` : '';
    console.log(`  ${CYAN}${stage}${RESET}${ovrTag}`);
    if (steps.length === 0) {
      console.log(`    ${DIM}(none)${RESET}`);
      continue;
    }
    steps.forEach((step, i) => {
      const chk = step.isEvaluationCheckpoint ? ` ${YELLOW}[checkpoint]${RESET}` : '';
      console.log(`    ${String(i + 1).padStart(2)}. ${step.anchor.padEnd(8)} ${DIM}${step.dose}${RESET}${chk}`);
    });
  }
  console.log('');
}

// ── Command parsing ───────────────────────────────────────────

/** Quote-aware tokenizer: `dose="150 g jogurtu"` → one token `dose=150 g jogurtu`. */
function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  let has = false;
  for (const ch of line.trim()) {
    if (ch === '"') {
      inQuote = !inQuote;
      has = true;
      continue;
    }
    if (/\s/.test(ch) && !inQuote) {
      if (has) {
        out.push(cur);
        cur = '';
        has = false;
      }
      continue;
    }
    cur += ch;
    has = true;
  }
  if (has) out.push(cur);
  return out;
}

function parseKV(tokens: readonly string[]): Record<string, string> {
  const kv: Record<string, string> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq > 0) kv[t.slice(0, eq)] = t.slice(eq + 1);
  }
  return kv;
}

function isPortion(x: string): x is PortionKind {
  return (PORTIONS as readonly string[]).includes(x);
}
function isTracked(x: string): x is ProtocolAllergenId {
  return (TRACKED as readonly string[]).includes(x);
}
function isOutcome(x: string): x is AllergenOutcome {
  return (OUTCOMES as readonly string[]).includes(x);
}
function isStage(x: string): x is FeedingStage {
  return (FEEDING_STAGES as readonly string[]).includes(x);
}
function isPhase(x: string): x is LadderPhase {
  return (LADDER_PHASES as readonly string[]).includes(x);
}

/** Parse the shared rung-edit field flags; returns null on an invalid value. */
function parseRungFields(
  kv: Record<string, string>
): { anchor?: PortionKind; checkpoint?: boolean; dose?: string; at?: number } | null {
  const fields: { anchor?: PortionKind; checkpoint?: boolean; dose?: string; at?: number } = {};
  if (kv.anchor !== undefined) {
    if (!isPortion(kv.anchor)) {
      warn(`anchor: ${PORTIONS.join(' | ')} (got '${kv.anchor}')`);
      return null;
    }
    fields.anchor = kv.anchor;
  }
  if (kv.checkpoint !== undefined) {
    if (kv.checkpoint !== 'true' && kv.checkpoint !== 'false') {
      warn(`checkpoint: true | false (got '${kv.checkpoint}')`);
      return null;
    }
    fields.checkpoint = kv.checkpoint === 'true';
  }
  if (kv.dose !== undefined) fields.dose = kv.dose;
  if (kv.at !== undefined) {
    const at = parseInt(kv.at, 10);
    if (Number.isNaN(at) || at < 1) {
      warn(`at: positive integer (got '${kv.at}')`);
      return null;
    }
    fields.at = at;
  }
  return fields;
}

const HELP = `
${BOLD}commands${RESET}  ${DIM}(type, press enter, see state)${RESET}
  ${BOLD}meal${RESET} <allergen:amount> […]  log a meal; repeat pairs for multiple allergens
                             e.g. meal eggs:pinch dairy:spoon
                             allergen: ${TRACKED.join(' | ')}
                             amount:   ${PORTIONS.join(' | ')}
  ${BOLD}meal none${RESET}                  log a clean meal (no allergen)
  ${BOLD}skin${RESET} <0-3>                 log a skin observation (0=calm, 3=worst)
  ${BOLD}eval${RESET} <allergen> <outcome>  record a checkpoint verdict
                             outcome: ${OUTCOMES.join(' | ')}
  ${BOLD}next${RESET} [n]                   advance n days (default 1)
  ${BOLD}stage${RESET} <${FEEDING_STAGES.join('|')}>   switch active feeding stage
  ${BOLD}phase${RESET} <${LADDER_PHASES.join('|')}>   switch ladder phase (sets cadence via cadenceForPhase)
  ${BOLD}permanent${RESET} <allergen> [on|off]  mark allergen permanently eliminated (→ blocked); toggles if no arg
  ${BOLD}ladder show${RESET} <allergen>     print all three stage ladders (effective)
  ${BOLD}rung edit${RESET} <a> <stage> <n> [anchor=] [checkpoint=] [dose="…"]   edit rung n
  ${BOLD}rung add${RESET}  <a> <stage> [anchor=] [checkpoint=] [dose="…"] [at=n]  insert a rung
  ${BOLD}rung rm${RESET}   <a> <stage> <n>                                        remove rung n
  ${BOLD}rung reset${RESET} <a> [stage]     drop the override (one stage, or all)
  ${BOLD}trace${RESET} <on|off|full>        toggle call tracing (full = verbatim args)
  ${BOLD}verbose${RESET} <on|off>            show/hide the per-render → gate call trace (default off)
  ${BOLD}show${RESET}                       reprint current state
  ${BOLD}clear${RESET}                      clear the screen, keep only legend + current state
  ${BOLD}reset${RESET}                      wipe all logged data + overrides
  ${BOLD}help${RESET} · ${BOLD}quit${RESET}
`;

function handleRung(args: string[]): boolean {
  const [sub, a, ...rest] = args;
  if (sub === 'reset') {
    if (!isTracked(a ?? '')) return warn(`allergen: ${TRACKED.join(' | ')}`);
    const stage = rest[0];
    if (stage !== undefined && !isStage(stage)) return warn(`stage: ${FEEDING_STAGES.join(' | ')}`);
    rungReset(a as ProtocolAllergenId, stage as FeedingStage | undefined);
    renderState();
    return true;
  }

  if (sub === 'edit' || sub === 'add' || sub === 'rm') {
    if (!isTracked(a ?? '')) return warn(`allergen: ${TRACKED.join(' | ')}`);
    const stage = rest[0];
    if (!isStage(stage ?? '')) return warn(`stage: ${FEEDING_STAGES.join(' | ')}`);
    const allergenId = a as ProtocolAllergenId;
    const st = stage as FeedingStage;

    if (sub === 'add') {
      const fields = parseRungFields(parseKV(rest.slice(1)));
      if (!fields) return true;
      if (!rungAdd(allergenId, st, fields)) return true;
      renderState();
      return true;
    }

    // edit / rm both need an index next
    const index = parseInt(rest[1] ?? '', 10);
    if (Number.isNaN(index)) return warn(`rung ${sub} <allergen> <stage> <n> …`);
    if (sub === 'rm') {
      if (!rungRemove(allergenId, st, index)) return true;
      renderState();
      return true;
    }
    const fields = parseRungFields(parseKV(rest.slice(2)));
    if (!fields) return true;
    if (!rungEdit(allergenId, st, index, fields)) return true;
    renderState();
    return true;
  }

  return warn(`rung <edit|add|rm|reset> … (type 'help')`);
}

function handle(line: string): boolean {
  const [cmd, ...args] = tokenize(line);
  switch (cmd) {
    case undefined:
    case '':
      return true;
    case 'quit':
    case 'q':
    case 'exit':
      return false;
    case 'help':
    case '?':
      console.log(HELP);
      return true;
    case 'show':
      renderState();
      return true;
    case 'clear':
      console.clear();
      console.log(HELP);
      renderState();
      return true;
    case 'reset':
      world.meals = [];
      world.observations = [];
      world.evaluations = [];
      world.overrides.clear();
      world.permanent.clear();
      console.log(`${DIM}world wiped${RESET}`);
      renderState();
      return true;
    case 'trace': {
      const mode = args[0];
      if (mode === 'on') {
        traceOn = true;
        traceFull = false;
      } else if (mode === 'off') {
        traceOn = false;
      } else if (mode === 'full') {
        traceOn = true;
        traceFull = true;
      } else {
        return warn('trace <on|off|full>');
      }
      console.log(`${DIM}trace: ${traceOn ? (traceFull ? 'full' : 'on') : 'off'}${RESET}`);
      return true;
    }
    case 'verbose': {
      const mode = args[0];
      if (mode === 'on') verbose = true;
      else if (mode === 'off') verbose = false;
      else return warn('verbose <on|off>');
      console.log(`${DIM}verbose: ${verbose ? 'on' : 'off'}${RESET}`);
      return true;
    }
    case 'next': {
      const n = args[0] ? parseInt(args[0], 10) : 1;
      if (Number.isNaN(n) || n < 1) return warn('next needs a positive integer');
      world.today = addDays(world.today, n);
      renderState();
      return true;
    }
    case 'stage': {
      const s = args[0] ?? '';
      if (!isStage(s)) return warn(`stage: ${FEEDING_STAGES.join(' | ')}`);
      world.stage = s;
      renderState();
      return true;
    }
    case 'phase': {
      const p = args[0] ?? '';
      if (!isPhase(p)) return warn(`phase: ${LADDER_PHASES.join(' | ')}`);
      world.phase = p;
      renderState();
      return true;
    }
    case 'permanent': {
      const [a, mode] = args;
      if (!isTracked(a ?? '')) return warn(`allergen: ${TRACKED.join(' | ')}`);
      if (mode !== undefined && mode !== 'on' && mode !== 'off') return warn('permanent <allergen> [on|off]');
      const allergenId = a as ProtocolAllergenId;
      const on = mode === undefined ? !world.permanent.has(allergenId) : mode === 'on';
      if (on) world.permanent.add(allergenId);
      else world.permanent.delete(allergenId);
      renderState();
      return true;
    }
    case 'ladder': {
      if (args[0] !== 'show') return warn(`ladder show <allergen>`);
      const a = args[1] ?? '';
      if (!isTracked(a)) return warn(`allergen: ${TRACKED.join(' | ')}`);
      renderLadderAllStages(a as ProtocolAllergenId);
      return true;
    }
    case 'rung':
      return handleRung(args);
    case 'skin': {
      const lvl = parseInt(args[0] ?? '', 10);
      if (![0, 1, 2, 3].includes(lvl)) return warn('skin needs 0-3');
      logSkin(lvl as RegionLevel);
      renderState();
      return true;
    }
    case 'eval': {
      const [a, o] = args;
      if (!isTracked(a ?? '')) return warn(`allergen: ${TRACKED.join(' | ')}`);
      if (!isOutcome(o ?? '')) return warn(`outcome: ${OUTCOMES.join(' | ')}`);
      logEvaluation(a as ProtocolAllergenId, o as AllergenOutcome);
      renderState();
      return true;
    }
    case 'meal': {
      if (args[0] === 'none') {
        logCleanMeal();
        renderState();
        return true;
      }
      if (args.length === 0) return warn(`meal <allergen:amount> [more…]  or  meal none`);
      const items: MealItem[] = [];
      for (const pair of args) {
        const [a, amt] = pair.split(':');
        if (!isTracked(a ?? '')) return warn(`allergen: ${TRACKED.join(' | ')} (got '${a}')`);
        if (!isPortion(amt ?? '')) return warn(`amount: ${PORTIONS.join(' | ')} (got '${amt}')`);
        items.push(mealItem(a as ProtocolAllergenId, amt as PortionKind));
      }
      logMeal(items);
      renderState();
      return true;
    }
    default:
      return warn(`unknown: ${cmd}  (type 'help')`);
  }
}

function warn(msg: string): boolean {
  console.log(`${RED}!${RESET} ${msg}`);
  return true;
}

// ── REPL ──────────────────────────────────────────────────────

console.log(`${BOLD}Allergen ladder simulator${RESET}  ${DIM}— tracking: ${TRACKED.join(', ')} · phase: ${world.phase} (cadence ${cadenceDays()}d, stability window ${stabilityWindowDays()}d) · verbose: ${verbose ? 'on' : 'off'}${RESET}`);
console.log(`${DIM}type 'help', 'quit' to exit${RESET}`);
console.log(HELP);
renderState();

// readline (not Bun's `prompt`) gives up/down-arrow command history and line
// editing on a TTY. `terminal` is auto-detected: on a real terminal it enables
// history; on piped stdin (scripted runs/tests) it falls back to plain reads.
// The async-iterator form queues every buffered line and ends cleanly on EOF —
// unlike `question()`, which drops lines that arrive faster than we re-ask.
const rl = createInterface({ input: stdin, output: stdout, historySize: 200 });

function promptStr(): string {
  return `${BOLD}[${world.today}]${RESET} > `;
}

rl.setPrompt(promptStr());
rl.prompt();
for await (const line of rl) {
  if (!handle(line)) break;
  rl.setPrompt(promptStr());
  rl.prompt();
}
rl.close();
console.log(`${DIM}bye${RESET}`);
